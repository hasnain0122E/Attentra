/**
 * Attentra — Execution Dispatcher
 *
 * Phase 7 / Step 2 — Provider Execution Abstraction + BlueMinds Adapter
 *
 * Bridges the routing engine's ExecutionPlan to the execution layer's
 * ProviderAdapter. The dispatcher:
 *
 * 1. Accepts an ExecutionPlan + messages
 * 2. Resolves the provider adapter by plan.primary.providerId
 * 3. Constructs an ExecutionRequest from the plan
 * 4. Executes through the resolved adapter
 * 5. Returns a normalized ExecutionResult
 *
 * The dispatcher MUST NOT:
 * - Choose models or score candidates (routing responsibility)
 * - Implement automatic fallback execution (Phase 7 Step 3)
 * - Contain provider-specific API code
 * - Modify the ExecutionPlan
 *
 * One execution plan → one provider adapter → one normalized result.
 */

import type {
  ExecutionPlan,
  ExecutionResult,
} from "@/lib/routing/execution-plan";
import type { ExecutionRequest, ExecutionConfig } from "./types";
import { DEFAULT_EXECUTION_TIMEOUT_MS } from "./types";
import { ExecutionAdapterRegistry } from "./registry";
import { Executor } from "./executor";
import {
  NormalizedExecutionError,
  sanitizeErrorMessage,
} from "./errors";

// ─────────────────────────────────────────────────────
// DISPATCHER
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral execution dispatcher.
 *
 * Takes a validated ExecutionPlan (from Phase 6 Step 4), extracts the
 * primary target, constructs an ExecutionRequest, and delegates to the
 * Executor which resolves the appropriate ProviderAdapter.
 *
 * The dispatcher does NOT implement fallback execution — it dispatches
 * only the primary target. Automatic fallback belongs to Phase 7 Step 3.
 */
export class Dispatcher {
  private readonly registry: ExecutionAdapterRegistry;
  private readonly executor: Executor;

  constructor(registry: ExecutionAdapterRegistry, config?: ExecutionConfig) {
    this.registry = registry;
    this.executor = new Executor(registry, config);
  }

  /**
   * Execute the primary target of an ExecutionPlan.
   *
   * @param plan     Validated execution plan from prepareExecutionFlow()
   * @param messages Conversation messages to send to the provider
   * @param config   Optional per-request execution config override
   * @returns        Normalized execution result
   */
  async executePlan(
    plan: ExecutionPlan,
    messages: Array<{ role: string; content: string }>,
    config?: ExecutionConfig
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 1. Validate the execution plan has a primary target
    if (!plan || !plan.primary) {
      return buildDispatcherFailure(
        new NormalizedExecutionError(
          "INVALID_EXECUTION_PLAN",
          "Execution plan has no primary target",
          { retryable: false }
        ),
        undefined,
        Date.now() - startTime
      );
    }

    if (!plan.primary.modelId) {
      return buildDispatcherFailure(
        new NormalizedExecutionError(
          "INVALID_EXECUTION_PLAN",
          "Execution plan primary target has no model ID",
          { retryable: false, provider: plan.primary.providerId }
        ),
        plan.primary,
        Date.now() - startTime
      );
    }

    if (!plan.primary.providerId) {
      return buildDispatcherFailure(
        new NormalizedExecutionError(
          "INVALID_EXECUTION_PLAN",
          "Execution plan primary target has no provider ID",
          { retryable: false }
        ),
        plan.primary,
        Date.now() - startTime
      );
    }

    // 2. Validate messages
    if (!messages || messages.length === 0) {
      return buildDispatcherFailure(
        new NormalizedExecutionError(
          "INVALID_REQUEST",
          "No messages provided for execution",
          { retryable: false, provider: plan.primary.providerId }
        ),
        plan.primary,
        Date.now() - startTime
      );
    }

    // 3. Verify adapter is registered before proceeding
    if (!this.registry.has(plan.primary.providerId)) {
      const available = this.registry.listProviderIds().join(", ");
      return buildDispatcherFailure(
        new NormalizedExecutionError(
          "MODEL_UNAVAILABLE",
          `No execution adapter registered for provider "${plan.primary.providerId}". ` +
            `Available: [${available}]`,
          { retryable: false, provider: plan.primary.providerId }
        ),
        plan.primary,
        Date.now() - startTime
      );
    }

    // 4. Build ExecutionRequest from ExecutionPlan
    const request = buildExecutionRequest(plan, messages);

    // 5. Execute through the resolved adapter
    const result = await this.executor.execute(request, config);

    return result;
  }

  /**
   * Get the underlying registry (for inspection/testing).
   */
  getRegistry(): ExecutionAdapterRegistry {
    return this.registry;
  }
}

// ─────────────────────────────────────────────────────
// CONVENIENCE FUNCTION
// ─────────────────────────────────────────────────────

/**
 * Execute an ExecutionPlan through the appropriate provider adapter.
 *
 * Convenience wrapper around Dispatcher for simple use cases.
 *
 * @param plan      Validated execution plan
 * @param messages  Conversation messages
 * @param registry  Execution adapter registry
 * @param config    Optional execution configuration
 * @returns         Normalized execution result
 */
export async function executeExecutionPlan(
  plan: ExecutionPlan,
  messages: Array<{ role: string; content: string }>,
  registry: ExecutionAdapterRegistry,
  config?: ExecutionConfig
): Promise<ExecutionResult> {
  const dispatcher = new Dispatcher(registry, config);
  return dispatcher.executePlan(plan, messages, config);
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Build an ExecutionRequest from an ExecutionPlan's primary target.
 *
 * Maps ExecutionPlan fields to the execution layer's request format
 * without altering routing decisions or model selection.
 */
function buildExecutionRequest(
  plan: ExecutionPlan,
  messages: Array<{ role: string; content: string }>
): ExecutionRequest {
  return {
    modelId: plan.primary.modelId,
    providerId: plan.primary.providerId,
    modelIdentifier: plan.primary.modelIdentifier,
    messages,
    maxTokens: plan.estimatedOutputTokens || undefined,
    requestId: plan.requestId ?? generateRequestId(),
    metadata: {
      taskType: plan.taskType,
      complexity: plan.complexity,
      routingScore: plan.routingScore,
      projectedCost: plan.projectedCost,
      routingDecisionId: plan.routingDecisionId,
    },
  };
}

/**
 * Build a failure result for dispatcher-level errors (before adapter dispatch).
 */
function buildDispatcherFailure(
  error: NormalizedExecutionError,
  target: { providerId?: string; modelId?: string } | undefined,
  latencyMs: number
): ExecutionResult {
  return {
    success: false,
    providerId: target?.providerId ?? error.provider,
    modelId: target?.modelId,
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    },
    latencyMs,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a simple request ID when one is not available from the plan.
 */
function generateRequestId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

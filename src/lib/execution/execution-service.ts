/**
 * Attentra — Central Execution Service
 *
 * Phase 7 / Step 3 — Production Provider Execution
 *
 * The production entry point for executing a validated ExecutionPlan
 * through the provider execution layer:
 *
 *   ExecutionPlan (Phase 6, frozen)
 *     → validateExecutionPlan()       (existing Phase 6 contract)
 *     → ProviderRegistry resolution   (providerId → ExecutionProvider)
 *     → Dispatcher                    (primary-target execution)
 *     → ExecutionResult               (existing Phase 6 contract)
 *
 * The service MUST NOT:
 * - Choose models or score candidates (routing responsibility)
 * - Execute fallback targets automatically (a later, controlled step)
 * - Contain provider-specific API code
 * - Recalculate or fabricate pricing (Phase 5/6 pricing is authoritative;
 *   projectedCost stays on the ExecutionPlan and is never overwritten)
 *
 * NOTE: This service lives in execution-service.ts (not executor.ts as
 * loosely recommended by the spec) because dispatcher.ts already imports
 * the Executor — placing the service in executor.ts would create a
 * circular import. executor.ts keeps the request-level Executor from
 * Step 1; this file is the plan-level production entry point.
 */

import type {
  ExecutionPlan,
  ExecutionResult,
} from "@/lib/routing/execution-plan";
import { validateExecutionPlan } from "@/lib/routing/execution-plan";
import type { ExecutionConfig, ExecutionOptions } from "./types";
import {
  ProviderRegistry,
  createDefaultProviderRegistry,
  getProviderRegistry,
} from "./provider-registry";
import { Dispatcher } from "./dispatcher";

export class ExecutionService {
  private readonly registry: ProviderRegistry;
  private readonly dispatcher: Dispatcher;

  /**
   * @param registry  Optional provider registry (defaults to the shared
   *                  default registry with all Phase 7 providers)
   * @param config    Optional default execution config (e.g., timeoutMs)
   */
  constructor(registry?: ProviderRegistry, config?: ExecutionConfig) {
    this.registry = registry ?? createDefaultProviderRegistry();
    this.dispatcher = new Dispatcher(this.registry.asAdapterRegistry(), config);
  }

  /**
   * Execute the PRIMARY target of a validated ExecutionPlan.
   *
   * Steps:
   * 1. Validate the plan using the existing Phase 6 contract
   *    (validateExecutionPlan) — invalid plans produce a structured
   *    INVALID_EXECUTION_PLAN failure, never an exception.
   * 2. Resolve the provider from the provider registry.
   * 3. Execute the primary target only (NO automatic fallback —
   *    if the primary fails, the structured failure is returned).
   * 4. Return the normalized ExecutionResult.
   *
   * @param plan     ExecutionPlan produced by the routing engine
   * @param messages Conversation messages to send
   * @param options  Optional per-request execution options (timeoutMs)
   */
  async execute(
    plan: ExecutionPlan,
    messages: Array<{ role: string; content: string }>,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 1. Validate the execution plan using the existing Phase 6 contract
    if (!plan || !plan.primary) {
      return buildServiceFailure(
        plan,
        {
          code: "INVALID_EXECUTION_PLAN",
          message: "Execution plan has no primary target",
          retryable: false,
        },
        Date.now() - startTime
      );
    }

    const validation = validateExecutionPlan(plan);
    if (!validation.valid) {
      return buildServiceFailure(
        plan,
        {
          code: "INVALID_EXECUTION_PLAN",
          message: `Execution plan validation failed: ${validation.errors
            .map((error) => error.message)
            .join("; ")}`,
          retryable: false,
        },
        Date.now() - startTime
      );
    }

    // 2. Resolve the provider from the provider registry
    if (!this.registry.has(plan.primary.providerId)) {
      const available = this.registry.listProviderIds().join(", ");
      return buildServiceFailure(
        plan,
        {
          code: "MODEL_UNAVAILABLE",
          message: `No execution provider registered for "${plan.primary.providerId}". Available providers: [${available}]`,
          retryable: false,
        },
        Date.now() - startTime
      );
    }

    // 3–5. Execute the primary target (request building, timeout, and
    //       response normalization are handled downstream). Fallback
    //       targets in the plan are intentionally NOT executed here.
    return this.dispatcher.executePlan(plan, messages, options);
  }

  /** The provider registry this service resolves providers from. */
  getProviderRegistry(): ProviderRegistry {
    return this.registry;
  }
}

/**
 * Build a structured failure result for service-level validation and
 * resolution errors (before any provider is contacted).
 */
function buildServiceFailure(
  plan: ExecutionPlan | null | undefined,
  error: { code: string; message: string; retryable: boolean },
  latencyMs: number
): ExecutionResult {
  return {
    success: false,
    providerId: plan?.primary?.providerId,
    modelId: plan?.primary?.modelId,
    error,
    latencyMs,
    timestamp: new Date().toISOString(),
  };
}

let defaultService: ExecutionService | undefined;

/** Get the shared default execution service (lazy singleton). */
export function getExecutionService(): ExecutionService {
  if (!defaultService) {
    defaultService = new ExecutionService(getProviderRegistry());
  }
  return defaultService;
}

/**
 * Attentra — Execution Orchestrator
 *
 * Phase 7 / Step 4 — Execution Orchestration, Fallback & Resilience
 *
 * The orchestrator is the single production entry point for executing
 * an ExecutionPlan end-to-end, including automatic fallback when
 * primary execution fails with a retryable error.
 *
 * Architecture:
 *   ExecutionPlan (Phase 6, frozen)
 *     → validateExecutionPlan()       (Phase 6 contract)
 *     → execute primary target
 *     → on retryable failure: execute fallback[0], fallback[1], …
 *     → OrchestratorResult
 *
 * The orchestrator MUST NOT:
 * - Choose models or score candidates (routing responsibility)
 * - Modify the ExecutionPlan or its fallback ordering
 * - Contain provider-specific API code or SDK imports
 * - Recalculate projected cost (Phase 5/6 pricing is authoritative)
 * - Fabricate actualCost from estimates (billing step responsibility)
 * - Treat any provider differently from another (provider-neutral)
 *
 * Fallback policy:
 * - Only retryable errors trigger fallback (TIMEOUT, REQUEST_TIMEOUT,
 *   RATE_LIMIT, SERVER_ERROR, NETWORK_ERROR)
 * - Non-retryable errors stop execution immediately
 * - maxAttempts defaults to fallbacks.length + 1, capped at MAX_ATTEMPTS
 *
 * Actual cost:
 * - Calculated from actual provider usage (inputTokens × inputPrice) +
 *   (outputTokens × outputPrice) using the Phase 5 pricing data on the
 *   Model database record
 * - Requires a Prisma client for pricing lookup; undefined when unavailable
 * - NEVER fabricated from routing estimates
 *
 * Security:
 * - API keys, Bearer tokens, and credential patterns are stripped from
 *   all error messages before being included in OrchestratorResult
 */

import type {
  ExecutionPlan,
  ExecutionTarget,
  ExecutionResult,
} from "@/lib/routing/execution-plan";
import { validateExecutionPlan } from "@/lib/routing/execution-plan";
import type { ExecutionOptions } from "./types";
import { ProviderRegistry, createDefaultProviderRegistry } from "./provider-registry";
import { Dispatcher } from "./dispatcher";
import { sanitizeErrorMessage } from "./errors";
import type { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

/** Hard upper bound on total execution attempts (primary + fallbacks). */
export const MAX_ORCHESTRATOR_ATTEMPTS = 5;

// ─────────────────────────────────────────────────────
// EXECUTION ATTEMPT
// ─────────────────────────────────────────────────────

/**
 * Record of a single provider execution attempt.
 *
 * Captures everything that happened during one provider call — whether
 * it succeeded or failed, how long it took, and what usage was reported.
 * Credentials and authorization headers are never included.
 */
export interface ExecutionAttempt {
  /** 1-based attempt number */
  attemptNumber: number;

  /** Provider ID that was attempted */
  providerId: string;

  /** Internal model ID that was attempted */
  modelId: string;

  /** Provider's native model identifier */
  modelIdentifier: string;

  /** ISO timestamp when this attempt started */
  startedAt: string;

  /** ISO timestamp when this attempt completed */
  completedAt: string;

  /** Wall-clock duration in milliseconds */
  latencyMs: number;

  /** Whether this attempt succeeded */
  success: boolean;

  /** Actual token usage reported by the provider (undefined on failure) */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /**
   * Actual cost for this attempt in USD.
   * Populated only when usage AND model pricing are available.
   * Never fabricated from routing estimates.
   */
  actualCost?: number;

  /** Structured error from this attempt (undefined on success) */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// ─────────────────────────────────────────────────────
// ORCHESTRATOR OPTIONS
// ─────────────────────────────────────────────────────

/**
 * Options passed to the orchestrator per execution.
 */
export interface OrchestratorOptions extends ExecutionOptions {
  /**
   * Maximum total attempts (primary + fallbacks).
   * Defaults to min(plan.fallbacks.length + 1, MAX_ORCHESTRATOR_ATTEMPTS).
   * Capped at MAX_ORCHESTRATOR_ATTEMPTS regardless.
   */
  maxAttempts?: number;

  /**
   * Prisma client for pricing lookup (actualCost calculation).
   * When omitted, actualCost is left undefined on all attempts.
   */
  prisma?: PrismaClient;
}

// ─────────────────────────────────────────────────────
// ORCHESTRATOR RESULT
// ─────────────────────────────────────────────────────

/**
 * Result from the execution orchestrator.
 *
 * Extends ExecutionResult with the full attempt history.
 * The top-level fields reflect the final successful (or last failed)
 * attempt's outcome.
 */
export interface OrchestratorResult extends ExecutionResult {
  /**
   * Ordered history of every provider attempt made.
   * Length equals the total number of attempts (primary + fallbacks used).
   */
  executionAttempts: ExecutionAttempt[];
}

// ─────────────────────────────────────────────────────
// ORCHESTRATOR CLASS
// ─────────────────────────────────────────────────────

/**
 * Execution orchestrator.
 *
 * Takes a validated ExecutionPlan, executes the primary target, and
 * automatically attempts fallback targets when failures are retryable.
 *
 * Provider neutrality: every target is dispatched through the same
 * Dispatcher → Executor → ProviderAdapter path. There is no
 * provider-specific branching inside the orchestrator.
 */
export class ExecutionOrchestrator {
  private readonly registry: ProviderRegistry;

  /**
   * @param registry  Optional provider registry (defaults to the shared
   *                  production registry with all Phase 7 providers)
   */
  constructor(registry?: ProviderRegistry) {
    this.registry = registry ?? createDefaultProviderRegistry();
  }

  /**
   * Execute an ExecutionPlan with automatic fallback.
   *
   * Steps:
   * 1. Validate the plan (Phase 6 contract)
   * 2. Execute primary target
   * 3. On retryable failure, execute fallback[0], fallback[1], … in order
   * 4. Stop on success or first non-retryable failure
   * 5. Return OrchestratorResult with complete attempt history
   *
   * @param plan     ExecutionPlan from the routing engine
   * @param messages Conversation messages to send
   * @param options  Optional execution options (maxAttempts, timeoutMs, prisma)
   */
  async execute(
    plan: ExecutionPlan,
    messages: Array<{ role: string; content: string }>,
    options?: OrchestratorOptions
  ): Promise<OrchestratorResult> {
    const overallStart = Date.now();

    // 1. Validate the execution plan
    if (!plan || !plan.primary) {
      return buildOrchestrationFailure(
        plan,
        {
          code: "INVALID_EXECUTION_PLAN",
          message: "Execution plan has no primary target",
          retryable: false,
        },
        Date.now() - overallStart,
        []
      );
    }

    const validation = validateExecutionPlan(plan);
    if (!validation.valid) {
      return buildOrchestrationFailure(
        plan,
        {
          code: "INVALID_EXECUTION_PLAN",
          message: `Execution plan validation failed: ${validation.errors
            .map((e) => e.message)
            .join("; ")}`,
          retryable: false,
        },
        Date.now() - overallStart,
        []
      );
    }

    if (!messages || messages.length === 0) {
      return buildOrchestrationFailure(
        plan,
        {
          code: "INVALID_REQUEST",
          message: "No messages provided for execution",
          retryable: false,
        },
        Date.now() - overallStart,
        []
      );
    }

    // 2. Build the ordered execution sequence: [primary, ...fallbacks]
    const targets: ExecutionTarget[] = [plan.primary, ...(plan.fallbacks ?? [])];

    // 3. Apply maxAttempts: default = targets.length, cap at MAX_ORCHESTRATOR_ATTEMPTS
    const defaultMax = Math.min(targets.length, MAX_ORCHESTRATOR_ATTEMPTS);
    const maxAttempts = Math.min(
      options?.maxAttempts ?? defaultMax,
      MAX_ORCHESTRATOR_ATTEMPTS
    );

    const attempts: ExecutionAttempt[] = [];
    let lastResult: ExecutionResult | null = null;

    // 4. Execute targets in order
    for (let i = 0; i < maxAttempts && i < targets.length; i++) {
      const target = targets[i];
      const attemptStart = new Date();

      // Build a single-target plan for the dispatcher
      const singleTargetPlan: ExecutionPlan = {
        ...plan,
        primary: target,
        fallbacks: [],
      };

      const dispatcher = new Dispatcher(
        this.registry.asAdapterRegistry(),
        { timeoutMs: options?.timeoutMs }
      );

      const result = await dispatcher.executePlan(
        singleTargetPlan,
        messages,
        { timeoutMs: options?.timeoutMs }
      );

      const attemptEnd = new Date();
      const latencyMs = result.latencyMs ?? (attemptEnd.getTime() - attemptStart.getTime());

      // Calculate actual cost from usage + pricing if prisma is available
      const actualCost =
        result.success && result.usage && options?.prisma
          ? await computeActualCost(options.prisma, target.modelId, result.usage)
          : undefined;

      const attempt: ExecutionAttempt = {
        attemptNumber: i + 1,
        providerId: target.providerId,
        modelId: target.modelId,
        modelIdentifier: target.modelIdentifier,
        startedAt: attemptStart.toISOString(),
        completedAt: attemptEnd.toISOString(),
        latencyMs,
        success: result.success,
        usage: result.usage,
        actualCost,
        error: result.error
          ? {
              code: result.error.code,
              message: sanitizeErrorMessage(result.error.message),
              retryable: result.error.retryable,
            }
          : undefined,
      };

      attempts.push(attempt);
      lastResult = result;

      // 5a. Success — stop immediately
      if (result.success) {
        return buildOrchestrationSuccess(
          result,
          target,
          attempts,
          i > 0, // fallbackUsed
          actualCost
        );
      }

      // 5b. Non-retryable failure — stop immediately (no fallback).
      //
      // Exception: MODEL_UNAVAILABLE is specific to ONE target — the
      // provider retired or restricted that exact model (e.g. a model
      // still present in the listing API but closed to new users). The
      // next fallback target is a DIFFERENT model (usually a different
      // provider), so it may still serve the request.
      if (
        !result.error?.retryable &&
        result.error?.code !== "MODEL_UNAVAILABLE"
      ) {
        break;
      }

      // 5c. Retryable failure — continue to next target
    }

    // 6. All attempts exhausted (or stopped at non-retryable failure)
    const totalLatencyMs = Date.now() - overallStart;
    const lastError = lastResult?.error ?? {
      code: "UNKNOWN" as const,
      message: "Execution failed with no error details",
      retryable: false,
    };

    return {
      success: false,
      providerId: attempts.at(-1)?.providerId ?? plan.primary.providerId,
      modelId: attempts.at(-1)?.modelId ?? plan.primary.modelId,
      error: {
        code: lastError.code,
        message: sanitizeErrorMessage(lastError.message),
        retryable: lastError.retryable,
      },
      latencyMs: totalLatencyMs,
      attempts: attempts.length,
      fallback:
        attempts.length > 1
          ? {
              used: true,
              attempts: attempts.length,
              primaryFailed: true,
              fallbackModelId: attempts.at(-1)?.modelId,
              fallbackProviderId: attempts.at(-1)?.providerId,
              reason: sanitizeErrorMessage(
                attempts[0]?.error?.message ?? "Primary execution failed"
              ),
            }
          : undefined,
      timestamp: new Date().toISOString(),
      executionAttempts: attempts,
    };
  }

  /** The provider registry this orchestrator resolves providers from. */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }
}

// ─────────────────────────────────────────────────────
// CONVENIENCE FUNCTION
// ─────────────────────────────────────────────────────

/**
 * Execute an ExecutionPlan with automatic fallback.
 *
 * Convenience wrapper around ExecutionOrchestrator for simple use cases.
 *
 * @param plan     ExecutionPlan from the routing engine
 * @param messages Conversation messages
 * @param options  Optional execution options
 * @param registry Optional provider registry (defaults to the production registry)
 */
export async function orchestrateExecution(
  plan: ExecutionPlan,
  messages: Array<{ role: string; content: string }>,
  options?: OrchestratorOptions,
  registry?: ProviderRegistry
): Promise<OrchestratorResult> {
  const orchestrator = new ExecutionOrchestrator(registry);
  return orchestrator.execute(plan, messages, options);
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Build a successful OrchestratorResult from the winning attempt.
 */
function buildOrchestrationSuccess(
  result: ExecutionResult,
  winningTarget: ExecutionTarget,
  attempts: ExecutionAttempt[],
  fallbackUsed: boolean,
  actualCost: number | undefined
): OrchestratorResult {
  return {
    success: true,
    providerId: winningTarget.providerId,
    modelId: winningTarget.modelId,
    providerRequestId: result.providerRequestId,
    content: result.content,
    usage: result.usage,
    latencyMs: result.latencyMs,
    actualCost,
    attempts: attempts.length,
    fallback: fallbackUsed
      ? {
          used: true,
          attempts: attempts.length,
          primaryFailed: true,
          fallbackModelId: winningTarget.modelId,
          fallbackProviderId: winningTarget.providerId,
          reason: sanitizeErrorMessage(
            attempts[0]?.error?.message ?? "Primary execution failed"
          ),
        }
      : undefined,
    timestamp: result.timestamp,
    executionAttempts: attempts,
  };
}

/**
 * Build a failure OrchestratorResult for pre-execution errors
 * (plan validation, missing messages, etc.).
 */
function buildOrchestrationFailure(
  plan: ExecutionPlan | null | undefined,
  error: { code: string; message: string; retryable: boolean },
  latencyMs: number,
  attempts: ExecutionAttempt[]
): OrchestratorResult {
  return {
    success: false,
    providerId: plan?.primary?.providerId,
    modelId: plan?.primary?.modelId,
    error: {
      code: error.code,
      message: sanitizeErrorMessage(error.message),
      retryable: error.retryable,
    },
    latencyMs,
    attempts: 0,
    timestamp: new Date().toISOString(),
    executionAttempts: attempts,
  };
}

/**
 * Compute actual cost from token usage and model pricing.
 *
 * Uses the Phase 5 pricing data stored on the Model record:
 *   actualCost = (inputTokens / 1000 × inputPricePer1k)
 *              + (outputTokens / 1000 × outputPricePer1k)
 *
 * Returns undefined if the model cannot be found or an error occurs.
 * Never fabricates cost from routing estimates.
 *
 * @param prisma  Prisma client for database access
 * @param modelId Internal database model ID
 * @param usage   Actual token usage from the provider response
 */
export async function computeActualCost(
  prisma: PrismaClient,
  modelId: string,
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
): Promise<number | undefined> {
  try {
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: {
        inputPricePer1k: true,
        outputPricePer1k: true,
      },
    });

    if (!model) return undefined;

    const inputPrice = Number(model.inputPricePer1k);
    const outputPrice = Number(model.outputPricePer1k);

    if (isNaN(inputPrice) || isNaN(outputPrice)) return undefined;

    const cost =
      (usage.inputTokens / 1000) * inputPrice +
      (usage.outputTokens / 1000) * outputPrice;

    // Round to 8 decimal places (consistent with Prisma Decimal(12,8))
    return Math.round(cost * 1e8) / 1e8;
  } catch {
    // Pricing lookup failure must not break execution
    return undefined;
  }
}

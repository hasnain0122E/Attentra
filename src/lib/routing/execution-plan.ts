/**
 * Attentra — Execution Boundary
 *
 * Phase 6 / Step 4 — Production Routing Execution Boundary
 *
 * Defines the provider-neutral execution contract between the routing
 * engine (Phase 6) and provider execution (Phase 7).
 *
 * This module:
 * - Builds a structured ExecutionPlan from a RoutingDecision
 * - Validates execution plans before provider dispatch
 * - Defines the ExecutionResult contract for Phase 7
 * - Formalizes fallback ordering for sequential provider attempts
 *
 * Architecture:
 *   REQUEST
 *     ↓
 *   ANALYSIS (analyzer.ts)
 *     ↓
 *   COMPLEXITY (complexity.ts)
 *     ↓
 *   TOKEN ESTIMATION (token-estimator.ts)
 *     ↓
 *   CANDIDATE FILTERING (candidates.ts)
 *     ↓
 *   SCORING (scorer.ts)
 *     ↓
 *   FALLBACK ORDERING (fallback.ts)
 *     ↓
 *   ROUTING DECISION (router.ts)
 *     ↓
 *   PERSISTENCE (persistence.ts)
 *     ↓
 *   EXECUTION PLAN (this file)
 *     ↓
 *   [PHASE 7 — PROVIDER EXECUTION: NOT IMPLEMENTED]
 *
 * Provider-Neutrality:
 *   This module MUST NOT:
 *   - Import provider SDKs (openai, @anthropic-ai/sdk, @google/generative-ai)
 *   - Contain hardcoded provider names or identifiers
 *   - Contain hardcoded prices or model selection logic
 *   - Make network calls to provider APIs
 *   - Construct provider-specific request payloads
 */

import type {
  RoutingDecision,
  RoutingResult,
  ModelScore,
  RoutingTaskType,
  ComplexityLevel,
} from "./types";

// ─────────────────────────────────────────────────────
// EXECUTION STATUS
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral execution states.
 *
 * READY:
 *   Execution plan is validated and ready for provider dispatch.
 *   Phase 7 will transition this to a running/completed state.
 *
 * NOT_EXECUTED:
 *   Execution plan was created but provider execution has NOT occurred.
 *   This is the default state when prepareExecutionFlow() produces a plan.
 *   The system explicitly distinguishes "routing decided" from "provider executed".
 *
 * FAILED:
 *   Execution plan creation or validation failed.
 *   Contains structured validation errors describing what went wrong.
 *
 * Additional states (RUNNING, COMPLETED, RETRYING, etc.) will be
 * introduced in Phase 7 when provider execution is implemented.
 */
export type ExecutionStatus = "READY" | "NOT_EXECUTED" | "FAILED";

// ─────────────────────────────────────────────────────
// EXECUTION TARGET (single provider/model entry)
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral description of a single execution target.
 * Contains everything Phase 7 needs to dispatch a request
 * to a specific provider/model — without provider-specific details.
 */
export interface ExecutionTarget {
  /** Unique entry identifier within the execution plan */
  entryId: string;

  /** Internal database model ID */
  modelId: string;

  /** Provider ID (e.g., database provider identifier) */
  providerId: string;

  /** Provider display name */
  providerName: string;

  /** Provider's native model identifier */
  modelIdentifier: string;

  /** Human-readable display name */
  displayName: string;

  /** Projected cost for this target (USD, from routing scoring) */
  projectedCost: number;

  /** Routing score that ranked this candidate (0.0–1.0) */
  routingScore: number;
}

// ─────────────────────────────────────────────────────
// EXECUTION PLAN
// ─────────────────────────────────────────────────────

/**
 * Structured internal execution plan derived from a RoutingDecision.
 *
 * This is the immutable contract between the routing engine and
 * the future provider execution layer. It captures:
 *
 * - The selected (primary) model for execution
 * - Ordered fallback targets for sequential retry
 * - Projected cost from the routing scoring layer (not recalculated)
 * - Full routing explanation for auditing
 * - Token estimates for provider context-window validation
 *
 * IMPORTANT: Creating an ExecutionPlan does NOT execute any provider
 * request. The status is explicitly NOT_EXECUTED until Phase 7
 * provider execution occurs.
 */
export interface ExecutionPlan {
  /** Request ID from routing metadata (if available) */
  requestId?: string;

  /** Routing decision database ID (if persisted) */
  routingDecisionId?: string;

  /** Task type classified by the routing analyzer */
  taskType: RoutingTaskType;

  /** Complexity classification */
  complexity: ComplexityLevel;

  /** Primary execution target (selected model) */
  primary: ExecutionTarget;

  /**
   * Ordered fallback targets for sequential retry.
   *
   * Ordering is inherited directly from the routing decision's fallback
   * array, which applies provider-diverse round-robin ordering via
   * fallback.ts. No re-sorting occurs here.
   *
   * Phase 7 should attempt fallbacks in order when the primary fails.
   */
  fallbacks: ExecutionTarget[];

  /** Estimated input tokens (from routing token estimator) */
  estimatedInputTokens: number;

  /** Estimated output tokens (from routing token estimator) */
  estimatedOutputTokens: number;

  /** Projected cost in USD (from routing scoring — NOT recalculated) */
  projectedCost: number;

  /** Selected model's routing score (0.0–1.0) */
  routingScore: number;

  /** Human-readable routing explanation */
  routingExplanation: string;

  /** Current execution status */
  status: ExecutionStatus;

  /** Timestamp when the execution plan was generated */
  createdAt: Date;
}

// ─────────────────────────────────────────────────────
// EXECUTION RESULT (Phase 7 contract)
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral execution result contract.
 *
 * This defines the shape that Phase 7 provider execution will fill
 * after dispatching a request to an AI provider. It is designed to
 * accommodate any provider's response format through normalized fields.
 *
 * Phase 7 will populate this after actual provider execution.
 * In Phase 6, this type serves as the contract definition only.
 */
export interface ExecutionResult {
  /** Whether provider execution succeeded */
  success: boolean;

  /** Provider ID that handled the request */
  providerId?: string;

  /** Model ID that handled the request */
  modelId?: string;

  /** Provider's native request/completion ID (for correlation) */
  providerRequestId?: string;

  /** Response content from the provider (text, JSON, etc.) */
  content?: string;

  /** Actual token usage reported by the provider */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /** Wall-clock latency in milliseconds */
  latencyMs?: number;

  /** Actual cost in USD (from provider billing, not projected) */
  actualCost?: number;

  /** Total number of execution attempts (primary + any fallbacks attempted) */
  attempts?: number;

  /** Error details when execution failed */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };

  /** Fallback information when primary failed and fallback was used */
  fallback?: {
    used: boolean;
    attempts: number;
    primaryFailed: boolean;
    fallbackModelId?: string;
    fallbackProviderId?: string;
    reason?: string;
  };

  /** ISO timestamp of when execution completed */
  timestamp: string;
}

// ─────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────

/**
 * Structured validation error from execution plan validation.
 */
export interface ExecutionValidationError {
  /** Field that failed validation */
  field: string;

  /** Human-readable error message */
  message: string;

  /** Machine-readable error code */
  code:
    | "MISSING_FIELD"
    | "INVALID_COST"
    | "INVALID_SCORE"
    | "INVALID_DATE"
    | "DUPLICATE_FALLBACK";
}

/**
 * Result of validating an execution plan.
 */
export interface ExecutionPlanValidation {
  /** Whether the plan passed all validation checks */
  valid: boolean;

  /** Structured validation errors (empty when valid) */
  errors: ExecutionValidationError[];
}

// ─────────────────────────────────────────────────────
// BUILD EXECUTION PLAN
// ─────────────────────────────────────────────────────

/**
 * Build an ExecutionPlan from a RoutingDecision.
 *
 * Extracts the selected model, fallback ordering, projected cost,
 * and routing explanation into a structured plan that Phase 7
 * provider execution can consume directly.
 *
 * Projected cost originates from the routing scoring layer — this
 * function never recalculates or duplicates pricing logic.
 *
 * @param decision   The routing decision to convert into an execution plan
 * @param requestId  Optional request ID (from routing metadata)
 * @param decisionId Optional persisted routing decision database ID
 * @returns          Structured execution plan
 * @throws           Error if the decision has no selected model
 */
export function buildExecutionPlan(
  decision: RoutingDecision,
  requestId?: string,
  decisionId?: string
): ExecutionPlan {
  if (!decision || !decision.selected) {
    throw new Error(
      "Cannot build execution plan: routing decision has no selected model"
    );
  }

  const primary = buildTarget(decision.selected, "primary");
  const fallbacks = (decision.fallbacks ?? []).map((f, i) =>
    buildTarget(f, `fallback-${i + 1}`)
  );

  return {
    requestId,
    routingDecisionId: decisionId,
    taskType: decision.taskType,
    complexity: decision.complexity.complexity,
    primary,
    fallbacks,
    estimatedInputTokens: decision.tokenEstimate.inputTokens,
    estimatedOutputTokens: decision.tokenEstimate.outputTokens,
    projectedCost: decision.selected.factors.projectedCost,
    routingScore: decision.selected.score,
    routingExplanation: decision.reason,
    status: "NOT_EXECUTED",
    createdAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────
// VALIDATE EXECUTION PLAN
// ─────────────────────────────────────────────────────

/**
 * Validate an execution plan for completeness and correctness.
 *
 * Checks that all required fields are present and valid:
 * - Primary model information (modelId, providerId, displayName)
 * - Projected cost is a valid non-negative number
 * - Routing score is between 0 and 1
 * - Fallback entries have required fields and no duplicate modelIds
 * - Timestamps are valid dates
 * - Task type and complexity are present
 *
 * @param plan  The execution plan to validate
 * @returns     Structured validation result
 */
export function validateExecutionPlan(plan: ExecutionPlan): ExecutionPlanValidation {
  const errors: ExecutionValidationError[] = [];

  // ── Primary model ──
  if (!plan.primary) {
    errors.push({
      field: "primary",
      message: "No primary execution target defined",
      code: "MISSING_FIELD",
    });
  } else {
    if (!plan.primary.modelId) {
      errors.push({
        field: "primary.modelId",
        message: "Primary model ID is missing",
        code: "MISSING_FIELD",
      });
    }
    if (!plan.primary.providerId) {
      errors.push({
        field: "primary.providerId",
        message: "Primary provider ID is missing",
        code: "MISSING_FIELD",
      });
    }
    if (!plan.primary.displayName) {
      errors.push({
        field: "primary.displayName",
        message: "Primary display name is missing",
        code: "MISSING_FIELD",
      });
    }
    if (isInvalidNumber(plan.primary.projectedCost)) {
      errors.push({
        field: "primary.projectedCost",
        message: "Primary projected cost is not a valid number",
        code: "INVALID_COST",
      });
    } else if (plan.primary.projectedCost < 0) {
      errors.push({
        field: "primary.projectedCost",
        message: "Primary projected cost is negative",
        code: "INVALID_COST",
      });
    }
    if (isInvalidNumber(plan.primary.routingScore)) {
      errors.push({
        field: "primary.routingScore",
        message: "Primary routing score is not a valid number",
        code: "INVALID_SCORE",
      });
    } else if (plan.primary.routingScore < 0 || plan.primary.routingScore > 1) {
      errors.push({
        field: "primary.routingScore",
        message: "Primary routing score must be between 0 and 1",
        code: "INVALID_SCORE",
      });
    }
  }

  // ── Projected cost ──
  if (isInvalidNumber(plan.projectedCost)) {
    errors.push({
      field: "projectedCost",
      message: "Projected cost is not a valid number",
      code: "INVALID_COST",
    });
  } else if (plan.projectedCost < 0) {
    errors.push({
      field: "projectedCost",
      message: "Projected cost is negative",
      code: "INVALID_COST",
    });
  }

  // ── Routing score ──
  if (isInvalidNumber(plan.routingScore)) {
    errors.push({
      field: "routingScore",
      message: "Routing score is not a valid number",
      code: "INVALID_SCORE",
    });
  } else if (plan.routingScore < 0 || plan.routingScore > 1) {
    errors.push({
      field: "routingScore",
      message: "Routing score must be between 0 and 1",
      code: "INVALID_SCORE",
    });
  }

  // ── Fallbacks ──
  if (!Array.isArray(plan.fallbacks)) {
    errors.push({
      field: "fallbacks",
      message: "Fallbacks must be an array",
      code: "MISSING_FIELD",
    });
  } else {
    const seenModelIds = new Set<string>();
    if (plan.primary?.modelId) {
      seenModelIds.add(plan.primary.modelId);
    }

    for (let i = 0; i < plan.fallbacks.length; i++) {
      const fb = plan.fallbacks[i];
      const prefix = `fallbacks[${i}]`;

      if (!fb.entryId) {
        errors.push({
          field: `${prefix}.entryId`,
          message: "Fallback entry ID is missing",
          code: "MISSING_FIELD",
        });
      }
      if (!fb.modelId) {
        errors.push({
          field: `${prefix}.modelId`,
          message: "Fallback model ID is missing",
          code: "MISSING_FIELD",
        });
      }
      if (!fb.providerId) {
        errors.push({
          field: `${prefix}.providerId`,
          message: "Fallback provider ID is missing",
          code: "MISSING_FIELD",
        });
      }
      if (!fb.displayName) {
        errors.push({
          field: `${prefix}.displayName`,
          message: "Fallback display name is missing",
          code: "MISSING_FIELD",
        });
      }
      if (isInvalidNumber(fb.projectedCost)) {
        errors.push({
          field: `${prefix}.projectedCost`,
          message: "Fallback projected cost is not a valid number",
          code: "INVALID_COST",
        });
      } else if (fb.projectedCost < 0) {
        errors.push({
          field: `${prefix}.projectedCost`,
          message: "Fallback projected cost is negative",
          code: "INVALID_COST",
        });
      }

      // Duplicate model check (including primary)
      if (fb.modelId && seenModelIds.has(fb.modelId)) {
        errors.push({
          field: `${prefix}.modelId`,
          message: `Duplicate model ID "${fb.modelId}" in execution plan`,
          code: "DUPLICATE_FALLBACK",
        });
      }
      if (fb.modelId) {
        seenModelIds.add(fb.modelId);
      }
    }
  }

  // ── Routing metadata ──
  if (isInvalidNumber(plan.routingScore)) {
    // Already reported above — no duplicate
  }
  if (!plan.complexity) {
    errors.push({
      field: "complexity",
      message: "Complexity is missing",
      code: "MISSING_FIELD",
    });
  }
  if (!plan.taskType) {
    errors.push({
      field: "taskType",
      message: "Task type is missing",
      code: "MISSING_FIELD",
    });
  }
  if (!(plan.createdAt instanceof Date) || isNaN(plan.createdAt.getTime())) {
    errors.push({
      field: "createdAt",
      message: "Created timestamp is not a valid date",
      code: "INVALID_DATE",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─────────────────────────────────────────────────────
// PREPARE EXECUTION FLOW
// ─────────────────────────────────────────────────────

/**
 * Main execution boundary entry point for Phase 7 integration.
 *
 * Takes a RoutingResult and produces a validated execution flow:
 *
 * 1. If routing failed → returns FAILED status immediately
 * 2. Builds an ExecutionPlan from the RoutingDecision
 * 3. Validates the plan
 * 4. If valid → returns plan with NOT_EXECUTED status (ready for Phase 7)
 * 5. If invalid → returns FAILED status with validation errors
 *
 * This function does NOT call any provider API. It only prepares
 * and validates the execution contract.
 *
 * @param result     Routing result from route(), routeWithDatabase(), or routeAndPersist()
 * @param requestId  Optional request ID override
 * @param decisionId Optional persisted decision ID override
 * @returns          Execution flow result with plan and validation
 */
export function prepareExecutionFlow(
  result: RoutingResult,
  requestId?: string,
  decisionId?: string
): {
  status: ExecutionStatus;
  plan?: ExecutionPlan;
  validation: ExecutionPlanValidation;
  error?: string;
} {
  // 1. Check routing success
  if (!result.success || !result.decision) {
    return {
      status: "FAILED",
      validation: {
        valid: false,
        errors: [
          {
            field: "routingResult",
            message: result.error ?? "Routing did not produce a valid decision",
            code: "MISSING_FIELD",
          },
        ],
      },
      error: result.error ?? "Routing failed",
    };
  }

  // 2. Build execution plan using explicit parameters
  // requestId and decisionId come from the caller or from persistence result
  const rid = requestId;
  const did = decisionId ?? result.persisted?.decisionId;

  // 3. Build execution plan
  let plan: ExecutionPlan;
  try {
    plan = buildExecutionPlan(result.decision, rid, did);
  } catch (error) {
    return {
      status: "FAILED",
      validation: {
        valid: false,
        errors: [
          {
            field: "executionPlan",
            message: error instanceof Error ? error.message : "Failed to build execution plan",
            code: "MISSING_FIELD",
          },
        ],
      },
      error: error instanceof Error ? error.message : "Failed to build execution plan",
    };
  }

  // 4. Validate the plan
  const validation = validateExecutionPlan(plan);

  if (!validation.valid) {
    return {
      status: "FAILED",
      plan,
      validation,
      error: `Execution plan validation failed: ${validation.errors.map((e) => e.message).join("; ")}`,
    };
  }

  // 5. Plan is valid — status is NOT_EXECUTED (Phase 7 will execute)
  return {
    status: "NOT_EXECUTED",
    plan,
    validation,
  };
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Convert a ModelScore into an ExecutionTarget.
 */
function buildTarget(score: ModelScore, entryId: string): ExecutionTarget {
  const c = score.candidate;
  return {
    entryId,
    modelId: c.modelId,
    providerId: c.providerId,
    providerName: c.providerName ?? c.providerId,
    modelIdentifier: c.modelIdentifier,
    displayName: c.displayName,
    projectedCost: score.factors.projectedCost,
    routingScore: score.score,
  };
}

/**
 * Check if a value is NaN or not a finite number.
 */
function isInvalidNumber(value: number): boolean {
  return typeof value !== "number" || isNaN(value) || !isFinite(value);
}

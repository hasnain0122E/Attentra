/**
 * Attentra — Routing Engine
 *
 * Phase 6 / Step 3 — Production Routing Validation + Decision Persistence
 *
 * The main router orchestrates the complete routing pipeline:
 *
 *   Normalized Request
 *     → Request Analyzer (task type, complexity, token estimate)
 *     → Candidate Loading (database or injected)
 *     → Candidate Filtering (capability + context + pricing)
 *     → Model Scoring (policy-weighted with projected cost)
 *     → Best Candidate Selection
 *     → Provider-Diverse Fallback Ordering
 *     → Explanation Generation
 *     → Routing Decision
 *     → Optional Persistence
 *
 * Architecture:
 *   route(request, options)              — Pure routing (candidates injected)
 *   routeWithDatabase(request, options)   — Database-backed routing
 *   routeAndPersist(request, options)     — Database-backed routing + persistence
 *
 * The router MUST be deterministic for identical inputs and identical
 * model/pricing state. This enables reproducible routing audits.
 *
 * The router MUST NOT:
 * - Import provider SDKs (openai, @anthropic-ai/sdk, @google/generative-ai)
 * - Contain hardcoded prices or latency values
 * - Duplicate model/pricing data from the database
 * - Silently fall back to a hardcoded model on failure
 */

import type {
  RoutingRequest,
  RoutingDecision,
  RoutingResult,
  RoutingPolicy,
  RoutingErrorCode,
  ModelCandidate,
  RejectedCandidate,
} from "./types";
import { analyzeRequest } from "./analyzer";
import { filterCandidates } from "./candidates";
import { scoreCandidates } from "./scorer";
import { orderFallbacks } from "./fallback";
import { explainDecision } from "./explanations";
import { resolvePolicy } from "./policies";
import { loadRoutingCandidates } from "./database";
import { persistRoutingDecision } from "./persistence";

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

/**
 * Options for the pure routing engine.
 */
export interface RouterOptions {
  /** Routing policy name or custom policy object */
  policy?: string | RoutingPolicy;

  /** Pre-loaded model candidates (for pure routing) */
  models: ModelCandidate[];
}

/**
 * Options for the database-backed routing engine.
 */
export interface DatabaseRouterOptions {
  /** Routing policy name or custom policy object */
  policy?: string | RoutingPolicy;
}

/**
 * Options for database-backed routing with persistence.
 */
export interface RouteAndPersistOptions {
  /** Routing policy name or custom policy object */
  policy?: string | RoutingPolicy;
}

// ─────────────────────────────────────────────────────
// PURE ROUTING PIPELINE
// ─────────────────────────────────────────────────────

/**
 * Core routing pipeline — shared between pure and database-backed routing.
 *
 * Takes pre-loaded candidates and runs the full routing pipeline:
 * analyze → filter → score → select → fallback → explain
 *
 * @param request    The routing request
 * @param models     Pre-loaded model candidates
 * @param policyOpt  Policy name or object (optional)
 * @returns          Routing result with decision or structured error
 */
function executeRoutingPipeline(
  request: RoutingRequest,
  models: ModelCandidate[],
  policyOpt?: string | RoutingPolicy
): RoutingResult {
  // 1. Analyze the request
  const analysis = analyzeRequest(
    request.messages,
    request.taskTypeHint,
    request.maxTokens
  );

  // 2. Resolve routing policy
  const policy: RoutingPolicy =
    typeof policyOpt === "string"
      ? resolvePolicy(policyOpt)
      : policyOpt ?? resolvePolicy("balanced");

  // 3. Determine if pricing is required (cost weight > 0.3 means cost matters significantly)
  const requirePricing = policy.costWeight > 0.3;

  // 4. Filter candidates with rejection tracking
  const { eligible, rejected } = filterCandidates(models, {
    taskType: analysis.taskType,
    estimatedTotalTokens: analysis.tokenEstimate.totalTokens,
    requirePricing,
  });

  // 5. Handle no eligible candidates
  if (eligible.length === 0) {
    const errorCode = classifyRoutingFailure(models, rejected);
    return {
      success: false,
      error: buildFailureMessage(errorCode, analysis.taskType, rejected),
      errorCode,
      rejected,
    };
  }

  // 6. Score eligible candidates (complexity-aware weighting)
  const scored = scoreCandidates(
    eligible,
    policy,
    analysis.taskType,
    analysis.tokenEstimate,
    analysis.complexity.complexity
  );

  // 7. Select best candidate
  const selected = scored[0];

  // 8. Provider-diverse fallback ordering
  const fallbacks = orderFallbacks(scored, selected);

  // 9. Build routing decision
  const decision: RoutingDecision = {
    taskType: analysis.taskType,
    complexity: analysis.complexity,
    tokenEstimate: analysis.tokenEstimate,
    candidates: scored,
    selected,
    fallbacks,
    rejected,
    reason: "",
    timestamp: new Date(),
  };

  // 10. Generate human-readable explanation
  decision.reason = explainDecision(decision);

  return {
    success: true,
    decision,
    rejected,
  };
}

// ─────────────────────────────────────────────────────
// PUBLIC ROUTING FUNCTIONS
// ─────────────────────────────────────────────────────

/**
 * Execute the routing pipeline with pre-loaded candidates.
 *
 * Use this for testing or when candidates come from a non-database source.
 *
 * @param request  The routing request
 * @param options  Router options with pre-loaded models
 * @returns        Routing result
 */
export function route(
  request: RoutingRequest,
  options: RouterOptions
): RoutingResult {
  try {
    return executeRoutingPipeline(request, options.models, options.policy);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown routing error",
      errorCode: "DATABASE_ERROR",
    };
  }
}

/**
 * Execute the routing pipeline with database-backed candidate loading.
 *
 * Loads active models and current pricing from PostgreSQL, then runs
 * the full routing pipeline. This is the production entry point.
 *
 * @param request  The routing request
 * @param options  Database router options (policy only)
 * @returns        Routing result with decision or structured error
 */
export async function routeWithDatabase(
  request: RoutingRequest,
  options?: DatabaseRouterOptions
): Promise<RoutingResult> {
  try {
    // 1. Load candidates from database
    const loadResult = await loadRoutingCandidates();

    if (loadResult.error) {
      return {
        success: false,
        error: `Database error: ${loadResult.error}`,
        errorCode: "DATABASE_ERROR",
      };
    }

    if (loadResult.candidates.length === 0) {
      return {
        success: false,
        error: "No active models with current pricing available in database",
        errorCode: "NO_ACTIVE_MODELS",
      };
    }

    // 2. Run pure routing pipeline
    return executeRoutingPipeline(
      request,
      loadResult.candidates,
      options?.policy
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown routing error",
      errorCode: "DATABASE_ERROR",
    };
  }
}

/**
 * Execute the routing pipeline with database-backed candidate loading
 * and optional persistence.
 *
 * Full flow:
 * 1. Load candidates from PostgreSQL
 * 2. Run the full routing pipeline
 * 3. Persist RoutingDecision when requestId is provided in metadata
 * 4. Return routing result with persistence info
 *
 * Persistence is optional — if no requestId is in metadata, routing
 * proceeds normally without persistence.
 *
 * @param request  The routing request (metadata.requestId enables persistence)
 * @param options  Routing options (policy only)
 * @returns        Routing result with optional persistence info
 */
export async function routeAndPersist(
  request: RoutingRequest,
  options?: RouteAndPersistOptions
): Promise<RoutingResult> {
  // 1. Run database-backed routing
  const result = await routeWithDatabase(request, options);

  if (!result.success || !result.decision) {
    return result;
  }

  // 2. Persist if requestId is provided
  const requestId = request.metadata?.requestId as string | undefined;
  if (requestId) {
    const persistResult = await persistRoutingDecision(requestId, result.decision);
    if (persistResult.success) {
      return {
        ...result,
        persisted: { success: true, decisionId: persistResult.decisionId },
      };
    }
    return {
      ...result,
      persistenceError: persistResult.error,
    };
  }

  return result;
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Classify why routing failed based on rejected candidates.
 */
function classifyRoutingFailure(
  allModels: ModelCandidate[],
  rejected: RejectedCandidate[]
): RoutingErrorCode {
  if (allModels.length === 0) return "NO_ACTIVE_MODELS";

  // Count rejection reasons
  const reasonCounts = new Map<string, number>();
  for (const r of rejected) {
    reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);
  }

  // If ALL candidates were rejected for context limits
  if (reasonCounts.get("REJECTED_CONTEXT_LIMIT") === rejected.length && rejected.length > 0) {
    return "ALL_EXCEED_CONTEXT";
  }

  // If ALL candidates were rejected for missing pricing
  if (reasonCounts.get("MISSING_PRICING") === rejected.length && rejected.length > 0) {
    return "NO_PRICING_AVAILABLE";
  }

  // Default: no compatible models (capability mismatch is most common)
  return "NO_COMPATIBLE_MODELS";
}

/**
 * Build a descriptive failure message from the error code.
 */
function buildFailureMessage(
  code: RoutingErrorCode,
  taskType: string,
  rejected: RejectedCandidate[]
): string {
  switch (code) {
    case "NO_ACTIVE_MODELS":
      return "No active models available in the database";
    case "ALL_EXCEED_CONTEXT":
      return `All ${rejected.length} candidate(s) exceed the estimated context window`;
    case "NO_PRICING_AVAILABLE":
      return "No candidates have current pricing data available";
    case "NO_COMPATIBLE_MODELS":
      return `No models support the "${taskType}" task type with sufficient context capacity`;
    case "DATABASE_ERROR":
      return "Failed to load routing candidates from database";
    case "INVALID_POLICY":
      return "Invalid routing policy specified";
    default:
      return `Routing failed: ${code}`;
  }
}

/**
 * Attentra — Routing Engine Public API
 *
 * Architecture.md v2.0 §8 — Routing Engine
 * Phase 6 / Step 2 — Database-Backed Routing
 *
 * Barrel export for the routing module. Other application modules
 * consume routing through these exports only.
 *
 * Usage:
 *   // Pure routing (candidates injected)
 *   import { route, type RoutingRequest } from "@/lib/routing";
 *
 *   // Database-backed routing (production)
 *   import { routeWithDatabase } from "@/lib/routing";
 */

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

export type {
  RoutingTaskType,
  ComplexityLevel,
  ComplexityResult,
  TokenEstimate,
  RoutingRequest,
  RoutingPolicy,
  ModelCandidate,
  ModelScore,
  RoutingDecision,
  RoutingResult,
  RejectionReason,
  RejectedCandidate,
  RoutingErrorCode,
  ProjectedCost,
} from "./types";

export { ROUTING_TASK_TYPES, TASK_TYPE_TO_CAPABILITIES } from "./types";

// ─────────────────────────────────────────────────────
// ANALYZER (Step 1)
// ─────────────────────────────────────────────────────

export { analyzeRequest } from "./analyzer";
export type { RequestAnalysis } from "./analyzer";

// ─────────────────────────────────────────────────────
// COMPLEXITY (Step 1)
// ─────────────────────────────────────────────────────

export { classifyComplexity } from "./complexity";

// ─────────────────────────────────────────────────────
// TOKEN ESTIMATOR (Step 1)
// ─────────────────────────────────────────────────────

export { estimateTokens, estimateTokenCount } from "./token-estimator";

// ─────────────────────────────────────────────────────
// CANDIDATE FILTERING (Step 2)
// ─────────────────────────────────────────────────────

export { filterCandidates, selectCandidates } from "./candidates";
export type { CandidateFilterOptions, CandidateFilterResult } from "./candidates";

// ─────────────────────────────────────────────────────
// POLICIES (Step 1)
// ─────────────────────────────────────────────────────

export { resolvePolicy, listPolicyNames, ROUTING_POLICIES } from "./policies";

// ─────────────────────────────────────────────────────
// SCORER (Step 2)
// ─────────────────────────────────────────────────────

export { scoreCandidates, calculateProjectedCost } from "./scorer";

// ─────────────────────────────────────────────────────
// FALLBACK (Step 2)
// ─────────────────────────────────────────────────────

export { orderFallbacks } from "./fallback";

// ─────────────────────────────────────────────────────
// EXPLANATIONS (Step 2)
// ─────────────────────────────────────────────────────

export { explainDecision, formatScore } from "./explanations";

// ─────────────────────────────────────────────────────
// DATABASE (Step 2)
// ─────────────────────────────────────────────────────

export { loadRoutingCandidates } from "./database";
export type { CandidateLoadResult } from "./database";

// ─────────────────────────────────────────────────────
// ROUTER (Step 2)
// ─────────────────────────────────────────────────────

export { route, routeWithDatabase } from "./router";
export type { RouterOptions, DatabaseRouterOptions } from "./router";

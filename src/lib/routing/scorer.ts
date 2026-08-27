/**
 * Attentra — Model Scorer
 *
 * Phase 6 / Step 2 — Database-Backed Routing
 *
 * Scores model candidates based on routing policy weights.
 *
 * Scoring factors:
 * - Cost score:      Lower projected cost → higher score
 * - Latency score:   Lower latency → higher score
 * - Capability score: Better task type match → higher score
 *
 * Normalization strategy:
 *   Min-max normalization across the candidate pool.
 *   - Lowest value → score 1.0 (best)
 *   - Highest value → score 0.0 (worst)
 *   - Single candidate → score 0.5 (neutral)
 *   - All equal values → score 0.5 (neutral)
 *   - Missing/invalid → score 0.0 (worst)
 *
 *   This is deterministic for a fixed candidate pool and produces
 *   meaningful relative comparisons.
 *
 * The scorer is provider-agnostic — it operates only on ModelCandidate data,
 * never on provider SDK types or hardcoded provider values.
 *
 * Projected cost:
 *   (inputTokens / 1000 × inputPricePer1k) + (outputTokens / 1000 × outputPricePer1k)
 */

import type {
  ModelCandidate,
  ModelScore,
  RoutingPolicy,
  RoutingTaskType,
  TokenEstimate,
  ProjectedCost,
} from "./types";
import { TASK_TYPE_TO_CAPABILITIES } from "./types";

// ─────────────────────────────────────────────────────
// PROJECTED COST
// ─────────────────────────────────────────────────────

/**
 * Calculate projected request cost for a candidate.
 *
 * Uses estimated token counts and the candidate's active PricingSnapshot prices.
 * Prices are per 1K tokens, so: (tokens / 1000) × pricePer1k.
 *
 * @param candidate      Model candidate with pricing data
 * @param tokenEstimate  Estimated input/output tokens
 * @returns              Projected cost breakdown in USD
 */
export function calculateProjectedCost(
  candidate: ModelCandidate,
  tokenEstimate: TokenEstimate
): ProjectedCost {
  const inputCost = (tokenEstimate.inputTokens / 1000) * candidate.inputPricePer1k;
  const outputCost = (tokenEstimate.outputTokens / 1000) * candidate.outputPricePer1k;
  const totalCost = inputCost + outputCost;

  return { inputCost, outputCost, totalCost };
}

// ─────────────────────────────────────────────────────
// NORMALIZATION HELPERS
// ─────────────────────────────────────────────────────

/**
 * Min-max normalize a "lower is better" metric to 0–1 score.
 *
 * - Lowest value → 1.0 (best)
 * - Highest value → 0.0 (worst)
 * - Single value or all equal → 0.5 (neutral)
 * - NaN-safe: returns 0.5 if range is zero
 */
function normalizeLowerBetter(value: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0) return 0.5; // All equal or single value
  const normalized = (max - value) / range;
  // Clamp to [0, 1] for safety
  return Math.max(0, Math.min(1, normalized));
}

// ─────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────

/**
 * Score a list of model candidates against a routing policy.
 *
 * @param candidates    Models to score (must be pre-filtered / eligible)
 * @param policy        Weight configuration for scoring
 * @param taskType      Classified task type (for capability matching)
 * @param tokenEstimate Estimated token counts (for cost projection)
 * @returns             Scored candidates sorted by score descending
 */
export function scoreCandidates(
  candidates: ModelCandidate[],
  policy: RoutingPolicy,
  taskType: RoutingTaskType,
  tokenEstimate: TokenEstimate
): ModelScore[] {
  if (candidates.length === 0) return [];

  const requiredCaps = TASK_TYPE_TO_CAPABILITIES[taskType] ?? [];

  // Pre-compute projected costs for all candidates
  const projectedCosts = candidates.map((c) => calculateProjectedCost(c, tokenEstimate));

  // Pre-compute latencies
  const latencies = candidates.map((c) => c.expectedLatencyMs);

  // Find normalization bounds
  const costs = projectedCosts.map((pc) => pc.totalCost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  const validLatencies = latencies.filter((l): l is number => l !== undefined && l > 0);
  const minLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : 0;
  const maxLatency = validLatencies.length > 0 ? Math.max(...validLatencies) : 0;

  // Score each candidate
  const scored: ModelScore[] = candidates.map((candidate, i) => {
    // ── Cost score ──
    const projectedCost = projectedCosts[i];
    const costScore = normalizeLowerBetter(projectedCost.totalCost, minCost, maxCost);

    // ── Latency score ──
    const latency = candidate.expectedLatencyMs;
    let latencyScore: number;
    if (latency === undefined || latency <= 0) {
      latencyScore = 0.0; // Missing latency → worst score
    } else {
      latencyScore = normalizeLowerBetter(latency, minLatency, maxLatency);
    }

    // ── Capability score ──
    let capabilityScore: number;
    if (requiredCaps.length > 0) {
      const matchedCaps = requiredCaps.filter((cap) =>
        candidate.capabilities.includes(cap)
      );
      const matchRatio = matchedCaps.length / requiredCaps.length;
      // Small bonus for broader capability coverage (max +0.2)
      const breadthBonus = Math.min(candidate.capabilities.length * 0.03, 0.2);
      capabilityScore = Math.min(matchRatio + breadthBonus, 1.0);
    } else {
      capabilityScore = 0.5;
    }

    // ── Weighted total ──
    const score =
      costScore * policy.costWeight +
      latencyScore * policy.latencyWeight +
      capabilityScore * policy.capabilityWeight;

    return {
      candidate,
      score: Math.round(score * 10000) / 10000,
      factors: {
        costScore: Math.round(costScore * 10000) / 10000,
        latencyScore: Math.round(latencyScore * 10000) / 10000,
        capabilityScore: Math.round(capabilityScore * 10000) / 10000,
        projectedCost: projectedCost.totalCost,
      },
      explanation:
        `${candidate.displayName}: cost=${costScore.toFixed(2)}` +
        ` ($${projectedCost.totalCost.toFixed(6)}),` +
        ` latency=${latencyScore.toFixed(2)}` +
        ` (${latency ?? "?"}ms),` +
        ` capability=${capabilityScore.toFixed(2)}`,
    };
  });

  // Sort by score descending (deterministic for equal scores: preserve order)
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

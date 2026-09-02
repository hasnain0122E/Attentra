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
  ComplexityLevel,
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
// COMPLEXITY-AWARE WEIGHT ADJUSTMENT
// ─────────────────────────────────────────────────────

/**
 * Adjust policy weights based on request complexity.
 *
 * As complexity rises, capability/quality matters more and cost matters less.
 * This ensures that:
 *   - LOW:  cost/latency can dominate (cheap models preferred)
 *   - MEDIUM: capability gets materially more weight
 *   - HIGH: capability/quality dominates cost
 *
 * The modifiers are multiplicative — they scale the base policy weights
 * and then re-normalize so they sum to the original total.
 */
function adjustWeightsForComplexity(
  policy: RoutingPolicy,
  complexity: ComplexityLevel
): { costWeight: number; latencyWeight: number; capabilityWeight: number } {
  let costMod: number;
  let latencyMod: number;
  let capabilityMod: number;

  switch (complexity) {
    case "LOW":
      // Cost and latency dominate; capability matters less
      costMod = 1.3;
      latencyMod = 1.15;
      capabilityMod = 0.55;
      break;
    case "MEDIUM":
      // Balanced with a slight capability lean
      costMod = 0.9;
      latencyMod = 1.0;
      capabilityMod = 1.3;
      break;
    case "HIGH":
      // Capability dominates; cost is secondary
      costMod = 0.1;
      latencyMod = 0.2;
      capabilityMod = 4.0;
      break;
    default:
      costMod = 1.0;
      latencyMod = 1.0;
      capabilityMod = 1.0;
  }

  const rawCost = policy.costWeight * costMod;
  const rawLatency = policy.latencyWeight * latencyMod;
  const rawCapability = policy.capabilityWeight * capabilityMod;

  // Re-normalize so weights sum to the original total
  const originalSum = policy.costWeight + policy.latencyWeight + policy.capabilityWeight;
  const rawSum = rawCost + rawLatency + rawCapability;

  if (rawSum <= 0) {
    return { costWeight: policy.costWeight, latencyWeight: policy.latencyWeight, capabilityWeight: policy.capabilityWeight };
  }

  const scale = originalSum / rawSum;
  return {
    costWeight: rawCost * scale,
    latencyWeight: rawLatency * scale,
    capabilityWeight: rawCapability * scale,
  };
}

// ─────────────────────────────────────────────────────
// TIER-BASED CAPABILITY BONUS
// ─────────────────────────────────────────────────────

/**
 * Return a bonus added to capability score based on model tier and complexity.
 *
 * Higher-tier models (HEAVY > MID > LIGHT) get a larger bonus as complexity
 * increases. At LOW complexity the bonus is negligible; at HIGH it is
 * significant — giving stronger models a meaningful scoring advantage.
 */
function tierBonus(tier: string | undefined, complexity: ComplexityLevel): number {
  let base: number;
  switch (tier) {
    case "HEAVY":  base = 0.12; break;
    case "MID":    base = 0.06; break;
    case "LIGHT":  base = 0.0;  break;
    default:       base = 0.0;
  }

  switch (complexity) {
    case "LOW":    return base * 0.3;   // negligible
    case "MEDIUM": return base * 0.8;   // moderate
    case "HIGH":   return base * 1.5;   // significant
    default:       return 0.0;
  }
}

// ─────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────

/**
 * Score a list of model candidates against a routing policy.
 *
 * Weights are adjusted by complexity so that:
 *   LOW  → cost/latency dominate
 *   MEDIUM → capability gets materially more weight
 *   HIGH → capability/quality dominates
 *
 * Model tier (LIGHT/MID/HEAVY) adds a complexity-scaled bonus to the
 * capability score, giving stronger models an edge at higher complexity.
 *
 * @param candidates    Models to score (must be pre-filtered / eligible)
 * @param policy        Weight configuration for scoring
 * @param taskType      Classified task type (for capability matching)
 * @param tokenEstimate Estimated token counts (for cost projection)
 * @param complexity    Classified complexity level (default: "MEDIUM")
 * @returns             Scored candidates sorted by score descending
 */
export function scoreCandidates(
  candidates: ModelCandidate[],
  policy: RoutingPolicy,
  taskType: RoutingTaskType,
  tokenEstimate: TokenEstimate,
  complexity: ComplexityLevel = "MEDIUM"
): ModelScore[] {
  if (candidates.length === 0) return [];

  const requiredCaps = TASK_TYPE_TO_CAPABILITIES[taskType] ?? [];

  // Adjust weights for complexity
  const weights = adjustWeightsForComplexity(policy, complexity);

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
    //
    // The capability score has two layers:
    //   1. Base score (capped at 0.85): task capability match + breadth bonus
    //   2. Tier bonus (up to +0.18): complexity-scaled model tier advantage
    //
    // Capping the base at 0.85 ensures the tier bonus can differentiate
    // between models that all match the required capabilities equally.
    // Without this cap, models with identical capabilities would all hit
    // 1.0 and the tier bonus would be invisible.
    let capabilityScore: number;
    if (requiredCaps.length > 0) {
      const matchedCaps = requiredCaps.filter((cap) =>
        candidate.capabilities.includes(cap)
      );
      const matchRatio = matchedCaps.length / requiredCaps.length;
      // Breadth bonus for broader capability coverage (max +0.15)
      const breadthBonus = Math.min(candidate.capabilities.length * 0.02, 0.15);
      // Base score capped at 0.85 to leave room for tier differentiation
      const baseCap = Math.min(matchRatio * 0.7 + breadthBonus, 0.85);
      // Tier-based bonus scaled by complexity
      const tier = tierBonus(candidate.tier, complexity);
      capabilityScore = Math.min(baseCap + tier, 1.0);
    } else {
      capabilityScore = 0.5;
    }

    // ── Weighted total (using complexity-adjusted weights) ──
    const score =
      costScore * weights.costWeight +
      latencyScore * weights.latencyWeight +
      capabilityScore * weights.capabilityWeight;

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

/**
 * Attentra — Fallback Ordering
 *
 * Phase 6 / Step 2 — Database-Backed Routing
 *
 * Determines fallback candidate ordering when the primary
 * selected model is unavailable or fails during execution.
 *
 * Provider Diversity Strategy:
 *   Round-robin across providers, prioritizing providers DIFFERENT
 *   from the selected candidate's provider first. This ensures
 *   maximum resilience through provider diversity.
 *
 *   Example:
 *     Selected: OpenAI-A (score 0.9)
 *     Scored: [OpenAI-B: 0.8, Anthropic-C: 0.7, Google-D: 0.6]
 *     Fallback: [Anthropic-C, Google-D, OpenAI-B]
 *     (Other providers first, then same provider)
 *
 *   The primary selection is excluded from fallbacks.
 *   If only one provider has candidates, that provider is used exclusively.
 *   Diversity does NOT sacrifice dramatically better candidates — it only
 *   reorders within the existing scored list.
 */

import type { ModelScore } from "./types";

/**
 * Order fallback candidates with provider diversity.
 *
 * Strategy:
 * 1. Exclude the selected (primary) candidate
 * 2. Group remaining candidates by providerId (sorted by score within groups)
 * 3. Sort providers: OTHER providers first (by best score), selected provider last
 * 4. Round-robin across providers: pick the top remaining candidate
 *    from each provider, cycling until all are placed
 *
 * @param allScored  All scored candidates (including selected)
 * @param selected   The primary selected candidate
 * @returns          Provider-diverse ordered fallback candidates
 */
export function orderFallbacks(
  allScored: ModelScore[],
  selected: ModelScore
): ModelScore[] {
  // 1. Exclude the selected candidate
  const remaining = allScored.filter(
    (s) => s.candidate.modelId !== selected.candidate.modelId
  );

  if (remaining.length <= 1) return remaining;

  // 2. Group by providerId and sort by score descending within each group
  const groups = new Map<string, ModelScore[]>();
  for (const score of remaining) {
    const pid = score.candidate.providerId;
    const group = groups.get(pid) ?? [];
    group.push(score);
    groups.set(pid, group);
  }
  for (const [pid, group] of groups) {
    group.sort((a, b) => b.score - a.score);
    groups.set(pid, group);
  }

  // 3. Sort providers: OTHER providers first (by best score desc),
  //    then the selected candidate's provider last (for diversity)
  const selectedProviderId = selected.candidate.providerId;
  const sortedProviderIds = Array.from(groups.keys()).sort((a, b) => {
    const aIsSelected = a === selectedProviderId ? 1 : 0;
    const bIsSelected = b === selectedProviderId ? 1 : 0;
    if (aIsSelected !== bIsSelected) return aIsSelected - bIsSelected;
    const bestA = groups.get(a)![0].score;
    const bestB = groups.get(b)![0].score;
    return bestB - bestA;
  });

  // 4. Round-robin across providers
  const result: ModelScore[] = [];
  const maxDepth = Math.max(...Array.from(groups.values()).map((g) => g.length));

  for (let depth = 0; depth < maxDepth; depth++) {
    for (const pid of sortedProviderIds) {
      const group = groups.get(pid)!;
      if (depth < group.length) {
        result.push(group[depth]);
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────
// FALLBACK COST CEILING (Phase 2C, optional)
// ─────────────────────────────────────────────────────

/**
 * Optional cap on how much more a fallback may be PROJECTED to cost than
 * the selected primary. Projected cost is a routing estimate (live pricing ×
 * estimated tokens) — never a guaranteed bill.
 *
 * Configuration:
 *   ROUTING_MAX_FALLBACK_COST_MULTIPLIER  number ≥ 1; unset → disabled
 *   ROUTING_FALLBACK_COST_MODE            "soft" (default) | "strict"
 *
 * Soft mode keeps the cheapest cross-provider fallback when EVERY
 * cross-provider fallback is over the ceiling, so a provider outage can
 * still be served. Soft mode therefore gives no strict cost guarantee.
 */
export interface FallbackCostCeiling {
  multiplier: number;
  mode: "soft" | "strict";
}

/** Outcome of applying the ceiling to an ordered fallback list. */
export interface FallbackCostFilterResult {
  /** Remaining fallbacks, in their original provider-diverse order */
  fallbacks: ModelScore[];
  /** Whether the ceiling was evaluated */
  applied: boolean;
  /** Primary projected cost × multiplier (USD), when applied */
  thresholdCost?: number;
  /** Fallbacks removed for exceeding the ceiling */
  excluded: ModelScore[];
  /** Over-ceiling cross-provider fallback kept by the soft limit */
  retainedOverCeiling?: ModelScore;
  /** Why an enabled ceiling was not evaluated */
  skippedReason?: "PRIMARY_COST_UNAVAILABLE";
}

/**
 * Parse the ceiling configuration. Unset disables the ceiling; malformed
 * or < 1 multipliers also disable it (existing behavior) and are flagged.
 */
export function parseFallbackCostCeiling(
  rawMultiplier: string | undefined,
  rawMode: string | undefined
): { ceiling: FallbackCostCeiling | null; malformed: boolean } {
  const trimmed = rawMultiplier?.trim();
  if (!trimmed) return { ceiling: null, malformed: false };

  const multiplier = Number(trimmed);
  if (!Number.isFinite(multiplier) || multiplier < 1) {
    return { ceiling: null, malformed: true };
  }

  const mode = rawMode?.trim().toLowerCase() === "strict" ? "strict" : "soft";
  return { ceiling: { multiplier, mode }, malformed: false };
}

let warnedMalformedCeiling = false;

/** Ceiling from the environment; warns once per instance when malformed. */
export function resolveFallbackCostCeiling(): FallbackCostCeiling | null {
  const { ceiling, malformed } = parseFallbackCostCeiling(
    process.env.ROUTING_MAX_FALLBACK_COST_MULTIPLIER,
    process.env.ROUTING_FALLBACK_COST_MODE
  );

  if (malformed && !warnedMalformedCeiling) {
    warnedMalformedCeiling = true;
    console.warn(
      "[routing] ROUTING_MAX_FALLBACK_COST_MULTIPLIER is not a number >= 1; " +
        "fallback cost ceiling disabled."
    );
  }

  return ceiling;
}

/**
 * Remove fallbacks projected to cost more than multiplier × the primary's
 * projected cost. Order, primary and all other eligibility are unchanged.
 */
export function applyFallbackCostCeiling(
  selected: ModelScore,
  fallbacks: ModelScore[],
  ceiling: FallbackCostCeiling | null
): FallbackCostFilterResult {
  if (!ceiling || fallbacks.length === 0) {
    return { fallbacks, applied: false, excluded: [] };
  }

  const primaryCost = selected.factors.projectedCost;
  if (!Number.isFinite(primaryCost) || primaryCost <= 0) {
    return {
      fallbacks,
      applied: false,
      excluded: [],
      skippedReason: "PRIMARY_COST_UNAVAILABLE",
    };
  }

  const thresholdCost = primaryCost * ceiling.multiplier;
  const withinCeiling = (s: ModelScore) =>
    Number.isFinite(s.factors.projectedCost) &&
    s.factors.projectedCost <= thresholdCost;

  const kept = new Set(fallbacks.filter(withinCeiling));

  let retainedOverCeiling: ModelScore | undefined;
  if (ceiling.mode === "soft") {
    const primaryProvider = selected.candidate.providerId;
    const crossProvider = fallbacks.filter(
      (s) => s.candidate.providerId !== primaryProvider
    );

    if (!crossProvider.some((s) => kept.has(s))) {
      retainedOverCeiling = crossProvider
        .filter((s) => Number.isFinite(s.factors.projectedCost))
        .sort((a, b) => a.factors.projectedCost - b.factors.projectedCost)[0];
      if (retainedOverCeiling) kept.add(retainedOverCeiling);
    }
  }

  return {
    fallbacks: fallbacks.filter((s) => kept.has(s)),
    applied: true,
    thresholdCost,
    excluded: fallbacks.filter((s) => !kept.has(s)),
    retainedOverCeiling,
  };
}

/**
 * Explanation suffix for the routing decision (empty when nothing to say).
 * Amounts are projections and labelled as such.
 */
export function describeFallbackCostFilter(
  result: FallbackCostFilterResult,
  ceiling: FallbackCostCeiling | null
): string {
  if (!ceiling) return "";

  if (result.skippedReason === "PRIMARY_COST_UNAVAILABLE") {
    return " | Fallback cost ceiling not applied: primary projected cost unavailable";
  }

  if (!result.applied || (result.excluded.length === 0 && !result.retainedOverCeiling)) {
    return "";
  }

  let text =
    ` | Fallback cost ceiling ${ceiling.multiplier}x primary projected cost ` +
    `($${result.thresholdCost!.toFixed(6)}): excluded ${result.excluded.length} fallback(s)`;

  if (result.retainedOverCeiling) {
    const r = result.retainedOverCeiling;
    text +=
      `; kept ${r.candidate.displayName} (${r.candidate.providerId}, projected ` +
      `$${r.factors.projectedCost.toFixed(6)}) above the ceiling as the cheapest ` +
      `cross-provider fallback (soft limit)`;
  }

  return text;
}

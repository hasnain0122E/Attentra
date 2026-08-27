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

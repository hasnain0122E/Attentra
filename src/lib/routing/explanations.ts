/**
 * Attentra — Routing Explanations
 *
 * Phase 6 / Step 2 — Database-Backed Routing
 *
 * Generates human-readable explanations for routing decisions.
 * Explanations help with:
 * - Debugging routing behavior
 * - Auditing decisions for cost savings reports
 * - Developer understanding of model selection
 *
 * Example output:
 *   "Selected Gemini Flash because it provides the required coding
 *    capability, fits within the 128K context window, and has the
 *    lowest projected cost among eligible candidates (~$0.000294)."
 */

import type { RoutingDecision, ModelScore, RejectedCandidate } from "./types";

/**
 * Build a concise, stable routing explanation from primitive
 * routing facts.
 *
 * This is the canonical concise explanation used consistently by
 * the consumer UI, the business UI, and the public API
 * (`routing.reason`). It deliberately excludes fallback catalogues,
 * rejection summaries, and formatted currency so a single sentence
 * shape is preserved across all surfaces; numeric projected cost and
 * routing score are exposed as separate structured fields.
 *
 * @param input.modelDisplayName  Display name of the selected model
 * @param input.complexity        Complexity label (e.g. "LOW", "MEDIUM", "HIGH")
 * @param input.taskType          Task type label (e.g. "GENERAL", "CODING")
 * @returns                       Concise explanation string
 */
export function buildConciseRoutingReason(input: {
  modelDisplayName: string;
  complexity: string;
  taskType: string;
}): string {
  const complexityLabel = input.complexity.toLowerCase();
  const taskTypeLabel = input.taskType.toLowerCase();

  return (
    `${input.modelDisplayName} selected for a ` +
    `${complexityLabel}-complexity ${taskTypeLabel} request ` +
    `based on capability, projected cost, and latency.`
  );
}

/**
 * Generate a human-readable explanation for a routing decision.
 *
 * @param decision  The routing decision to explain
 * @returns         Explanation string
 */
export function explainDecision(decision: RoutingDecision): string {
  const { selected, taskType, complexity, tokenEstimate, rejected } = decision;
  const c = selected.candidate;
  const providerLabel = c.providerName ?? c.providerId;

  const parts: string[] = [];

  // Primary selection
  parts.push(
    `Selected ${c.displayName} (${providerLabel}/${c.modelIdentifier})`
  );

  // Why selected
  const reasons: string[] = [];
  reasons.push(`supports ${taskType}`);
  if (c.contextWindow) {
    reasons.push(`fits within ${c.contextWindow.toLocaleString()} token context`);
  }
  if (selected.factors.projectedCost > 0) {
    reasons.push(
      `projected cost $${selected.factors.projectedCost.toFixed(6)}`
    );
  }
  parts.push(`because it ${reasons.join(", ")}`);

  // Score and complexity
  parts.push(
    `Score: ${selected.score.toFixed(4)}` +
    ` | Complexity: ${complexity.complexity} (${complexity.confidence.toFixed(2)})` +
    ` | ~${tokenEstimate.totalTokens.toLocaleString()} tokens`
  );

  // Fallbacks
  if (decision.fallbacks.length > 0) {
    const fallbackNames = decision.fallbacks
      .map((f) => `${f.candidate.displayName} (${f.candidate.providerName ?? f.candidate.providerId})`)
      .join(", ");
    parts.push(`Fallbacks: ${fallbackNames}`);
  }

  // Rejected candidates summary
  if (rejected && rejected.length > 0) {
    const summary = summarizeRejections(rejected);
    parts.push(`Excluded: ${summary}`);
  }

  return parts.join(" | ");
}

/**
 * Summarize rejection reasons into a compact string.
 */
function summarizeRejections(rejected: RejectedCandidate[]): string {
  const byReason = new Map<string, string[]>();
  for (const r of rejected) {
    const names = byReason.get(r.reason) ?? [];
    names.push(r.candidate.displayName);
    byReason.set(r.reason, names);
  }

  const parts: string[] = [];
  for (const [reason, names] of byReason) {
    const label = rejectionReasonLabel(reason);
    parts.push(`${names.join(", ")} (${label})`);
  }
  return parts.join("; ");
}

/**
 * Convert rejection reason code to human-readable label.
 */
function rejectionReasonLabel(reason: string): string {
  switch (reason) {
    case "INACTIVE_MODEL": return "inactive";
    case "INACTIVE_PROVIDER": return "provider inactive";
    case "MISSING_CAPABILITY": return "unsupported task";
    case "REJECTED_CONTEXT_LIMIT": return "context exceeded";
    case "UNKNOWN_CONTEXT_WINDOW": return "unknown context";
    case "MISSING_PRICING": return "no pricing";
    default: return reason;
  }
}

/**
 * Format a single model score for display.
 */
export function formatScore(score: ModelScore): string {
  const c = score.candidate;
  const providerLabel = c.providerName ?? c.providerId;
  return (
    `${c.displayName} (${providerLabel}) — ` +
    `score: ${score.score.toFixed(4)}, ` +
    `$${score.factors.projectedCost.toFixed(6)} projected, ` +
    `${c.expectedLatencyMs ?? "?"}ms latency`
  );
}

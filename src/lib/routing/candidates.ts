/**
 * Attentra — Candidate Selection & Filtering
 *
 * Phase 6 / Step 2 — Database-Backed Routing
 *
 * Filters available models to viable candidates with full rejection tracking.
 *
 * Filtering order (Architecture §8):
 * 1. Provider/model active status
 * 2. Capability compatibility
 * 3. Context-window compatibility (HARD enforcement)
 * 4. Pricing availability (when required by policy)
 * 5. Candidate becomes eligible for scoring
 *
 * The router must never select a model that cannot accommodate the request.
 * Context window enforcement is absolute — not a scoring penalty.
 */

import type { ModelCandidate, RoutingTaskType, RejectedCandidate } from "./types";
import { TASK_TYPE_TO_CAPABILITIES } from "./types";

/**
 * Filter options for candidate selection.
 */
export interface CandidateFilterOptions {
  /** Task type for capability matching */
  taskType: RoutingTaskType;

  /** Estimated total tokens (input + output) for context window enforcement */
  estimatedTotalTokens?: number;

  /** Estimated input tokens for context window filtering (legacy, prefer estimatedTotalTokens) */
  estimatedInputTokens?: number;

  /** Include inactive models (default: false) */
  includeInactive?: boolean;

  /** Whether pricing is required for a candidate to be eligible */
  requirePricing?: boolean;
}

/**
 * Result of candidate filtering with rejection tracking.
 */
export interface CandidateFilterResult {
  /** Eligible candidates that passed all filters */
  eligible: ModelCandidate[];

  /** Candidates that were rejected with reasons */
  rejected: RejectedCandidate[];
}

/**
 * Filter candidates with full rejection tracking.
 *
 * Applies filters in order:
 * 1. Active status (model.active must be true)
 * 2. Capability match (model must support at least one required capability)
 * 3. Context window (estimated tokens must fit within contextWindow)
 * 4. Pricing availability (when requirePricing is true)
 *
 * @param models   All available models to filter
 * @param options  Filtering criteria
 * @returns        Eligible candidates and rejected candidates with reasons
 */
export function filterCandidates(
  models: ModelCandidate[],
  options: CandidateFilterOptions
): CandidateFilterResult {
  const eligible: ModelCandidate[] = [];
  const rejected: RejectedCandidate[] = [];
  const requiredCapabilities = TASK_TYPE_TO_CAPABILITIES[options.taskType] ?? [];
  const totalTokens = options.estimatedTotalTokens ?? options.estimatedInputTokens;

  for (const model of models) {
    // 1. Active filter
    if (!model.active && !options.includeInactive) {
      rejected.push({
        candidate: model,
        reason: "INACTIVE_MODEL",
        details: `${model.displayName} is inactive`,
      });
      continue;
    }

    // 2. Capability filter
    if (requiredCapabilities.length > 0) {
      const hasCapability = requiredCapabilities.some((cap) =>
        model.capabilities.includes(cap)
      );
      if (!hasCapability) {
        rejected.push({
          candidate: model,
          reason: "MISSING_CAPABILITY",
          details:
            `${model.displayName} does not support ${options.taskType} ` +
            `(requires: ${requiredCapabilities.join(", ")})`,
        });
        continue;
      }
    }

    // 3. Context window filter — HARD enforcement
    if (totalTokens !== undefined && totalTokens > 0) {
      if (model.contextWindow !== undefined && model.contextWindow !== null) {
        if (totalTokens > model.contextWindow) {
          rejected.push({
            candidate: model,
            reason: "REJECTED_CONTEXT_LIMIT",
            details:
              `${model.displayName} context window (${model.contextWindow.toLocaleString()}) ` +
              `cannot accommodate estimated ${totalTokens.toLocaleString()} tokens`,
          });
          continue;
        }
      } else {
        // Unknown context window — exclude for safety
        rejected.push({
          candidate: model,
          reason: "UNKNOWN_CONTEXT_WINDOW",
          details: `${model.displayName} has unknown context window capacity`,
        });
        continue;
      }
    }

    // 4. Pricing availability
    if (options.requirePricing) {
      if (model.inputPricePer1k <= 0 && model.outputPricePer1k <= 0) {
        rejected.push({
          candidate: model,
          reason: "MISSING_PRICING",
          details: `${model.displayName} has no usable pricing for cost-based routing`,
        });
        continue;
      }
    }

    // Passed all filters
    eligible.push(model);
  }

  return { eligible, rejected };
}

/**
 * Select viable model candidates from available models.
 *
 * Backward-compatible wrapper around filterCandidates that returns
 * only the eligible list (no rejection tracking).
 *
 * @param models   Available models to filter
 * @param options  Filtering criteria
 * @returns        Viable candidates
 */
export function selectCandidates(
  models: ModelCandidate[],
  options: CandidateFilterOptions
): ModelCandidate[] {
  return filterCandidates(models, options).eligible;
}

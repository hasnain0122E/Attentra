import type {
  CostBreakdown,
  CostIntelligenceResult,
  ModelPricing,
  TokenUsage,
} from "./types";

const COST_DECIMAL_PLACES = 8;
const PERCENTAGE_DECIMAL_PLACES = 4;

function round(value: number, decimalPlaces: number): number {
  const multiplier = 10 ** decimalPlaces;

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function assertNonNegativeFinite(
  value: number,
  fieldName: string
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative finite number`);
  }
}

function validateUsage(usage: TokenUsage): void {
  assertNonNegativeFinite(usage.inputTokens, "inputTokens");
  assertNonNegativeFinite(usage.outputTokens, "outputTokens");
}

function validatePricing(pricing: ModelPricing): void {
  assertNonNegativeFinite(pricing.inputPricePer1k, "inputPricePer1k");
  assertNonNegativeFinite(pricing.outputPricePer1k, "outputPricePer1k");
}

/**
 * Calculate the monetary cost of a request using token usage and
 * normalized per-1,000-token pricing.
 *
 * This function contains no database or provider logic.
 */
export function calculateModelCost(
  usage: TokenUsage,
  pricing: ModelPricing
): CostBreakdown {
  validateUsage(usage);
  validatePricing(pricing);

  const inputCost =
    (usage.inputTokens / 1000) * pricing.inputPricePer1k;

  const outputCost =
    (usage.outputTokens / 1000) * pricing.outputPricePer1k;

  return {
    inputCost: round(inputCost, COST_DECIMAL_PLACES),
    outputCost: round(outputCost, COST_DECIMAL_PLACES),
    totalCost: round(inputCost + outputCost, COST_DECIMAL_PLACES),
  };
}

/**
 * Compare Attentra's actual execution cost against the configured
 * baseline model using the SAME token usage.
 *
 * Positive savings:
 *   Attentra was cheaper than the baseline.
 *
 * Zero savings:
 *   Attentra cost the same as the baseline.
 *
 * Negative savings:
 *   Attentra was more expensive than the baseline.
 */
export function calculateCostIntelligence(
  usage: TokenUsage,
  actualPricing: ModelPricing,
  baselinePricing: ModelPricing
): CostIntelligenceResult {
  const actual = calculateModelCost(usage, actualPricing);
  const baseline = calculateModelCost(usage, baselinePricing);

  const savings = round(
    baseline.totalCost - actual.totalCost,
    COST_DECIMAL_PLACES
  );

  const savingsPercentage =
    baseline.totalCost > 0
      ? round(
          (savings / baseline.totalCost) * 100,
          PERCENTAGE_DECIMAL_PLACES
        )
      : 0;

  return {
    actualCost: actual.totalCost,
    baselineCost: baseline.totalCost,
    savings,
    savingsPercentage,
  };
}
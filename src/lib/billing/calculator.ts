/**
 * Attentra — Billing Calculator
 *
 * Phase 12.15
 *
 * Pure deterministic billing calculation.
 *
 * Takes aggregated cost inputs for a billing period and produces
 * canonical billing metrics: verified savings, optimization fee,
 * total customer cost, and coverage.
 *
 * Key invariants:
 * - Fee is calculated on PERIOD-LEVEL NET savings, not per-request.
 * - Negative or zero verified savings produce zero fee.
 * - Customer retains 90% of positive verified savings.
 * - totalCustomerCost = totalActualUsageCost + optimizationFee.
 */

import {
  OPTIMIZATION_FEE_RATE,
  type BillingPeriodInput,
  type BillingPeriodResult,
} from "./types";

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

const MONEY_DECIMAL_PLACES = 8;
const PERCENTAGE_DECIMAL_PLACES = 4;

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function roundMoney(value: number): number {
  return Number(value.toFixed(MONEY_DECIMAL_PLACES));
}

function roundPercentage(value: number): number {
  return Number(value.toFixed(PERCENTAGE_DECIMAL_PLACES));
}

// ─────────────────────────────────────────────────────
// CALCULATOR
// ─────────────────────────────────────────────────────

/**
 * Calculate canonical billing metrics for a period.
 *
 * This function is pure — no side effects, no I/O, no React.
 * Given the same inputs it always produces the same outputs.
 *
 * Formula:
 *
 *   verifiedSavings    = comparableBaselineCost - comparableActualCost
 *   billableSavings    = max(verifiedSavings, 0)
 *   optimizationFee    = billableSavings × OPTIMIZATION_FEE_RATE
 *   customerNetSavings = billableSavings - optimizationFee
 *   totalCustomerCost  = totalActualUsageCost + optimizationFee
 *   comparableCoverage = comparableRequests / totalCostedRequests
 */
export function calculateBillingPeriod(
  input: BillingPeriodInput,
): BillingPeriodResult {
  const {
    totalActualUsageCost,
    comparableActualCost,
    comparableBaselineCost,
    totalCostedRequests,
    comparableRequests,
  } = input;

  // ─────────────────────────────────────────────────
  // Verified savings (can be negative)
  // ─────────────────────────────────────────────────

  const verifiedSavings = roundMoney(
    comparableBaselineCost - comparableActualCost,
  );

  // ─────────────────────────────────────────────────
  // Billable savings (clamped to zero)
  // ─────────────────────────────────────────────────

  const billableSavings = roundMoney(
    Math.max(verifiedSavings, 0),
  );

  // ─────────────────────────────────────────────────
  // Optimization fee (10% of billable savings)
  // ─────────────────────────────────────────────────

  const optimizationFee = roundMoney(
    billableSavings * OPTIMIZATION_FEE_RATE,
  );

  // ─────────────────────────────────────────────────
  // Customer net savings
  // ─────────────────────────────────────────────────

  const customerNetSavings = roundMoney(
    billableSavings - optimizationFee,
  );

  // ─────────────────────────────────────────────────
  // Total customer cost (usage + fee)
  // ─────────────────────────────────────────────────

  const totalCustomerCost = roundMoney(
    totalActualUsageCost + optimizationFee,
  );

  // ─────────────────────────────────────────────────
  // Coverage
  // ─────────────────────────────────────────────────

  const comparableCoverage = totalCostedRequests > 0
    ? roundPercentage(
        (comparableRequests / totalCostedRequests) * 100,
      )
    : 0;

  return {
    totalActualUsageCost: roundMoney(totalActualUsageCost),
    comparableActualCost: roundMoney(comparableActualCost),
    baselineCost: roundMoney(comparableBaselineCost),

    verifiedSavings,
    billableSavings,
    optimizationFeeRate: OPTIMIZATION_FEE_RATE,
    optimizationFee,
    customerNetSavings,
    totalCustomerCost,

    totalCostedRequests,
    comparableRequests,
    comparableCoverage,
  };
}

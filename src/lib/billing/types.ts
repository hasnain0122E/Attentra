/**
 * Attentra — Billing Types
 *
 * Phase 12.15
 *
 * Canonical billing types for period-level aggregation.
 *
 * All monetary values are in USD (canonical internal representation).
 * PKR conversion is presentation-only and happens in the UI layer.
 */

// ─────────────────────────────────────────────────────
// FEE RATE
// ─────────────────────────────────────────────────────

/**
 * Attentra optimization fee rate.
 *
 * 10% of positive net verified savings for the billing period.
 *
 * Single source of truth — do not duplicate elsewhere.
 */
export const OPTIMIZATION_FEE_RATE = 0.10;

// ─────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────

/**
 * Aggregated cost inputs for a billing period.
 *
 * - totalActualUsageCost: sum of actualCost for ALL successfully costed requests
 * - comparableActualCost: sum of actualCost for requests with valid baseline
 * - comparableBaselineCost: sum of baselineCost for requests with valid baseline
 */
export interface BillingPeriodInput {
  totalActualUsageCost: number;
  comparableActualCost: number;
  comparableBaselineCost: number;
  totalCostedRequests: number;
  comparableRequests: number;
}

// ─────────────────────────────────────────────────────
// OUTPUT
// ─────────────────────────────────────────────────────

/**
 * Canonical billing period result.
 *
 * Contains all derived billing metrics for a period:
 * - verified savings (baseline - actual for comparable requests)
 * - optimization fee (10% of positive net savings)
 * - total customer cost (usage + fee)
 * - coverage (comparable / total costed)
 */
export interface BillingPeriodResult {
  totalActualUsageCost: number;
  comparableActualCost: number;
  baselineCost: number;

  verifiedSavings: number;
  billableSavings: number;
  optimizationFeeRate: number;
  optimizationFee: number;
  customerNetSavings: number;
  totalCustomerCost: number;

  totalCostedRequests: number;
  comparableRequests: number;
  comparableCoverage: number;
}

// ─────────────────────────────────────────────────────
// BASELINE METADATA
// ─────────────────────────────────────────────────────

/**
 * Describes the baseline model used for savings comparison.
 */
export interface BillingBaselineInfo {
  configured: boolean;
  modelId?: string;
  identifier?: string;
  displayName?: string;
}

// ─────────────────────────────────────────────────────
// CONSUMER BILLING
// ─────────────────────────────────────────────────────

/**
 * Complete consumer billing payload for a period.
 */
export interface ConsumerBillingData {
  period: {
    from: string | null;
    to: string | null;
  };

  usage: {
    totalActualCost: number;
    comparableActualCost: number;
    baselineCost: number;
  };

  savings: {
    verifiedSavings: number;
    billableSavings: number;
    optimizationFeeRate: number;
    optimizationFee: number;
    customerNetSavings: number;
  };

  totalCustomerCost: number;

  coverage: {
    totalCostedRequests: number;
    comparableRequests: number;
    percentage: number;
  };

  baseline: BillingBaselineInfo;
}

// ─────────────────────────────────────────────────────
// BUSINESS BILLING
// ─────────────────────────────────────────────────────

/**
 * Complete business billing payload for a period.
 */
export interface BusinessBillingData {
  period: {
    from: string | null;
    to: string | null;
  };

  usage: {
    totalActualCost: number;
    comparableActualCost: number;
    baselineCost: number;
  };

  savings: {
    verifiedSavings: number;
    billableSavings: number;
    optimizationFeeRate: number;
    optimizationFee: number;
    customerNetSavings: number;
  };

  totalCustomerCost: number;

  coverage: {
    totalCostedRequests: number;
    comparableRequests: number;
    percentage: number;
  };

  baseline: BillingBaselineInfo;
}

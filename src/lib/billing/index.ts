/**
 * Attentra — Billing Module
 *
 * Phase 12.15
 *
 * Canonical billing calculations and aggregation.
 */

export {
  OPTIMIZATION_FEE_RATE,
} from "./types";

export {
  calculateBillingPeriod,
} from "./calculator";

export {
  getConsumerBilling,
} from "./consumer";

export {
  getBusinessBilling,
} from "./business";

export type {
  BillingPeriodInput,
  BillingPeriodResult,
  BillingBaselineInfo,
  ConsumerBillingData,
  BusinessBillingData,
} from "./types";

/**
 * Attentra — Cost Intelligence Types
 *
 * Shared contracts for request-level and aggregated
 * cost intelligence.
 */

// ─────────────────────────────────────────────────────
// CORE COST TYPES
// ─────────────────────────────────────────────────────

/**
 * Actual token usage returned by the executed model.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Active model pricing expressed per 1,000 tokens.
 */
export interface ModelPricing {
  inputPricePer1k: number;
  outputPricePer1k: number;
}

/**
 * Cost breakdown for a single model execution.
 */
export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/**
 * Request-level comparison between the executed model
 * and the configured baseline model.
 */
export interface CostIntelligenceResult {
  actualCost: number;
  baselineCost: number;
  savings: number;
  savingsPercentage: number;
}

// ─────────────────────────────────────────────────────
// CONSUMER COST ANALYTICS
// ─────────────────────────────────────────────────────

/**
 * High-level cost metrics for one consumer/user.
 *
 * Note:
 * - actualSpend includes every successful cost-bearing request.
 * - comparableActualSpend only includes requests that have
 *   a valid baseline comparison.
 * - savings is never fabricated for requests without baseline data.
 */
export interface ConsumerCostSummary {
  requestCount: number;
  costBearingRequestCount: number;
  comparableRequestCount: number;

  actualSpend: number;
  comparableActualSpend: number;
  baselineSpend: number;
  savings: number;
  savingsPercentage: number;

  averageCostPerRequest: number;
  comparableSpendCoverage: number;
}

/**
 * Consumer spend grouped by executed model.
 */
export interface ConsumerCostModelBreakdown {
  modelId: string;
  modelIdentifier: string;
  displayName: string;
  providerId: string;

  requestCount: number;
  actualSpend: number;
  percentageOfSpend: number;
}

/**
 * Consumer spend grouped by provider.
 */
export interface ConsumerCostProviderBreakdown {
  providerId: string;
  providerName: string;

  requestCount: number;
  actualSpend: number;
  percentageOfSpend: number;
}

/**
 * Consumer spend grouped by detected/routed task type.
 */
export interface ConsumerCostTaskBreakdown {
  taskType: string;

  requestCount: number;
  actualSpend: number;
  percentageOfSpend: number;
}

/**
 * Daily consumer cost trend.
 */
export interface ConsumerCostTrendPoint {
  date: string;

  requestCount: number;
  actualSpend: number;
  baselineSpend: number;
  savings: number;
}

/**
 * Complete consumer cost intelligence payload.
 */
export interface ConsumerCostAnalytics {
  summary: ConsumerCostSummary;

  byModel: ConsumerCostModelBreakdown[];
  byProvider: ConsumerCostProviderBreakdown[];
  byTaskType: ConsumerCostTaskBreakdown[];

  trend: ConsumerCostTrendPoint[];
}

// ─────────────────────────────────────────────────────
// BUSINESS COST ANALYTICS
// ─────────────────────────────────────────────────────

export interface BusinessCostSummary {
  requestCount: number;
  costBearingRequestCount: number;
  comparableRequestCount: number;

  actualSpend: number;
  comparableActualSpend: number;
  baselineSpend: number;

  savings: number;
  savingsPercentage: number;

  averageCostPerRequest: number;
  comparableSpendCoverage: number;

  activeMemberCount: number;
}

export interface BusinessCostModelBreakdown {
  modelId: string;
  modelIdentifier: string;
  displayName: string;
  providerId: string;

  requestCount: number;
  actualSpend: number;
  percentageOfSpend: number;
}

export interface BusinessCostProviderBreakdown {
  providerId: string;
  providerName: string;

  requestCount: number;
  actualSpend: number;
  percentageOfSpend: number;
}

export interface BusinessCostTaskBreakdown {
  taskType: string;

  requestCount: number;
  actualSpend: number;
  percentageOfSpend: number;
}

export interface BusinessCostMemberBreakdown {
  userId: string;
  name: string | null;
  email: string | null;

  requestCount: number;
  actualSpend: number;
  percentageOfSpend: number;
}

export interface BusinessCostTrendPoint {
  date: string;

  requestCount: number;
  actualSpend: number;
  baselineSpend: number;
  savings: number;
}

export interface BusinessCostAnalytics {
  summary: BusinessCostSummary;

  byModel: BusinessCostModelBreakdown[];
  byProvider: BusinessCostProviderBreakdown[];
  byTaskType: BusinessCostTaskBreakdown[];
  byMember: BusinessCostMemberBreakdown[];

  trend: BusinessCostTrendPoint[];
}
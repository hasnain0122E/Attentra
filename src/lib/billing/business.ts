/**
 * Attentra — Business Billing Aggregation
 *
 * Phase 12.15
 *
 * Aggregates business request cost data for billing.
 *
 * Scopes by businessId. This includes:
 * - Business API-key requests (userId = null, businessId = workspace)
 * - Any other requests attributed to the business
 *
 * Business baseline is resolved from Business.baselineModelId.
 * There is NO fallback to the consumer baseline.
 *
 * If no baseline is configured:
 * - Usage cost still displays normally
 * - Baseline/savings/fee are zero
 * - No savings are fabricated
 */

import type { PrismaClient } from "@prisma/client";

import {
  calculateBillingPeriod,
} from "./calculator";

import type {
  BillingBaselineInfo,
  BusinessBillingData,
} from "./types";

// ─────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────

export interface GetBusinessBillingOptions {
  from?: Date;
  to?: Date;
}

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

const MONEY_DECIMAL_PLACES = 8;

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function roundMoney(value: number): number {
  return Number(value.toFixed(MONEY_DECIMAL_PLACES));
}

/**
 * Safely converts Prisma Decimal/string/number/null
 * values into a JavaScript number.
 */
function decimalToNumber(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function validateOptions(
  options?: GetBusinessBillingOptions,
) {
  if (options?.from && Number.isNaN(options.from.getTime())) {
    throw new Error("Invalid business billing 'from' date");
  }

  if (options?.to && Number.isNaN(options.to.getTime())) {
    throw new Error("Invalid business billing 'to' date");
  }

  if (options?.from && options?.to && options.from > options.to) {
    throw new Error("Business billing 'from' date cannot be after 'to' date");
  }
}

// ─────────────────────────────────────────────────────
// BASELINE RESOLUTION
// ─────────────────────────────────────────────────────

/**
 * Resolve the business baseline model from Business.baselineModelId.
 *
 * Does NOT fall back to the consumer baseline.
 * If no baseline is configured, returns { configured: false }.
 */
async function resolveBusinessBaseline(
  prisma: PrismaClient,
  businessId: string,
): Promise<BillingBaselineInfo> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      baselineModel: {
        select: {
          id: true,
          modelIdentifier: true,
          displayName: true,
        },
      },
    },
  });

  if (!business?.baselineModel) {
    return { configured: false };
  }

  return {
    configured: true,
    modelId: business.baselineModel.id,
    identifier: business.baselineModel.modelIdentifier,
    displayName: business.baselineModel.displayName,
  };
}

// ─────────────────────────────────────────────────────
// AGGREGATION
// ─────────────────────────────────────────────────────

export async function getBusinessBilling(
  prisma: PrismaClient,
  businessId: string,
  options?: GetBusinessBillingOptions,
): Promise<BusinessBillingData> {
  if (!businessId.trim()) {
    throw new Error("businessId is required for business billing");
  }

  validateOptions(options);

  const createdAtFilter =
    options?.from || options?.to
      ? {
          ...(options.from ? { gte: options.from } : {}),
          ...(options.to ? { lte: options.to } : {}),
        }
      : undefined;

  /**
   * Query all successful requests belonging to this business.
   *
   * This includes business API-key requests (userId = null)
   * and any other requests attributed to the workspace.
   */
  const requests = await prisma.request.findMany({
    where: {
      businessId,
      status: "SUCCESS",

      ...(createdAtFilter
        ? { createdAt: createdAtFilter }
        : {}),
    },

    orderBy: {
      createdAt: "asc",
    },

    select: {
      actualCost: true,
      baselineCost: true,
    },
  });

  // ───────────────────────────────────────────────────
  // ACCUMULATORS
  // ───────────────────────────────────────────────────

  let totalActualUsageCost = 0;
  let comparableActualCost = 0;
  let comparableBaselineCost = 0;
  let totalCostedRequests = 0;
  let comparableRequests = 0;

  for (const request of requests) {
    const actualCost = decimalToNumber(request.actualCost);

    if (actualCost === null) {
      continue;
    }

    totalCostedRequests++;
    totalActualUsageCost = roundMoney(
      totalActualUsageCost + actualCost,
    );

    const baselineCost = decimalToNumber(request.baselineCost);

    if (baselineCost !== null) {
      comparableRequests++;
      comparableActualCost = roundMoney(
        comparableActualCost + actualCost,
      );
      comparableBaselineCost = roundMoney(
        comparableBaselineCost + baselineCost,
      );
    }
  }

  // ───────────────────────────────────────────────────
  // BILLING CALCULATION
  // ───────────────────────────────────────────────────

  const result = calculateBillingPeriod({
    totalActualUsageCost,
    comparableActualCost,
    comparableBaselineCost,
    totalCostedRequests,
    comparableRequests,
  });

  // ───────────────────────────────────────────────────
  // BASELINE METADATA
  // ───────────────────────────────────────────────────

  const baseline = await resolveBusinessBaseline(prisma, businessId);

  // ───────────────────────────────────────────────────
  // RESPONSE
  // ───────────────────────────────────────────────────

  return {
    period: {
      from: options?.from?.toISOString() ?? null,
      to: options?.to?.toISOString() ?? null,
    },

    usage: {
      totalActualCost: result.totalActualUsageCost,
      comparableActualCost: result.comparableActualCost,
      baselineCost: result.baselineCost,
    },

    savings: {
      verifiedSavings: result.verifiedSavings,
      billableSavings: result.billableSavings,
      optimizationFeeRate: result.optimizationFeeRate,
      optimizationFee: result.optimizationFee,
      customerNetSavings: result.customerNetSavings,
    },

    totalCustomerCost: result.totalCustomerCost,

    coverage: {
      totalCostedRequests: result.totalCostedRequests,
      comparableRequests: result.comparableRequests,
      percentage: result.comparableCoverage,
    },

    baseline,
  };
}

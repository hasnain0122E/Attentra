/**
 * Attentra — Consumer Billing Aggregation
 *
 * Phase 12.15
 *
 * Aggregates consumer request cost data for billing.
 *
 * Scopes by userId where businessId is null.
 * This prevents double-counting: business API-key requests
 * (userId = null, businessId = workspace) are NOT included
 * in consumer billing.
 *
 * Personal API-key requests (userId = user, businessId = null)
 * ARE included — they belong to the consumer.
 *
 * Session requests (userId = user, businessId = null)
 * ARE also included.
 */

import type { PrismaClient } from "@prisma/client";

import {
  calculateBillingPeriod,
} from "./calculator";

import type {
  BillingBaselineInfo,
  ConsumerBillingData,
} from "./types";

// ─────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────

export interface GetConsumerBillingOptions {
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
  options?: GetConsumerBillingOptions,
) {
  if (options?.from && Number.isNaN(options.from.getTime())) {
    throw new Error("Invalid consumer billing 'from' date");
  }

  if (options?.to && Number.isNaN(options.to.getTime())) {
    throw new Error("Invalid consumer billing 'to' date");
  }

  if (options?.from && options?.to && options.from > options.to) {
    throw new Error("Consumer billing 'from' date cannot be after 'to' date");
  }
}

// ─────────────────────────────────────────────────────
// BASELINE RESOLUTION
// ─────────────────────────────────────────────────────

/**
 * Resolve the consumer baseline model from the
 * CONSUMER_BASELINE_MODEL environment variable.
 *
 * Returns baseline metadata for the billing response.
 */
async function resolveConsumerBaseline(
  prisma: PrismaClient,
): Promise<BillingBaselineInfo> {
  const identifier = process.env.CONSUMER_BASELINE_MODEL?.trim();

  if (!identifier) {
    return { configured: false };
  }

  const model = await prisma.model.findFirst({
    where: {
      modelIdentifier: identifier,
      active: true,
    },
    select: {
      id: true,
      modelIdentifier: true,
      displayName: true,
    },
  });

  if (!model) {
    return { configured: false };
  }

  return {
    configured: true,
    modelId: model.id,
    identifier: model.modelIdentifier,
    displayName: model.displayName,
  };
}

// ─────────────────────────────────────────────────────
// AGGREGATION
// ─────────────────────────────────────────────────────

export async function getConsumerBilling(
  prisma: PrismaClient,
  userId: string,
  options?: GetConsumerBillingOptions,
): Promise<ConsumerBillingData> {
  if (!userId.trim()) {
    throw new Error("userId is required for consumer billing");
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
   * Query all successful requests belonging to this consumer.
   *
   * Critical: businessId = null ensures we only include
   * personal/session requests, NOT business API-key requests.
   */
  const requests = await prisma.request.findMany({
    where: {
      userId,
      businessId: null,
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

  const baseline = await resolveConsumerBaseline(prisma);

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

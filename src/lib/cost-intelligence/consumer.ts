/**
 * Attentra — Consumer Cost Analytics
 *
 * Phase 11 / Step 3B
 *
 * Aggregates persisted request-level cost intelligence
 * for a single authenticated consumer.
 *
 * Important:
 * - Uses persisted historical Request cost facts.
 * - Does not recalculate pricing.
 * - Does not call providers.
 * - Does not call pricing sync.
 * - Does not fabricate baseline savings.
 */

import type { PrismaClient } from "@prisma/client";

import type {
  ConsumerCostAnalytics,
  ConsumerCostModelBreakdown,
  ConsumerCostProviderBreakdown,
  ConsumerCostTaskBreakdown,
  ConsumerCostTrendPoint,
} from "./types";

// ─────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────

export interface GetConsumerCostAnalyticsOptions {
  from?: Date;
  to?: Date;
}

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

/**
 * Safely converts Prisma Decimal/string/number/null values
 * into a JavaScript number.
 */
function decimalToNumber(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function percentageOf(
  part: number,
  total: number,
): number {
  if (total === 0) {
    return 0;
  }

  return roundPercentage(
    (part / total) * 100,
  );
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function validateOptions(
  options?: GetConsumerCostAnalyticsOptions,
) {
  if (
    options?.from &&
    Number.isNaN(options.from.getTime())
  ) {
    throw new Error(
      "Invalid consumer cost analytics 'from' date",
    );
  }

  if (
    options?.to &&
    Number.isNaN(options.to.getTime())
  ) {
    throw new Error(
      "Invalid consumer cost analytics 'to' date",
    );
  }

  if (
    options?.from &&
    options?.to &&
    options.from > options.to
  ) {
    throw new Error(
      "Consumer cost analytics 'from' date cannot be after 'to' date",
    );
  }
}

// ─────────────────────────────────────────────────────
// AGGREGATION
// ─────────────────────────────────────────────────────

export async function getConsumerCostAnalytics(
  prisma: PrismaClient,
  userId: string,
  options?: GetConsumerCostAnalyticsOptions,
): Promise<ConsumerCostAnalytics> {
  if (!userId.trim()) {
    throw new Error(
      "userId is required for consumer cost analytics",
    );
  }

  validateOptions(options);

  const createdAtFilter =
    options?.from || options?.to
      ? {
          ...(options.from
            ? {
                gte: options.from,
              }
            : {}),

          ...(options.to
            ? {
                lte: options.to,
              }
            : {}),
        }
      : undefined;

  /**
   * Query every successful request.
   *
   * We intentionally do NOT filter actualCost != null here.
   *
   * This allows:
   *
   * requestCount
   *   = every successful consumer request
   *
   * costBearingRequestCount
   *   = successful requests with persisted actual cost
   */
  const requests =
    await prisma.request.findMany({
      where: {
        userId,
        status: "SUCCESS",

        ...(createdAtFilter
          ? {
              createdAt: createdAtFilter,
            }
          : {}),
      },

      orderBy: {
        createdAt: "asc",
      },

      select: {
        id: true,

        taskType: true,

        actualCost: true,
        baselineCost: true,
        savings: true,
        savingsPercentage: true,

        createdAt: true,

        selectedModel: {
          select: {
            id: true,
            modelIdentifier: true,
            displayName: true,
            providerId: true,
          },
        },
      },
    });

  // ───────────────────────────────────────────────────
  // SUMMARY ACCUMULATORS
  // ───────────────────────────────────────────────────

  let actualSpend = 0;
  let comparableActualSpend = 0;
  let baselineSpend = 0;
  let totalSavings = 0;

  let costBearingRequestCount = 0;
  let comparableRequestCount = 0;

  // ───────────────────────────────────────────────────
  // GROUP MAPS
  // ───────────────────────────────────────────────────

  const modelMap = new Map<
    string,
    {
      modelId: string;
      modelIdentifier: string;
      displayName: string;
      providerId: string;
      requestCount: number;
      actualSpend: number;
    }
  >();

  const providerMap = new Map<
    string,
    {
      providerId: string;
      providerName: string;
      requestCount: number;
      actualSpend: number;
    }
  >();

  const taskMap = new Map<
    string,
    {
      taskType: string;
      requestCount: number;
      actualSpend: number;
    }
  >();

  const trendMap = new Map<
    string,
    {
      date: string;
      requestCount: number;
      actualSpend: number;
      baselineSpend: number;
      savings: number;
    }
  >();

  // ───────────────────────────────────────────────────
  // PROCESS REQUESTS
  // ───────────────────────────────────────────────────

  for (const request of requests) {
    const day = dateKey(request.createdAt);

    /**
     * Every successful request contributes to request
     * volume in the daily trend.
     */
    const existingTrend =
      trendMap.get(day) ?? {
        date: day,
        requestCount: 0,
        actualSpend: 0,
        baselineSpend: 0,
        savings: 0,
      };

    existingTrend.requestCount += 1;

    const requestActualCost =
      decimalToNumber(request.actualCost);

    /**
     * Missing actualCost means this request is not safe
     * to include in monetary aggregation.
     */
    if (requestActualCost === null) {
      trendMap.set(day, existingTrend);
      continue;
    }

    costBearingRequestCount += 1;
    actualSpend += requestActualCost;

    existingTrend.actualSpend +=
      requestActualCost;

    // ─────────────────────────────────────────────────
    // MODEL BREAKDOWN
    // ─────────────────────────────────────────────────

    if (request.selectedModel) {
      const modelKey =
        request.selectedModel.id;

      const modelEntry =
        modelMap.get(modelKey) ?? {
          modelId:
            request.selectedModel.id,

          modelIdentifier:
            request.selectedModel
              .modelIdentifier,

          displayName:
            request.selectedModel
              .displayName,

          providerId:
            request.selectedModel
              .providerId,

          requestCount: 0,
          actualSpend: 0,
        };

      modelEntry.requestCount += 1;

      modelEntry.actualSpend +=
        requestActualCost;

      modelMap.set(
        modelKey,
        modelEntry,
      );

      // ───────────────────────────────────────────────
      // PROVIDER BREAKDOWN
      // ───────────────────────────────────────────────

      const providerId =
        request.selectedModel.providerId;

      const providerEntry =
        providerMap.get(providerId) ?? {
          providerId,

          /**
           * Keep this provider-neutral.
           *
           * Phase 12/UI may map provider IDs to
           * presentation labels if required.
           */
          providerName: providerId,

          requestCount: 0,
          actualSpend: 0,
        };

      providerEntry.requestCount += 1;

      providerEntry.actualSpend +=
        requestActualCost;

      providerMap.set(
        providerId,
        providerEntry,
      );
    }

    // ─────────────────────────────────────────────────
    // TASK TYPE BREAKDOWN
    // ─────────────────────────────────────────────────

    const taskType =
      request.taskType ?? "UNKNOWN";

    const taskEntry =
      taskMap.get(taskType) ?? {
        taskType,
        requestCount: 0,
        actualSpend: 0,
      };

    taskEntry.requestCount += 1;

    taskEntry.actualSpend +=
      requestActualCost;

    taskMap.set(
      taskType,
      taskEntry,
    );

    // ─────────────────────────────────────────────────
    // BASELINE / SAVINGS COMPARISON
    // ─────────────────────────────────────────────────

    const requestBaselineCost =
      decimalToNumber(
        request.baselineCost,
      );

    const requestSavings =
      decimalToNumber(request.savings);

    /**
     * A request is comparable only when:
     *
     * - actual cost exists
     * - baseline cost exists
     * - savings exists
     *
     * Do not infer missing values.
     */
    const comparable =
      requestBaselineCost !== null &&
      requestSavings !== null;

    if (comparable) {
      comparableRequestCount += 1;

      comparableActualSpend +=
        requestActualCost;

      baselineSpend +=
        requestBaselineCost;

      totalSavings += requestSavings;

      existingTrend.baselineSpend +=
        requestBaselineCost;

      existingTrend.savings +=
        requestSavings;
    }

    trendMap.set(day, existingTrend);
  }

  // ───────────────────────────────────────────────────
  // FINAL SUMMARY
  // ───────────────────────────────────────────────────

  const roundedActualSpend =
    roundMoney(actualSpend);

  const roundedComparableActualSpend =
    roundMoney(comparableActualSpend);

  const roundedBaselineSpend =
    roundMoney(baselineSpend);

  const roundedSavings =
    roundMoney(totalSavings);

  /**
   * Aggregate savings percentage must be:
   *
   * total savings / total baseline spend
   *
   * Never average individual request percentages.
   */
  const savingsPercentage =
    roundedBaselineSpend > 0
      ? roundPercentage(
          (roundedSavings /
            roundedBaselineSpend) *
            100,
        )
      : 0;

  const averageCostPerRequest =
    costBearingRequestCount > 0
      ? roundMoney(
          roundedActualSpend /
            costBearingRequestCount,
        )
      : 0;

  /**
   * Spend coverage:
   *
   * Of all spend we know about, how much had a valid
   * baseline comparison?
   */
  const comparableSpendCoverage =
    roundedActualSpend > 0
      ? roundPercentage(
          (roundedComparableActualSpend /
            roundedActualSpend) *
            100,
        )
      : 0;

  // ───────────────────────────────────────────────────
  // BREAKDOWNS
  // ───────────────────────────────────────────────────

  const byModel: ConsumerCostModelBreakdown[] =
    Array.from(modelMap.values())
      .map((entry) => ({
        ...entry,

        actualSpend: roundMoney(
          entry.actualSpend,
        ),

        percentageOfSpend: percentageOf(
          entry.actualSpend,
          actualSpend,
        ),
      }))
      .sort(
        (a, b) =>
          b.actualSpend - a.actualSpend,
      );

  const byProvider: ConsumerCostProviderBreakdown[] =
    Array.from(providerMap.values())
      .map((entry) => ({
        ...entry,

        actualSpend: roundMoney(
          entry.actualSpend,
        ),

        percentageOfSpend: percentageOf(
          entry.actualSpend,
          actualSpend,
        ),
      }))
      .sort(
        (a, b) =>
          b.actualSpend - a.actualSpend,
      );

  const byTaskType: ConsumerCostTaskBreakdown[] =
    Array.from(taskMap.values())
      .map((entry) => ({
        ...entry,

        actualSpend: roundMoney(
          entry.actualSpend,
        ),

        percentageOfSpend: percentageOf(
          entry.actualSpend,
          actualSpend,
        ),
      }))
      .sort(
        (a, b) =>
          b.actualSpend - a.actualSpend,
      );

  const trend: ConsumerCostTrendPoint[] =
    Array.from(trendMap.values())
      .map((entry) => ({
        date: entry.date,

        requestCount:
          entry.requestCount,

        actualSpend: roundMoney(
          entry.actualSpend,
        ),

        baselineSpend: roundMoney(
          entry.baselineSpend,
        ),

        savings: roundMoney(
          entry.savings,
        ),
      }))
      .sort((a, b) =>
        a.date.localeCompare(b.date),
      );

  return {
    summary: {
      requestCount: requests.length,

      costBearingRequestCount,

      comparableRequestCount,

      actualSpend:
        roundedActualSpend,

      comparableActualSpend:
        roundedComparableActualSpend,

      baselineSpend:
        roundedBaselineSpend,

      savings:
        roundedSavings,

      savingsPercentage,

      averageCostPerRequest,

      comparableSpendCoverage,
    },

    byModel,
    byProvider,
    byTaskType,

    trend,
  };
}
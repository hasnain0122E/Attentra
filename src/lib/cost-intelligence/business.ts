/**
 * Attentra — Business Cost Analytics
 *
 * Phase 11 / Step 4
 *
 * Aggregates persisted request-level cost intelligence
 * for a single business / organization.
 *
 * Important:
 * - Uses persisted historical Request cost facts.
 * - Does not recalculate historical pricing.
 * - Does not call providers.
 * - Does not trigger pricing sync.
 * - Does not fabricate baseline savings.
 */

import type { PrismaClient } from "@prisma/client";

import type {
  BusinessCostAnalytics,
  BusinessCostMemberBreakdown,
  BusinessCostModelBreakdown,
  BusinessCostProviderBreakdown,
  BusinessCostTaskBreakdown,
  BusinessCostTrendPoint,
} from "./types";

// ─────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────

export interface GetBusinessCostAnalyticsOptions {
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
  return Number(
    value.toFixed(MONEY_DECIMAL_PLACES),
  );
}

function roundPercentage(
  value: number,
): number {
  return Number(
    value.toFixed(
      PERCENTAGE_DECIMAL_PLACES,
    ),
  );
}

function decimalToNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
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
    const parsed = Number(
      value.toString(),
    );

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

function dateKey(
  date: Date,
): string {
  return date
    .toISOString()
    .slice(0, 10);
}

function validateOptions(
  options?: GetBusinessCostAnalyticsOptions,
) {
  if (
    options?.from &&
    Number.isNaN(
      options.from.getTime(),
    )
  ) {
    throw new Error(
      "Invalid business cost analytics 'from' date",
    );
  }

  if (
    options?.to &&
    Number.isNaN(
      options.to.getTime(),
    )
  ) {
    throw new Error(
      "Invalid business cost analytics 'to' date",
    );
  }

  if (
    options?.from &&
    options?.to &&
    options.from > options.to
  ) {
    throw new Error(
      "Business cost analytics 'from' date cannot be after 'to' date",
    );
  }
}

// ─────────────────────────────────────────────────────
// AGGREGATION
// ─────────────────────────────────────────────────────

export async function getBusinessCostAnalytics(
  prisma: PrismaClient,
  businessId: string,
  options?: GetBusinessCostAnalyticsOptions,
): Promise<BusinessCostAnalytics> {
  if (!businessId.trim()) {
    throw new Error(
      "businessId is required for business cost analytics",
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
   * Query every successful request belonging to
   * this organization.
   *
   * Do not filter actualCost here because requestCount
   * must represent all successful business requests,
   * including historical rows without cost intelligence.
   */
  const requests =
    await prisma.request.findMany({
      where: {
        businessId,
        status: "SUCCESS",

        ...(createdAtFilter
          ? {
              createdAt:
                createdAtFilter,
            }
          : {}),
      },

      orderBy: {
        createdAt: "asc",
      },

      select: {
        id: true,

        userId: true,
        taskType: true,

        actualCost: true,
        baselineCost: true,
        savings: true,
        savingsPercentage: true,

        createdAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

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
  // SUMMARY
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

  const memberMap = new Map<
    string,
    {
      userId: string;
      name: string | null;
      email: string | null;
      requestCount: number;
      actualSpend: number;
    }
  >();

  const activeMemberIds =
    new Set<string>();

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
    const day = dateKey(
      request.createdAt,
    );

    const trendEntry =
      trendMap.get(day) ?? {
        date: day,
        requestCount: 0,
        actualSpend: 0,
        baselineSpend: 0,
        savings: 0,
      };

    /**
     * Every successful request contributes to
     * request-volume analytics.
     */
    trendEntry.requestCount += 1;

    /**
     * Track active organization members even when an
     * old request does not have persisted cost data.
     */
    if (request.userId) {
      activeMemberIds.add(
        request.userId,
      );
    }

    const requestActualCost =
      decimalToNumber(
        request.actualCost,
      );

    /**
     * Missing actual cost means the request must not
     * contribute to monetary aggregation.
     */
    if (
      requestActualCost === null
    ) {
      trendMap.set(
        day,
        trendEntry,
      );

      continue;
    }

    costBearingRequestCount += 1;

    actualSpend +=
      requestActualCost;

    trendEntry.actualSpend +=
      requestActualCost;

    // ─────────────────────────────────────────────────
    // MODEL
    // ─────────────────────────────────────────────────

    if (request.selectedModel) {
      const model =
        request.selectedModel;

      const existingModel =
        modelMap.get(model.id) ?? {
          modelId: model.id,

          modelIdentifier:
            model.modelIdentifier,

          displayName:
            model.displayName,

          providerId:
            model.providerId,

          requestCount: 0,
          actualSpend: 0,
        };

      existingModel.requestCount += 1;

      existingModel.actualSpend +=
        requestActualCost;

      modelMap.set(
        model.id,
        existingModel,
      );

      // ───────────────────────────────────────────────
      // PROVIDER
      // ───────────────────────────────────────────────

      const providerId =
        model.providerId;

      const existingProvider =
        providerMap.get(
          providerId,
        ) ?? {
          providerId,

          providerName:
            providerId,

          requestCount: 0,
          actualSpend: 0,
        };

      existingProvider.requestCount +=
        1;

      existingProvider.actualSpend +=
        requestActualCost;

      providerMap.set(
        providerId,
        existingProvider,
      );
    }

    // ─────────────────────────────────────────────────
    // TASK
    // ─────────────────────────────────────────────────

    const taskType =
      request.taskType ??
      "UNKNOWN";

    const existingTask =
      taskMap.get(taskType) ?? {
        taskType,
        requestCount: 0,
        actualSpend: 0,
      };

    existingTask.requestCount += 1;

    existingTask.actualSpend +=
      requestActualCost;

    taskMap.set(
      taskType,
      existingTask,
    );

    // ─────────────────────────────────────────────────
    // MEMBER
    // ─────────────────────────────────────────────────

    if (request.userId) {
      const userId =
        request.userId;

      const existingMember =
        memberMap.get(userId) ?? {
          userId,

          name:
            request.user?.name ??
            null,

          email:
            request.user?.email ??
            null,

          requestCount: 0,
          actualSpend: 0,
        };

      existingMember.requestCount += 1;

      existingMember.actualSpend +=
        requestActualCost;

      memberMap.set(
        userId,
        existingMember,
      );
    }

    // ─────────────────────────────────────────────────
    // BASELINE COMPARISON
    // ─────────────────────────────────────────────────

    const requestBaselineCost =
      decimalToNumber(
        request.baselineCost,
      );

    const requestSavings =
      decimalToNumber(
        request.savings,
      );

    const comparable =
      requestBaselineCost !== null &&
      requestSavings !== null;

    if (comparable) {
      comparableRequestCount += 1;

      comparableActualSpend +=
        requestActualCost;

      baselineSpend +=
        requestBaselineCost;

      totalSavings +=
        requestSavings;

      trendEntry.baselineSpend +=
        requestBaselineCost;

      trendEntry.savings +=
        requestSavings;
    }

    trendMap.set(
      day,
      trendEntry,
    );
  }

  // ───────────────────────────────────────────────────
  // SUMMARY CALCULATIONS
  // ───────────────────────────────────────────────────

  const roundedActualSpend =
    roundMoney(actualSpend);

  const roundedComparableActualSpend =
    roundMoney(
      comparableActualSpend,
    );

  const roundedBaselineSpend =
    roundMoney(
      baselineSpend,
    );

  const roundedSavings =
    roundMoney(
      totalSavings,
    );

  /**
   * Organization savings percentage must be calculated
   * from aggregate totals.
   *
   * Do NOT average per-request savings percentages.
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

  const byModel: BusinessCostModelBreakdown[] =
    Array.from(
      modelMap.values(),
    )
      .map((entry) => ({
        ...entry,

        actualSpend:
          roundMoney(
            entry.actualSpend,
          ),

        percentageOfSpend:
          percentageOf(
            entry.actualSpend,
            actualSpend,
          ),
      }))
      .sort(
        (a, b) =>
          b.actualSpend -
          a.actualSpend,
      );

  const byProvider: BusinessCostProviderBreakdown[] =
    Array.from(
      providerMap.values(),
    )
      .map((entry) => ({
        ...entry,

        actualSpend:
          roundMoney(
            entry.actualSpend,
          ),

        percentageOfSpend:
          percentageOf(
            entry.actualSpend,
            actualSpend,
          ),
      }))
      .sort(
        (a, b) =>
          b.actualSpend -
          a.actualSpend,
      );

  const byTaskType: BusinessCostTaskBreakdown[] =
    Array.from(
      taskMap.values(),
    )
      .map((entry) => ({
        ...entry,

        actualSpend:
          roundMoney(
            entry.actualSpend,
          ),

        percentageOfSpend:
          percentageOf(
            entry.actualSpend,
            actualSpend,
          ),
      }))
      .sort(
        (a, b) =>
          b.actualSpend -
          a.actualSpend,
      );

  const byMember: BusinessCostMemberBreakdown[] =
    Array.from(
      memberMap.values(),
    )
      .map((entry) => ({
        ...entry,

        actualSpend:
          roundMoney(
            entry.actualSpend,
          ),

        percentageOfSpend:
          percentageOf(
            entry.actualSpend,
            actualSpend,
          ),
      }))
      .sort(
        (a, b) =>
          b.actualSpend -
          a.actualSpend,
      );

  const trend: BusinessCostTrendPoint[] =
    Array.from(
      trendMap.values(),
    )
      .map((entry) => ({
        date:
          entry.date,

        requestCount:
          entry.requestCount,

        actualSpend:
          roundMoney(
            entry.actualSpend,
          ),

        baselineSpend:
          roundMoney(
            entry.baselineSpend,
          ),

        savings:
          roundMoney(
            entry.savings,
          ),
      }))
      .sort((a, b) =>
        a.date.localeCompare(
          b.date,
        ),
      );

  return {
    summary: {
      requestCount:
        requests.length,

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

      activeMemberCount:
        activeMemberIds.size,
    },

    byModel,
    byProvider,
    byTaskType,
    byMember,

    trend,
  };
}
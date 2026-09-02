/**
 * Attentra — Consumer Cost Analytics Tests
 *
 * Phase 11 / Step 3B
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@prisma/client";

import { getConsumerCostAnalytics } from "@/lib/cost-intelligence/consumer";

// ─────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────

const mockFindMany = vi.fn();

const prisma = {
  request: {
    findMany: mockFindMany,
  },
} as unknown as PrismaClient;

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function requestFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",

    taskType: "GENERAL",

    actualCost: 0.002,
    baselineCost: 0.01,
    savings: 0.008,
    savingsPercentage: 80,

    createdAt: new Date("2026-09-01T10:00:00.000Z"),

    selectedModel: {
      id: "model-1",

      modelIdentifier: "gemini-2.5-flash",

      displayName: "Gemini 2.5 Flash",

      providerId: "google",
    },

    ...overrides,
  };
}

// ─────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────

describe("getConsumerCostAnalytics", () => {
  it("returns zero analytics for an empty request history", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.summary).toEqual({
      requestCount: 0,
      costBearingRequestCount: 0,
      comparableRequestCount: 0,

      actualSpend: 0,
      comparableActualSpend: 0,

      baselineSpend: 0,
      savings: 0,
      savingsPercentage: 0,

      averageCostPerRequest: 0,

      comparableSpendCoverage: 0,
    });

    expect(result.byModel).toEqual([]);

    expect(result.byProvider).toEqual([]);

    expect(result.byTaskType).toEqual([]);

    expect(result.trend).toEqual([]);
  });

  it("aggregates actual consumer spend", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",
        actualCost: 0.002,
        baselineCost: null,
        savings: null,
      }),

      requestFixture({
        id: "req-2",
        actualCost: 0.003,
        baselineCost: null,
        savings: null,
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.summary.requestCount).toBe(2);

    expect(result.summary.costBearingRequestCount).toBe(2);

    expect(result.summary.actualSpend).toBe(0.005);

    expect(result.summary.averageCostPerRequest).toBe(0.0025);
  });

  it("calculates aggregate savings percentage from total spend instead of averaging request percentages", async () => {
  mockFindMany.mockResolvedValue([
    requestFixture({
      id: "req-small-baseline",
      actualCost: 0.5,
      baselineCost: 1,
      savings: 0.5,
      savingsPercentage: 50,
    }),

    requestFixture({
      id: "req-large-baseline",
      actualCost: 8.1,
      baselineCost: 9,
      savings: 0.9,
      savingsPercentage: 10,
    }),
  ]);

  const result =
    await getConsumerCostAnalytics(
      prisma,
      "user-1",
    );

  expect(
    result.summary.actualSpend,
  ).toBe(8.6);

  expect(
    result.summary.baselineSpend,
  ).toBe(10);

  expect(
    result.summary.savings,
  ).toBe(1.4);

  expect(
    result.summary.savingsPercentage,
  ).toBe(14);
});

  it("aggregates baseline spend and savings only for comparable requests", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",

        actualCost: 0.002,
        baselineCost: 0.01,
        savings: 0.008,
      }),

      requestFixture({
        id: "req-2",

        actualCost: 0.004,
        baselineCost: 0.02,
        savings: 0.016,
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.summary.comparableRequestCount).toBe(2);

    expect(result.summary.comparableActualSpend).toBe(0.006);

    expect(result.summary.baselineSpend).toBe(0.03);

    expect(result.summary.savings).toBe(0.024);

    expect(result.summary.savingsPercentage).toBe(80);

    expect(result.summary.comparableSpendCoverage).toBe(100);
  });

  it("does not fabricate savings when baseline data is missing", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        actualCost: 0.005,
        baselineCost: null,
        savings: null,
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.summary.actualSpend).toBe(0.005);

    expect(result.summary.baselineSpend).toBe(0);

    expect(result.summary.savings).toBe(0);

    expect(result.summary.savingsPercentage).toBe(0);

    expect(result.summary.comparableRequestCount).toBe(0);
  });

  it("distinguishes total successful requests from cost-bearing requests", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-costed",
        actualCost: 0.002,
      }),

      requestFixture({
        id: "req-no-cost",
        actualCost: null,
        baselineCost: null,
        savings: null,
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.summary.requestCount).toBe(2);

    expect(result.summary.costBearingRequestCount).toBe(1);
  });

  it("groups spend by executed model", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",
        actualCost: 0.002,

        selectedModel: {
          id: "model-google",
          modelIdentifier: "gemini-2.5-flash",
          displayName: "Gemini 2.5 Flash",
          providerId: "google",
        },
      }),

      requestFixture({
        id: "req-2",
        actualCost: 0.003,

        selectedModel: {
          id: "model-google",
          modelIdentifier: "gemini-2.5-flash",
          displayName: "Gemini 2.5 Flash",
          providerId: "google",
        },
      }),

      requestFixture({
        id: "req-3",
        actualCost: 0.005,

        selectedModel: {
          id: "model-anthropic",
          modelIdentifier: "claude-sonnet",
          displayName: "Claude Sonnet",
          providerId: "anthropic",
        },
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.byModel).toHaveLength(2);

    const anthropicModel = result.byModel.find(
      (model) => model.modelId === "model-anthropic",
    );

    const googleModel = result.byModel.find(
      (model) => model.modelId === "model-google",
    );

    expect(anthropicModel).toEqual(
      expect.objectContaining({
        modelId: "model-anthropic",
        modelIdentifier: "claude-sonnet",
        displayName: "Claude Sonnet",
        providerId: "anthropic",
        requestCount: 1,
        actualSpend: 0.005,
        percentageOfSpend: 50,
      }),
    );

    expect(googleModel).toEqual(
      expect.objectContaining({
        modelId: "model-google",
        modelIdentifier: "gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        providerId: "google",
        requestCount: 2,
        actualSpend: 0.005,
        percentageOfSpend: 50,
      }),
    );
  });

  it("groups spend by provider", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",
        actualCost: 0.002,

        selectedModel: {
          id: "model-1",
          modelIdentifier: "g1",
          displayName: "Google 1",
          providerId: "google",
        },
      }),

      requestFixture({
        id: "req-2",
        actualCost: 0.003,

        selectedModel: {
          id: "model-2",
          modelIdentifier: "g2",
          displayName: "Google 2",
          providerId: "google",
        },
      }),

      requestFixture({
        id: "req-3",
        actualCost: 0.005,

        selectedModel: {
          id: "model-3",
          modelIdentifier: "c1",
          displayName: "Claude Sonnet",
          providerId: "anthropic",
        },
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.byProvider).toHaveLength(2);

    const google = result.byProvider.find(
      (provider) => provider.providerId === "google",
    );

    expect(google).toEqual(
      expect.objectContaining({
        requestCount: 2,
        actualSpend: 0.005,
        percentageOfSpend: 50,
      }),
    );
  });

  it("groups spend by task type", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",
        taskType: "CODING",
        actualCost: 0.006,
      }),

      requestFixture({
        id: "req-2",
        taskType: "CODING",
        actualCost: 0.002,
      }),

      requestFixture({
        id: "req-3",
        taskType: "WRITING",
        actualCost: 0.002,
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    const coding = result.byTaskType.find((task) => task.taskType === "CODING");

    expect(coding).toEqual(
      expect.objectContaining({
        requestCount: 2,

        actualSpend: 0.008,

        percentageOfSpend: 80,
      }),
    );
  });

  it("aggregates daily cost trend", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",

        actualCost: 0.002,
        baselineCost: 0.01,
        savings: 0.008,

        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      }),

      requestFixture({
        id: "req-2",

        actualCost: 0.003,
        baselineCost: 0.01,
        savings: 0.007,

        createdAt: new Date("2026-09-01T18:00:00.000Z"),
      }),

      requestFixture({
        id: "req-3",

        actualCost: 0.004,
        baselineCost: 0.01,
        savings: 0.006,

        createdAt: new Date("2026-09-02T10:00:00.000Z"),
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.trend).toEqual([
      {
        date: "2026-09-01",

        requestCount: 2,

        actualSpend: 0.005,

        baselineSpend: 0.02,

        savings: 0.015,
      },

      {
        date: "2026-09-02",

        requestCount: 1,

        actualSpend: 0.004,

        baselineSpend: 0.01,

        savings: 0.006,
      },
    ]);
  });

  it("passes date range filtering to Prisma", async () => {
    mockFindMany.mockResolvedValue([]);

    const from = new Date("2026-08-01T00:00:00.000Z");

    const to = new Date("2026-08-31T23:59:59.999Z");

    await getConsumerCostAnalytics(prisma, "user-123", {
      from,
      to,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-123",

          status: "SUCCESS",

          createdAt: {
            gte: from,
            lte: to,
          },
        },
      }),
    );
  });

  it("throws for an empty userId", async () => {
    await expect(getConsumerCostAnalytics(prisma, "   ")).rejects.toThrow(
      "userId is required",
    );

    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("throws when from date is after to date", async () => {
    await expect(
      getConsumerCostAnalytics(prisma, "user-1", {
        from: new Date("2026-09-10T00:00:00.000Z"),

        to: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("cannot be after");
  });

  it("preserves negative savings when Attentra costs more than baseline", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        actualCost: 0.02,
        baselineCost: 0.01,
        savings: -0.01,
        savingsPercentage: -100,
      }),
    ]);

    const result = await getConsumerCostAnalytics(prisma, "user-1");

    expect(result.summary.actualSpend).toBe(0.02);

    expect(result.summary.baselineSpend).toBe(0.01);

    expect(result.summary.savings).toBe(-0.01);

    expect(result.summary.savingsPercentage).toBe(-100);
  });
});

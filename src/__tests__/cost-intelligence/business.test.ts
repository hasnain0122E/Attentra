import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@prisma/client";

import { getBusinessCostAnalytics } from "@/lib/cost-intelligence/business";

const mockFindMany = vi.fn();

const prisma = {
  request: {
    findMany: mockFindMany,
  },
} as unknown as PrismaClient;

function requestFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",

    userId: "user-1",

    taskType: "GENERAL",

    actualCost: 0.002,
    baselineCost: 0.01,
    savings: 0.008,
    savingsPercentage: 80,

    createdAt: new Date("2026-09-01T10:00:00.000Z"),

    user: {
      id: "user-1",
      name: "Hasnain",
      email: "hasnain@example.com",
    },

    selectedModel: {
      id: "model-1",

      modelIdentifier: "gemini-2.5-flash",

      displayName: "Gemini 2.5 Flash",

      providerId: "google",
    },

    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBusinessCostAnalytics", () => {
  it("returns zero analytics for an empty business history", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

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

      activeMemberCount: 0,
    });

    expect(result.byModel).toEqual([]);

    expect(result.byProvider).toEqual([]);

    expect(result.byTaskType).toEqual([]);

    expect(result.byMember).toEqual([]);

    expect(result.trend).toEqual([]);
  });

  it("aggregates total business spend", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",
        actualCost: 0.004,
        baselineCost: null,
        savings: null,
      }),

      requestFixture({
        id: "req-2",
        actualCost: 0.006,
        baselineCost: null,
        savings: null,
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    expect(result.summary.requestCount).toBe(2);

    expect(result.summary.costBearingRequestCount).toBe(2);

    expect(result.summary.actualSpend).toBe(0.01);

    expect(result.summary.averageCostPerRequest).toBe(0.005);
  });

  it("aggregates business baseline spend and savings", async () => {
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

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    expect(result.summary.comparableRequestCount).toBe(2);

    expect(result.summary.comparableActualSpend).toBe(0.006);

    expect(result.summary.baselineSpend).toBe(0.03);

    expect(result.summary.savings).toBe(0.024);

    expect(result.summary.savingsPercentage).toBe(80);

    expect(result.summary.comparableSpendCoverage).toBe(100);
  });

  it("does not fabricate savings for requests without a baseline", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        actualCost: 0.007,
        baselineCost: null,
        savings: null,
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    expect(result.summary.actualSpend).toBe(0.007);

    expect(result.summary.baselineSpend).toBe(0);

    expect(result.summary.savings).toBe(0);

    expect(result.summary.comparableRequestCount).toBe(0);
  });

  it("counts unique active business members", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",
        userId: "user-1",
      }),

      requestFixture({
        id: "req-2",
        userId: "user-1",
      }),

      requestFixture({
        id: "req-3",
        userId: "user-2",

        user: {
          id: "user-2",
          name: "Member Two",
          email: "member2@example.com",
        },
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    expect(result.summary.activeMemberCount).toBe(2);
  });

  it("groups spend by member", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",

        userId: "user-1",

        actualCost: 0.002,
      }),

      requestFixture({
        id: "req-2",

        userId: "user-1",

        actualCost: 0.003,
      }),

      requestFixture({
        id: "req-3",

        userId: "user-2",

        actualCost: 0.005,

        user: {
          id: "user-2",
          name: "Member Two",
          email: "member2@example.com",
        },
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    expect(result.byMember).toHaveLength(2);

    const user1 = result.byMember.find((member) => member.userId === "user-1");

    const user2 = result.byMember.find((member) => member.userId === "user-2");

    expect(user1).toEqual(
      expect.objectContaining({
        requestCount: 2,
        actualSpend: 0.005,
        percentageOfSpend: 50,
      }),
    );

    expect(user2).toEqual(
      expect.objectContaining({
        requestCount: 1,
        actualSpend: 0.005,
        percentageOfSpend: 50,
      }),
    );
  });

  it("includes unattributed business API spend without creating a member", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",

        userId: null,
        user: null,

        actualCost: 0.01,

        baselineCost: null,
        savings: null,
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    expect(result.summary.actualSpend).toBe(0.01);

    expect(result.summary.activeMemberCount).toBe(0);

    expect(result.byMember).toEqual([]);
  });

  it("groups spend by model without depending on ordering ties", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",

        actualCost: 0.005,

        selectedModel: {
          id: "model-google",
          modelIdentifier: "gemini-2.5-flash",
          displayName: "Gemini 2.5 Flash",
          providerId: "google",
        },
      }),

      requestFixture({
        id: "req-2",

        actualCost: 0.005,

        selectedModel: {
          id: "model-anthropic",
          modelIdentifier: "claude-sonnet",
          displayName: "Claude Sonnet",
          providerId: "anthropic",
        },
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    const google = result.byModel.find(
      (model) => model.modelId === "model-google",
    );

    const anthropic = result.byModel.find(
      (model) => model.modelId === "model-anthropic",
    );

    expect(google).toEqual(
      expect.objectContaining({
        actualSpend: 0.005,
        percentageOfSpend: 50,
      }),
    );

    expect(anthropic).toEqual(
      expect.objectContaining({
        actualSpend: 0.005,
        percentageOfSpend: 50,
      }),
    );
  });

  it("groups spend by provider", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",

        actualCost: 0.006,

        selectedModel: {
          id: "model-g1",
          modelIdentifier: "google-1",
          displayName: "Google 1",
          providerId: "google",
        },
      }),

      requestFixture({
        id: "req-2",

        actualCost: 0.004,

        selectedModel: {
          id: "model-a1",
          modelIdentifier: "claude-1",
          displayName: "Claude 1",
          providerId: "anthropic",
        },
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    const google = result.byProvider.find(
      (provider) => provider.providerId === "google",
    );

    expect(google).toEqual(
      expect.objectContaining({
        requestCount: 1,
        actualSpend: 0.006,
        percentageOfSpend: 60,
      }),
    );
  });

  it("groups spend by task type", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        id: "req-1",
        taskType: "CODING",
        actualCost: 0.008,
      }),

      requestFixture({
        id: "req-2",
        taskType: "WRITING",
        actualCost: 0.002,
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    const coding = result.byTaskType.find((task) => task.taskType === "CODING");

    expect(coding).toEqual(
      expect.objectContaining({
        requestCount: 1,
        actualSpend: 0.008,
        percentageOfSpend: 80,
      }),
    );
  });

  it("aggregates daily business trend", async () => {
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

        createdAt: new Date("2026-09-01T20:00:00.000Z"),
      }),

      requestFixture({
        id: "req-3",

        actualCost: 0.004,
        baselineCost: 0.01,
        savings: 0.006,

        createdAt: new Date("2026-09-02T08:00:00.000Z"),
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

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

  it("passes business and date filters to Prisma", async () => {
    mockFindMany.mockResolvedValue([]);

    const from = new Date("2026-08-01T00:00:00.000Z");

    const to = new Date("2026-08-31T23:59:59.999Z");

    await getBusinessCostAnalytics(prisma, "business-123", {
      from,
      to,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: "business-123",

          status: "SUCCESS",

          createdAt: {
            gte: from,
            lte: to,
          },
        },
      }),
    );
  });

  it("throws for an empty businessId", async () => {
    await expect(getBusinessCostAnalytics(prisma, "   ")).rejects.toThrow(
      "businessId is required",
    );

    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("throws when from date is after to date", async () => {
    await expect(
      getBusinessCostAnalytics(prisma, "business-1", {
        from: new Date("2026-09-10T00:00:00.000Z"),

        to: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("cannot be after");
  });

  it("preserves negative organization savings", async () => {
    mockFindMany.mockResolvedValue([
      requestFixture({
        actualCost: 0.02,
        baselineCost: 0.01,
        savings: -0.01,
        savingsPercentage: -100,
      }),
    ]);

    const result = await getBusinessCostAnalytics(prisma, "business-1");

    expect(result.summary.actualSpend).toBe(0.02);

    expect(result.summary.baselineSpend).toBe(0.01);

    expect(result.summary.savings).toBe(-0.01);

    expect(result.summary.savingsPercentage).toBe(-100);
  });
});

it("calculates business aggregate savings percentage from total spend instead of averaging request percentages", async () => {
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

  const result = await getBusinessCostAnalytics(prisma, "business-1");

  expect(result.summary.actualSpend).toBe(8.6);

  expect(result.summary.baselineSpend).toBe(10);

  expect(result.summary.savings).toBe(1.4);

  expect(result.summary.savingsPercentage).toBe(14);
});

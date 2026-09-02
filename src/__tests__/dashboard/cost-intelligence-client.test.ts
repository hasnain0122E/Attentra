import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  fetchBusinessCostAnalytics,
  fetchConsumerCostAnalytics,
} from "@/lib/dashboard/cost-intelligence-client";

const fetchMock = vi.fn();

const consumerAnalytics = {
  summary: {
    requestCount: 10,
    costBearingRequestCount: 10,
    comparableRequestCount: 8,

    actualSpend: 0.1,
    comparableActualSpend: 0.08,
    baselineSpend: 0.2,

    savings: 0.12,
    savingsPercentage: 60,

    averageCostPerRequest: 0.01,
    comparableSpendCoverage: 80,
  },

  byModel: [],
  byProvider: [],
  byTaskType: [],
  trend: [],
};

const businessAnalytics = {
  summary: {
    requestCount: 20,
    costBearingRequestCount: 18,
    comparableRequestCount: 15,

    actualSpend: 0.3,
    comparableActualSpend: 0.25,
    baselineSpend: 0.6,

    savings: 0.35,
    savingsPercentage: 58.3333,

    averageCostPerRequest: 0.01666667,
    comparableSpendCoverage: 83.3333,

    activeMemberCount: 4,
  },

  byModel: [],
  byProvider: [],
  byTaskType: [],
  byMember: [],
  trend: [],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    fetchMock,
  );

  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(
  "dashboard cost intelligence client",
  () => {
    it("loads consumer analytics", async () => {
      fetchMock.mockResolvedValue({
        ok: true,

        json: async () => ({
          success: true,
          data: consumerAnalytics,
        }),
      });

      const result =
        await fetchConsumerCostAnalytics();

      expect(result).toEqual(
        consumerAnalytics,
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/dashboard/cost-intelligence",
        expect.objectContaining({
          method: "GET",
          cache: "no-store",
        }),
      );
    });

    it("adds consumer date filters", async () => {
      fetchMock.mockResolvedValue({
        ok: true,

        json: async () => ({
          success: true,
          data: consumerAnalytics,
        }),
      });

      await fetchConsumerCostAnalytics({
        from: new Date(
          "2026-09-01T00:00:00.000Z",
        ),

        to: new Date(
          "2026-09-30T23:59:59.999Z",
        ),
      });

      const url =
        fetchMock.mock.calls[0][0] as string;

      expect(url).toContain(
        "/api/dashboard/cost-intelligence?",
      );

      expect(url).toContain(
        "from=",
      );

      expect(url).toContain(
        "to=",
      );
    });

    it("loads business analytics", async () => {
      fetchMock.mockResolvedValue({
        ok: true,

        json: async () => ({
          success: true,
          data: businessAnalytics,
        }),
      });

      const result =
        await fetchBusinessCostAnalytics(
          "business-123",
        );

      expect(result).toEqual(
        businessAnalytics,
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/business/business-123/cost-intelligence",
        expect.anything(),
      );
    });

    it("encodes business IDs", async () => {
      fetchMock.mockResolvedValue({
        ok: true,

        json: async () => ({
          success: true,
          data: businessAnalytics,
        }),
      });

      await fetchBusinessCostAnalytics(
        "business/test",
      );

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        "/api/business/business%2Ftest/cost-intelligence",
      );
    });

    it("rejects an empty business ID before fetch", async () => {
      await expect(
        fetchBusinessCostAnalytics(
          "   ",
        ),
      ).rejects.toThrow(
        "businessId is required",
      );

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("surfaces API errors", async () => {
      fetchMock.mockResolvedValue({
        ok: false,

        json: async () => ({
          success: false,

          error: {
            code:
              "COST_ANALYTICS_ERROR",

            message:
              "Unable to load cost analytics",
          },
        }),
      });

      await expect(
        fetchConsumerCostAnalytics(),
      ).rejects.toThrow(
        "Unable to load cost analytics",
      );
    });

    it("handles malformed API responses", async () => {
      fetchMock.mockResolvedValue({
        ok: false,

        json: async () => {
          throw new Error(
            "invalid json",
          );
        },
      });

      await expect(
        fetchConsumerCostAnalytics(),
      ).rejects.toThrow(
        "Invalid analytics response",
      );
    });
  },
);
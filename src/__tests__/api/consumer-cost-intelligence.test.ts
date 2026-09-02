import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  NextRequest,
} from "next/server";

const mocks = vi.hoisted(
  () => ({
    requireAuth: vi.fn(),

    getConsumerCostAnalytics:
      vi.fn(),
  }),
);

vi.mock(
  "@/lib/auth-utils",
  () => ({
    requireAuth:
      mocks.requireAuth,
  }),
);

vi.mock(
  "@/lib/prisma",
  () => ({
    prisma: {},
  }),
);

vi.mock(
  "@/lib/cost-intelligence",
  () => ({
    getConsumerCostAnalytics:
      mocks.getConsumerCostAnalytics,
  }),
);

import {
  GET,
} from "@/app/api/dashboard/cost-intelligence/route";

beforeEach(() => {
  vi.clearAllMocks();

  mocks.requireAuth.mockResolvedValue({
    user: {
      id: "user-123",
      name: "Test User",
      email:
        "test@example.com",
    },
  });

  mocks.getConsumerCostAnalytics
    .mockResolvedValue({
      summary: {
        requestCount: 5,
        costBearingRequestCount: 5,
        comparableRequestCount: 4,

        actualSpend: 0.05,
        comparableActualSpend: 0.04,
        baselineSpend: 0.1,

        savings: 0.06,
        savingsPercentage: 60,

        averageCostPerRequest:
          0.01,

        comparableSpendCoverage:
          80,
      },

      byModel: [],
      byProvider: [],
      byTaskType: [],
      trend: [],
    });
});

describe(
  "GET /api/dashboard/cost-intelligence",
  () => {
    it("returns authenticated consumer cost analytics", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/dashboard/cost-intelligence",
        );

      const response =
        await GET(request);

      const body =
        await response.json();

      expect(response.status).toBe(
        200,
      );

      expect(body.success).toBe(
        true,
      );

      expect(
        body.data.summary.actualSpend,
      ).toBe(0.05);

      expect(
        mocks.getConsumerCostAnalytics,
      ).toHaveBeenCalledWith(
        expect.anything(),
        "user-123",
        {
          from: undefined,
          to: undefined,
        },
      );
    });

    it("passes date filtering to the analytics service", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/dashboard/cost-intelligence?from=2026-09-01T00%3A00%3A00.000Z&to=2026-09-30T23%3A59%3A59.999Z",
        );

      const response =
        await GET(request);

      expect(response.status).toBe(
        200,
      );

      expect(
        mocks.getConsumerCostAnalytics,
      ).toHaveBeenCalledWith(
        expect.anything(),
        "user-123",
        {
          from: new Date(
            "2026-09-01T00:00:00.000Z",
          ),

          to: new Date(
            "2026-09-30T23:59:59.999Z",
          ),
        },
      );
    });

    it("returns 400 for an invalid date range", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/dashboard/cost-intelligence?from=invalid",
        );

      const response =
        await GET(request);

      const body =
        await response.json();

      expect(response.status).toBe(
        400,
      );

      expect(body).toEqual({
        success: false,

        error: {
          code:
            "INVALID_DATE_RANGE",

          message:
            "Invalid 'from' date",
        },
      });

      expect(
        mocks.getConsumerCostAnalytics,
      ).not.toHaveBeenCalled();
    });

    it("returns 500 when analytics retrieval fails", async () => {
      mocks.getConsumerCostAnalytics
        .mockRejectedValue(
          new Error(
            "database unavailable",
          ),
        );

      const request =
        new NextRequest(
          "http://localhost/api/dashboard/cost-intelligence",
        );

      const response =
        await GET(request);

      const body =
        await response.json();

      expect(response.status).toBe(
        500,
      );

      expect(body).toEqual({
        success: false,

        error: {
          code:
            "COST_ANALYTICS_ERROR",

          message:
            "Unable to load cost analytics",
        },
      });
    });
  },
);
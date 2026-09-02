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
    requireBusinessMembership:
      vi.fn(),

    getBusinessCostAnalytics:
      vi.fn(),
  }),
);

vi.mock(
  "@/lib/auth-utils",
  () => ({
    requireBusinessMembership:
      mocks.requireBusinessMembership,
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
    getBusinessCostAnalytics:
      mocks.getBusinessCostAnalytics,
  }),
);

import {
  GET,
} from "@/app/api/business/[businessId]/cost-intelligence/route";

beforeEach(() => {
  vi.clearAllMocks();

  mocks.requireBusinessMembership
    .mockResolvedValue({
      session: {
        user: {
          id: "user-123",
          name: "Test User",
          email:
            "test@example.com",
        },
      },

      membership: {
        id: "membership-1",
        userId: "user-123",
        businessId:
          "business-123",
        role: "MEMBER",
      },
    });

  mocks.getBusinessCostAnalytics
    .mockResolvedValue({
      summary: {
        requestCount: 10,
        costBearingRequestCount: 9,
        comparableRequestCount: 8,

        actualSpend: 0.2,
        comparableActualSpend: 0.18,
        baselineSpend: 0.5,

        savings: 0.32,
        savingsPercentage: 64,

        averageCostPerRequest:
          0.02222222,

        comparableSpendCoverage:
          90,

        activeMemberCount: 3,
      },

      byModel: [],
      byProvider: [],
      byTaskType: [],
      byMember: [],
      trend: [],
    });
});

function makeContext(
  businessId = "business-123",
) {
  return {
    params: {
      businessId,
    },
  };
}

describe(
  "GET /api/business/[businessId]/cost-intelligence",
  () => {
    it("returns business cost analytics for an authorized member", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/business/business-123/cost-intelligence",
        );

      const response =
        await GET(
          request,
          makeContext(),
        );

      const body =
        await response.json();

      expect(
        response.status,
      ).toBe(200);

      expect(
        body.success,
      ).toBe(true);

      expect(
        body.data.summary.actualSpend,
      ).toBe(0.2);

      expect(
        mocks.requireBusinessMembership,
      ).toHaveBeenCalledWith(
        "business-123",
      );

      expect(
        mocks.getBusinessCostAnalytics,
      ).toHaveBeenCalledWith(
        expect.anything(),
        "business-123",
        {
          from: undefined,
          to: undefined,
        },
      );
    });

    it("passes date filtering to the business analytics service", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/business/business-123/cost-intelligence?from=2026-09-01T00%3A00%3A00.000Z&to=2026-09-30T23%3A59%3A59.999Z",
        );

      const response =
        await GET(
          request,
          makeContext(),
        );

      expect(
        response.status,
      ).toBe(200);

      expect(
        mocks.getBusinessCostAnalytics,
      ).toHaveBeenCalledWith(
        expect.anything(),
        "business-123",
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

    it("returns 400 for an invalid business ID", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/business//cost-intelligence",
        );

      const response =
        await GET(
          request,
          makeContext("   "),
        );

      const body =
        await response.json();

      expect(
        response.status,
      ).toBe(400);

      expect(body).toEqual({
        success: false,

        error: {
          code:
            "INVALID_BUSINESS_ID",

          message:
            "Business ID is required",
        },
      });

      expect(
        mocks.requireBusinessMembership,
      ).not.toHaveBeenCalled();

      expect(
        mocks.getBusinessCostAnalytics,
      ).not.toHaveBeenCalled();
    });

    it("returns 403 when the user is not a business member", async () => {
      mocks.requireBusinessMembership
        .mockRejectedValue(
          new Error(
            "Unauthorized: not a member of this business",
          ),
        );

      const request =
        new NextRequest(
          "http://localhost/api/business/business-123/cost-intelligence",
        );

      const response =
        await GET(
          request,
          makeContext(),
        );

      const body =
        await response.json();

      expect(
        response.status,
      ).toBe(403);

      expect(body).toEqual({
        success: false,

        error: {
          code:
            "BUSINESS_ACCESS_DENIED",

          message:
            "You do not have access to this business",
        },
      });

      expect(
        mocks.getBusinessCostAnalytics,
      ).not.toHaveBeenCalled();
    });

    it("validates membership before reading analytics", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/business/business-123/cost-intelligence",
        );

      await GET(
        request,
        makeContext(),
      );

      expect(
        mocks.requireBusinessMembership.mock
          .invocationCallOrder[0],
      ).toBeLessThan(
        mocks.getBusinessCostAnalytics.mock
          .invocationCallOrder[0],
      );
    });

    it("returns 400 for an invalid date range", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/business/business-123/cost-intelligence?from=invalid",
        );

      const response =
        await GET(
          request,
          makeContext(),
        );

      const body =
        await response.json();

      expect(
        response.status,
      ).toBe(400);

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
        mocks.getBusinessCostAnalytics,
      ).not.toHaveBeenCalled();
    });

    it("returns 500 when analytics retrieval fails", async () => {
      mocks.getBusinessCostAnalytics
        .mockRejectedValue(
          new Error(
            "database unavailable",
          ),
        );

      const request =
        new NextRequest(
          "http://localhost/api/business/business-123/cost-intelligence",
        );

      const response =
        await GET(
          request,
          makeContext(),
        );

      const body =
        await response.json();

      expect(
        response.status,
      ).toBe(500);

      expect(body).toEqual({
        success: false,

        error: {
          code:
            "COST_ANALYTICS_ERROR",

          message:
            "Unable to load business cost analytics",
        },
      });
    });
  },
);
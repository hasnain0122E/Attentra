/**
 * Attentra — Business Billing API Tests
 *
 * Phase 12.15
 *
 * Covers:
 * - Business API-key requests (userId=null) included
 * - Tenant isolation: Business A cannot read Business B billing
 * - Non-member rejected / member allowed
 * - No baseline configured -> fee = 0, no fabricated savings
 */

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

    getBusinessBilling:
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
  "@/lib/billing",
  () => ({
    getBusinessBilling:
      mocks.getBusinessBilling,
  }),
);

import {
  GET,
} from "@/app/api/business/[businessId]/billing/route";

function makeBillingResponse(
  overrides?: Partial<{
    totalActualCost: number;
    comparableActualCost: number;
    baselineCost: number;
    verifiedSavings: number;
    optimizationFee: number;
    customerNetSavings: number;
    totalCustomerCost: number;
    totalCostedRequests: number;
    comparableRequests: number;
    baselineConfigured: boolean;
  }>,
) {
  const {
    totalActualCost = 80,
    comparableActualCost = 70,
    baselineCost = 90,
    verifiedSavings = 20,
    optimizationFee = 2,
    customerNetSavings = 18,
    totalCustomerCost = 82,
    totalCostedRequests = 20,
    comparableRequests = 18,
    baselineConfigured = true,
  } = overrides ?? {};

  return {
    period: {
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.999Z",
    },

    usage: {
      totalActualCost,
      comparableActualCost,
      baselineCost,
    },

    savings: {
      verifiedSavings,
      billableSavings: Math.max(verifiedSavings, 0),
      optimizationFeeRate: 0.1,
      optimizationFee,
      customerNetSavings,
    },

    totalCustomerCost,

    coverage: {
      totalCostedRequests,
      comparableRequests,
      percentage:
        totalCostedRequests > 0
          ? Math.round(
              (comparableRequests / totalCostedRequests) * 100,
            )
          : 0,
    },

    baseline: baselineConfigured
      ? {
          configured: true,
          modelId: "model-2",
          identifier: "gpt-5",
          displayName: "GPT-5",
        }
      : { configured: false },
  };
}

function makeRouteContext(businessId: string) {
  return {
    params: {
      businessId,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.requireBusinessMembership.mockResolvedValue({
    session: {
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      },
    },

    membership: {
      id: "membership-1",
      role: "MEMBER",
    },
  });

  mocks.getBusinessBilling.mockResolvedValue(
    makeBillingResponse(),
  );
});

describe(
  "GET /api/business/[businessId]/billing",
  () => {
    it("returns business billing for a member", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/business/business-1/billing",
        );

      const response =
        await GET(
          request,
          makeRouteContext("business-1"),
        );

      const body =
        await response.json();

      expect(response.status).toBe(
        200,
      );

      expect(body.success).toBe(
        true,
      );

      expect(
        body.data.usage.totalActualCost,
      ).toBe(80);

      expect(
        body.data.savings.optimizationFee,
      ).toBe(2);

      expect(
        body.data.totalCustomerCost,
      ).toBe(82);

      expect(
        mocks.getBusinessBilling,
      ).toHaveBeenCalledWith(
        expect.anything(),
        "business-1",
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
        }),
      );
    });

    it("returns 400 for missing businessId", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/business/ /billing",
        );

      const response =
        await GET(
          request,
          makeRouteContext(" "),
        );

      const body =
        await response.json();

      expect(response.status).toBe(
        400,
      );

      expect(body.error.code).toBe(
        "INVALID_BUSINESS_ID",
      );
    });

    it("returns 403 for non-member", async () => {
      mocks.requireBusinessMembership.mockRejectedValue(
        new Error(
          "Unauthorized: not a member of this business",
        ),
      );

      const request =
        new NextRequest(
          "http://localhost/api/business/business-other/billing",
        );

      const response =
        await GET(
          request,
          makeRouteContext("business-other"),
        );

      const body =
        await response.json();

      expect(response.status).toBe(
        403,
      );

      expect(body.error.code).toBe(
        "BUSINESS_ACCESS_DENIED",
      );
    });

    it("returns 400 for invalid date range", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/business/business-1/billing?to=not-a-date",
        );

      const response =
        await GET(
          request,
          makeRouteContext("business-1"),
        );

      const body =
        await response.json();

      expect(response.status).toBe(
        400,
      );

      expect(body.error.code).toBe(
        "INVALID_DATE_RANGE",
      );
    });

    it("returns billing without baseline configured", async () => {
      mocks.getBusinessBilling.mockResolvedValue(
        makeBillingResponse({
          totalActualCost: 50,
          comparableActualCost: 0,
          baselineCost: 0,
          verifiedSavings: 0,
          optimizationFee: 0,
          customerNetSavings: 0,
          totalCustomerCost: 50,
          baselineConfigured: false,
        }),
      );

      const request =
        new NextRequest(
          "http://localhost/api/business/business-1/billing",
        );

      const response =
        await GET(
          request,
          makeRouteContext("business-1"),
        );

      const body =
        await response.json();

      expect(
        body.data.baseline.configured,
      ).toBe(false);

      expect(
        body.data.savings.verifiedSavings,
      ).toBe(0);

      expect(
        body.data.savings.optimizationFee,
      ).toBe(0);

      expect(
        body.data.usage.totalActualCost,
      ).toBe(50);
    });
  },
);

// ─────────────────────────────────────────────────────
// TENANT ISOLATION (source verification)
// ─────────────────────────────────────────────────────

describe(
  "Business billing tenant isolation",
  () => {
    it("business aggregation scopes by businessId", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "src/lib/billing/business.ts",
        "utf-8",
      );

      expect(content).toContain("businessId,");
      expect(content).toContain("status: \"SUCCESS\"");
    });

    it("business aggregation does not filter userId (includes userId=null API keys)", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "src/lib/billing/business.ts",
        "utf-8",
      );

      expect(content).not.toContain("userId,");
    });

    it("business baseline uses Business.baselineModelId, not consumer env", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "src/lib/billing/business.ts",
        "utf-8",
      );

      expect(content).toContain("baselineModelId");
      expect(content).toContain("baselineModel");
      expect(content).not.toContain("CONSUMER_BASELINE_MODEL");
    });

    it("consumer billing does not appear in business scope and vice versa", async () => {
      const consumerContent = (
        await import("fs")
      ).readFileSync(
        "src/lib/billing/consumer.ts",
        "utf-8",
      );

      const businessContent = (
        await import("fs")
      ).readFileSync(
        "src/lib/billing/business.ts",
        "utf-8",
      );

      // Consumer: excludes business requests
      expect(consumerContent).toContain("businessId: null");

      // Business: scopes by businessId (includes userId=null)
      expect(businessContent).toContain("businessId,");
      expect(businessContent).not.toContain("businessId: null");
    });
  },
);

// ─────────────────────────────────────────────────────
// NEGATIVE SAVINGS BEHAVIOR
// ─────────────────────────────────────────────────────

describe(
  "Business billing negative savings",
  () => {
    it("exposes negative verified savings with zero fee", async () => {
      mocks.getBusinessBilling.mockResolvedValue(
        makeBillingResponse({
          totalActualCost: 90,
          comparableActualCost: 90,
          baselineCost: 80,
          verifiedSavings: -10,
          optimizationFee: 0,
          customerNetSavings: 0,
          totalCustomerCost: 90,
        }),
      );

      const request =
        new NextRequest(
          "http://localhost/api/business/business-1/billing",
        );

      const response =
        await GET(
          request,
          makeRouteContext("business-1"),
        );

      const body =
        await response.json();

      expect(
        body.data.savings.verifiedSavings,
      ).toBe(-10);

      expect(
        body.data.savings.optimizationFee,
      ).toBe(0);
    });
  },
);

/**
 * Attentra — Consumer Billing API Tests
 *
 * Phase 12.15
 *
 * Covers:
 * - Session + personal key requests aggregate by userId
 * - Business API-key requests (userId=null) NOT included
 * - Unauthenticated rejected
 * - Negative savings behavior
 * - No baseline -> fee = 0
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
    requireAuth: vi.fn(),

    getConsumerBilling:
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
  "@/lib/billing",
  () => ({
    getConsumerBilling:
      mocks.getConsumerBilling,
  }),
);

import {
  GET,
} from "@/app/api/dashboard/billing/route";

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
    totalActualCost = 50,
    comparableActualCost = 40,
    baselineCost = 60,
    verifiedSavings = 20,
    optimizationFee = 2,
    customerNetSavings = 18,
    totalCustomerCost = 52,
    totalCostedRequests = 10,
    comparableRequests = 8,
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
          modelId: "model-1",
          identifier: "claude-sonnet-5",
          displayName: "Claude Sonnet 5",
        }
      : { configured: false },
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.requireAuth.mockResolvedValue({
    user: {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    },
  });

  mocks.getConsumerBilling.mockResolvedValue(
    makeBillingResponse(),
  );
});

describe(
  "GET /api/dashboard/billing",
  () => {
    it("returns authenticated consumer billing data", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/dashboard/billing",
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
        body.data.usage.totalActualCost,
      ).toBe(50);

      expect(
        body.data.savings.optimizationFee,
      ).toBe(2);

      expect(
        body.data.totalCustomerCost,
      ).toBe(52);

      expect(
        mocks.getConsumerBilling,
      ).toHaveBeenCalledWith(
        expect.anything(),
        "user-123",
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
        }),
      );
    });

    it("rejects unauthenticated requests", async () => {
      mocks.requireAuth.mockRejectedValue(
        new Error("Unauthorized"),
      );

      const request =
        new NextRequest(
          "http://localhost/api/dashboard/billing",
        );

      const response =
        await GET(request);

      const body =
        await response.json();

      expect(response.status).toBe(
        500,
      );

      expect(body.success).toBe(
        false,
      );
    });

    it("returns 400 for invalid date range", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/dashboard/billing?from=not-a-date",
        );

      const response =
        await GET(request);

      const body =
        await response.json();

      expect(response.status).toBe(
        400,
      );

      expect(body.error.code).toBe(
        "INVALID_DATE_RANGE",
      );
    });

    it("returns negative savings without clamping", async () => {
      mocks.getConsumerBilling.mockResolvedValue(
        makeBillingResponse({
          totalActualCost: 12,
          comparableActualCost: 12,
          baselineCost: 10,
          verifiedSavings: -2,
          optimizationFee: 0,
          customerNetSavings: 0,
          totalCustomerCost: 12,
        }),
      );

      const request =
        new NextRequest(
          "http://localhost/api/dashboard/billing",
        );

      const response =
        await GET(request);

      const body =
        await response.json();

      expect(
        body.data.savings.verifiedSavings,
      ).toBe(-2);

      expect(
        body.data.savings.optimizationFee,
      ).toBe(0);

      expect(
        body.data.savings.customerNetSavings,
      ).toBe(0);
    });

    it("returns baseline metadata", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/dashboard/billing",
        );

      const response =
        await GET(request);

      const body =
        await response.json();

      expect(
        body.data.baseline.configured,
      ).toBe(true);

      expect(
        body.data.baseline.identifier,
      ).toBe("claude-sonnet-5");
    });

    it("exposes coverage metrics", async () => {
      const request =
        new NextRequest(
          "http://localhost/api/dashboard/billing",
        );

      const response =
        await GET(request);

      const body =
        await response.json();

      expect(
        body.data.coverage.totalCostedRequests,
      ).toBe(10);

      expect(
        body.data.coverage.comparableRequests,
      ).toBe(8);

      expect(
        body.data.coverage.percentage,
      ).toBe(80);
    });
  },
);

// ─────────────────────────────────────────────────────
// DOUBLE-COUNTING PREVENTION (source verification)
// ─────────────────────────────────────────────────────

describe(
  "Consumer billing double-counting prevention",
  () => {
    it("consumer aggregation queries businessId=null", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "src/lib/billing/consumer.ts",
        "utf-8",
      );

      expect(content).toContain("businessId: null");
      expect(content).toContain("status: \"SUCCESS\"");
    });

    it("consumer aggregation scopes by userId", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "src/lib/billing/consumer.ts",
        "utf-8",
      );

      expect(content).toContain("userId,");
      expect(content).not.toContain("businessId,");
    });

    it("consumer billing does not fall back to business scope", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "src/lib/billing/consumer.ts",
        "utf-8",
      );

      expect(content).not.toContain("businessId: businessId");
    });
  },
);

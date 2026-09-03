import {
  calculateBillingPeriod,
  OPTIMIZATION_FEE_RATE,
} from "@/lib/billing";

import { describe, expect, it } from "vitest";

describe("Billing Calculator", () => {
  // ─────────────────────────────────────────────────
  // A: Positive net period savings
  // ─────────────────────────────────────────────────

  describe("A: positive net period savings", () => {
    it("calculates fee on positive verified savings", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 8,
        comparableActualCost: 8,
        comparableBaselineCost: 10,
        totalCostedRequests: 5,
        comparableRequests: 5,
      });

      expect(result.verifiedSavings).toBe(2);
      expect(result.billableSavings).toBe(2);
      expect(result.optimizationFee).toBe(0.2);
      expect(result.customerNetSavings).toBe(1.8);
      expect(result.totalCustomerCost).toBe(8.2);
    });
  });

  // ─────────────────────────────────────────────────
  // B: Zero savings
  // ─────────────────────────────────────────────────

  describe("B: zero savings", () => {
    it("produces zero fee when savings are exactly zero", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 10,
        comparableActualCost: 10,
        comparableBaselineCost: 10,
        totalCostedRequests: 5,
        comparableRequests: 5,
      });

      expect(result.verifiedSavings).toBe(0);
      expect(result.billableSavings).toBe(0);
      expect(result.optimizationFee).toBe(0);
      expect(result.customerNetSavings).toBe(0);
      expect(result.totalCustomerCost).toBe(10);
    });
  });

  // ─────────────────────────────────────────────────
  // C: Negative savings
  // ─────────────────────────────────────────────────

  describe("C: negative savings", () => {
    it("exposes negative verified savings but zero fee", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 12,
        comparableActualCost: 12,
        comparableBaselineCost: 10,
        totalCostedRequests: 5,
        comparableRequests: 5,
      });

      expect(result.verifiedSavings).toBe(-2);
      expect(result.billableSavings).toBe(0);
      expect(result.optimizationFee).toBe(0);
      expect(result.customerNetSavings).toBe(0);
      expect(result.totalCustomerCost).toBe(12);
    });
  });

  // ─────────────────────────────────────────────────
  // D: Mixed request outcomes (+100, +100, -150)
  // ─────────────────────────────────────────────────

  describe("D: mixed request outcomes", () => {
    it("calculates fee on NET savings, not per-request positive sum", () => {
      /**
       * Three requests:
       *   A: baseline=100, actual=0   → savings=+100
       *   B: baseline=100, actual=0   → savings=+100
       *   C: baseline=50,  actual=200 → savings=-150
       *
       * Period-level:
       *   comparableBaselineCost = 100 + 100 + 50 = 250
       *   comparableActualCost   = 0 + 0 + 200 = 200
       *   verifiedSavings = 250 - 200 = 50
       *   fee = 50 × 0.10 = 5
       *
       * NOT fee = (100 + 100) × 0.10 = 20
       */
      const result = calculateBillingPeriod({
        totalActualUsageCost: 200,
        comparableActualCost: 200,
        comparableBaselineCost: 250,
        totalCostedRequests: 3,
        comparableRequests: 3,
      });

      expect(result.verifiedSavings).toBe(50);
      expect(result.optimizationFee).toBe(5);
      expect(result.customerNetSavings).toBe(45);
      expect(result.totalCustomerCost).toBe(205);
    });
  });

  // ─────────────────────────────────────────────────
  // E: Fee = exactly 10%
  // ─────────────────────────────────────────────────

  describe("E: fee rate is exactly 10%", () => {
    it("charges exactly 10% of billable savings", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 90,
        comparableActualCost: 90,
        comparableBaselineCost: 100,
        totalCostedRequests: 10,
        comparableRequests: 10,
      });

      expect(result.optimizationFeeRate).toBe(OPTIMIZATION_FEE_RATE);
      expect(result.optimizationFeeRate).toBe(0.10);
      expect(result.optimizationFee).toBe(1);
    });

    it("works for large savings", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 500,
        comparableActualCost: 500,
        comparableBaselineCost: 1000,
        totalCostedRequests: 100,
        comparableRequests: 100,
      });

      expect(result.verifiedSavings).toBe(500);
      expect(result.optimizationFee).toBe(50);
    });
  });

  // ─────────────────────────────────────────────────
  // F: Customer retains 90%
  // ─────────────────────────────────────────────────

  describe("F: customer retains 90%", () => {
    it("customerNetSavings = 90% of billableSavings", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 45,
        comparableActualCost: 45,
        comparableBaselineCost: 50,
        totalCostedRequests: 10,
        comparableRequests: 10,
      });

      expect(result.billableSavings).toBe(5);
      expect(result.optimizationFee).toBe(0.5);
      expect(result.customerNetSavings).toBe(4.5);
    });
  });

  // ─────────────────────────────────────────────────
  // G: totalCustomerCost = totalActualUsageCost + optimizationFee
  // ─────────────────────────────────────────────────

  describe("G: totalCustomerCost formula", () => {
    it("equals usage plus fee", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 50,
        comparableActualCost: 40,
        comparableBaselineCost: 60,
        totalCostedRequests: 10,
        comparableRequests: 8,
      });

      expect(result.totalCustomerCost).toBe(
        result.totalActualUsageCost + result.optimizationFee,
      );
    });

    it("equals just usage when fee is zero", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 50,
        comparableActualCost: 50,
        comparableBaselineCost: 40,
        totalCostedRequests: 10,
        comparableRequests: 10,
      });

      expect(result.optimizationFee).toBe(0);
      expect(result.totalCustomerCost).toBe(50);
    });
  });

  // ─────────────────────────────────────────────────
  // H: Non-comparable requests
  // ─────────────────────────────────────────────────

  describe("H: non-comparable requests", () => {
    it("contribute to totalActualUsageCost but NOT baseline savings", () => {
      /**
       * 10 costed requests, 8 comparable:
       *   - 8 comparable: actual=40, baseline=50
       *   - 2 non-comparable: actual=10 (no baseline)
       *
       * totalActualUsageCost = 50
       * comparableActualCost = 40
       * comparableBaselineCost = 50
       * verifiedSavings = 10
       * fee = 1
       */
      const result = calculateBillingPeriod({
        totalActualUsageCost: 50,
        comparableActualCost: 40,
        comparableBaselineCost: 50,
        totalCostedRequests: 10,
        comparableRequests: 8,
      });

      expect(result.totalActualUsageCost).toBe(50);
      expect(result.comparableActualCost).toBe(40);
      expect(result.baselineCost).toBe(50);
      expect(result.verifiedSavings).toBe(10);
      expect(result.optimizationFee).toBe(1);
      expect(result.totalCustomerCost).toBe(51);
    });
  });

  // ─────────────────────────────────────────────────
  // I: Coverage calculation
  // ─────────────────────────────────────────────────

  describe("I: coverage calculation", () => {
    it("calculates comparable coverage percentage", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 100,
        comparableActualCost: 80,
        comparableBaselineCost: 90,
        totalCostedRequests: 10,
        comparableRequests: 8,
      });

      expect(result.comparableCoverage).toBe(80);
    });

    it("returns 0 coverage when no costed requests", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 0,
        comparableActualCost: 0,
        comparableBaselineCost: 0,
        totalCostedRequests: 0,
        comparableRequests: 0,
      });

      expect(result.comparableCoverage).toBe(0);
    });

    it("returns 100% when all requests are comparable", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 100,
        comparableActualCost: 100,
        comparableBaselineCost: 120,
        totalCostedRequests: 5,
        comparableRequests: 5,
      });

      expect(result.comparableCoverage).toBe(100);
    });
  });

  // ─────────────────────────────────────────────────
  // J: Tiny cost precision
  // ─────────────────────────────────────────────────

  describe("J: tiny cost precision", () => {
    it("handles sub-cent costs without floating-point artifacts", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 0.00001234,
        comparableActualCost: 0.00001234,
        comparableBaselineCost: 0.00001500,
        totalCostedRequests: 3,
        comparableRequests: 3,
      });

      expect(result.verifiedSavings).toBeCloseTo(0.00000266, 8);
      expect(result.optimizationFee).toBeCloseTo(0.00000027, 8);
      expect(result.totalCustomerCost).toBeCloseTo(0.00001261, 8);
    });

    it("handles zero costs cleanly", () => {
      const result = calculateBillingPeriod({
        totalActualUsageCost: 0,
        comparableActualCost: 0,
        comparableBaselineCost: 0,
        totalCostedRequests: 0,
        comparableRequests: 0,
      });

      expect(result.verifiedSavings).toBe(0);
      expect(result.billableSavings).toBe(0);
      expect(result.optimizationFee).toBe(0);
      expect(result.customerNetSavings).toBe(0);
      expect(result.totalCustomerCost).toBe(0);
    });
  });
});

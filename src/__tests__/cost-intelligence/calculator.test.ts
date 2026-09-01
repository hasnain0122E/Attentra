import {
  calculateCostIntelligence,
  calculateModelCost,
} from "@/lib/cost-intelligence";

import { describe, expect, it } from "vitest";

describe("Cost Intelligence Calculator", () => {
  describe("calculateModelCost", () => {
    it("calculates input and output token cost", () => {
      const result = calculateModelCost(
        {
          inputTokens: 1000,
          outputTokens: 500,
        },
        {
          inputPricePer1k: 0.01,
          outputPricePer1k: 0.03,
        },
      );

      expect(result).toEqual({
        inputCost: 0.01,
        outputCost: 0.015,
        totalCost: 0.025,
      });
    });

    it("supports fractional token quantities relative to 1k pricing", () => {
      const result = calculateModelCost(
        {
          inputTokens: 250,
          outputTokens: 100,
        },
        {
          inputPricePer1k: 0.002,
          outputPricePer1k: 0.006,
        },
      );

      expect(result.inputCost).toBe(0.0005);
      expect(result.outputCost).toBe(0.0006);
      expect(result.totalCost).toBe(0.0011);
    });

    it("returns zero cost for zero token usage", () => {
      const result = calculateModelCost(
        {
          inputTokens: 0,
          outputTokens: 0,
        },
        {
          inputPricePer1k: 0.01,
          outputPricePer1k: 0.03,
        },
      );

      expect(result).toEqual({
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
      });
    });

    it("supports zero-priced models", () => {
      const result = calculateModelCost(
        {
          inputTokens: 5000,
          outputTokens: 1000,
        },
        {
          inputPricePer1k: 0,
          outputPricePer1k: 0,
        },
      );

      expect(result.totalCost).toBe(0);
    });

    it("rejects negative token usage", () => {
      expect(() =>
        calculateModelCost(
          {
            inputTokens: -1,
            outputTokens: 100,
          },
          {
            inputPricePer1k: 0.01,
            outputPricePer1k: 0.03,
          },
        ),
      ).toThrow("inputTokens must be a non-negative finite number");
    });

    it("rejects invalid pricing", () => {
      expect(() =>
        calculateModelCost(
          {
            inputTokens: 100,
            outputTokens: 100,
          },
          {
            inputPricePer1k: Number.NaN,
            outputPricePer1k: 0.03,
          },
        ),
      ).toThrow("inputPricePer1k must be a non-negative finite number");
    });
  });

  describe("calculateCostIntelligence", () => {
    it("calculates positive savings against a more expensive baseline", () => {
      const result = calculateCostIntelligence(
        {
          inputTokens: 1000,
          outputTokens: 500,
        },
        {
          inputPricePer1k: 0.002,
          outputPricePer1k: 0.006,
        },
        {
          inputPricePer1k: 0.01,
          outputPricePer1k: 0.03,
        },
      );

      expect(result.actualCost).toBe(0.005);
      expect(result.baselineCost).toBe(0.025);
      expect(result.savings).toBe(0.02);
      expect(result.savingsPercentage).toBe(80);
    });

    it("returns zero savings when actual and baseline pricing are equal", () => {
      const pricing = {
        inputPricePer1k: 0.01,
        outputPricePer1k: 0.03,
      };

      const result = calculateCostIntelligence(
        {
          inputTokens: 1000,
          outputTokens: 500,
        },
        pricing,
        pricing,
      );

      expect(result.actualCost).toBe(0.025);
      expect(result.baselineCost).toBe(0.025);
      expect(result.savings).toBe(0);
      expect(result.savingsPercentage).toBe(0);
    });

    it("preserves negative savings when Attentra costs more", () => {
      const result = calculateCostIntelligence(
        {
          inputTokens: 1000,
          outputTokens: 500,
        },
        {
          inputPricePer1k: 0.02,
          outputPricePer1k: 0.06,
        },
        {
          inputPricePer1k: 0.01,
          outputPricePer1k: 0.03,
        },
      );

      expect(result.actualCost).toBe(0.05);
      expect(result.baselineCost).toBe(0.025);
      expect(result.savings).toBe(-0.025);
      expect(result.savingsPercentage).toBe(-100);
    });

    it("avoids division by zero for a free baseline model", () => {
      const result = calculateCostIntelligence(
        {
          inputTokens: 1000,
          outputTokens: 500,
        },
        {
          inputPricePer1k: 0.002,
          outputPricePer1k: 0.006,
        },
        {
          inputPricePer1k: 0,
          outputPricePer1k: 0,
        },
      );

      expect(result.baselineCost).toBe(0);
      expect(result.savings).toBe(-0.005);
      expect(result.savingsPercentage).toBe(0);
    });

    it("rounds monetary values to eight decimal places", () => {
      const result = calculateModelCost(
        {
          inputTokens: 333,
          outputTokens: 777,
        },
        {
          inputPricePer1k: 0.00123456,
          outputPricePer1k: 0.00654321,
        },
      );

      expect(Number.isFinite(result.totalCost)).toBe(true);

      const decimalPlaces =
        result.totalCost.toString().split(".")[1]?.length ?? 0;

      expect(decimalPlaces).toBeLessThanOrEqual(8);
    });
  });
});

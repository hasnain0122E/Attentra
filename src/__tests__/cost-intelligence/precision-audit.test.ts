import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateCostIntelligence,
  calculateModelCost,
} from "@/lib/cost-intelligence/calculator";

describe(
  "cost intelligence precision audit",
  () => {
    it("handles very small token costs without collapsing them to zero", () => {
      const result =
        calculateModelCost(
          {
            inputTokens: 1,
            outputTokens: 1,
          },
          {
            inputPricePer1k: 0.0001,
            outputPricePer1k: 0.0002,
          },
        );

      expect(result.inputCost).toBe(
        0.0000001,
      );

      expect(result.outputCost).toBe(
        0.0000002,
      );

      expect(result.totalCost).toBe(
        0.0000003,
      );
    });

    it("rounds monetary values to at most 8 decimal places", () => {
      const result =
        calculateModelCost(
          {
            inputTokens: 333,
            outputTokens: 777,
          },
          {
            inputPricePer1k:
              0.12345678,

            outputPricePer1k:
              0.87654321,
          },
        );

      for (const value of [
        result.inputCost,
        result.outputCost,
        result.totalCost,
      ]) {
        const decimals =
          value
            .toString()
            .split(".")[1]
            ?.length ?? 0;

        expect(decimals).toBeLessThanOrEqual(
          8,
        );
      }
    });

    it("preserves exact zero usage semantics", () => {
      const result =
        calculateModelCost(
          {
            inputTokens: 0,
            outputTokens: 0,
          },
          {
            inputPricePer1k: 100,
            outputPricePer1k: 200,
          },
        );

      expect(result).toEqual({
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
      });
    });

    it("does not clamp negative savings", () => {
      const result =
        calculateCostIntelligence(
          {
            inputTokens: 1000,
            outputTokens: 1000,
          },
          {
            inputPricePer1k: 2,
            outputPricePer1k: 2,
          },
          {
            inputPricePer1k: 1,
            outputPricePer1k: 1,
          },
        );

      expect(result.actualCost).toBe(4);
      expect(result.baselineCost).toBe(2);
      expect(result.savings).toBe(-2);

      expect(
        result.savingsPercentage,
      ).toBe(-100);
    });

    it("reports zero savings percentage when baseline cost is zero", () => {
      const result =
        calculateCostIntelligence(
          {
            inputTokens: 1000,
            outputTokens: 1000,
          },
          {
            inputPricePer1k: 1,
            outputPricePer1k: 1,
          },
          {
            inputPricePer1k: 0,
            outputPricePer1k: 0,
          },
        );

      expect(result.actualCost).toBe(2);
      expect(result.baselineCost).toBe(0);
      expect(result.savings).toBe(-2);

      expect(
        result.savingsPercentage,
      ).toBe(0);
    });

    it("uses identical token usage for actual and baseline comparison", () => {
      const result =
        calculateCostIntelligence(
          {
            inputTokens: 750,
            outputTokens: 250,
          },
          {
            inputPricePer1k: 1,
            outputPricePer1k: 2,
          },
          {
            inputPricePer1k: 4,
            outputPricePer1k: 8,
          },
        );

      expect(result.actualCost).toBe(
        1.25,
      );

      expect(result.baselineCost).toBe(
        5,
      );

      expect(result.savings).toBe(
        3.75,
      );

      expect(
        result.savingsPercentage,
      ).toBe(75);
    });

    it("rejects infinite pricing instead of persisting meaningless cost", () => {
      expect(() =>
        calculateModelCost(
          {
            inputTokens: 100,
            outputTokens: 100,
          },
          {
            inputPricePer1k:
              Number.POSITIVE_INFINITY,

            outputPricePer1k: 1,
          },
        ),
      ).toThrow();
    });

    it("rejects negative token usage", () => {
      expect(() =>
        calculateModelCost(
          {
            inputTokens: -1,
            outputTokens: 10,
          },
          {
            inputPricePer1k: 1,
            outputPricePer1k: 1,
          },
        ),
      ).toThrow();
    });
  },
);
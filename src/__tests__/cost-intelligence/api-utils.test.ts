import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseCostAnalyticsDateRange,
} from "@/lib/cost-intelligence/api-utils";

describe(
  "parseCostAnalyticsDateRange",
  () => {
    it("returns an empty range when no dates are supplied", () => {
      const params =
        new URLSearchParams();

      const result =
        parseCostAnalyticsDateRange(
          params,
        );

      expect(result).toEqual({
        success: true,

        range: {
          from: undefined,
          to: undefined,
        },
      });
    });

    it("parses a valid from date", () => {
      const params =
        new URLSearchParams({
          from:
            "2026-09-01T00:00:00.000Z",
        });

      const result =
        parseCostAnalyticsDateRange(
          params,
        );

      expect(result.success).toBe(
        true,
      );

      if (!result.success) {
        throw new Error(
          "Expected successful parse",
        );
      }

      expect(
        result.range.from?.toISOString(),
      ).toBe(
        "2026-09-01T00:00:00.000Z",
      );
    });

    it("parses a valid date range", () => {
      const params =
        new URLSearchParams({
          from:
            "2026-09-01T00:00:00.000Z",

          to:
            "2026-09-30T23:59:59.999Z",
        });

      const result =
        parseCostAnalyticsDateRange(
          params,
        );

      expect(result.success).toBe(
        true,
      );
    });

    it("rejects an invalid from date", () => {
      const params =
        new URLSearchParams({
          from: "not-a-date",
        });

      expect(
        parseCostAnalyticsDateRange(
          params,
        ),
      ).toEqual({
        success: false,
        error:
          "Invalid 'from' date",
      });
    });

    it("rejects an invalid to date", () => {
      const params =
        new URLSearchParams({
          to: "invalid",
        });

      expect(
        parseCostAnalyticsDateRange(
          params,
        ),
      ).toEqual({
        success: false,
        error:
          "Invalid 'to' date",
      });
    });

    it("rejects a range where from is after to", () => {
      const params =
        new URLSearchParams({
          from:
            "2026-09-10T00:00:00.000Z",

          to:
            "2026-09-01T00:00:00.000Z",
        });

      expect(
        parseCostAnalyticsDateRange(
          params,
        ),
      ).toEqual({
        success: false,

        error:
          "'from' date cannot be after 'to' date",
      });
    });
  },
);
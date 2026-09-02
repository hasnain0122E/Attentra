/**
 * Attentra — Cost Intelligence API Utilities
 *
 * Phase 11 / Step 5
 */

export interface CostAnalyticsDateRange {
  from?: Date;
  to?: Date;
}

export interface CostAnalyticsQueryResult {
  success: true;
  range: CostAnalyticsDateRange;
}

export interface CostAnalyticsQueryError {
  success: false;
  error: string;
}

export function parseCostAnalyticsDateRange(
  searchParams: URLSearchParams,
):
  | CostAnalyticsQueryResult
  | CostAnalyticsQueryError {
  const fromValue =
    searchParams.get("from");

  const toValue =
    searchParams.get("to");

  let from: Date | undefined;
  let to: Date | undefined;

  if (fromValue) {
    from = new Date(fromValue);

    if (Number.isNaN(from.getTime())) {
      return {
        success: false,
        error:
          "Invalid 'from' date",
      };
    }
  }

  if (toValue) {
    to = new Date(toValue);

    if (Number.isNaN(to.getTime())) {
      return {
        success: false,
        error:
          "Invalid 'to' date",
      };
    }
  }

  if (from && to && from > to) {
    return {
      success: false,
      error:
        "'from' date cannot be after 'to' date",
    };
  }

  return {
    success: true,
    range: {
      from,
      to,
    },
  };
}
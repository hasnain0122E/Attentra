import type {
  BusinessCostAnalytics,
  ConsumerCostAnalytics,
} from "@/lib/cost-intelligence";

export interface CostAnalyticsDateRange {
  from?: Date;
  to?: Date;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T> =
  | ApiSuccess<T>
  | ApiFailure;

function buildQueryString(
  range?: CostAnalyticsDateRange,
): string {
  if (!range) {
    return "";
  }

  const params =
    new URLSearchParams();

  if (range.from) {
    params.set(
      "from",
      range.from.toISOString(),
    );
  }

  if (range.to) {
    params.set(
      "to",
      range.to.toISOString(),
    );
  }

  const query =
    params.toString();

  return query ? `?${query}` : "";
}

async function fetchAnalytics<T>(
  url: string,
): Promise<T> {
  const response = await fetch(url, {
    method: "GET",

    headers: {
      Accept: "application/json",
    },

    cache: "no-store",
  });

  let payload: ApiResponse<T>;

  try {
    payload =
      (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(
      "Invalid analytics response",
    );
  }

  if (
    !response.ok ||
    !payload.success
  ) {
    const message =
      !payload.success
        ? payload.error.message
        : "Unable to load analytics";

    throw new Error(message);
  }

  return payload.data;
}

export async function fetchConsumerCostAnalytics(
  range?: CostAnalyticsDateRange,
): Promise<ConsumerCostAnalytics> {
  return fetchAnalytics<ConsumerCostAnalytics>(
    `/api/dashboard/cost-intelligence${buildQueryString(
      range,
    )}`,
  );
}

export async function fetchBusinessCostAnalytics(
  businessId: string,
  range?: CostAnalyticsDateRange,
): Promise<BusinessCostAnalytics> {
  if (!businessId.trim()) {
    throw new Error(
      "businessId is required",
    );
  }

  return fetchAnalytics<BusinessCostAnalytics>(
    `/api/business/${encodeURIComponent(
      businessId,
    )}/cost-intelligence${buildQueryString(
      range,
    )}`,
  );
}
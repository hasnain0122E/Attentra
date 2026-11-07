/**
 * Attentra — Request display helpers (presentation only).
 * Never fabricate values: unknown cost/tokens render as "Not available".
 */

import { formatDisplayCurrency } from "@/lib/currency/display-currency";
import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

export const NOT_AVAILABLE = "Not available";

/** USD amount → display currency, or "Not available" when unknown. */
export function formatRequestCost(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return NOT_AVAILABLE;
  }

  return formatDisplayCurrency(value);
}

/** Token values honest about their provenance. */
export function describeTokens(request: Pick<
  RequestHistoryItem,
  "inputTokens" | "outputTokens" | "totalTokens" | "tokenSource"
>) {
  if (request.tokenSource === "estimated") {
    return {
      input: NOT_AVAILABLE,
      output: NOT_AVAILABLE,
      total: NOT_AVAILABLE,
      detail: `No provider usage · routing estimate was ${request.inputTokens.toLocaleString("en")} in / ${request.outputTokens.toLocaleString("en")} out`,
    };
  }

  return {
    input: request.inputTokens.toLocaleString("en"),
    output: request.outputTokens.toLocaleString("en"),
    total: request.totalTokens.toLocaleString("en"),
    detail:
      request.tokenSource === "unverified"
        ? "Cost not calculated · counts may be routing estimates"
        : "Provider-reported usage",
  };
}

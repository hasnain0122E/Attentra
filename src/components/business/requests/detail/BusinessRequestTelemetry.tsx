import type { ElementType } from "react";

import {
  Clock,
  Key,
  ChartBar,
} from "@phosphor-icons/react/dist/ssr";

import type { BusinessRequestHistoryItem } from "@/lib/dashboard/business-request-queries";

import { formatDisplayCurrency } from "@/lib/currency/display-currency";

interface BusinessRequestTelemetryProps {
  request: BusinessRequestHistoryItem;
}

function formatCost(value?: number) {
  if (value === undefined) {
    return "\u2014";
  }

  return formatDisplayCurrency(value);
}

function formatLatency(value: number | null | undefined) {
  if (!value || value <= 0) {
    return "\u2014";
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }

  return `${(value / 1000).toFixed(
    2,
  )}s`;
}

function formatRoutingDetail(ms: number | null | undefined) {
  if (!ms || ms <= 0) {
    return "Routing latency not measured";
  }

  return `${Math.round(ms)}ms routing`;
}

export default function BusinessRequestTelemetry({
  request,
}: BusinessRequestTelemetryProps) {
  return (
    <section>
      <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
        Request telemetry
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <TelemetryItem
          label="Total latency"
          value={formatLatency(
            request.latencyMs,
          )}
          detail={formatRoutingDetail(
            request.routingLatencyMs,
          )}
          icon={Clock}
        />

        <TelemetryItem
          label="Total tokens"
          value={String(
            request.totalTokens,
          )}
          detail={`${request.inputTokens} in · ${request.outputTokens} out`}
          icon={ChartBar}
        />

        <TelemetryItem
          label="Actual cost"
          value={formatCost(
            request.actualCost,
          )}
          detail={
            request.actualCost ===
            undefined
              ? "No completed execution"
              : "Successful execution"
          }
          icon={ChartBar}
        />

        <TelemetryItem
          label="Requester"
          value={request.requester}
          detail="Organization API key"
          icon={Key}
        />

        <TelemetryItem
          label="API key"
          value={request.apiKeyName}
          detail={request.apiKeyPrefix}
          icon={Key}
        />

        <TelemetryItem
          label="Executed model"
          value={
            request.executedModel ?? "—"
          }
          detail={
            request.executedProvider ??
            "No successful execution"
          }
          icon={ChartBar}
        />
      </div>
    </section>
  );
}

interface TelemetryItemProps {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
}

function TelemetryItem({
  label,
  value,
  detail,
  icon: Icon,
}: TelemetryItemProps) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
          {label}
        </div>

        <Icon
          size={14}
          weight="duotone"
          className="shrink-0 text-[var(--color-accent)]"
        />
      </div>

      <div className="mt-5 break-words text-[12px] font-semibold text-[var(--color-foreground)]">
        {value}
      </div>

      <div className="mt-1.5 break-all font-mono text-[7px] uppercase tracking-[0.06em] text-[var(--color-foreground-muted)]">
        {detail}
      </div>
    </div>
  );
}
import {
  Clock,
  Coins,
  Hash,
  Lightning,
  Robot,
  Stack,
} from "@phosphor-icons/react/dist/ssr";

import type { ElementType } from "react";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

import { formatDisplayCurrency } from "@/lib/currency/display-currency";

interface RequestMetadataGridProps {
  request: RequestHistoryItem;
}

function formatCost(value?: number) {
  if (value === undefined) {
    return "\u2014";
  }

  return formatDisplayCurrency(value);
}

function formatLatency(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

export default function RequestMetadataGrid({
  request,
}: RequestMetadataGridProps) {
  return (
    <section>
      <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
        Request telemetry
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetadataItem
          label="Total latency"
          value={formatLatency(
            request.latencyMs,
          )}
          detail={`${request.routingLatencyMs}ms routing`}
          icon={Clock}
        />

        <MetadataItem
          label="Execution latency"
          value={formatLatency(
            request.executionLatencyMs,
          )}
          detail="Provider execution"
          icon={Lightning}
        />

        <MetadataItem
          label="Total tokens"
          value={String(request.totalTokens)}
          detail={`${request.inputTokens} in · ${request.outputTokens} out`}
          icon={Hash}
        />

        <MetadataItem
          label="Projected cost"
          value={formatCost(
            request.projectedCost,
          )}
          detail="Primary routing estimate"
          icon={Coins}
        />

        <MetadataItem
          label="Actual cost"
          value={formatCost(request.actualCost)}
          detail={
            request.actualCost === undefined
              ? "No completed execution"
              : "Successful execution"
          }
          icon={Stack}
        />

        <MetadataItem
          label="Executed model"
          value={
            request.executedModel ?? "—"
          }
          detail={
            request.executedProvider ??
            "No successful execution"
          }
          icon={Robot}
        />
      </div>
    </section>
  );
}

interface MetadataItemProps {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
}

function MetadataItem({
  label,
  value,
  detail,
  icon: Icon,
}: MetadataItemProps) {
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

      <div className="mt-5 break-words text-[13px] font-semibold text-[var(--color-foreground)]">
        {value}
      </div>

      <div className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.06em] text-[var(--color-foreground-muted)]">
        {detail}
      </div>
    </div>
  );
}
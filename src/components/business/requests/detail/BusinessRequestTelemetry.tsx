import type { ElementType } from "react";

import {
  Clock,
  Key,
  UsersThree,
  ChartBar,
} from "@phosphor-icons/react/dist/ssr";

import type { BusinessRequestItem } from "@/lib/business/request-data";

interface BusinessRequestTelemetryProps {
  request: BusinessRequestItem;
}

function formatCost(value?: number) {
  if (value === undefined) {
    return "—";
  }

  return `$${value.toFixed(6)}`;
}

function formatLatency(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(
    2,
  )}s`;
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
          detail={`${request.routingLatencyMs}ms routing`}
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
          label="Member"
          value={request.member.name}
          detail={request.member.role}
          icon={UsersThree}
        />

        <TelemetryItem
          label="API key"
          value={request.apiKey.name}
          detail={request.apiKey.prefix}
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
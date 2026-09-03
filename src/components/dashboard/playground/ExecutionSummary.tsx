import type { ElementType } from "react";

import {
  ArrowsClockwise,
  Clock,
  Coins,
  Hash,
} from "@phosphor-icons/react/dist/ssr";

import type { ExecutionDisplayData } from "@/types/dashboard";

import { formatDisplayCurrency } from "@/lib/currency/display-currency";

interface ExecutionSummaryProps {
  execution: ExecutionDisplayData;
}

function formatLatency(value: number) {
  if (!value || value <= 0) {
    return "\u2014";
  }

  if (value < 1000) {
    return `${Math.round(value)} ms`;
  }

  return `${(value / 1000).toFixed(2)} s`;
}

export default function ExecutionSummary({
  execution,
}: ExecutionSummaryProps) {
  const successfulAttempts = execution.attempts.filter(
    (attempt) => attempt.success,
  ).length;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryItem
        label="Total latency"
        value={formatLatency(execution.latencyMs)}
        icon={Clock}
      />

      <SummaryItem
        label="Total tokens"
        value={String(execution.usage.totalTokens)}
        icon={Hash}
      />

      <SummaryItem
        label="Actual cost"
        value={formatDisplayCurrency(execution.actualCost ?? 0)}
        icon={Coins}
      />

      <SummaryItem
        label="Execution"
        value={
          execution.fallbackUsed
            ? `${execution.attempts.length} attempts`
            : `${successfulAttempts} attempt`
        }
        icon={ArrowsClockwise}
      />
    </section>
  );
}

interface SummaryItemProps {
  label: string;
  value: string;
  icon: ElementType;
}

function SummaryItem({
  label,
  value,
  icon: Icon,
}: SummaryItemProps) {
  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          {label}
        </div>

        <Icon
          size={14}
          weight="duotone"
          className="text-[var(--color-accent)]"
        />
      </div>

      <div className="mt-5 font-mono text-[13px] font-medium text-[var(--color-foreground)]">
        {value}
      </div>
    </div>
  );
}
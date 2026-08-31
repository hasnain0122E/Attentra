import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { BusinessModelUsageItem } from "@/lib/business/model-data";

interface ModelUsageCardProps {
  model: BusinessModelUsageItem;
}

function formatLatency(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

export default function ModelUsageCard({
  model,
}: ModelUsageCardProps) {
  const executionDelta =
    model.executedPercentage -
    model.routedPercentage;

  return (
    <article className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <HealthBadge
            health={model.health}
          />

          <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            {model.model}
          </h3>

          <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
            {model.provider}
          </div>

          <div className="mt-1 break-all font-mono text-[7px] text-[var(--color-foreground-muted)]">
            {model.identifier}
          </div>
        </div>

        <div
          className={[
            "rounded-full px-2.5 py-1 font-mono text-[7px]",
            executionDelta >= 0
              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
              : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]",
          ].join(" ")}
        >
          {executionDelta >= 0 ? "+" : ""}
          {executionDelta.toFixed(1)}%
          execution delta
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Metric
          label="Routed"
          value={model.routedCount.toLocaleString()}
          detail={`${model.routedPercentage.toFixed(1)}% share`}
        />

        <Metric
          label="Executed"
          value={model.executedCount.toLocaleString()}
          detail={`${model.executedPercentage.toFixed(1)}% share`}
        />

        <Metric
          label="Fallback in"
          value={model.fallbackInCount.toLocaleString()}
          detail="requests received"
        />

        <Metric
          label="Fallback out"
          value={model.fallbackOutCount.toLocaleString()}
          detail="requests moved away"
        />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
            Routed workload
          </span>

          <span className="font-mono text-[7px] text-[var(--color-foreground-muted)]">
            {model.routedPercentage.toFixed(1)}%
          </span>
        </div>

        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
          <div
            className="h-full rounded-full bg-[var(--color-foreground-muted)]/45"
            style={{
              width: `${model.routedPercentage}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
            Executed workload
          </span>

          <span className="font-mono text-[7px] text-[var(--color-accent)]">
            {model.executedPercentage.toFixed(1)}%
          </span>
        </div>

        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)]"
            style={{
              width: `${model.executedPercentage}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4">
        <div>
          <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
            Avg latency
          </div>

          <div className="mt-1.5 font-mono text-[9px] text-[var(--color-foreground)]">
            {formatLatency(
              model.avgLatencyMs,
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
            Capability
          </div>

          <div className="mt-1.5 text-[8px] text-[var(--color-foreground-secondary)]">
            {model.capabilityTier}
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[14px] bg-[var(--color-background)] p-3.5">
      <div className="font-mono text-[6px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-2 text-[12px] font-semibold text-[var(--color-foreground)]">
        {value}
      </div>

      <div className="mt-1 text-[7px] text-[var(--color-foreground-muted)]">
        {detail}
      </div>
    </div>
  );
}

function HealthBadge({
  health,
}: {
  health: BusinessModelUsageItem["health"];
}) {
  if (health === "HEALTHY") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <CheckCircle size={9} />
        Healthy
      </span>
    );
  }

  if (health === "DEGRADED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
        <WarningCircle size={9} />
        Degraded
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
      <WarningCircle size={9} />
      Unavailable
    </span>
  );
}
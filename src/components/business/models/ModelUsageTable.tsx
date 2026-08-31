import type { ReactNode } from "react";

import {
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import {
  businessModelUsage,
  type BusinessModelUsageItem,
} from "@/lib/business/model-data";

function formatLatency(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

export default function ModelUsageTable() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Model inventory
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Organization model usage
        </h2>

        <p className="mt-2 max-w-[620px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Compare routed workload, completed execution,
          fallback involvement, latency, and model health.
        </p>
      </div>

      <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/40 px-5 py-3 xl:grid xl:grid-cols-[minmax(220px,1.3fr)_110px_110px_105px_105px_110px_95px] xl:items-center xl:gap-4">
        <HeaderLabel>Model</HeaderLabel>
        <HeaderLabel>Routed</HeaderLabel>
        <HeaderLabel>Executed</HeaderLabel>
        <HeaderLabel>Fallback in</HeaderLabel>
        <HeaderLabel>Fallback out</HeaderLabel>
        <HeaderLabel>Latency</HeaderLabel>
        <HeaderLabel>Health</HeaderLabel>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {businessModelUsage.map((model) => (
          <div
            key={model.id}
            className="px-5 py-5 sm:px-6"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.3fr)_110px_110px_105px_105px_110px_95px] xl:items-center xl:gap-4">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-[var(--color-foreground)]">
                  {model.model}
                </div>

                <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  {model.provider}
                </div>

                <div className="mt-1 break-all font-mono text-[6px] text-[var(--color-foreground-muted)]">
                  {model.identifier}
                </div>
              </div>

              <Metric
                label="Routed"
                value={model.routedCount.toLocaleString()}
                detail={`${model.routedPercentage.toFixed(1)}%`}
              />

              <Metric
                label="Executed"
                value={model.executedCount.toLocaleString()}
                detail={`${model.executedPercentage.toFixed(1)}%`}
                accent
              />

              <Metric
                label="Fallback in"
                value={model.fallbackInCount.toLocaleString()}
              />

              <Metric
                label="Fallback out"
                value={model.fallbackOutCount.toLocaleString()}
              />

              <Metric
                label="Avg latency"
                value={formatLatency(
                  model.avgLatencyMs,
                )}
              />

              <Health
                health={model.health}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeaderLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)] xl:hidden">
        {label}
      </div>

      <div
        className={[
          "mt-1.5 font-mono text-[9px] xl:mt-0",
          accent
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-foreground)]",
        ].join(" ")}
      >
        {value}
      </div>

      {detail && (
        <div className="mt-1 font-mono text-[6px] text-[var(--color-foreground-muted)]">
          {detail}
        </div>
      )}
    </div>
  );
}

function Health({
  health,
}: {
  health: BusinessModelUsageItem["health"];
}) {
  if (health === "HEALTHY") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <CheckCircle size={8} />
        Healthy
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
      <WarningCircle size={8} />
      {health === "DEGRADED"
        ? "Degraded"
        : "Unavailable"}
    </span>
  );
}
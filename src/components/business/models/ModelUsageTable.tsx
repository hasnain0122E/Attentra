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
      {/* Header */}
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

      {/* Desktop table header */}
      <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/40 px-6 py-3 xl:grid xl:grid-cols-[minmax(220px,1.35fr)_105px_105px_105px_105px_105px_95px] xl:items-center xl:gap-4">
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
          <article
            key={model.id}
            className="px-5 py-5 transition-colors hover:bg-[var(--color-surface-soft)]/30 sm:px-6"
          >
            {/* MOBILE / TABLET */}
            <div className="xl:hidden">
              {/* Identity */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[var(--color-foreground)]">
                    {model.model}
                  </div>

                  <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {model.provider}
                  </div>

                  <div className="mt-1 break-all font-mono text-[6px] text-[var(--color-foreground-muted)]">
                    {model.identifier}
                  </div>
                </div>

                <Health
                  health={model.health}
                />
              </div>

              {/* Metrics */}
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
                <MobileMetric
                  label="Routed"
                  value={model.routedCount.toLocaleString()}
                  detail={`${model.routedPercentage.toFixed(1)}%`}
                />

                <MobileMetric
                  label="Executed"
                  value={model.executedCount.toLocaleString()}
                  detail={`${model.executedPercentage.toFixed(1)}%`}
                  accent
                />

                <MobileMetric
                  label="Fallback in"
                  value={model.fallbackInCount.toLocaleString()}
                />

                <MobileMetric
                  label="Fallback out"
                  value={model.fallbackOutCount.toLocaleString()}
                />
              </div>

              {/* Footer */}
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-4">
                <div>
                  <div className="font-mono text-[6px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
                    Avg latency
                  </div>

                  <div className="mt-2 font-mono text-[8px] text-[var(--color-foreground)]">
                    {formatLatency(
                      model.avgLatencyMs,
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[6px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
                    Capability
                  </div>

                  <div className="mt-2 text-[8px] leading-4 text-[var(--color-foreground-secondary)]">
                    {model.capabilityTier}
                  </div>
                </div>
              </div>

              {/* Task affinity */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {model.taskAffinity.map(
                  (task) => (
                    <span
                      key={task}
                      className="rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]"
                    >
                      {task}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* DESKTOP */}
            <div className="hidden xl:grid xl:grid-cols-[minmax(220px,1.35fr)_105px_105px_105px_105px_105px_95px] xl:items-center xl:gap-4">
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

              <DesktopMetric
                value={model.routedCount.toLocaleString()}
                detail={`${model.routedPercentage.toFixed(1)}%`}
              />

              <DesktopMetric
                value={model.executedCount.toLocaleString()}
                detail={`${model.executedPercentage.toFixed(1)}%`}
                accent
              />

              <DesktopMetric
                value={model.fallbackInCount.toLocaleString()}
              />

              <DesktopMetric
                value={model.fallbackOutCount.toLocaleString()}
              />

              <DesktopMetric
                value={formatLatency(
                  model.avgLatencyMs,
                )}
              />

              <Health
                health={model.health}
              />
            </div>
          </article>
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

function MobileMetric({
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
      <div className="font-mono text-[6px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div
        className={[
          "mt-2 font-mono text-[9px]",
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

function DesktopMetric({
  value,
  detail,
  accent = false,
}: {
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={[
          "font-mono text-[9px]",
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
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <CheckCircle size={8} />
        Healthy
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
      <WarningCircle size={8} />

      {health === "DEGRADED"
        ? "Degraded"
        : "Unavailable"}
    </span>
  );
}
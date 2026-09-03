import {
  ArrowRight,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { BusinessRequestHistoryItem } from "@/lib/dashboard/business-request-queries";

import { formatDisplayCurrency } from "@/lib/currency/display-currency";

interface BusinessRequestRoutingProps {
  request: BusinessRequestHistoryItem;
}

function formatCost(value?: number) {
  if (value === undefined) {
    return "\u2014";
  }

  return formatDisplayCurrency(value);
}

/**
 * Format a latency value for display.
 * Returns em-dash for zero/null/undefined (no measurement available).
 */
function formatLatency(value: number | null | undefined): string {
  if (!value || value <= 0) {
    return "\u2014";
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

/**
 * Build a concise, human-readable routing explanation from persisted data.
 * Uses the same pattern as the consumer RequestRoutingOverview component.
 */
function buildConciseReason(request: BusinessRequestHistoryItem): string {
  const scoreText = request.routingScore > 0
    ? `routing score ${request.routingScore.toFixed(2)}`
    : "routing score";
  const costText = request.projectedCost !== undefined
    ? `projected cost (${formatCost(request.projectedCost)})`
    : "projected cost";

  return (
    `${request.routedModel} was selected for this ` +
    `${request.complexity.toLowerCase()}-complexity ${request.taskType.toLowerCase()} request ` +
    `based on capability, latency, and ${costText}.`
  );
}

export default function BusinessRequestRouting({
  request,
}: BusinessRequestRoutingProps) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Routing decision
        </div>

        <h2 className="mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
          How Attentra routed this organization request
        </h2>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          <Stage
            label="01 · Analyze"
            title={request.taskType}
            detail={`${request.complexity} complexity`}
          />

          <FlowArrow />

          <Stage
            label="02 · Score"
            title={request.routingScore.toFixed(
              4,
            )}
            detail="Routing score"
          />

          <FlowArrow />

          <Stage
            label="03 · Route"
            title={request.routedModel}
            detail={request.routedProvider}
            highlighted
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl bg-[var(--color-foreground)] p-5 text-white">
            <div className="font-mono text-[8px] uppercase tracking-[0.11em] text-white/40">
              Decision explanation
            </div>

            <p className="mt-4 text-[11px] leading-6 text-white/65">
              {buildConciseReason(request)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="Projected cost"
              value={formatCost(
                request.projectedCost,
              )}
            />

            <Metric
              label="Routing latency"
              value={formatLatency(request.routingLatencyMs)}
            />

            <Metric
              label="Task type"
              value={request.taskType}
            />

            <Metric
              label="Complexity"
              value={request.complexity}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stage({
  label,
  title,
  detail,
  highlighted = false,
}: {
  label: string;
  title: string;
  detail: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        highlighted
          ? "border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-background)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl",
          highlighted
            ? "bg-[var(--color-accent)] text-white"
            : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]",
        ].join(" ")}
      >
        <CheckCircle
          size={15}
          weight="duotone"
        />
      </div>

      <div className="mt-5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-2 truncate text-[12px] font-semibold text-[var(--color-foreground)]">
        {title}
      </div>

      <div className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
        {detail}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center text-[var(--color-foreground-muted)] lg:flex">
      <ArrowRight size={14} />
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-3 break-words font-mono text-[9px] text-[var(--color-foreground)]">
        {value}
      </div>
    </div>
  );
}
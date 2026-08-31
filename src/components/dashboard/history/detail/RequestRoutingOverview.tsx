import {
  ArrowRight,
  Brain,
  CheckCircle,
  CirclesThreePlus,
} from "@phosphor-icons/react/dist/ssr";

import type { ReactNode } from "react";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

interface RequestRoutingOverviewProps {
  request: RequestHistoryItem;
}

function formatCost(value?: number) {
  if (value === undefined) {
    return "—";
  }

  return `$${value.toFixed(6)}`;
}

export default function RequestRoutingOverview({
  request,
}: RequestRoutingOverviewProps) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Routing decision
        </div>

        <h2 className="mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
          How Attentra routed this request
        </h2>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr] xl:items-stretch">
          <StageCard
            label="01 · Analyze"
            title={request.taskType}
            detail={`${request.complexity} complexity`}
            icon={<Brain size={17} weight="duotone" />}
          />

          <FlowArrow />

          <StageCard
            label="02 · Score"
            title={request.routingScore.toFixed(4)}
            detail="Routing score"
            icon={
              <CirclesThreePlus
                size={17}
                weight="duotone"
              />
            }
          />

          <FlowArrow />

          <StageCard
            label="03 · Route"
            title={request.routedModel}
            detail={request.routedProvider}
            icon={
              <CheckCircle
                size={17}
                weight="duotone"
              />
            }
            highlighted
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl bg-[var(--color-foreground)] p-5 text-white">
            <div className="font-mono text-[8px] uppercase tracking-[0.11em] text-white/40">
              Decision explanation
            </div>

            <p className="mt-4 text-[11px] leading-6 text-white/65">
              {request.routingReason}
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
              value={`${request.routingLatencyMs}ms`}
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

interface StageCardProps {
  label: string;
  title: string;
  detail: string;
  icon: ReactNode;
  highlighted?: boolean;
}

function StageCard({
  label,
  title,
  detail,
  icon,
  highlighted = false,
}: StageCardProps) {
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
        {icon}
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
    <div className="hidden items-center justify-center text-[var(--color-foreground-muted)] xl:flex">
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

      <div className="mt-3 font-mono text-[10px] text-[var(--color-foreground)]">
        {value}
      </div>
    </div>
  );
}
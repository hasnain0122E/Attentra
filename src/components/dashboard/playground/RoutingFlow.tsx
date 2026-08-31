import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowsClockwise,
  Brain,
  CheckCircle,
  CirclesThreePlus,
  Lightning,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { PlaygroundResultData } from "@/types/dashboard";

interface RoutingFlowProps {
  result: PlaygroundResultData;
}

export default function RoutingFlow({ result }: RoutingFlowProps) {
  const { routing, execution } = result;

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Routing trace
          </div>

          <h2 className="mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            How Attentra handled this request
          </h2>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full bg-[var(--color-accent-soft)] px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />

          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-accent)]">
            Routing complete
          </span>
        </div>
      </div>

      {/* Flow */}
      <div className="p-5 sm:p-6">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-stretch">
          {/* Analyze */}
          <FlowCard
            label="01 · Analyze"
            title={routing.taskType}
            description={`${routing.complexity} complexity`}
            icon={<Brain size={17} weight="duotone" />}
          />

          <FlowArrow />

          {/* Score */}
          <FlowCard
            label="02 · Score"
            title={`${routing.candidates.length} candidates`}
            description="Capability · cost · context"
            icon={<CirclesThreePlus size={17} weight="duotone" />}
          />

          <FlowArrow />

          {/* Route */}
          <FlowCard
            label="03 · Route"
            title={routing.selectedModelDisplayName}
            description={routing.selectedProvider}
            icon={<CheckCircle size={17} weight="duotone" />}
            highlighted
          />

          <FlowArrow />

          {/* Execute */}
          <FlowCard
            label="04 · Execute"
            title={execution.displayName}
            description={
              execution.fallbackUsed
                ? `${execution.provider} · fallback`
                : execution.provider
            }
            icon={
              execution.fallbackUsed ? (
                <ArrowsClockwise size={17} weight="duotone" />
              ) : (
                <Lightning size={17} weight="duotone" />
              )
            }
            fallback={execution.fallbackUsed}
          />
        </div>

        {execution.fallbackUsed && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] px-4 py-3.5 sm:flex-row sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-accent)]">
              <WarningCircle size={17} weight="duotone" />
            </div>

            <div className="flex-1">
              <div className="text-[11px] font-medium text-[var(--color-foreground)]">
                Primary execution unavailable
              </div>

              <p className="mt-1 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
                {routing.selectedModelDisplayName} was selected by the routing
                engine, but execution continued with {execution.displayName}{" "}
                using Attentra&apos;s ordered fallback path.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
              Automatic fallback
              <ArrowRight size={10} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface FlowCardProps {
  label: string;
  title: string;
  description: string;
  icon: ReactNode;
  highlighted?: boolean;
  fallback?: boolean;
}

function FlowCard({
  label,
  title,
  description,
  icon,
  highlighted = false,
  fallback = false,
}: FlowCardProps) {
  return (
    <div
      className={[
        "relative min-w-0 rounded-2xl border p-4",
        highlighted
          ? "border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-background)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl",
          highlighted || fallback
            ? "bg-[var(--color-accent)] text-white"
            : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="mt-5 font-mono text-[8px] uppercase tracking-[0.11em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-2 truncate text-[12px] font-semibold text-[var(--color-foreground)]">
        {title}
      </div>

      <div className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
        {description}
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

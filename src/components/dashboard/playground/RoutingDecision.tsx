import {
  ArrowRight,
  Brain,
  CheckCircle,
  Gauge,
} from "@phosphor-icons/react/dist/ssr";

import type { RoutingDisplayData } from "@/types/dashboard";

interface RoutingDecisionProps {
  routing: RoutingDisplayData;
}

function buildConciseReason(routing: RoutingDisplayData): string {
  const selected = routing.candidates.find((c) => c.selected);
  const scoreText = selected ? `routing score ${selected.score.toFixed(2)}` : "routing score";
  const costText = `$${routing.projectedCost.toFixed(6)}`;

  return (
    `Selected ${routing.selectedModelDisplayName} for this ` +
    `${routing.complexity.toLowerCase()}-complexity ${routing.taskType.toLowerCase()} request ` +
    `based on capability, context fit, projected cost (${costText}), and ${scoreText}.`
  );
}

export default function RoutingDecision({
  routing,
}: RoutingDecisionProps) {
  const selected = routing.candidates.find((c) => c.selected);

  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Routing decision
          </div>

          <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            Attentra selected
          </h2>
        </div>

        <CheckCircle
          size={20}
          weight="duotone"
          className="text-[var(--color-accent)]"
        />
      </div>

      <div className="mt-6 rounded-2xl bg-[var(--color-accent-soft)] p-4">
        <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-accent)]">
          Routed model
        </div>

        <div className="mt-2 text-[15px] font-semibold text-[var(--color-foreground)]">
          {routing.selectedModelDisplayName}
        </div>

        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
          {routing.selectedProvider}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--color-border)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--color-foreground-muted)]">
            <Brain size={13} />

            <span className="font-mono text-[8px] uppercase tracking-[0.1em]">
              Task
            </span>
          </div>

          <div className="mt-2 text-[11px] font-medium text-[var(--color-foreground)]">
            {routing.taskType}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--color-foreground-muted)]">
            <Gauge size={13} />

            <span className="font-mono text-[8px] uppercase tracking-[0.1em]">
              Complexity
            </span>
          </div>

          <div className="mt-2 text-[11px] font-medium text-[var(--color-foreground)]">
            {routing.complexity}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          Why this model
        </div>

        <p className="mt-2 text-[11px] leading-5 text-[var(--color-foreground-secondary)]">
          {buildConciseReason(routing)}
        </p>
      </div>

      {selected && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--color-surface-soft)] p-3">
            <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
              Routing score
            </div>

            <div className="mt-1.5 font-mono text-[12px] font-medium text-[var(--color-foreground)]">
              {selected.score.toFixed(4)}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--color-surface-soft)] p-3">
            <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
              Projected cost
            </div>

            <div className="mt-1.5 font-mono text-[12px] font-medium text-[var(--color-foreground)]">
              ${routing.projectedCost.toFixed(6)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 border-t border-[var(--color-border)] pt-4 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
        Analyze
        <ArrowRight size={10} />
        Score
        <ArrowRight size={10} />
        Route
      </div>
    </section>
  );
}
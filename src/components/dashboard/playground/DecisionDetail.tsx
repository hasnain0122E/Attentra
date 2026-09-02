import {
  Brain,
  CurrencyDollar,
  Database,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";

import type { RoutingDisplayData } from "@/types/dashboard";

interface DecisionDetailProps {
  routing: RoutingDisplayData;
}

const factors = [
  {
    title: "Task capability",
    description:
      "Model capability is evaluated against the detected request type.",
    icon: Brain,
  },
  {
    title: "Context fit",
    description:
      "Candidates unable to satisfy the estimated context requirement are rejected.",
    icon: Database,
  },
  {
    title: "Cost",
    description:
      "Current model pricing contributes to the projected request cost.",
    icon: CurrencyDollar,
  },
  {
    title: "Routing score",
    description:
      "Eligible candidates are normalized and ranked before execution.",
    icon: Lightning,
  },
];

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

export default function DecisionDetail({
  routing,
}: DecisionDetailProps) {
  const selected = routing.candidates.find((c) => c.selected);

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
      {/* Explanation */}
      <div className="rounded-[24px] bg-[var(--color-foreground)] p-5 text-white sm:p-6">
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/40">
          Decision explanation
        </div>

        <div className="mt-5 font-reservation text-[28px] leading-[1.02] tracking-[-0.025em]">
          Why {routing.selectedModelDisplayName}?
        </div>

        <p className="mt-5 max-w-[620px] text-[11px] leading-6 text-white/60">
          {buildConciseReason(routing)}
        </p>

        <div className="mt-7 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
            <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-white/35">
              Task
            </div>

            <div className="mt-2 text-[10px] font-medium">
              {routing.taskType}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
            <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-white/35">
              Complexity
            </div>

            <div className="mt-2 text-[10px] font-medium">
              {routing.complexity}
            </div>
          </div>
        </div>

        {selected && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
              <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-white/35">
                Routing score
              </div>

              <div className="mt-2 font-mono text-[11px] font-medium">
                {selected.score.toFixed(4)}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
              <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-white/35">
                Projected cost
              </div>

              <div className="mt-2 font-mono text-[11px] font-medium">
                ${routing.projectedCost.toFixed(6)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Factors */}
      <div className="grid gap-3 sm:grid-cols-2">
        {factors.map((factor) => {
          const Icon = factor.icon;

          return (
            <div
              key={factor.title}
              className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Icon size={15} weight="duotone" />
              </div>

              <div className="mt-5 text-[11px] font-semibold text-[var(--color-foreground)]">
                {factor.title}
              </div>

              <p className="mt-2 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
                {factor.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
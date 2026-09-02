import {
  Check,
  Trophy,
} from "@phosphor-icons/react/dist/ssr";

import type { RoutingCandidateDisplayData } from "@/types/dashboard";

interface CandidateRankingProps {
  candidates: RoutingCandidateDisplayData[];
}

function formatCost(cost: number) {
  return `$${cost.toFixed(6)}`;
}

export default function CandidateRanking({
  candidates,
}: CandidateRankingProps) {
  const topCandidates = candidates.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Candidate scoring
          </div>

          <h2 className="mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            Ranked model candidates
          </h2>
        </div>

        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          Top {topCandidates.length}
        </div>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {topCandidates.map((candidate) => {
          const percentage = Math.max(
            0,
            Math.min(100, candidate.score * 100),
          );

          return (
            <div
              key={candidate.modelIdentifier}
              className={[
                "grid gap-4 px-5 py-4 transition-colors sm:px-6",
                "lg:grid-cols-[48px_minmax(180px,1.1fr)_minmax(180px,1fr)_90px_110px]",
                "lg:items-center",
                candidate.selected
                  ? "bg-[var(--color-accent-soft)]/60"
                  : "hover:bg-[var(--color-surface-soft)]",
              ].join(" ")}
            >
              {/* Rank */}
              <div className="flex items-center gap-2">
                {candidate.rank === 1 ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white">
                    <Trophy size={12} weight="fill" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] font-mono text-[9px] text-[var(--color-foreground-secondary)]">
                    {candidate.rank}
                  </div>
                )}
              </div>

              {/* Model */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[11px] font-medium text-[var(--color-foreground)]">
                    {candidate.displayName}
                  </span>

                  {candidate.selected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-white">
                      <Check size={8} weight="bold" />
                      Selected
                    </span>
                  )}
                </div>

                <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  {candidate.provider}
                </div>
              </div>

              {/* Score visualization */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    Routing score
                  </span>

                  <span className="font-mono text-[9px] text-[var(--color-foreground)]">
                    {candidate.score.toFixed(4)}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
                  <div
                    className={[
                      "h-full rounded-full",
                      candidate.selected
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-foreground-muted)]/35",
                    ].join(" ")}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>

              {/* Cost */}
              <div>
                <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)] lg:hidden">
                  Projected
                </div>

                <div className="mt-1 font-mono text-[9px] text-[var(--color-foreground)] lg:mt-0">
                  {formatCost(candidate.projectedCost)}
                </div>
              </div>

              {/* State */}
              <div className="lg:text-right">
                <span
                  className={[
                    "inline-flex rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em]",
                    candidate.selected
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-muted)]",
                  ].join(" ")}
                >
                  {candidate.selected ? "Primary" : "Eligible"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
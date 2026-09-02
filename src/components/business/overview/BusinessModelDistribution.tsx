import type { BusinessOverviewModelUsage } from "@/lib/dashboard/business-overview-queries";

interface BusinessModelDistributionProps {
  items: BusinessOverviewModelUsage[];
}

export default function BusinessModelDistribution({ items }: BusinessModelDistributionProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Model usage
        </div>
        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Organization requests by model
        </h2>
        <p className="mt-4 text-[10px] leading-5 text-[var(--color-foreground-muted)]">
          No model usage data yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Model usage
          </div>

          <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
            Organization requests by model
          </h2>

          <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
            Distribution of routed workloads across models used by the
            organization.
          </p>
        </div>

        <div className="hidden font-mono text-[7px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)] sm:block">
          All time
        </div>
      </div>

      <div className="mt-7 space-y-6">
        {items.map((item) => (
          <div key={item.modelId}>
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                  {item.displayName}
                </div>

                <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.11em] text-[var(--color-foreground-muted)]">
                  {item.provider}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="font-mono text-[9px] text-[var(--color-foreground)]">
                  {item.share}%
                </div>

                <div className="mt-1 text-[8px] text-[var(--color-foreground-muted)]">
                  {item.requests.toLocaleString()} requests
                </div>
              </div>
            </div>

            <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
                style={{
                  width: `${item.share}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

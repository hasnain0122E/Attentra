import { modelRoutingDistribution } from "@/lib/business/routing-data";

export default function ModelRoutingDistribution() {
  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div>
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Model routing
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Routed vs executed workloads
        </h2>

        <p className="mt-2 max-w-[600px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Compare primary routing decisions with the models
          that ultimately completed execution.
        </p>
      </div>

      <div className="mt-7 space-y-6">
        {modelRoutingDistribution.map((item) => (
          <div key={item.model}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  {item.model}
                </div>

                <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                  {item.provider}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-[8px] text-[var(--color-foreground)]">
                  {item.routedCount.toLocaleString()} routed
                </div>

                <div className="mt-1 font-mono text-[7px] text-[var(--color-accent)]">
                  {item.executedCount.toLocaleString()} executed
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <DistributionBar
                label="Routed"
                percentage={item.routedPercentage}
                muted
              />

              <DistributionBar
                label="Executed"
                percentage={item.executedPercentage}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DistributionBar({
  label,
  percentage,
  muted = false,
}: {
  label: string;
  percentage: number;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-[62px_1fr_42px] items-center gap-2.5">
      <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="h-[5px] overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
        <div
          className={[
            "h-full rounded-full",
            muted
              ? "bg-[var(--color-foreground-muted)]/45"
              : "bg-[var(--color-accent)]",
          ].join(" ")}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="text-right font-mono text-[7px] text-[var(--color-foreground-muted)]">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}
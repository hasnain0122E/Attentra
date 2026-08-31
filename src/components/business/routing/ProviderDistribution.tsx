import { providerDistribution } from "@/lib/business/routing-data";

export default function ProviderDistribution() {
  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div>
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Provider distribution
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Routing across providers
        </h2>

        <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Routed and executed workload share across provider
          infrastructure.
        </p>
      </div>

      <div className="mt-7 space-y-5">
        {providerDistribution.map((provider) => (
          <div
            key={provider.provider}
            className="rounded-[17px] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  {provider.provider}
                </div>

                <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  Provider
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-[8px] text-[var(--color-foreground)]">
                  {provider.routedPercentage.toFixed(1)}% routed
                </div>

                <div className="mt-1 font-mono text-[7px] text-[var(--color-accent)]">
                  {provider.executedPercentage.toFixed(1)}% executed
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric
                label="Routed"
                value={provider.routedCount.toLocaleString()}
              />

              <Metric
                label="Executed"
                value={provider.executedCount.toLocaleString()}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
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
    <div className="rounded-xl bg-[var(--color-surface)] p-3">
      <div className="font-mono text-[6px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-2 font-mono text-[9px] text-[var(--color-foreground)]">
        {value}
      </div>
    </div>
  );
}
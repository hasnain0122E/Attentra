import { taskDistribution } from "@/lib/business/routing-data";

export default function TaskDistribution() {
  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div>
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Task distribution
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          What the organization is asking
        </h2>

        <p className="mt-2 max-w-[560px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Request volume grouped by the task classification
          produced by Attentra&apos;s routing analyzer.
        </p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {taskDistribution.map((item) => (
          <div
            key={item.taskType}
            className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                  {item.taskType}
                </div>

                <div className="mt-2 text-[12px] font-semibold text-[var(--color-foreground)]">
                  {item.requestCount.toLocaleString()}
                </div>
              </div>

              <div className="font-mono text-[9px] text-[var(--color-accent)]">
                {item.percentage}%
              </div>
            </div>

            <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{
                  width: `${item.percentage}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
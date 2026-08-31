import { taskAffinityData } from "@/lib/business/model-data";

export default function TaskAffinityPanel() {
  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div>
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Task affinity
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Which models dominate each workload
        </h2>

        <p className="mt-2 max-w-[620px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Primary model selection by task classification
          across organization routing activity.
        </p>
      </div>

      <div className="mt-7 space-y-4">
        {taskAffinityData.map((item) => (
          <div
            key={item.taskType}
            className="rounded-[17px] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                  {item.taskType}
                </div>

                <div className="mt-2 text-[11px] font-semibold text-[var(--color-foreground)]">
                  {item.primaryModel}
                </div>

                <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  {item.provider}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="font-mono text-[9px] text-[var(--color-accent)]">
                  {item.percentage}%
                </div>

                <div className="mt-1 text-[7px] text-[var(--color-foreground-muted)]">
                  {item.requestCount.toLocaleString()} requests
                </div>
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
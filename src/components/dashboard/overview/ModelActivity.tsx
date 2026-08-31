import { modelActivity } from "@/lib/dashboard/mock-data";

export default function ModelActivity() {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Model activity
          </div>

          <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            Requests by model
          </h2>
        </div>

        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          Last 7 days
        </div>
      </div>

      <div className="mt-7 space-y-5">
        {modelActivity.map((item) => (
          <div key={item.model}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-[var(--color-foreground)]">
                  {item.model}
                </div>

                <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                  {item.provider}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-[10px] text-[var(--color-foreground)]">
                  {item.share}%
                </div>

                <div className="mt-0.5 text-[9px] text-[var(--color-foreground-muted)]">
                  {item.requests} requests
                </div>
              </div>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${item.share}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
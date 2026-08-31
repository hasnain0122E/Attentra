import Link from "next/link";
import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";
import { recentRequests } from "@/lib/dashboard/mock-data";

export default function RecentRequests() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 lg:px-6">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Activity
          </div>

          <h2 className="mt-1.5 text-[17px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            Recent requests
          </h2>
        </div>

        <Link
          href="/dashboard/history"
          className="group flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-foreground-secondary)] transition-colors hover:text-[var(--color-foreground)]"
        >
          View history

          <ArrowRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-6 py-3 text-left font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Request
              </th>

              <th className="px-4 py-3 text-left font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Task
              </th>

              <th className="px-4 py-3 text-left font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Routed
              </th>

              <th className="px-4 py-3 text-left font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Executed
              </th>

              <th className="px-4 py-3 text-left font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Status
              </th>

              <th className="px-4 py-3 text-right font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Latency
              </th>
            </tr>
          </thead>

          <tbody>
            {recentRequests.map((request) => (
              <tr
                key={request.id}
                className="border-b border-[var(--color-border)] last:border-b-0 transition-colors hover:bg-[var(--color-surface-soft)]"
              >
                <td className="max-w-[300px] px-6 py-4">
                  <div className="truncate text-[11px] font-medium text-[var(--color-foreground)]">
                    {request.prompt}
                  </div>

                  <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {request.time}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="font-mono text-[9px] text-[var(--color-foreground-secondary)]">
                    {request.taskType}
                  </div>

                  <div className="mt-1 text-[9px] text-[var(--color-foreground-muted)]">
                    {request.complexity}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="text-[10px] font-medium text-[var(--color-foreground)]">
                    {request.routedModel}
                  </div>

                  <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {request.routedProvider}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="text-[10px] font-medium text-[var(--color-foreground)]">
                    {request.executedModel}
                  </div>

                  <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {request.executedProvider}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em]",
                      request.fallbackUsed
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]",
                    ].join(" ")}
                  >
                    {request.fallbackUsed ? (
                      <ArrowsClockwise size={10} />
                    ) : (
                      <CheckCircle size={10} />
                    )}

                    {request.status}
                  </div>
                </td>

                <td className="px-4 py-4 text-right font-mono text-[9px] text-[var(--color-foreground-secondary)]">
                  {request.latency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
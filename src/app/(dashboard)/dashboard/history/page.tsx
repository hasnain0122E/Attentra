import Link from "next/link";
import {
  ArrowRight,
  ClockCounterClockwise,
} from "@phosphor-icons/react/dist/ssr";

import HistoryClient from "@/components/dashboard/history/HistoryClient";
import { requestHistory } from "@/lib/dashboard/history-data";

export default function HistoryPage() {
  const fallbackCount = requestHistory.filter(
    (request) => request.fallbackUsed,
  ).length;

  const failedCount = requestHistory.filter(
    (request) => request.status === "FAILED",
  ).length;

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-6 border-b border-[var(--color-border)] pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Request ledger
          </div>

          <h1 className="mt-3 font-reservation text-[clamp(2.2rem,4vw,4rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[var(--color-foreground)]">
            Request history.
          </h1>

          <p className="mt-4 max-w-[700px] text-[13px] leading-6 text-[var(--color-foreground-secondary)]">
            Inspect routing decisions, execution outcomes,
            fallbacks, latency, and model activity across your
            recent requests.
          </p>
        </div>

        <Link
          href="/dashboard/playground"
          className="group inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-3 text-[11px] font-medium text-white transition-transform hover:-translate-y-0.5"
        >
          Run a request

          <ArrowRight
            size={13}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <HistoryMetric
          label="Requests"
          value={String(requestHistory.length)}
        />

        <HistoryMetric
          label="Fallbacks"
          value={String(fallbackCount)}
        />

        <HistoryMetric
          label="Failed"
          value={String(failedCount)}
        />
      </section>

      <HistoryClient />
    </div>
  );
}

function HistoryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div>
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          {label}
        </div>

        <div className="mt-1 font-reservation text-[24px] leading-none text-[var(--color-foreground)]">
          {value}
        </div>
      </div>

      <ClockCounterClockwise
        size={17}
        weight="duotone"
        className="text-[var(--color-accent)]"
      />
    </div>
  );
}
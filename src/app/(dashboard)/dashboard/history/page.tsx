import Link from "next/link";
import {
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";

import HistoryClient from "@/components/dashboard/history/HistoryClient";

export default function HistoryPage() {
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

      <HistoryClient />
    </div>
  );
}
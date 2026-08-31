import Link from "next/link";

import {
  ArrowLeft,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

interface RequestDetailHeaderProps {
  request: RequestHistoryItem;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function RequestDetailHeader({
  request,
}: RequestDetailHeaderProps) {
  return (
    <div className="mb-7">
      <Link
        href="/dashboard/history"
        className="inline-flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)] transition hover:text-[var(--color-accent)]"
      >
        <ArrowLeft size={11} />
        Request history
      </Link>

      <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={request.status}
            />

            <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
              {request.taskType}
            </span>

            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
              {request.complexity}
            </span>
          </div>

          <h1 className="mt-4 font-reservation text-[34px] leading-[0.98] tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[42px]">
            Request detail.
          </h1>

          <p className="mt-3 font-mono text-[8px] tracking-[0.04em] text-[var(--color-foreground-muted)]">
            {request.id}
          </p>
        </div>

        <div className="xl:text-right">
          <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Created
          </div>

          <div className="mt-1.5 text-[10px] text-[var(--color-foreground-secondary)]">
            {formatDate(request.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: RequestHistoryItem["status"];
}) {
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
        <WarningCircle size={10} />
        Failed
      </span>
    );
  }

  if (status === "FALLBACK") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <ArrowsClockwise size={10} />
        Fallback used
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
      <CheckCircle size={10} />
      Success
    </span>
  );
}
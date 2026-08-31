import {
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { RequestHistoryStatus } from "@/types/dashboard";

interface RequestStatusBadgeProps {
  status: RequestHistoryStatus;
}

export default function RequestStatusBadge({
  status,
}: RequestStatusBadgeProps) {
  if (status === "FALLBACK") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <ArrowsClockwise size={10} />
        Fallback
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
        <WarningCircle size={10} />
        Failed
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
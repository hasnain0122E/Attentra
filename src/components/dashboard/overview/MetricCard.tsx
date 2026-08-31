interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  detail: string;
}

export default function MetricCard({
  label,
  value,
  change,
  detail,
}: MetricCardProps) {
  const positive = change.startsWith("+");

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div className="font-reservation text-[34px] leading-none tracking-[-0.025em] text-[var(--color-foreground)]">
          {value}
        </div>

        <div
          className={[
            "rounded-full px-2 py-1 font-mono text-[9px]",
            positive
              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
              : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]",
          ].join(" ")}
        >
          {change}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-[var(--color-foreground-secondary)]">
        {detail}
      </p>
    </div>
  );
}
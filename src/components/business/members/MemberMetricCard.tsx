interface MemberMetricCardProps {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}

export default function MemberMetricCard({
  label,
  value,
  detail,
  accent = false,
}: MemberMetricCardProps) {
  return (
    <article
      className={[
        "relative overflow-hidden rounded-[22px] border p-5 sm:p-6",
        accent
          ? "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)]/60"
          : "border-[var(--color-border)] bg-[var(--color-surface)]",
      ].join(" ")}
    >
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--color-accent)] opacity-[0.10] blur-[40px]"
        />
      )}

      <div className="relative z-10">
        <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]">
          {label}
        </div>

        <div className="mt-6 font-reservation text-[38px] leading-none tracking-[-0.035em] text-[var(--color-foreground)] sm:text-[42px]">
          {value}
        </div>

        <p className="mt-4 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          {detail}
        </p>
      </div>
    </article>
  );
}
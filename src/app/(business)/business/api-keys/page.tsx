export default function ApiKeysPage() {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
        Business workspace
      </div>

      <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
        Api Keys.
      </h1>

      <p className="mt-3 max-w-[650px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
        Organization-wide request activity will
        appear here.
      </p>
    </div>
  );
}
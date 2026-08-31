import SettingsClient from "@/components/dashboard/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Workspace configuration
          </div>

          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            Settings.
          </h1>

          <p className="mt-3 max-w-[670px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
            Configure workspace defaults,
            routing preferences, fallback
            behavior, and developer-facing
            display options.
          </p>
        </div>

        <div className="w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Consumer workspace
          </span>
        </div>
      </div>

      <SettingsClient />
    </div>
  );
}
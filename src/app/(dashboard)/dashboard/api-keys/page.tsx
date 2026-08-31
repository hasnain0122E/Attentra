import ApiKeysClient from "@/components/dashboard/api-keys/ApiKeysClient";

export default function ApiKeysPage() {
  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Developer access
          </div>

          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            API keys.
          </h1>

          <p className="mt-3 max-w-[650px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
            Create and manage credentials used
            by your applications to authenticate
            with Attentra&apos;s unified routing
            API.
          </p>
        </div>

        <div className="w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Consumer workspace
          </span>
        </div>
      </div>

      <ApiKeysClient />
    </div>
  );
}
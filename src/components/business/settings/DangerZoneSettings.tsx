"use client";

import {
  Warning,
} from "@phosphor-icons/react";

export default function DangerZoneSettings() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Danger zone
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Destructive workspace actions
        </h2>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 rounded-[17px] border border-[var(--color-border)] bg-[var(--color-background)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Warning
                size={14}
                weight="duotone"
              />
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[var(--color-foreground)]">
                Delete organization
              </div>

              <p className="mt-1 max-w-[520px] text-[8px] leading-4 text-[var(--color-foreground-secondary)]">
                Permanently remove the
                workspace, organization
                configuration, and
                administrative access.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="h-9 shrink-0 rounded-xl border border-[var(--color-border)] px-4 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)] opacity-50"
          >
            Disabled in demo
          </button>
        </div>
      </div>
    </section>
  );
}
"use client";

import {
  Prohibit,
  X,
} from "@phosphor-icons/react";

import type { DashboardApiKey } from "@/lib/dashboard/api-key-data";

interface RevokeKeyModalProps {
  apiKey: DashboardApiKey | null;

  onClose: () => void;
  onConfirm: () => void;
}

export default function RevokeKeyModal({
  apiKey,
  onClose,
  onConfirm,
}: RevokeKeyModalProps) {
  if (!apiKey) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close revoke key dialog"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--color-foreground)]/25 backdrop-blur-[3px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-key-title"
        className="relative z-10 w-full max-w-[470px] rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_30px_90px_rgba(25,23,21,0.18)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Prohibit
                size={18}
                weight="duotone"
              />
            </div>

            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-accent)]">
                Revoke credential
              </div>

              <h2
                id="revoke-key-title"
                className="mt-1.5 text-[18px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]"
              >
                Revoke API key?
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-foreground-muted)] transition hover:bg-[var(--color-surface-soft)]"
          >
            <X size={14} />
          </button>
        </div>

        <p className="mt-5 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Applications using{" "}
          <span className="font-medium text-[var(--color-foreground)]">
            {apiKey.name}
          </span>{" "}
          will no longer be able to authenticate
          after the key is revoked.
        </p>

        <div className="mt-4 rounded-xl bg-[var(--color-background)] px-3 py-3 font-mono text-[8px] text-[var(--color-foreground-muted)]">
          {apiKey.maskedKey}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-[9px] font-medium text-[var(--color-foreground-secondary)] transition hover:bg-[var(--color-surface-soft)]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-xl bg-[var(--color-foreground)] px-4 text-[9px] font-medium text-white transition hover:opacity-90"
          >
            Revoke key
          </button>
        </div>
      </div>
    </div>
  );
}
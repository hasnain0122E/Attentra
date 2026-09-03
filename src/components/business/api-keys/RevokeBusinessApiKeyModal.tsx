"use client";

import { useEffect } from "react";

import { Warning, X } from "@phosphor-icons/react";

interface RevokeBusinessApiKeyModalProps {
  keyName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RevokeBusinessApiKeyModal({
  keyName,
  onClose,
  onConfirm,
}: RevokeBusinessApiKeyModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close revoke API key modal"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--color-foreground)]/35 backdrop-blur-[3px]"
      />

      <div className="relative z-10 w-full max-w-[470px] rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_30px_100px_rgba(25,23,21,0.20)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <Warning size={16} weight="duotone" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)]"
          >
            <X size={12} />
          </button>
        </div>

        <h2 className="mt-5 font-reservation text-[27px] leading-none tracking-[-0.025em] text-[var(--color-foreground)]">
          Revoke credential?
        </h2>

        <p className="mt-3 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Applications using{" "}
          <span className="font-semibold text-[var(--color-foreground)]">
            {keyName}
          </span>{" "}
          would no longer be able to authenticate with this credential.
        </p>

        <div className="mt-5 rounded-[16px] bg-[var(--color-background)] p-4">
          <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
            Credential
          </div>

          <div className="mt-2 text-[10px] font-semibold text-[var(--color-foreground)]">
            {keyName}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[var(--color-border)] px-5 text-[9px] text-[var(--color-foreground-secondary)]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-xl bg-[var(--color-foreground)] px-5 text-[9px] font-semibold text-white transition hover:opacity-90"
          >
            Revoke credential
          </button>
        </div>
      </div>
    </div>
  );
}

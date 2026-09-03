"use client";

import { useEffect, useState } from "react";

import { Check, Copy } from "@phosphor-icons/react";

interface CreatedBusinessKeyModalProps {
  rawKey: string;
  keyName: string;
  onClose: () => void;
}

export default function CreatedBusinessKeyModal({
  rawKey,
  keyName,
  onClose,
}: CreatedBusinessKeyModalProps) {
  const [copied, setCopied] = useState(false);

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

  async function copySecret() {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[540px] overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_30px_100px_rgba(25,23,21,0.20)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5 sm:p-6">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Check size={15} weight="bold" />
            </div>
            <h2 className="mt-4 font-reservation text-[27px] leading-none tracking-[-0.025em] text-[var(--color-foreground)]">
              API key created.
            </h2>
            <p className="mt-2 max-w-[390px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
              Copy your API key now. You won&apos;t be able to see it
              again.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
              {keyName}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-5 text-[var(--color-foreground)] select-all">
                {rawKey}
              </code>
              <button
                type="button"
                onClick={copySecret}
                aria-label="Copy API key"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-accent)]"
              >
                {copied ? (
                  <Check size={13} weight="bold" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
            {copied && (
              <div className="mt-2 font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-accent)]">
                Copied
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 h-10 w-full rounded-xl bg-[var(--color-foreground)] text-[9px] font-semibold text-white transition hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

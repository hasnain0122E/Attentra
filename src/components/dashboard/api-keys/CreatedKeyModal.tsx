"use client";

import { useState } from "react";

import {
  Check,
  Copy,
  ShieldCheck,
  Warning,
  X,
} from "@phosphor-icons/react";

interface CreatedKeyModalProps {
  open: boolean;
  keyName: string;
  secret: string;

  onClose: () => void;
}

export default function CreatedKeyModal({
  open,
  keyName,
  secret,
  onClose,
}: CreatedKeyModalProps) {
  const [copied, setCopied] =
    useState(false);

  if (!open) {
    return null;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(
      secret,
    );

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1400);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--color-foreground)]/30 backdrop-blur-[3px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="created-api-key-title"
        className="relative z-10 w-full max-w-[560px] rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_30px_90px_rgba(25,23,21,0.2)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white">
              <ShieldCheck
                size={18}
                weight="duotone"
              />
            </div>

            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-accent)]">
                Key created
              </div>

              <h2
                id="created-api-key-title"
                className="mt-1.5 text-[18px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]"
              >
                Save your API key
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

        <div className="mt-5 rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] p-4">
          <div className="flex gap-2.5">
            <Warning
              size={15}
              weight="duotone"
              className="mt-0.5 shrink-0 text-[var(--color-accent)]"
            />

            <div>
              <div className="text-[10px] font-semibold text-[var(--color-foreground)]">
                This secret is shown only once
              </div>

              <p className="mt-1 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
                Copy it now and store it securely.
                Attentra will not display the full
                credential again.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
            {keyName}
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-2">
            <code className="min-w-0 flex-1 overflow-x-auto px-2 font-mono text-[9px] text-[var(--color-foreground)]">
              {secret}
            </code>

            <button
              type="button"
              onClick={handleCopy}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-foreground)] px-3 font-mono text-[8px] uppercase tracking-[0.08em] text-white transition hover:opacity-90"
            >
              {copied ? (
                <>
                  <Check
                    size={10}
                    weight="bold"
                  />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={10} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-10 w-full rounded-xl bg-[var(--color-accent)] text-[9px] font-medium text-white transition hover:opacity-90"
        >
          I saved my key
        </button>
      </div>
    </div>
  );
}
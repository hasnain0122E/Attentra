"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Sparkle,
} from "@phosphor-icons/react";

interface ResponsePanelProps {
  content: string;
}

export default function ResponsePanel({
  content,
}: ResponsePanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Sparkle
            size={15}
            weight="duotone"
            className="text-[var(--color-accent)]"
          />

          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
              Response
            </div>

            <div className="mt-1 text-[12px] font-medium text-[var(--color-foreground)]">
              Generated through Attentra
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 text-[10px] font-medium text-[var(--color-foreground-secondary)] transition-colors hover:text-[var(--color-foreground)]"
        >
          {copied ? (
            <>
              <Check size={13} />
              Copied
            </>
          ) : (
            <>
              <Copy size={13} />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="p-5 sm:p-6 lg:p-7">
        <div className="max-w-[880px] whitespace-pre-wrap text-[13px] leading-7 text-[var(--color-foreground-secondary)] sm:text-[14px]">
          {content}
        </div>
      </div>
    </section>
  );
}
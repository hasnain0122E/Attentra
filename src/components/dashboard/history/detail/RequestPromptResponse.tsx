"use client";

import { useState } from "react";

import {
  Check,
  Copy,
} from "@phosphor-icons/react";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

interface RequestPromptResponseProps {
  request: RequestHistoryItem;
}

export default function RequestPromptResponse({
  request,
}: RequestPromptResponseProps) {
  const [copied, setCopied] = useState(false);

  async function copyResponse() {
    if (!request.response) {
      return;
    }

    await navigator.clipboard.writeText(
      request.response,
    );

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1400);
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {/* Prompt */}
      <article className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
          User prompt
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--color-background)] p-4 sm:p-5">
          <p className="whitespace-pre-wrap text-[11px] leading-6 text-[var(--color-foreground)]">
            {request.prompt}
          </p>
        </div>
      </article>

      {/* Response */}
      <article className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Generated response
          </div>

          {request.response && (
            <button
              type="button"
              onClick={copyResponse}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]"
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
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--color-accent-soft)]/50 p-4 sm:p-5">
          {request.response ? (
            <p className="whitespace-pre-wrap text-[11px] leading-6 text-[var(--color-foreground)]">
              {request.response}
            </p>
          ) : (
            <div>
              <div className="text-[11px] font-medium text-[var(--color-foreground)]">
                No response generated
              </div>

              <p className="mt-2 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
                This request did not complete
                successfully, so there is no model
                response associated with the record.
              </p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
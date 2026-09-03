"use client";

import {
  useState,
  type ElementType,
} from "react";

import {
  Check,
  Copy,
  Key,
} from "@phosphor-icons/react";

import type { BusinessRequestHistoryItem } from "@/lib/dashboard/business-request-queries";

interface BusinessRequestPromptResponseProps {
  request: BusinessRequestHistoryItem;
}

export default function BusinessRequestPromptResponse({
  request,
}: BusinessRequestPromptResponseProps) {
  const [copied, setCopied] =
    useState(false);

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
    <section className="space-y-4">
      {/* Organization context */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ContextCard
          icon={Key}
          label="Requester"
          value={request.requester}
          detail="Organization API key"
        />

        <ContextCard
          icon={Key}
          label="API key"
          value={request.apiKeyName}
          detail={request.apiKeyPrefix}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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
                  This organization request did
                  not complete successfully, so
                  there is no generated response
                  associated with it.
                </p>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

interface ContextCardProps {
  icon: ElementType;
  label: string;
  value: string;
  detail: string;
}

function ContextCard({
  icon: Icon,
  label,
  value,
  detail,
}: ContextCardProps) {
  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2">
        <Icon
          size={13}
          weight="duotone"
          className="text-[var(--color-accent)]"
        />

        <span className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
          {label}
        </span>
      </div>

      <div className="mt-3 truncate text-[10px] font-semibold text-[var(--color-foreground)]">
        {value}
      </div>

      <div className="mt-1 truncate font-mono text-[7px] text-[var(--color-foreground-muted)]">
        {detail}
      </div>
    </div>
  );
}
"use client";

import {
  ArrowUp,
  Command,
  Sparkle,
} from "@phosphor-icons/react";

interface PromptComposerProps {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function PromptComposer({
  value,
  loading,
  onChange,
  onSubmit,
}: PromptComposerProps) {
  const canSubmit = value.trim().length > 0 && !loading;

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Prompt
          </div>

          <div className="mt-1 text-[12px] text-[var(--color-foreground-secondary)]">
            Send a request through Attentra.
          </div>
        </div>

        <div className="hidden items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-accent)] sm:flex">
          <Sparkle size={10} weight="fill" />
          Intelligent routing
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ask Attentra anything..."
          rows={8}
          className="min-h-[190px] w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-7 text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-foreground-muted)]"
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
            <Command size={11} />
            Attentra chooses the model automatically
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4",
              "text-[11px] font-medium transition-all duration-200",
              canSubmit
                ? "bg-[var(--color-foreground)] text-white hover:-translate-y-0.5"
                : "cursor-not-allowed bg-[var(--color-surface-soft)] text-[var(--color-foreground-muted)]",
            ].join(" ")}
          >
            {loading ? "Routing..." : "Run request"}

            <ArrowUp size={13} weight="bold" />
          </button>
        </div>
      </div>
    </section>
  );
}
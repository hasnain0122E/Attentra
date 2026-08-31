import {
  ArrowsClockwise,
  CheckCircle,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";

import type { ExecutionDisplayData } from "@/types/dashboard";

interface ExecutionResultProps {
  execution: ExecutionDisplayData;
}

export default function ExecutionResult({
  execution,
}: ExecutionResultProps) {
  const successfulAttempt = execution.attempts.find(
    (attempt) => attempt.success,
  );

  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Execution
          </div>

          <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            Response generated
          </h2>
        </div>

        <CheckCircle
          size={20}
          weight="duotone"
          className="text-[var(--color-accent)]"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--color-border)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Executed model
            </div>

            <div className="mt-2 text-[15px] font-semibold text-[var(--color-foreground)]">
              {execution.displayName}
            </div>

            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
              {execution.provider}
            </div>
          </div>

          <span className="w-fit rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-accent)]">
            {execution.fallbackUsed
              ? "Fallback executed"
              : "Primary executed"}
          </span>
        </div>
      </div>

      {execution.fallbackUsed && (
        <div className="mt-3 rounded-xl bg-[var(--color-accent-soft)] px-3 py-2.5">
          <div className="flex items-center gap-2 text-[var(--color-accent)]">
            <ArrowsClockwise size={12} />

            <span className="font-mono text-[8px] uppercase tracking-[0.08em]">
              Fallback path completed
            </span>
          </div>

          <p className="mt-2 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
            Attentra continued execution after the primary model failed
            and successfully generated the response using the next
            eligible candidate.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--color-surface-soft)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--color-foreground-muted)]">
            <Lightning size={12} />

            <span className="font-mono text-[8px] uppercase tracking-[0.1em]">
              Latency
            </span>
          </div>

          <div className="mt-2 font-mono text-[11px] text-[var(--color-foreground)]">
            {(execution.latencyMs / 1000).toFixed(2)}s
          </div>
        </div>

        <div className="rounded-xl bg-[var(--color-surface-soft)] p-3">
          <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Attempts
          </div>

          <div className="mt-2 font-mono text-[11px] text-[var(--color-foreground)]">
            {execution.attempts.length}
          </div>
        </div>

        <div className="rounded-xl bg-[var(--color-surface-soft)] p-3">
          <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Input tokens
          </div>

          <div className="mt-2 font-mono text-[11px] text-[var(--color-foreground)]">
            {execution.usage.inputTokens}
          </div>
        </div>

        <div className="rounded-xl bg-[var(--color-surface-soft)] p-3">
          <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Output tokens
          </div>

          <div className="mt-2 font-mono text-[11px] text-[var(--color-foreground)]">
            {execution.usage.outputTokens}
          </div>
        </div>
      </div>

      {successfulAttempt && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <div className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
            Successful attempt
          </div>

          <div className="mt-1.5 text-[10px] text-[var(--color-foreground-secondary)]">
            Attempt {successfulAttempt.attempt} ·{" "}
            {successfulAttempt.displayName}
          </div>
        </div>
      )}
    </section>
  );
}
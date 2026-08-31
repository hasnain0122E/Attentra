import {
  ArrowDown,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

interface RequestExecutionPathProps {
  request: RequestHistoryItem;
}

function formatLatency(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

export default function RequestExecutionPath({
  request,
}: RequestExecutionPathProps) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Execution path
          </div>

          <h2 className="mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            Provider execution attempts
          </h2>
        </div>

        {request.fallbackUsed && (
          <div className="flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
            <ArrowsClockwise size={10} />
            Automatic fallback
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {request.attempts.length > 0 ? (
          <div className="space-y-0">
            {request.attempts.map(
              (attempt, index) => {
                const isLast =
                  index ===
                  request.attempts.length - 1;

                return (
                  <div
                    key={`${attempt.attempt}-${attempt.modelIdentifier}`}
                  >
                    <div
                      className={[
                        "rounded-2xl border p-4 sm:p-5",
                        attempt.success
                          ? "border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]"
                          : "border-[var(--color-border)] bg-[var(--color-background)]",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div
                            className={[
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                              attempt.success
                                ? "bg-[var(--color-accent)] text-white"
                                : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]",
                            ].join(" ")}
                          >
                            {attempt.success ? (
                              <CheckCircle
                                size={17}
                                weight="duotone"
                              />
                            ) : (
                              <WarningCircle
                                size={17}
                                weight="duotone"
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
                              Attempt{" "}
                              {attempt.attempt}
                            </div>

                            <div className="mt-2 text-[13px] font-semibold text-[var(--color-foreground)]">
                              {attempt.model}
                            </div>

                            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                              {attempt.provider}
                            </div>

                            <div className="mt-1 break-all font-mono text-[7px] text-[var(--color-foreground-muted)]">
                              {
                                attempt.modelIdentifier
                              }
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                              Latency
                            </div>

                            <div className="mt-1 font-mono text-[9px] text-[var(--color-foreground)]">
                              {formatLatency(
                                attempt.latencyMs,
                              )}
                            </div>
                          </div>

                          <span
                            className={[
                              "rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em]",
                              attempt.success
                                ? "bg-[var(--color-accent)] text-white"
                                : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]",
                            ].join(" ")}
                          >
                            {attempt.success
                              ? "Success"
                              : "Failed"}
                          </span>
                        </div>
                      </div>

                      {!attempt.success && (
                        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {attempt.errorCode && (
                              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
                                {
                                  attempt.errorCode
                                }
                              </span>
                            )}

                            {attempt.retryable && (
                              <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
                                Retryable
                              </span>
                            )}
                          </div>

                          {attempt.errorMessage && (
                            <p className="mt-2 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
                              {
                                attempt.errorMessage
                              }
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {!isLast && (
                      <div className="flex h-9 items-center justify-center">
                        <ArrowDown
                          size={13}
                          className="text-[var(--color-accent)]"
                        />
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <div className="py-10 text-center text-[10px] text-[var(--color-foreground-muted)]">
            No execution attempts recorded.
          </div>
        )}
      </div>
    </section>
  );
}
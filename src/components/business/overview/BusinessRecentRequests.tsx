import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { ReactNode } from "react";

import Link from "next/link";

interface RecentBusinessRequest {
  id: string;

  member: {
    name: string;
    initials: string;
  };

  taskType: string;

  status:
    | "SUCCESS"
    | "FALLBACK"
    | "FAILED";

  routedModel: string;
  routedProvider: string;

  executedModel?: string;
  executedProvider?: string;

  fallbackUsed: boolean;

  latencyMs: number;
  createdAt: string;
}

const recentRequests: RecentBusinessRequest[] = [
  {
    id: "biz_req_01J8V2D4N9K7F1A3",

    member: {
      name: "Hasnain Ali",
      initials: "HA",
    },

    taskType: "REASONING",

    status: "FALLBACK",

    routedModel: "Gemini 2.5 Flash",
    routedProvider: "Google",

    executedModel: "Claude Sonnet 5",
    executedProvider: "Anthropic",

    fallbackUsed: true,

    latencyMs: 2112,

    createdAt:
      "2026-08-31T11:28:00.000Z",
  },

  {
    id: "biz_req_01J8V1Q6M3S9C8P2",

    member: {
      name: "Sara Khan",
      initials: "SK",
    },

    taskType: "CODING",

    status: "SUCCESS",

    routedModel: "Claude Sonnet 5",
    routedProvider: "Anthropic",

    executedModel: "Claude Sonnet 5",
    executedProvider: "Anthropic",

    fallbackUsed: false,

    latencyMs: 1842,

    createdAt:
      "2026-08-31T10:54:00.000Z",
  },

  {
    id: "biz_req_01J8UZR8W7M5K4T9",

    member: {
      name: "Ahmed Raza",
      initials: "AR",
    },

    taskType: "SUMMARIZATION",

    status: "SUCCESS",

    routedModel: "Gemini 2.5 Flash",
    routedProvider: "Google",

    executedModel: "Gemini 2.5 Flash",
    executedProvider: "Google",

    fallbackUsed: false,

    latencyMs: 846,

    createdAt:
      "2026-08-31T10:31:00.000Z",
  },

  {
    id: "biz_req_01J8UYD5Q2V8H6L1",

    member: {
      name: "Hamza Noor",
      initials: "HN",
    },

    taskType: "ANALYSIS",

    status: "FAILED",

    routedModel: "Gemini 2.5 Pro",
    routedProvider: "Google",

    fallbackUsed: false,

    latencyMs: 1438,

    createdAt:
      "2026-08-31T09:47:00.000Z",
  },
];

function formatLatency(
  value: number,
) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(
    value / 1000
  ).toFixed(2)}s`;
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

export default function BusinessRecentRequests() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Organization activity
          </div>

          <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
            Recent requests
          </h2>

          <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
            Latest routed requests across
            organization members.
          </p>
        </div>

        <Link
          href="/business/requests"
          className="inline-flex w-fit items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-accent)] transition-opacity hover:opacity-70"
        >
          View all
          <ArrowRight size={9} />
        </Link>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {recentRequests.map(
          (request) => (
            <Link
              key={request.id}
              href={`/business/requests/${request.id}`}
              className="group block px-5 py-5 transition-colors hover:bg-[var(--color-surface-soft)]/30 sm:px-6"
            >
              {/* MOBILE / TABLET */}
              <div className="xl:hidden">
                {/* Identity + status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-surface-soft)] font-mono text-[7px] font-semibold text-[var(--color-foreground-secondary)]">
                      {
                        request.member
                          .initials
                      }
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-semibold text-[var(--color-foreground)]">
                        {
                          request.member
                            .name
                        }
                      </div>

                      <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
                        {
                          request.taskType
                        }
                      </div>
                    </div>
                  </div>

                  <StatusBadge
                    status={
                      request.status
                    }
                  />
                </div>

                {/* Model path */}
                <div className="mt-5 grid grid-cols-2 gap-5">
                  <CompactField
                    label="Routed"
                    value={
                      request.routedModel
                    }
                    detail={
                      request.routedProvider
                    }
                  />

                  <CompactField
                    label="Executed"
                    value={
                      request.executedModel ??
                      "—"
                    }
                    detail={
                      request.executedProvider ??
                      "No successful execution"
                    }
                    accent={
                      request.fallbackUsed
                    }
                  />
                </div>

                {/* Metadata footer */}
                <div className="mt-5 grid grid-cols-2 gap-5 border-t border-[var(--color-border)] pt-4">
                  <CompactField
                    label="Latency"
                    value={formatLatency(
                      request.latencyMs,
                    )}
                  />

                  <CompactField
                    label="Created"
                    value={formatDate(
                      request.createdAt,
                    )}
                  />
                </div>
              </div>

              {/* DESKTOP */}
              <div className="hidden xl:grid xl:grid-cols-[minmax(180px,0.7fr)_120px_minmax(260px,1fr)_100px_130px_20px] xl:items-center xl:gap-4">
                {/* Member */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-surface-soft)] font-mono text-[7px] font-semibold text-[var(--color-foreground-secondary)]">
                    {
                      request.member
                        .initials
                    }
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[9px] font-semibold text-[var(--color-foreground)]">
                      {
                        request.member
                          .name
                      }
                    </div>

                    <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                      {
                        request.taskType
                      }
                    </div>
                  </div>
                </div>

                <StatusBadge
                  status={request.status}
                />

                {/* Model path */}
                <div className="flex min-w-0 items-center gap-2">
                  <ModelLabel
                    model={
                      request.routedModel
                    }
                    provider={
                      request.routedProvider
                    }
                  />

                  {request.fallbackUsed &&
                    request.executedModel && (
                      <>
                        <ArrowRight
                          size={9}
                          className="shrink-0 text-[var(--color-accent)]"
                        />

                        <ModelLabel
                          model={
                            request.executedModel
                          }
                          provider={
                            request.executedProvider ??
                            ""
                          }
                          accent
                        />
                      </>
                    )}

                  {!request.fallbackUsed &&
                    request.status !==
                      "FAILED" && (
                    <span className="font-mono text-[6px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
                      Routed & executed
                    </span>
                  )}
                </div>

                <DesktopField
                  label="Latency"
                  value={formatLatency(
                    request.latencyMs,
                  )}
                />

                <DesktopField
                  label="Created"
                  value={formatDate(
                    request.createdAt,
                  )}
                />

                <ArrowRight
                  size={10}
                  className="text-[var(--color-foreground-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-accent)]"
                />
              </div>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

function CompactField({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[6px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div
        className={[
          "mt-2 truncate text-[9px] font-medium",
          accent
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-foreground)]",
        ].join(" ")}
      >
        {value}
      </div>

      {detail && (
        <div className="mt-1 truncate font-mono text-[6px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
          {detail}
        </div>
      )}
    </div>
  );
}

function DesktopField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-1.5 text-[8px] text-[var(--color-foreground-secondary)]">
        {value}
      </div>
    </div>
  );
}

function ModelLabel({
  model,
  provider,
  accent = false,
}: {
  model: string;
  provider: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div
        className={[
          "truncate text-[8px] font-medium",
          accent
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-foreground)]",
        ].join(" ")}
      >
        {model}
      </div>

      <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
        {provider}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "SUCCESS"
    | "FALLBACK"
    | "FAILED";
}) {
  if (status === "FALLBACK") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <ArrowsClockwise
          size={8}
        />
        Fallback
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
        <WarningCircle
          size={8}
        />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
      <CheckCircle size={8} />
      Success
    </span>
  );
}
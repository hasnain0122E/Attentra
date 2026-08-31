import Link from "next/link";

import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import {
  businessRecentRequests,
  type BusinessRecentRequest,
} from "@/lib/business/overview-data";

function formatLatency(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function BusinessRecentRequests() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Organization activity
          </div>

          <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
            Recent requests
          </h2>

          <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
            Latest routed requests across organization
            members.
          </p>
        </div>

        <Link
          href="/business/requests"
          className="group hidden shrink-0 items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)] transition hover:text-[var(--color-accent)] sm:flex"
        >
          View all

          <ArrowRight
            size={9}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {businessRecentRequests.map((request) => (
          <article
            key={request.id}
            className="px-5 py-4 transition-colors hover:bg-[var(--color-surface-soft)]/35 sm:px-6"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(170px,0.7fr)_minmax(200px,1fr)_minmax(280px,1.4fr)_100px_120px] xl:items-center">
              {/* Member */}
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] font-mono text-[7px] font-semibold text-[var(--color-foreground-secondary)]">
                  {request.memberInitials}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[9px] font-semibold text-[var(--color-foreground)]">
                    {request.member}
                  </div>

                  <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
                    {request.taskType}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <StatusBadge
                  status={request.status}
                />
              </div>

              {/* Route */}
              <div className="min-w-0">
                <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)] xl:hidden">
                  Model path
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 xl:mt-0">
                  <ModelLabel
                    model={request.routedModel}
                    provider={request.routedProvider}
                  />

                  {request.fallbackUsed && (
                    <>
                      <ArrowRight
                        size={10}
                        className="text-[var(--color-accent)]"
                      />

                      <ModelLabel
                        model={request.executedModel}
                        provider={request.executedProvider}
                        accent
                      />
                    </>
                  )}
                </div>

                {!request.fallbackUsed &&
                  request.status !== "FAILED" && (
                    <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
                      Routed & executed
                    </div>
                  )}
              </div>

              {/* Latency */}
              <Metric
                label="Latency"
                value={formatLatency(
                  request.latencyMs,
                )}
              />

              {/* Time */}
              <Metric
                label="Created"
                value={formatDate(
                  request.createdAt,
                )}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="p-4 sm:hidden">
        <Link
          href="/business/requests"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] py-2.5 font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]"
        >
          View all requests
          <ArrowRight size={9} />
        </Link>
      </div>
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: BusinessRecentRequest["status"];
}) {
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
        <WarningCircle size={8} />
        Failed
      </span>
    );
  }

  if (status === "FALLBACK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <ArrowsClockwise size={8} />
        Fallback
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
      <CheckCircle size={8} />
      Success
    </span>
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
          "truncate text-[9px] font-medium",
          accent
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-foreground)]",
        ].join(" ")}
      >
        {model}
      </div>

      <div className="mt-0.5 font-mono text-[6px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
        {provider}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)] xl:hidden">
        {label}
      </div>

      <div className="mt-1.5 text-[9px] text-[var(--color-foreground-secondary)] xl:mt-0">
        {value}
      </div>
    </div>
  );
}
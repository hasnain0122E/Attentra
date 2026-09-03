import Link from "next/link";

import type { ReactNode } from "react";

import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

import { formatDisplayCurrency } from "@/lib/currency/display-currency";

interface HistoryTableProps {
  requests: RequestHistoryItem[];
}

function formatLatency(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

function formatCost(value?: number) {
  if (value === undefined) {
    return "\u2014";
  }

  return formatDisplayCurrency(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function HistoryTable({
  requests,
}: HistoryTableProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
        <div className="font-reservation text-[24px] text-[var(--color-foreground)]">
          No matching requests.
        </div>

        <p className="mx-auto mt-2 max-w-[400px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Try changing the active filters or search
          query.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/45 px-5 py-3 xl:grid xl:grid-cols-[minmax(260px,1.5fr)_minmax(220px,1fr)_100px_110px_130px_30px] xl:items-center xl:gap-5">
        <HeaderLabel>Request</HeaderLabel>
        <HeaderLabel>Model path</HeaderLabel>
        <HeaderLabel>Latency</HeaderLabel>
        <HeaderLabel>Cost</HeaderLabel>
        <HeaderLabel>Created</HeaderLabel>

        <div />
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {requests.map((request) => (
          <Link
            key={request.id}
            href={`/dashboard/history/${request.id}`}
            className="group block px-5 py-5 transition-colors hover:bg-[var(--color-surface-soft)]/55"
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(260px,1.5fr)_minmax(220px,1fr)_100px_110px_130px_30px] xl:items-center">
              {/* Request */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={request.status} />

                  <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {request.taskType}
                  </span>

                  <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {request.complexity}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 max-w-[650px] text-[11px] font-medium leading-5 text-[var(--color-foreground)]">
                  {request.prompt}
                </p>

                <div className="mt-2 truncate font-mono text-[7px] tracking-[0.04em] text-[var(--color-foreground-muted)]">
                  {request.id}
                </div>
              </div>

              {/* Model path */}
              <div>
                <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)] xl:hidden">
                  Model path
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 xl:mt-0">
                  <ModelLabel
                    name={request.routedModel}
                    provider={request.routedProvider}
                  />

                  {request.fallbackUsed &&
                    request.executedModel && (
                      <>
                        <ArrowRight
                          size={11}
                          className="text-[var(--color-accent)]"
                        />

                        <ModelLabel
                          name={request.executedModel}
                          provider={
                            request.executedProvider ??
                            ""
                          }
                          emphasized
                        />
                      </>
                    )}
                </div>

                {!request.fallbackUsed &&
                  request.status !== "FAILED" && (
                    <div className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
                      Routed & executed
                    </div>
                  )}
              </div>

              <Metric
                label="Latency"
                value={formatLatency(
                  request.latencyMs,
                )}
              />

              <Metric
                label="Actual cost"
                value={formatCost(
                  request.actualCost,
                )}
              />

              <div>
                <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)] xl:hidden">
                  Created
                </div>

                <div className="mt-2 text-[9px] text-[var(--color-foreground-secondary)] xl:mt-0">
                  {formatDate(
                    request.createdAt,
                  )}
                </div>

                <div className="mt-1 font-mono text-[7px] text-[var(--color-foreground-muted)]">
                  {request.totalTokens} tokens
                </div>
              </div>

              <div className="hidden justify-end xl:flex">
                <ArrowRight
                  size={13}
                  className="text-[var(--color-foreground-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--color-accent)]"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HeaderLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
      {children}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: RequestHistoryItem["status"];
}) {
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
        <WarningCircle size={9} />
        Failed
      </span>
    );
  }

  if (status === "FALLBACK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <ArrowsClockwise size={9} />
        Fallback
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
      <CheckCircle size={9} />
      Success
    </span>
  );
}

interface ModelLabelProps {
  name: string;
  provider: string;
  emphasized?: boolean;
}

function ModelLabel({
  name,
  provider,
  emphasized = false,
}: ModelLabelProps) {
  return (
    <div className="min-w-0">
      <div
        className={[
          "truncate text-[10px] font-medium",
          emphasized
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-foreground)]",
        ].join(" ")}
      >
        {name}
      </div>

      <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
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

      <div className="mt-2 font-mono text-[9px] text-[var(--color-foreground)] xl:mt-0">
        {value}
      </div>
    </div>
  );
}
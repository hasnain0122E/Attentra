import type { ReactNode } from "react";

import Link from "next/link";

import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { BusinessRequestHistoryItem } from "@/lib/dashboard/business-request-queries";

import { formatDisplayCurrency } from "@/lib/currency/display-currency";

interface BusinessRequestTableProps {
  requests: BusinessRequestHistoryItem[];
}

function formatLatency(value: number | null | undefined) {
  if (!value || value <= 0) {
    return "\u2014";
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`;
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

export default function BusinessRequestTable({
  requests,
}: BusinessRequestTableProps) {
  if (requests.length === 0) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <div className="font-reservation text-[25px] text-[var(--color-foreground)]">
          No matching requests.
        </div>

        <p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Try changing the active search or organization filters.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Desktop header */}
      <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/45 px-5 py-3 xl:grid xl:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1.2fr)_minmax(240px,1fr)_95px_105px_115px_26px] xl:items-center xl:gap-4">
        <HeaderLabel>Member</HeaderLabel>
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
            href={`/business/requests/${request.id}`}
            className="group block px-5 py-5 transition-colors hover:bg-[var(--color-surface-soft)]/35"
          >
            {/* MOBILE / TABLET */}
            <div className="xl:hidden">
              {/* Identity */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-surface-soft)] font-mono text-[8px] font-semibold text-[var(--color-foreground-secondary)]">
                    {request.requester.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                      {request.requester}
                    </div>

                    <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                      {request.apiKeyName}
                    </div>
                  </div>
                </div>

                <StatusBadge
                  status={request.status}
                />
              </div>

              {/* Task metadata */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  {request.taskType}
                </span>

                <span className="font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  {request.complexity}
                </span>
              </div>

              {/* Prompt */}
              <p className="mt-4 line-clamp-2 text-[10px] font-medium leading-5 text-[var(--color-foreground)]">
                {request.prompt}
              </p>

              <div className="mt-2 truncate font-mono text-[6px] tracking-[0.04em] text-[var(--color-foreground-muted)]">
                {request.id}
              </div>

              {/* Compact model path */}
              <div className="mt-5 grid grid-cols-2 gap-5">
                <MobileMetric
                  label="Routed"
                  value={request.routedModel}
                  detail={request.routedProvider}
                />

                <MobileMetric
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

              {/* Compact telemetry */}
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[var(--color-border)] pt-4">
                <MobileMetric
                  label="Latency"
                  value={formatLatency(
                    request.latencyMs,
                  )}
                />

                <MobileMetric
                  label="Tokens"
                  value={String(
                    request.totalTokens,
                  )}
                />

                <MobileMetric
                  label="Actual cost"
                  value={formatCost(
                    request.actualCost,
                  )}
                  accent={
                    request.status !== "FAILED"
                  }
                />

                <MobileMetric
                  label="Created"
                  value={formatDate(
                    request.createdAt,
                  )}
                />
              </div>

              <div className="mt-4 flex justify-end">
                <ArrowRight
                  size={11}
                  className="text-[var(--color-foreground-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--color-accent)]"
                />
              </div>
            </div>

            {/* DESKTOP */}
            <div className="hidden xl:grid xl:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1.2fr)_minmax(240px,1fr)_95px_105px_115px_26px] xl:items-center xl:gap-4">
              {/* Member */}
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] font-mono text-[8px] font-semibold text-[var(--color-foreground-secondary)]">
                  {request.requester.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[10px] font-semibold text-[var(--color-foreground)]">
                    {request.requester}
                  </div>

                  <div className="mt-1 truncate font-mono text-[7px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
                    {request.apiKeyName}
                  </div>
                </div>
              </div>

              {/* Request */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={request.status}
                  />

                  <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {request.taskType}
                  </span>

                  <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {request.complexity}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-[10px] font-medium leading-5 text-[var(--color-foreground)]">
                  {request.prompt}
                </p>

                <div className="mt-2 truncate font-mono text-[6px] tracking-[0.04em] text-[var(--color-foreground-muted)]">
                  {request.id}
                </div>
              </div>

              {/* Model path */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
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
                          size={10}
                          className="text-[var(--color-accent)]"
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
                </div>

                {!request.fallbackUsed &&
                  request.status !==
                    "FAILED" && (
                    <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]">
                      Routed & executed
                    </div>
                  )}
              </div>

              <DesktopMetric
                value={formatLatency(
                  request.latencyMs,
                )}
              />

              <DesktopMetric
                value={formatCost(
                  request.actualCost,
                )}
              />

              <div>
                <div className="text-[8px] text-[var(--color-foreground-secondary)]">
                  {formatDate(
                    request.createdAt,
                  )}
                </div>

                <div className="mt-1 font-mono text-[6px] text-[var(--color-foreground-muted)]">
                  {request.totalTokens} tokens
                </div>
              </div>

              <div className="flex justify-end">
                <ArrowRight
                  size={12}
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

function MobileMetric({
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

function DesktopMetric({
  value,
}: {
  value: string;
}) {
  return (
    <div className="font-mono text-[8px] text-[var(--color-foreground)]">
      {value}
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

function StatusBadge({
  status,
}: {
  status: BusinessRequestHistoryItem["status"];
}) {
  if (status === "FAILED") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
        <WarningCircle size={8} />
        Failed
      </span>
    );
  }

  if (status === "FALLBACK") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <ArrowsClockwise size={8} />
        Fallback
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
"use client";

import {
  ArrowDown,
  ArrowUp,
  ChartLineUp,
  CurrencyDollar,
  Gauge,
} from "@phosphor-icons/react";

import {
  useEffect,
  useState,
} from "react";

import type {
  ConsumerCostAnalytics,
} from "@/lib/cost-intelligence";

import {
  fetchConsumerCostAnalytics,
} from "@/lib/dashboard/cost-intelligence-client";

function formatCurrency(
  value: number,
): string {
  if (value === 0) {
    return "$0.0000";
  }

  if (Math.abs(value) < 0.0001) {
    return `$${value.toFixed(6)}`;
  }

  return `$${value.toFixed(4)}`;
}

function formatPercentage(
  value: number,
): string {
  return `${Math.abs(value).toFixed(1)}%`;
}

function LoadingState() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="h-3 w-32 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
        <div className="mt-3 h-6 w-52 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
      </div>

      <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="bg-[var(--color-surface)] p-5 sm:p-6"
          >
            <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            <div className="mt-5 h-8 w-28 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
        Cost intelligence
      </div>

      <h2 className="mt-2 font-reservation text-[1.6rem] font-normal tracking-[-0.025em] text-[var(--color-foreground)]">
        No cost data yet.
      </h2>

      <p className="mt-2 max-w-[520px] text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
        Cost intelligence will appear here after your first successfully
        costed Attentra request.
      </p>
    </section>
  );
}

function ErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Cost intelligence
        </div>

        <p className="mt-2 text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
          Cost analytics could not be loaded.
        </p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="w-fit rounded-full border border-[var(--color-border)] px-4 py-2 text-[10px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-soft)]"
      >
        Try again
      </button>
    </section>
  );
}

export default function CostIntelligence() {
  const [
    analytics,
    setAnalytics,
  ] =
    useState<ConsumerCostAnalytics | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(false);

  async function loadAnalytics() {
    setLoading(true);
    setError(false);

    try {
      const data =
        await fetchConsumerCostAnalytics();

      setAnalytics(data);
    } catch (loadError) {
      console.error(
        "[dashboard] Failed to load cost intelligence",
        loadError,
      );

      setAnalytics(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        onRetry={() => {
          void loadAnalytics();
        }}
      />
    );
  }

  if (
    !analytics ||
    analytics.summary
      .costBearingRequestCount === 0
  ) {
    return <EmptyState />;
  }

  const {
    summary,
    byModel,
  } = analytics;

  const topModel =
    byModel[0] ?? null;

  const hasSavings =
    summary.savings > 0;

  const hasOverspend =
    summary.savings < 0;

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Cost intelligence
          </div>

          <h2 className="mt-2 font-reservation text-[1.65rem] font-normal tracking-[-0.025em] text-[var(--color-foreground)]">
            What your routing actually costs.
          </h2>
        </div>

        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          {summary.costBearingRequestCount} costed{" "}
          {summary.costBearingRequestCount === 1
            ? "request"
            : "requests"}
        </div>
      </div>

      {/* Financial metrics */}
      <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-4">
        {/* Actual spend */}
        <div className="bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Actual spend
            </div>

            <CurrencyDollar
              size={15}
              className="text-[var(--color-accent)]"
            />
          </div>

          <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
            {formatCurrency(
              summary.actualSpend,
            )}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
            Persisted execution cost
          </p>
        </div>

        {/* Baseline */}
        <div className="bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Baseline spend
            </div>

            <Gauge
              size={15}
              className="text-[var(--color-foreground-secondary)]"
            />
          </div>

          <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
            {formatCurrency(
              summary.baselineSpend,
            )}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
            Across comparable requests
          </p>
        </div>

        {/* Savings */}
        <div className="relative overflow-hidden bg-[var(--color-surface)] p-5 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(217,119,69,0.15) 0%, rgba(217,119,69,0) 70%)",
            }}
          />

          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Savings
              </div>

              {hasSavings ? (
                <ArrowDown
                  size={15}
                  className="text-[var(--color-accent)]"
                />
              ) : hasOverspend ? (
                <ArrowUp
                  size={15}
                  className="text-[var(--color-foreground)]"
                />
              ) : (
                <ChartLineUp
                  size={15}
                  className="text-[var(--color-foreground-secondary)]"
                />
              )}
            </div>

            <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
              {formatCurrency(
                summary.savings,
              )}
            </div>

            <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
              {hasSavings
                ? `${formatPercentage(
                    summary.savingsPercentage,
                  )} below baseline`
                : hasOverspend
                  ? `${formatPercentage(
                      summary.savingsPercentage,
                    )} above baseline`
                  : "Equal to baseline"}
            </p>
          </div>
        </div>

        {/* Average */}
        <div className="bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Avg / request
            </div>

            <ChartLineUp
              size={15}
              className="text-[var(--color-foreground-secondary)]"
            />
          </div>

          <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
            {formatCurrency(
              summary.averageCostPerRequest,
            )}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
            Mean cost of costed requests
          </p>
        </div>
      </div>

      {/* Footer intelligence */}
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-3 sm:px-6">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
            Comparable coverage
          </div>

          <div className="mt-1 text-[12px] font-medium text-[var(--color-foreground)]">
            {formatPercentage(
              summary.comparableSpendCoverage,
            )}
          </div>
        </div>

        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
            Comparable requests
          </div>

          <div className="mt-1 text-[12px] font-medium text-[var(--color-foreground)]">
            {summary.comparableRequestCount}
          </div>
        </div>

        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
            Highest spend model
          </div>

          <div className="mt-1 truncate text-[12px] font-medium text-[var(--color-foreground)]">
            {topModel
              ? topModel.displayName
              : "No model data"}
          </div>
        </div>
      </div>
    </section>
  );
}
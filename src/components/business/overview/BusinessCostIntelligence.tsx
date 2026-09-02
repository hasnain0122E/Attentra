"use client";

import {
  Buildings,
  ChartLineUp,
  CurrencyDollar,
  UsersThree,
} from "@phosphor-icons/react";

import {
  useEffect,
  useState,
} from "react";

import type {
  BusinessCostAnalytics,
} from "@/lib/cost-intelligence";

import {
  fetchBusinessCostAnalytics,
} from "@/lib/dashboard/cost-intelligence-client";

import {
  useBusiness,
} from "@/components/business/BusinessContext";

function formatCurrency(
  value: number,
): string {
  if (value === 0) {
    return "$0.00";
  }

  if (Math.abs(value) < 0.01) {
    return `${value < 0 ? "-" : ""}$${Math.abs(
      value,
    ).toFixed(4)}`;
  }

  return `${value < 0 ? "-" : ""}$${Math.abs(
    value,
  ).toFixed(2)}`;
}

function formatPercentage(
  value: number,
): string {
  return `${Math.abs(value).toFixed(1)}%`;
}

export default function BusinessCostIntelligence() {
  const {
    business,
  } = useBusiness();

  const [
    analytics,
    setAnalytics,
  ] =
    useState<BusinessCostAnalytics | null>(
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
    if (!business) {
      setLoading(false);
      setAnalytics(null);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const data =
        await fetchBusinessCostAnalytics(
          business.id,
        );

      setAnalytics(data);
    } catch (loadError) {
      console.error(
        "[business-dashboard] Failed to load cost intelligence",
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
  }, [business?.id]);

  if (!business) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7">
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Organization cost intelligence
        </div>

        <h2 className="mt-2 font-reservation text-[1.55rem] text-[var(--color-foreground)]">
          No business workspace available.
        </h2>

        <p className="mt-2 text-[11px] leading-5 text-[var(--color-foreground-secondary)]">
          Join or create a business workspace to view organization-wide cost
          analytics.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-6 py-5">
          <div className="h-3 w-40 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />

          <div className="mt-3 h-6 w-56 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
        </div>

        <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="bg-[var(--color-surface)] p-6"
            >
              <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />

              <div className="mt-5 h-8 w-28 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Organization cost intelligence
          </div>

          <p className="mt-2 text-[11px] text-[var(--color-foreground-secondary)]">
            Organization cost analytics could not be loaded.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadAnalytics();
          }}
          className="w-fit rounded-full border border-[var(--color-border)] px-4 py-2 text-[10px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-soft)]"
        >
          Try again
        </button>
      </section>
    );
  }

  if (
    !analytics ||
    analytics.summary
      .costBearingRequestCount === 0
  ) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7">
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Organization cost intelligence
        </div>

        <h2 className="mt-2 font-reservation text-[1.55rem] text-[var(--color-foreground)]">
          No organization cost data yet.
        </h2>

        <p className="mt-2 text-[11px] leading-5 text-[var(--color-foreground-secondary)]">
          Financial analytics will appear after this workspace executes
          costed requests through Attentra.
        </p>
      </section>
    );
  }

  const {
    summary,
    byModel,
    byMember,
  } = analytics;

  const topModel =
    byModel[0] ?? null;

  const topMember =
    byMember[0] ?? null;

  const savingsLabel =
    summary.savings > 0
      ? `${formatPercentage(
          summary.savingsPercentage,
        )} below baseline`
      : summary.savings < 0
        ? `${formatPercentage(
            summary.savingsPercentage,
          )} above baseline`
        : "Equal to baseline";

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Organization cost intelligence
          </div>

          <h2 className="mt-2 font-reservation text-[1.65rem] font-normal tracking-[-0.025em] text-[var(--color-foreground)]">
            Routing economics across your team.
          </h2>
        </div>

        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          {summary.costBearingRequestCount} costed requests
        </div>
      </div>

      <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Actual spend
            </span>

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

          <p className="mt-3 text-[10px] text-[var(--color-foreground-muted)]">
            Organization execution cost
          </p>
        </div>

        <div className="bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Baseline spend
            </span>

            <Buildings
              size={15}
              className="text-[var(--color-foreground-secondary)]"
            />
          </div>

          <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
            {formatCurrency(
              summary.baselineSpend,
            )}
          </div>

          <p className="mt-3 text-[10px] text-[var(--color-foreground-muted)]">
            Equivalent baseline usage
          </p>
        </div>

        <div className="relative overflow-hidden bg-[var(--color-surface)] p-5 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-14 h-36 w-36"
            style={{
              background:
                "radial-gradient(circle, rgba(217,119,69,0.16) 0%, rgba(217,119,69,0) 70%)",
            }}
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Savings
              </span>

              <ChartLineUp
                size={15}
                className="text-[var(--color-accent)]"
              />
            </div>

            <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
              {formatCurrency(
                summary.savings,
              )}
            </div>

            <p className="mt-3 text-[10px] text-[var(--color-foreground-muted)]">
              {savingsLabel}
            </p>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Active members
            </span>

            <UsersThree
              size={15}
              className="text-[var(--color-foreground-secondary)]"
            />
          </div>

          <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
            {summary.activeMemberCount}
          </div>

          <p className="mt-3 text-[10px] text-[var(--color-foreground-muted)]">
            Members with successful requests
          </p>
        </div>
      </div>

      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
            Avg / request
          </div>

          <div className="mt-1 text-[12px] font-medium text-[var(--color-foreground)]">
            {formatCurrency(
              summary.averageCostPerRequest,
            )}
          </div>
        </div>

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
            Highest spend model
          </div>

          <div className="mt-1 truncate text-[12px] font-medium text-[var(--color-foreground)]">
            {topModel?.displayName ??
              "No model data"}
          </div>
        </div>

        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
            Highest spend member
          </div>

          <div className="mt-1 truncate text-[12px] font-medium text-[var(--color-foreground)]">
            {topMember?.name ??
              topMember?.email ??
              "No attributed member"}
          </div>
        </div>
      </div>
    </section>
  );
}
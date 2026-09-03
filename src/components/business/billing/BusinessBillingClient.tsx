"use client";

import {
  Coins,
  Gauge,
  ArrowDown,
  ArrowUp,
  Receipt,
  Percent,
} from "@phosphor-icons/react";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useBusiness,
} from "@/components/business/BusinessContext";

import type {
  BusinessBillingData,
} from "@/lib/billing";

import {
  formatDisplayCurrency,
  formatDisplayCurrencyCompact,
} from "@/lib/currency/display-currency";

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function formatPercentage(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`;
}

function getCurrentMonthFrom(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function getCurrentMonthTo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
}

function formatPeriodLabel(from: string | null, to: string | null): string {
  if (!from || !to) return "All time";

  // from/to are YYYY-MM-DD strings. Deriving the label from the string parts
  // (not Date parsing) keeps the heading stable in every browser timezone —
  // new Date("YYYY-MM-DD") is UTC midnight and shifts a day back locally.
  const [year, month] = from.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) return "All time";

  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(
    "en-US",
    { month: "long", timeZone: "UTC" },
  );

  return `${monthName} ${year}`;
}

// ─────────────────────────────────────────────────────
// STATES
// ─────────────────────────────────────────────────────

function LoadingState() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="h-3 w-32 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
        <div className="mt-3 h-6 w-52 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
      </div>

      <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
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
        Billing &amp; usage
      </div>

      <h2 className="mt-2 font-reservation text-[1.6rem] font-normal tracking-[-0.025em] text-[var(--color-foreground)]">
        No billing data for this period.
      </h2>

      <p className="mt-2 max-w-[520px] text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
        Billing information will appear here after the first successfully
        costed request in the selected period.
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
          Billing &amp; usage
        </div>

        <p className="mt-2 text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
          Billing data could not be loaded.
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

// ─────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────

export default function BusinessBillingClient() {
  const { business } = useBusiness();

  const [billing, setBilling] = useState<BusinessBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [from, setFrom] = useState(getCurrentMonthFrom);
  const [to, setTo] = useState(getCurrentMonthTo);

  const loadBilling = useCallback(async () => {
    if (!business) return;

    setLoading(true);
    setError(false);

    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/business/${business.id}/billing?${params}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to load billing");
      }

      setBilling(json.data);
    } catch (loadError) {
      console.error("[billing] Failed to load business billing", loadError);
      setBilling(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [business, from, to]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  if (!business) {
    return <LoadingState />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState onRetry={() => { void loadBilling(); }} />;
  }

  if (!billing || billing.coverage.totalCostedRequests === 0) {
    return <EmptyState />;
  }

  const {
    usage,
    savings,
    totalCustomerCost,
    coverage,
    period,
    baseline,
  } = billing;

  const hasPositiveSavings = savings.verifiedSavings > 0;
  const hasNegativeSavings = savings.verifiedSavings < 0;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Billing &amp; usage
          </div>

          <h1 className="mt-2 font-reservation text-[1.8rem] font-normal tracking-[-0.025em] text-[var(--color-foreground)]">
            Workspace usage and optimization billing.
          </h1>

          <p className="mt-1 text-[11px] text-[var(--color-foreground-muted)]">
            {formatPeriodLabel(period.from, period.to)}
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Billing period start date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-foreground)]"
          />
          <span className="font-mono text-[9px] text-[var(--color-foreground-muted)]">to</span>
          <input
            type="date"
            aria-label="Billing period end date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-foreground)]"
          />
        </div>
      </div>

      {/* Summary cards */}
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-3">
          {/* Provider usage */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Provider usage
              </div>

              <Coins size={15} className="text-[var(--color-accent)]" />
            </div>

            <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
              {formatDisplayCurrencyCompact(usage.totalActualCost)}
            </div>

            <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
              Total provider execution cost
            </p>
          </div>

          {/* Baseline equivalent */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Baseline equivalent
              </div>

              <Gauge size={15} className="text-[var(--color-foreground-secondary)]" />
            </div>

            <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
              {formatDisplayCurrencyCompact(usage.baselineCost)}
            </div>

            <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
              {baseline.configured
                ? `Based on ${baseline.displayName}`
                : "No baseline configured"}
            </p>
          </div>

          {/* Verified savings */}
          <div className="relative overflow-hidden bg-[var(--color-surface)] p-5 sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full"
              style={{
                background: hasPositiveSavings
                  ? "radial-gradient(circle, rgba(217,119,69,0.15) 0%, rgba(217,119,69,0) 70%)"
                  : "none",
              }}
            />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                  Verified savings
                </div>

                {hasPositiveSavings ? (
                  <ArrowDown size={15} className="text-[var(--color-accent)]" />
                ) : hasNegativeSavings ? (
                  <ArrowUp size={15} className="text-[var(--color-foreground)]" />
                ) : (
                  <Receipt size={15} className="text-[var(--color-foreground-secondary)]" />
                )}
              </div>

              <div className="mt-5 whitespace-nowrap font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
                {formatDisplayCurrencyCompact(savings.verifiedSavings)}
              </div>

              <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
                {hasPositiveSavings
                  ? "Baseline minus actual cost"
                  : hasNegativeSavings
                    ? "Actual cost exceeded baseline"
                    : baseline.configured
                      ? "Equal to baseline"
                      : "Configure a baseline to enable savings tracking"}
              </p>
            </div>
          </div>

          {/* Attentra fee */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Attentra fee
              </div>

              <Percent size={15} className="text-[var(--color-accent)]" />
            </div>

            <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
              {formatDisplayCurrencyCompact(savings.optimizationFee)}
            </div>

            <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
              {savings.optimizationFee > 0
                ? `${formatPercentage(savings.optimizationFeeRate * 100)} of verified savings`
                : "No fee when savings are zero or negative"}
            </p>
          </div>

          {/* Net savings retained */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Net savings retained
              </div>

              <ArrowDown size={15} className="text-[var(--color-accent)]" />
            </div>

            <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
              {formatDisplayCurrencyCompact(savings.customerNetSavings)}
            </div>

            <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
              {savings.customerNetSavings > 0
                ? "90% of verified savings"
                : "No net savings this period"}
            </p>
          </div>

          {/* Total cost */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Total cost
              </div>

              <Receipt size={15} className="text-[var(--color-foreground)]" />
            </div>

            <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
              {formatDisplayCurrencyCompact(totalCustomerCost)}
            </div>

            <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
              Provider usage plus Attentra fee
            </p>
          </div>
        </div>
      </section>

      {/* Baseline info + Coverage */}
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2">
          {/* Baseline model */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Baseline model
            </div>

            {baseline.configured ? (
              <div className="mt-1 text-[14px] font-medium text-[var(--color-foreground)]">
                {baseline.displayName}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-[11px] leading-4 text-[var(--color-foreground-secondary)]">
                  Configure a baseline model in{" "}
                  <Link
                    href="/business/settings"
                    className="text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 transition-colors hover:text-[var(--color-accent)]/80"
                  >
                    Settings
                  </Link>{" "}
                  to enable verified savings billing.
                </p>
              </div>
            )}
          </div>

          {/* Coverage */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                  Costed
                </div>

                <div className="mt-1 text-[14px] font-medium text-[var(--color-foreground)]">
                  {coverage.totalCostedRequests}
                </div>
              </div>

              <div>
                <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                  Comparable
                </div>

                <div className="mt-1 text-[14px] font-medium text-[var(--color-foreground)]">
                  {coverage.comparableRequests}
                </div>
              </div>

              <div>
                <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                  Coverage
                </div>

                <div className="mt-1 text-[14px] font-medium text-[var(--color-foreground)]">
                  {formatPercentage(coverage.percentage)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import {
  Coins,
  Gauge,
  ArrowDown,
  ArrowUp,
  Receipt,
  Percent,
} from "@phosphor-icons/react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  ConsumerBillingData,
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

  const fromDate = new Date(from);
  const toDate = new Date(to);

  const monthName = fromDate.toLocaleString("en-US", { month: "long" });
  const year = fromDate.getFullYear();

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
        Billing
      </div>

      <h2 className="mt-2 font-reservation text-[1.6rem] font-normal tracking-[-0.025em] text-[var(--color-foreground)]">
        No billing data for this period.
      </h2>

      <p className="mt-2 max-w-[520px] text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
        Billing information will appear here after your first successfully
        costed Attentra request in the selected period.
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
          Billing
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

export default function BillingClient() {
  const [billing, setBilling] = useState<ConsumerBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [from, setFrom] = useState(getCurrentMonthFrom);
  const [to, setTo] = useState(getCurrentMonthTo);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/dashboard/billing?${params}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message ?? "Failed to load billing");
      }

      setBilling(json.data);
    } catch (loadError) {
      console.error("[billing] Failed to load consumer billing", loadError);
      setBilling(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

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
  } = billing;

  const hasPositiveSavings = savings.verifiedSavings > 0;
  const hasNegativeSavings = savings.verifiedSavings < 0;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Billing
          </div>

          <h1 className="mt-2 font-reservation text-[1.8rem] font-normal tracking-[-0.025em] text-[var(--color-foreground)]">
            Pay for usage. We earn when we save you money.
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

              <Coins
                size={15}
                className="text-[var(--color-accent)]"
              />
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

              <Gauge
                size={15}
                className="text-[var(--color-foreground-secondary)]"
              />
            </div>

            <div className="mt-5 font-reservation text-[2rem] leading-none tracking-[-0.035em] text-[var(--color-foreground)]">
              {formatDisplayCurrencyCompact(usage.baselineCost)}
            </div>

            <p className="mt-3 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
              What baseline would have cost
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
                  <ArrowDown
                    size={15}
                    className="text-[var(--color-accent)]"
                  />
                ) : hasNegativeSavings ? (
                  <ArrowUp
                    size={15}
                    className="text-[var(--color-foreground)]"
                  />
                ) : (
                  <Receipt
                    size={15}
                    className="text-[var(--color-foreground-secondary)]"
                  />
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
                    : "Equal to baseline"}
              </p>
            </div>
          </div>

          {/* Attentra fee */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Attentra fee
              </div>

              <Percent
                size={15}
                className="text-[var(--color-accent)]"
              />
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

          {/* You keep */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                You keep
              </div>

              <ArrowDown
                size={15}
                className="text-[var(--color-accent)]"
              />
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

              <Receipt
                size={15}
                className="text-[var(--color-foreground)]"
              />
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

      {/* Formula explanation */}
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Attentra optimization fee
          </div>

          <h2 className="mt-2 font-reservation text-[1.3rem] font-normal tracking-[-0.025em] text-[var(--color-foreground)]">
            10% of positive net verified savings
          </h2>
        </div>

        <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2">
          {/* Savings formula */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-[var(--color-foreground-secondary)]">
                  Baseline equivalent
                </span>
                <span className="font-mono text-[11px] text-[var(--color-foreground)]">
                  {formatDisplayCurrency(usage.baselineCost)}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-[var(--color-foreground-secondary)]">
                  − Actual comparable usage
                </span>
                <span className="font-mono text-[11px] text-[var(--color-foreground)]">
                  {formatDisplayCurrency(usage.comparableActualCost)}
                </span>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-medium text-[var(--color-foreground)]">
                    = Verified savings
                  </span>
                  <span className="font-mono text-[11px] font-medium text-[var(--color-foreground)]">
                    {formatDisplayCurrency(savings.verifiedSavings)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fee formula */}
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-[var(--color-foreground-secondary)]">
                  Verified savings
                </span>
                <span className="font-mono text-[11px] text-[var(--color-foreground)]">
                  {formatDisplayCurrency(savings.billableSavings)}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-[var(--color-foreground-secondary)]">
                  × {formatPercentage(savings.optimizationFeeRate * 100)}
                </span>
                <span className="font-mono text-[11px] text-[var(--color-foreground-muted)]">
                  Attentra fee rate
                </span>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-medium text-[var(--color-foreground)]">
                    = Attentra fee
                  </span>
                  <span className="font-mono text-[11px] font-medium text-[var(--color-foreground)]">
                    {formatDisplayCurrency(savings.optimizationFee)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="border-t border-[var(--color-border)] px-5 py-4 sm:px-6">
          <p className="text-[10px] leading-4 text-[var(--color-foreground-muted)]">
            {savings.optimizationFee > 0
              ? "Customer keeps 90% of positive verified savings."
              : "No optimization fee is charged when the selected period does not produce positive verified savings."}
          </p>
        </div>
      </section>

      {/* Coverage */}
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-3">
          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Total costed requests
            </div>

            <div className="mt-1 text-[14px] font-medium text-[var(--color-foreground)]">
              {coverage.totalCostedRequests}
            </div>
          </div>

          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Comparable requests
            </div>

            <div className="mt-1 text-[14px] font-medium text-[var(--color-foreground)]">
              {coverage.comparableRequests}
            </div>
          </div>

          <div className="bg-[var(--color-surface)] p-5 sm:p-6">
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
              Baseline coverage
            </div>

            <div className="mt-1 text-[14px] font-medium text-[var(--color-foreground)]">
              {formatPercentage(coverage.percentage)}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

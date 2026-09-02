"use client";

import { useEffect, useState } from "react";

import MetricCard from "@/components/dashboard/overview/MetricCard";
import ModelActivity from "@/components/dashboard/overview/ModelActivity";
import RecentRequests from "@/components/dashboard/overview/RecentRequests";
import RoutingHealth from "@/components/dashboard/overview/RoutingHealth";
import CostIntelligence from "@/components/dashboard/overview/CostIntelligence";

import type { OverviewData } from "@/lib/dashboard/overview-queries";

// ─────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────

function formatLatency(ms: number | null): string {
  if (ms === null || ms === 0) return "—";

  if (ms < 1000) return `${Math.round(ms)}ms`;

  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────
// STATES
// ─────────────────────────────────────────────────────

function LoadingState() {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            <div className="mt-8 h-9 w-28 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[var(--color-foreground)]" />
      </div>

      <div className="h-48 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Overview
        </div>

        <p className="mt-2 text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
          Dashboard data could not be loaded.
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

function EmptyState() {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Requests"
          value="0"
          change="No data"
          detail="No requests yet"
        />
        <MetricCard
          label="Avg. latency"
          value="—"
          change="No data"
          detail="No requests yet"
        />
        <MetricCard
          label="Fallback rate"
          value="0.0%"
          change="No data"
          detail="No requests yet"
        />
      </section>

      <CostIntelligence />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]">
            Model activity
          </div>

          <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
            No model usage yet.
          </h2>

          <p className="mt-2 max-w-[520px] text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
            Model activity will appear here after your first successful
            Attentra request.
          </p>
        </section>

        <RoutingHealth
          successRate={0}
          fallbackRate={0}
          avgDecisionTimeMs={0}
        />
      </div>

      <RecentRequests items={[]} />
    </>
  );
}

// ─────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────

export default function DashboardOverviewClient() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/dashboard/overview", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error("Failed to load");

      const json = (await res.json()) as {
        success: boolean;
        data: OverviewData;
      };

      if (!json.success) throw new Error("API error");

      setData(json.data);
    } catch (err) {
      console.error("[dashboard] Failed to load overview", err);
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) return <LoadingState />;

  if (error) return <ErrorState onRetry={() => void loadData()} />;

  if (!data) return <EmptyState />;

  const { metrics, recentRequests, modelUsage, routingHealth } = data;

  const isEmpty =
    metrics.totalRequests === 0 &&
    modelUsage.length === 0 &&
    recentRequests.length === 0;

  if (isEmpty) return <EmptyState />;

  const metricsCards = [
    {
      label: "Requests",
      value: metrics.totalRequests.toLocaleString(),
      change: `${metrics.totalRequests} total`,
      detail: "All time requests",
    },
    {
      label: "Avg. latency",
      value: formatLatency(metrics.avgLatencyMs),
      change: metrics.avgLatencyMs !== null
        ? `${Math.round(metrics.avgLatencyMs)}ms avg`
        : "No data",
      detail: "Per request",
    },
    {
      label: "Fallback rate",
      value: formatPercentage(metrics.fallbackRate),
      change: formatPercentage(metrics.fallbackRate),
      detail: "Requests requiring fallback",
    },
  ];

  return (
    <>
      {/* A. Metric cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {metricsCards.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            change={metric.change}
            detail={metric.detail}
          />
        ))}
      </section>

      {/* B. Cost Intelligence */}
      <CostIntelligence />

      {/* C. Model Activity + D. Routing Health */}
      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <ModelActivity items={modelUsage} />
        <RoutingHealth
          successRate={routingHealth.successRate}
          fallbackRate={routingHealth.fallbackRate}
          avgDecisionTimeMs={routingHealth.avgDecisionTimeMs}
        />
      </section>

      {/* E. Recent requests */}
      <RecentRequests items={recentRequests} />
    </>
  );
}

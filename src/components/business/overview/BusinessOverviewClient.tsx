"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import Link from "next/link";

import { useBusiness } from "@/components/business/BusinessContext";

import BusinessMetricCard from "@/components/business/overview/BusinessMetricCard";
import BusinessModelDistribution from "@/components/business/overview/BusinessModelDistribution";
import BusinessRoutingHealth from "@/components/business/overview/BusinessRoutingHealth";
import BusinessRecentRequests from "@/components/business/overview/BusinessRecentRequests";
import BusinessCostIntelligence from "@/components/business/overview/BusinessCostIntelligence";
import BusinessIdentity from "@/components/business/overview/BusinessIdentity";

import type { BusinessOverviewData } from "@/lib/dashboard/business-overview-queries";

function formatCurrency(value: number): string {
  if (value === 0) return "$0.0000";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs < 0.0001) {
    return `${sign}$${abs.toFixed(6)}`;
  }
  return `${sign}$${abs.toFixed(4)}`;
}

export default function BusinessOverviewClient() {
  const { business } = useBusiness();

  const [data, setData] = useState<BusinessOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!business) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch(
        `/api/business/${business.id}/overview`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );

      if (!res.ok) throw new Error("Failed to load");

      const json = (await res.json()) as {
        success: boolean;
        data: BusinessOverviewData;
      };

      if (!json.success) throw new Error("API error");

      setData(json.data);
    } catch (err) {
      console.error("[business-dashboard] Failed to load overview", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── Computed metric cards ─────────────────────────
  const metricCards = useMemo(() => {
    if (!data) return [];

    const { metrics, apiKeyStats } = data;

    return [
      {
        label: "Requests",
        value: metrics.totalRequests.toLocaleString(),
        detail: `organization requests · ${apiKeyStats.activeKeys} active API key${apiKeyStats.activeKeys === 1 ? "" : "s"}`,
      },
      {
        label: "Actual spend",
        value: formatCurrency(metrics.actualSpend),
        detail: "total execution cost across workspace",
      },
      {
        label: "Avg latency",
        value: metrics.avgLatencyMs !== null ? `${metrics.avgLatencyMs}ms` : "—",
        detail: "average end-to-end request latency",
        accent: true,
      },
      {
        label: "Routing success",
        value: `${metrics.successRate.toFixed(1)}%`,
        detail: `${metrics.fallbackRate.toFixed(1)}% fallback rate`,
        accent: true,
      },
    ];
  }, [data]);

  if (!business) return null;

  // ── Loading state ─────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-8">
          <div className="relative z-10">
            <BusinessIdentity />
            <div className="mt-3 h-10 w-[500px] animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            <div className="mt-5 h-4 w-[600px] animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
              <div className="mt-5 h-8 w-24 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────
  if (error) {
    return (
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-8">
          <div className="relative z-10">
            <BusinessIdentity />
            <h1 className="mt-3 max-w-[760px] font-reservation text-[clamp(2.1rem,3.6vw,3.7rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[var(--color-foreground)]">
              Organization-wide AI visibility.
            </h1>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Overview
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-foreground-secondary)]">
              Organization overview could not be loaded.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="w-fit rounded-full border border-[var(--color-border)] px-4 py-2 text-[10px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-soft)]"
          >
            Try again
          </button>
        </section>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────
  const isEmpty = !data || data.metrics.totalRequests === 0;

  return (
    <div className="space-y-7">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
        >
          <div
            className="absolute -right-[7%] -top-[55%] h-[165%] w-[58%]"
            style={{
              background:
                "radial-gradient(circle at center, rgba(217,119,69,0.28) 0%, rgba(217,119,69,0.12) 30%, rgba(217,119,69,0.045) 52%, rgba(217,119,69,0) 72%)",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <BusinessIdentity />

            <h1 className="mt-3 max-w-[760px] font-reservation text-[clamp(2.1rem,3.6vw,3.7rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[var(--color-foreground)]">
              Organization-wide AI visibility.
            </h1>

            <p className="mt-5 max-w-[690px] text-[13px] leading-6 text-[var(--color-foreground-secondary)] sm:text-[14px]">
              Monitor request activity, model usage, routing health, fallback
              behavior, and team adoption across your organization.
            </p>
          </div>

          <Link
            href="/business/requests"
            className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-3 text-[11px] font-medium text-white transition-transform duration-200 hover:-translate-y-0.5"
          >
            View requests
            <ArrowRight
              size={12}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>

      {/* Organization metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <BusinessMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            accent={metric.accent}
          />
        ))}
      </section>

      {/* Organization cost intelligence (already real) */}
      <BusinessCostIntelligence />

      {isEmpty ? (
        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
          <div className="font-reservation text-[25px] text-[var(--color-foreground)]">
            No organization data yet.
          </div>
          <p className="mx-auto mt-2 max-w-[520px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
            Model usage, routing health, and recent requests will appear here
            once your workspace starts processing requests through Attentra.
          </p>
        </section>
      ) : (
        <>
          {/* Model + routing */}
          <section className="grid gap-4 lg:grid-cols-[1.35fr_0.75fr]">
            <BusinessModelDistribution items={data!.modelUsage} />
            <BusinessRoutingHealth health={data!.routingHealth} totalRequests={data!.metrics.totalRequests} />
          </section>

          {/* Recent organization requests */}
          <BusinessRecentRequests items={data!.recentRequests} />
        </>
      )}
    </div>
  );
}

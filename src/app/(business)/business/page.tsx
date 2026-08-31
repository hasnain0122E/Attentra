import Link from "next/link";

import {
  ArrowRight,
  Buildings,
} from "@phosphor-icons/react/dist/ssr";

import BusinessMemberActivity from "@/components/business/overview/BusinessMemberActivity";
import BusinessMetricCard from "@/components/business/overview/BusinessMetricCard";
import BusinessModelDistribution from "@/components/business/overview/BusinessModelDistribution";
import BusinessRecentRequests from "@/components/business/overview/BusinessRecentRequests";
import BusinessRoutingHealth from "@/components/business/overview/BusinessRoutingHealth";

import { businessMetrics } from "@/lib/business/overview-data";

export default function BusinessPage() {
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
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
              <Buildings
                size={12}
                weight="duotone"
              />

              Acme AI
            </div>

            <h1 className="mt-3 max-w-[760px] font-reservation text-[clamp(2.1rem,3.6vw,3.7rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[var(--color-foreground)]">
              Organization-wide AI visibility.
            </h1>

            <p className="mt-5 max-w-[690px] text-[13px] leading-6 text-[var(--color-foreground-secondary)] sm:text-[14px]">
              Monitor request activity, model usage,
              routing health, fallback behavior, and
              team adoption across your organization.
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
        {businessMetrics.map((metric) => (
          <BusinessMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            change={metric.change}
            detail={metric.detail}
            accent={metric.accent}
          />
        ))}
      </section>

      {/* Model + routing */}
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.75fr]">
        <BusinessModelDistribution />
        <BusinessRoutingHealth />
      </section>

      {/* Members */}
      <BusinessMemberActivity />

      {/* Recent organization requests */}
      <BusinessRecentRequests />
    </div>
  );
}
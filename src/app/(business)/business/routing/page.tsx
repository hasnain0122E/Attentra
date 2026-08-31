import FallbackPaths from "@/components/business/routing/FallbackPaths";
import ModelRoutingDistribution from "@/components/business/routing/ModelRoutingDistribution";
import ProviderDistribution from "@/components/business/routing/ProviderDistribution";
import RoutingLatencyPanel from "@/components/business/routing/RoutingLatencyPanel";
import RoutingMetricCard from "@/components/business/routing/RoutingMetricCard";
import TaskDistribution from "@/components/business/routing/TaskDistribution";

import { routingMetrics } from "@/lib/business/routing-data";

export default function RoutingPage() {
  return (
    <div className="space-y-7">
      {/* Heading */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Routing intelligence
          </div>

          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            Routing.
          </h1>

          <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
            Understand how Attentra classifies organization
            traffic, distributes requests across models and
            providers, and handles fallback execution.
          </p>
        </div>

        <div className="w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Last 30 days
          </span>
        </div>
      </div>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {routingMetrics.map((metric) => (
          <RoutingMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            change={metric.change}
            accent={metric.accent}
          />
        ))}
      </section>

      {/* Core routing analysis */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <TaskDistribution />
        <ModelRoutingDistribution />
      </section>

      {/* Fallback */}
      <FallbackPaths />

      {/* Provider + latency */}
      <section className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
        <ProviderDistribution />
        <RoutingLatencyPanel />
      </section>
    </div>
  );
}
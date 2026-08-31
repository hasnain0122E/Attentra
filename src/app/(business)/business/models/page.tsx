import ModelHealthPanel from "@/components/business/models/ModelHealthPanel";
import ModelMetricCard from "@/components/business/models/ModelMetricCard";
import ModelUsageCard from "@/components/business/models/ModelUsageCard";
import ModelUsageTable from "@/components/business/models/ModelUsageTable";
import TaskAffinityPanel from "@/components/business/models/TaskAffinityPanel";

import {
  businessModelUsage,
  modelMetrics,
} from "@/lib/business/model-data";

export default function ModelsPage() {
  return (
    <div className="space-y-7">
      {/* Heading */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Model intelligence
          </div>

          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            Models.
          </h1>

          <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
            Understand which models are selected,
            which models ultimately execute,
            where fallback traffic moves, and how
            each model performs across organization
            workloads.
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
        {modelMetrics.map((metric) => (
          <ModelMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            accent={metric.accent}
          />
        ))}
      </section>

      {/* Model cards */}
      <section className="grid gap-4 xl:grid-cols-2">
        {businessModelUsage.map((model) => (
          <ModelUsageCard
            key={model.id}
            model={model}
          />
        ))}
      </section>

      {/* Full inventory */}
      <ModelUsageTable />

      {/* Task affinity + health */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <TaskAffinityPanel />
        <ModelHealthPanel />
      </section>
    </div>
  );
}
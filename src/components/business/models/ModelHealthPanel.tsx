import {
  CheckCircle,
  Pulse,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import type { ElementType } from "react";

import { businessModelUsage } from "@/lib/business/model-data";

export default function ModelHealthPanel() {
  const healthyCount =
    businessModelUsage.filter(
      (model) =>
        model.health === "HEALTHY",
    ).length;

  const degradedCount =
    businessModelUsage.filter(
      (model) =>
        model.health === "DEGRADED",
    ).length;

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[var(--color-foreground)] p-5 text-white sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute -right-[22%] -top-[30%] h-[300px] w-[300px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(217,119,69,0.18) 0%, rgba(217,119,69,0.05) 42%, rgba(217,119,69,0) 72%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/40">
              Model health
            </div>

            <h2 className="mt-3 max-w-[330px] font-reservation text-[29px] leading-[0.96] tracking-[-0.03em]">
              Most organization traffic is running on healthy models.
            </h2>
          </div>

          <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--color-accent)] sm:flex">
            <Pulse
              size={17}
              weight="duotone"
            />
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <HealthMetric
            label="Healthy"
            value={String(
              healthyCount,
            )}
            icon={CheckCircle}
            accent
          />

          <HealthMetric
            label="Degraded"
            value={String(
              degradedCount,
            )}
            icon={WarningCircle}
          />
        </div>

        <div className="mt-5 space-y-2.5">
          {businessModelUsage.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between gap-4 rounded-[15px] border border-white/[0.08] bg-white/[0.035] px-3.5 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-[9px] font-medium text-white/75">
                  {model.model}
                </div>

                <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.08em] text-white/35">
                  {model.provider}
                </div>
              </div>

              <div
                className={[
                  "shrink-0 font-mono text-[7px] uppercase tracking-[0.08em]",
                  model.health ===
                  "HEALTHY"
                    ? "text-[var(--color-accent)]"
                    : "text-white/55",
                ].join(" ")}
              >
                {model.health}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HealthMetric({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: ElementType;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.035] p-4">
      <Icon
        size={14}
        weight="duotone"
        className={
          accent
            ? "text-[var(--color-accent)]"
            : "text-white/45"
        }
      />

      <div className="mt-4 font-reservation text-[28px] leading-none">
        {value}
      </div>

      <div className="mt-2 font-mono text-[7px] uppercase tracking-[0.08em] text-white/35">
        {label}
      </div>
    </div>
  );
}
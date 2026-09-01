"use client";

import type { RoutingPriority } from "@/lib/business/settings-data";

interface RoutingDefaultsSettingsProps {
  value: RoutingPriority;
  onChange: (
    value: RoutingPriority,
  ) => void;
}

const priorities: {
  value: RoutingPriority;
  label: string;
  description: string;
}[] = [
  {
    value: "BALANCED",
    label: "Balanced",
    description:
      "Balance capability, latency, and cost.",
  },
  {
    value: "QUALITY",
    label: "Quality",
    description:
      "Favor stronger model capability.",
  },
  {
    value: "LATENCY",
    label: "Latency",
    description:
      "Favor faster model responses.",
  },
  {
    value: "COST",
    label: "Cost",
    description:
      "Favor lower projected request cost.",
  },
];

export default function RoutingDefaultsSettings({
  value,
  onChange,
}: RoutingDefaultsSettingsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {priorities.map((priority) => {
        const active =
          value === priority.value;

        return (
          <button
            key={priority.value}
            type="button"
            onClick={() =>
              onChange(priority.value)
            }
            className={[
              "rounded-[17px] border p-4 text-left transition",
              active
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : "border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-border-strong)]",
            ].join(" ")}
          >
            <div
              className={[
                "font-mono text-[8px] uppercase tracking-[0.09em]",
                active
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-foreground)]",
              ].join(" ")}
            >
              {priority.label}
            </div>

            <p className="mt-2 text-[8px] leading-4 text-[var(--color-foreground-secondary)]">
              {priority.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
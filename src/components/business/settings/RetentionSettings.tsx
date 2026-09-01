"use client";

import type { RetentionPeriod } from "@/lib/business/settings-data";

interface RetentionSettingsProps {
  value: RetentionPeriod;
  onChange: (
    value: RetentionPeriod,
  ) => void;
}

const retentionOptions: {
  value: RetentionPeriod;
  label: string;
  description: string;
}[] = [
  {
    value: "7_DAYS",
    label: "7 days",
    description:
      "Short operational retention.",
  },
  {
    value: "30_DAYS",
    label: "30 days",
    description:
      "Recommended for most teams.",
  },
  {
    value: "90_DAYS",
    label: "90 days",
    description:
      "Longer observability window.",
  },
];

export default function RetentionSettings({
  value,
  onChange,
}: RetentionSettingsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {retentionOptions.map(
        (option) => {
          const active =
            value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onChange(option.value)
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
                {option.label}
              </div>

              <p className="mt-2 text-[8px] leading-4 text-[var(--color-foreground-secondary)]">
                {
                  option.description
                }
              </p>
            </button>
          );
        },
      )}
    </div>
  );
}
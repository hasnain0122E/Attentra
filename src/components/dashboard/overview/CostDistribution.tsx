"use client";

import type {
  ConsumerCostAnalytics,
} from "@/lib/cost-intelligence";

import { formatDisplayCurrency } from "@/lib/currency/display-currency";

interface CostDistributionProps {
  analytics: ConsumerCostAnalytics;
}

export default function CostDistribution({
  analytics,
}: CostDistributionProps) {
  const models =
    analytics.byModel.slice(0, 4);

  if (models.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-[var(--color-border)] px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
            Spend distribution
          </div>

          <div className="mt-1 text-[11px] text-[var(--color-foreground-secondary)]">
            Executed models
          </div>
        </div>

        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          Actual cost
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {models.map((model) => (
          <div
            key={model.modelId}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[11px] font-medium text-[var(--color-foreground)]">
                  {model.displayName}
                </span>

                <span className="shrink-0 font-mono text-[9px] text-[var(--color-foreground-muted)]">
                  {model.percentageOfSpend.toFixed(
                    1,
                  )}
                  %
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        model.percentageOfSpend,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="min-w-[68px] text-right font-mono text-[9px] text-[var(--color-foreground-secondary)]">
              {formatDisplayCurrency(
                model.actualSpend,
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
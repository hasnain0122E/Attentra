import type { PlaygroundResultData } from "@/types/dashboard";

interface RequestMetadataProps {
  result: PlaygroundResultData;
}

function formatCost(value: number | undefined) {
  if (value === undefined) {
    return "—";
  }

  return `$${value.toFixed(6)}`;
}

export default function RequestMetadata({
  result,
}: RequestMetadataProps) {
  const items = [
    {
      label: "Projected cost",
      value: formatCost(result.routing.projectedCost),
    },
    {
      label: "Actual cost",
      value: formatCost(result.execution.actualCost),
    },
    {
      label: "Input tokens",
      value: String(result.execution.usage.inputTokens),
    },
    {
      label: "Output tokens",
      value: String(result.execution.usage.outputTokens),
    },
    {
      label: "Total tokens",
      value: String(result.execution.usage.totalTokens),
    },
    {
      label: "Latency",
      value: `${result.execution.latencyMs} ms`,
    },
  ];

  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
        Request metadata
      </div>

      <div className="mt-5 divide-y divide-[var(--color-border)]">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
          >
            <span className="text-[10px] text-[var(--color-foreground-secondary)]">
              {item.label}
            </span>

            <span className="font-mono text-[9px] text-[var(--color-foreground)]">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          Timestamp
        </div>

        <div className="mt-1.5 font-mono text-[9px] text-[var(--color-foreground-secondary)]">
          {result.timestamp}
        </div>
      </div>
    </section>
  );
}
import {
  CheckCircle,
  ArrowsClockwise,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";

interface RoutingHealthProps {
  successRate: number;
  fallbackRate: number;
  avgDecisionTimeMs: number;
}

const items = [
  {
    label: "Successful routing",
    key: "successRate" as const,
    icon: CheckCircle,
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    label: "Fallback usage",
    key: "fallbackRate" as const,
    icon: ArrowsClockwise,
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    label: "Avg. decision time",
    key: "avgDecisionTimeMs" as const,
    icon: Lightning,
    format: (v: number) => v < 1000 ? `${Math.round(v)}ms` : `${(v / 1000).toFixed(2)}s`,
  },
];

function resolveHeading(
  successRate: number,
  fallbackRate: number,
): string {
  if (successRate === 0 && fallbackRate === 0) {
    return "No routing data yet.";
  }

  // High success + high fallback → fallback is recovering requests
  if (successRate >= 80 && fallbackRate >= 30) {
    return "Fallbacks are recovering requests.";
  }

  // Good success, low fallback
  if (successRate >= 80) {
    return "Routing is healthy.";
  }

  // Meaningful failures
  if (successRate > 0) {
    return "Execution reliability needs attention.";
  }

  return "No successful executions yet.";
}

export default function RoutingHealth({
  successRate,
  fallbackRate,
  avgDecisionTimeMs,
}: RoutingHealthProps) {
  const values = { successRate, fallbackRate, avgDecisionTimeMs };

  const heading = resolveHeading(successRate, fallbackRate);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[var(--color-foreground)] p-5 text-white lg:p-6">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/[0.06]" />
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/[0.05]" />

      <div className="relative">
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/45">
          Routing health
        </div>

        <h2 className="mt-2 max-w-[260px] font-reservation text-[27px] leading-[1.02] tracking-[-0.025em]">
          {heading}
        </h2>

        <div className="mt-8 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    weight="duotone"
                    className="text-[var(--color-accent)]"
                  />

                  <span className="text-[11px] text-white/65">
                    {item.label}
                  </span>
                </div>

                <span className="font-mono text-[10px] text-white">
                  {item.format(values[item.key])}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import {
  CheckCircle,
  ArrowsClockwise,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";

const items = [
  {
    label: "Successful routing",
    value: "93.7%",
    icon: CheckCircle,
  },
  {
    label: "Fallback usage",
    value: "6.3%",
    icon: ArrowsClockwise,
  },
  {
    label: "Avg. decision time",
    value: "38 ms",
    icon: Lightning,
  },
];

export default function RoutingHealth() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[var(--color-foreground)] p-5 text-white lg:p-6">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/[0.06]" />
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/[0.05]" />

      <div className="relative">
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/45">
          Routing health
        </div>

        <h2 className="mt-2 max-w-[260px] font-reservation text-[27px] leading-[1.02] tracking-[-0.025em]">
          Attentra is routing normally.
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
                  {item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
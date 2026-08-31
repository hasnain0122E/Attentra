import {
  ArrowsClockwise,
  CheckCircle,
  Clock,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

const routingHealth = [
  {
    label: "Successful routing",
    value: "94.1%",
    detail: "12,085 completed requests",
    icon: CheckCircle,
    accent: true,
  },
  {
    label: "Fallback usage",
    value: "5.9%",
    detail: "758 fallback executions",
    icon: ArrowsClockwise,
  },
  {
    label: "Failed requests",
    value: "0.8%",
    detail: "103 failed executions",
    icon: WarningCircle,
  },
  {
    label: "Routing decision",
    value: "41ms",
    detail: "average routing latency",
    icon: Clock,
  },
];

export default function BusinessRoutingHealth() {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[var(--color-foreground)] p-5 text-white sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute -right-[25%] -top-[30%] h-[310px] w-[310px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(217,119,69,0.15) 0%, rgba(217,119,69,0.05) 38%, rgba(217,119,69,0) 72%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/40">
          Routing health
        </div>

        <h2 className="mt-3 max-w-[350px] font-reservation text-[29px] leading-[0.95] tracking-[-0.03em] text-white">
          Organization routing is operating normally.
        </h2>

        <p className="mt-3 max-w-[390px] text-[9px] leading-5 text-white/50">
          Routing, fallback activity, and execution
          performance across the organization.
        </p>

        <div className="mt-7 space-y-2.5">
          {routingHealth.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-[15px] border border-white/[0.08] bg-white/[0.035] px-3.5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      item.accent
                        ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                        : "bg-white/[0.05] text-white/55",
                    ].join(" ")}
                  >
                    <Icon
                      size={14}
                      weight="duotone"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[9px] font-medium text-white/75">
                      {item.label}
                    </div>

                    <div className="mt-1 truncate text-[7px] text-white/35">
                      {item.detail}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 font-mono text-[9px] text-white">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
import {
  Clock,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";

import { routingLatencyBuckets } from "@/lib/business/routing-data";

export default function RoutingLatencyPanel() {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[var(--color-foreground)] p-5 text-white sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute -right-[20%] -top-[25%] h-[300px] w-[300px]"
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
              Routing latency
            </div>

            <h2 className="mt-3 max-w-[320px] font-reservation text-[29px] leading-[0.96] tracking-[-0.03em]">
              Decisions stay fast across organization traffic.
            </h2>
          </div>

          <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--color-accent)] sm:flex">
            <Lightning
              size={17}
              weight="duotone"
            />
          </div>
        </div>

        <div className="mt-7 rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-white/35">
                Average decision
              </div>

              <div className="mt-2 font-reservation text-[34px] leading-none">
                41ms
              </div>
            </div>

            <Clock
              size={18}
              weight="duotone"
              className="text-[var(--color-accent)]"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {routingLatencyBuckets.map((bucket) => (
            <div
              key={bucket.label}
              className="grid grid-cols-[60px_1fr_40px] items-center gap-3"
            >
              <div className="font-mono text-[7px] text-white/45">
                {bucket.label}
              </div>

              <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{
                    width: `${bucket.percentage}%`,
                  }}
                />
              </div>

              <div className="text-right font-mono text-[7px] text-white/55">
                {bucket.percentage}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
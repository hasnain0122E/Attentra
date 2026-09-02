import Link from "next/link";

import { ArrowRight, Sparkle } from "@phosphor-icons/react/dist/ssr";

import DashboardOverviewClient from "@/components/dashboard/overview/DashboardOverviewClient";

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        {/* Ambient copper glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
        >
          {/* Main glow */}
          <div
            className="absolute -right-[8%] -top-[45%] h-[150%] w-[58%]"
            style={{
              background:
                "radial-gradient(circle at center, rgba(217,119,69,0.24) 0%, rgba(217,119,69,0.14) 28%, rgba(217,119,69,0.06) 50%, rgba(217,119,69,0) 72%)",
            }}
          />

          {/* Secondary lower glow */}
          <div
            className="absolute -bottom-[65%] right-[8%] h-[130%] w-[42%]"
            style={{
              background:
                "radial-gradient(circle at center, rgba(217,119,69,0.13) 0%, rgba(217,119,69,0.05) 42%, rgba(217,119,69,0) 72%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Consumer workspace
            </div>

            <h1 className="mt-3 max-w-[720px] font-reservation text-[clamp(2.1rem,4vw,4rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[var(--color-foreground)]">
              Your AI routing workspace.
            </h1>

            <p className="mt-5 max-w-[640px] text-[13px] leading-6 text-[var(--color-foreground-secondary)] sm:text-[14px]">
              Track how Attentra analyzes requests, selects models, handles
              fallbacks, and executes each response across your AI stack.
            </p>
          </div>

          <Link
            href="/dashboard/playground"
            className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-3 text-[11px] font-medium text-white transition-transform duration-200 hover:-translate-y-0.5"
          >
            <Sparkle size={14} weight="fill" />
            Run a request
            <ArrowRight
              size={13}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>

      {/* Metrics + Cost Intelligence + Model Activity + Routing Health + Recent Requests */}
      <DashboardOverviewClient />
    </div>
  );
}

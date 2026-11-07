"use client";

import { motion } from "motion/react";
import {
  ArrowsClockwise,
  CurrencyDollar,
  Plug,
  Stack,
} from "@phosphor-icons/react";

/**
 * Benefits — outcomes for the application, not the routing steps
 * (those are covered in "How it works").
 */
const benefits = [
  {
    number: "01",
    label: "INTEGRATION",
    title: "One integration instead of three.",
    description:
      "Keep the OpenAI SDK you already use. Attentra speaks to OpenAI, Anthropic and Google for you, so adding a provider never means adding a new client to your code.",
    metric: "1 endpoint",
    metricLabel: "three providers behind it",
    icon: Plug,
  },
  {
    number: "02",
    label: "COST",
    title: "Pay premium prices only when the task needs it.",
    description:
      "Simple requests can go to lower-cost models. Every response records its calculated cost, and the dashboard compares it with a baseline model you choose.",
    metric: "Per request",
    metricLabel: "cost recorded and comparable",
    icon: CurrencyDollar,
  },
  {
    number: "03",
    label: "RESILIENCE",
    title: "A provider outage doesn't have to become yours.",
    description:
      "When an attempt fails with a recoverable error — a timeout, a rate limit, a model the account can't use — Attentra tries an eligible model on another provider before returning an error.",
    metric: "Automatic",
    metricLabel: "cross-provider fallback",
    icon: ArrowsClockwise,
  },
];

export default function WhyAttentra() {
  return (
    <section
      id="why-attentra"
      className="attentra-atmosphere attendra-atmosphere-subtle relative overflow-hidden bg-[var(--color-background)] py-28 sm:py-36 lg:py-44"
    >
      {/* =====================================================
          BACKGROUND
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-[-12rem] top-[20%] h-[30rem] w-[30rem] rounded-full bg-[var(--color-accent-soft)] opacity-10 blur-[130px]" />

        <div className="absolute right-[-12rem] bottom-[10%] h-[30rem] w-[30rem] rounded-full bg-[var(--color-accent-soft)] opacity-10 blur-[130px]" />
      </div>

      <div className="attentra-container relative">
        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Stack size={14} />
              </span>

              <span className="attentra-label text-[var(--color-accent)]">
                Benefits
              </span>
            </div>

            <p className="mt-6 max-w-sm text-sm leading-6 text-[var(--color-foreground-secondary)]">
              Three things your team stops worrying about once requests go
              through Attentra.
            </p>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.7,
              delay: 0.1,
            }}
            className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--color-foreground)] sm:text-5xl lg:text-6xl"
          >
            What changes
            <br />
            <span className="text-[var(--color-accent)]">
              for your application.
            </span>
          </motion.h2>
        </div>

        {/* =====================================================
            BENEFITS
            ===================================================== */}

        <div className="mt-20 border-t border-[var(--color-border)]">
          {benefits.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.number}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{
                  once: true,
                  amount: 0.25,
                }}
                transition={{
                  duration: 0.65,
                  delay: index * 0.08,
                }}
                className="group grid gap-6 border-b border-[var(--color-border)] py-10 lg:grid-cols-[0.15fr_0.2fr_1fr_0.35fr] lg:items-center lg:gap-8"
              >
                {/* Number */}

                <div className="font-mono text-[9px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
                  {item.number}
                </div>

                {/* Label */}

                <div className="flex items-center gap-2">
                  <Icon
                    size={15}
                    className="text-[var(--color-accent)]"
                  />

                  <span className="font-mono text-[9px] font-medium tracking-[0.13em] text-[var(--color-foreground-secondary)]">
                    {item.label}
                  </span>
                </div>

                {/* Copy */}

                <div>
                  <h3 className="max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.04em] text-[var(--color-foreground)] transition-colors duration-300 group-hover:text-[var(--color-accent)] sm:text-3xl">
                    {item.title}
                  </h3>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-foreground-secondary)]">
                    {item.description}
                  </p>
                </div>

                {/* Outcome */}

                <div className="lg:text-right">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)] sm:text-3xl">
                    {item.metric}
                  </div>

                  <div className="mt-1 font-mono text-[8px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
                    {item.metricLabel.toUpperCase()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  CloudSlash,
  Lightning,
  Stack,
  WarningCircle,
} from "@phosphor-icons/react";

/** Three everyday requests that a single hard-coded model handles badly. */
const examples = [
  {
    request: "Classify a support ticket",
    context: "Thousands a day",
    needs: "A fast, inexpensive model",
    hardCoded: "One premium model: you overpay on every call",
    withAttentra: "Routed to a low-cost model that can do the job",
    accent: "bg-[var(--color-accent)]",
    icon: Lightning,
  },
  {
    request: "Debug a production incident",
    context: "A few a week",
    needs: "Strong multi-step reasoning",
    hardCoded: "One budget model: risk of a weak answer",
    withAttentra: "Routed to a stronger reasoning model",
    accent: "bg-[var(--color-foreground)]",
    icon: Brain,
  },
  {
    request: "Your AI provider has an outage",
    context: "Unplanned",
    needs: "Another provider, ready to answer",
    hardCoded: "One provider: requests fail until it recovers",
    withAttentra: "Retried on an eligible model from another provider",
    accent: "bg-[var(--color-foreground-secondary)]",
    icon: CloudSlash,
  },
];

export default function ModelFragmentation() {
  return (
    <section
      id="product"
      className="attentra-atmosphere attendra-atmosphere-medium relative overflow-hidden bg-[var(--color-background)] py-28 sm:py-36 lg:py-44"
    >
      {/* =====================================================
          BACKGROUND
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-[-15rem] top-[20%] h-[32rem] w-[32rem] rounded-full bg-[var(--color-accent-soft)] opacity-30 blur-[120px]" />

        <div className="absolute right-[-15rem] bottom-[10%] h-[32rem] w-[32rem] rounded-full bg-white opacity-80 blur-[120px]" />
      </div>

      <div className="attentra-container relative">
        {/* =====================================================
            INTRO
            ===================================================== */}

        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          {/* Left */}

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Stack size={16} />
              </span>

              <span className="attentra-label text-[var(--color-accent)]">
                The problem
              </span>
            </div>

            <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--color-foreground)] sm:text-5xl lg:text-6xl">
              Different requests need different models.
            </h2>
          </motion.div>

          {/* Right */}

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:pt-10"
          >
            <p className="max-w-2xl text-lg leading-8 text-[var(--color-foreground-secondary)] sm:text-xl">
              A ticket classifier and a production bug hunt shouldn&apos;t pay
              the same price — and when a provider goes down, an app wired to
              that provider goes down with it.
            </p>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-foreground-muted)]">
              Choosing per request and maintaining several provider
              integrations is real engineering work, so most teams hard-code
              one model and live with the trade-offs.
            </p>
          </motion.div>
        </div>

        {/* =====================================================
            MODEL COMPARISON
            ===================================================== */}

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {examples.map((example, index) => {
            const ExampleIcon = example.icon;

            return (
              <motion.div
                key={example.request}
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.2,
                }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                }}
                className="group relative overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                {/* Top accent */}

                <div
                  className={`absolute left-0 right-0 top-0 h-1 ${example.accent}`}
                />

                {/* Header */}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-[var(--color-foreground)]">
                      {example.request}
                    </div>

                    <div className="mt-1 text-xs text-[var(--color-foreground-muted)]">
                      {example.context}
                    </div>
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] transition-transform duration-300 group-hover:scale-105">
                    <ExampleIcon
                      size={25}
                      weight="duotone"
                    />
                  </div>
                </div>

                {/* Need */}

                <div className="mt-8">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                    What it needs
                  </div>

                  <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
                    {example.needs}
                  </div>
                </div>

                {/* Outcomes */}

                <div className="mt-8 grid gap-3">
                  <div className="rounded-xl bg-[var(--color-background)] p-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--color-foreground-muted)]">
                      <WarningCircle size={13} />
                      Hard-coded
                    </div>

                    <div className="mt-1.5 text-sm text-[var(--color-foreground-secondary)]">
                      {example.hardCoded}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[var(--color-accent-soft)] p-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--color-accent)]">
                      <CheckCircle size={13} />
                      With Attentra
                    </div>

                    <div className="mt-1.5 text-sm font-medium text-[var(--color-foreground)]">
                      {example.withAttentra}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* =====================================================
            BRIDGE TO HOW IT WORKS
            ===================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="mt-14 flex flex-col gap-5 rounded-[1.5rem] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <p className="max-w-2xl text-lg font-medium leading-7 tracking-[-0.02em] text-[var(--color-foreground)] sm:text-xl">
            Attentra makes that choice on each request, outside your code
            {" "}
            <span className="text-[var(--color-foreground-secondary)]">
              — and records why it chose.
            </span>
          </p>

          <a
            href="#how-it-works"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-3 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5"
          >
            Follow one request
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
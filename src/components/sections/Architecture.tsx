"use client";

import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle,
  CurrencyDollar,
  Gauge,
  Brain,
  Lightning,
  ShareNetwork,
  Sparkle,
  Stack,
  TerminalWindow,
} from "@phosphor-icons/react";

import { formatDisplayCurrency } from "@/lib/currency/display-currency";

const models = [
  {
    name: "GPT-4.1",
    provider: "OpenAI",
    latency: "620ms",
    cost: 0.012,
  },
  {
    name: "Claude Sonnet",
    provider: "Anthropic",
    latency: "480ms",
    cost: 0.008,
  },
  {
    name: "Gemini Flash",
    provider: "Google",
    latency: "210ms",
    cost: 0.003,
  },
];

export default function Architecture() {
  return (
    <section
      id="architecture"
      className="attentra-dark-atmosphere relative overflow-hidden bg-[var(--color-dark)] py-28 text-white sm:py-36 lg:py-44"
    >
      {/* =====================================================
          BACKGROUND
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[var(--color-accent)] opacity-[0.12] blur-[140px]" />

        <div className="absolute bottom-[-20rem] left-[-12rem] h-[32rem] w-[32rem] rounded-full bg-[var(--color-accent)] opacity-[0.05] blur-[140px]" />

        <div className="absolute right-[-14rem] top-[35%] h-[28rem] w-[28rem] rounded-full bg-[var(--color-accent)] opacity-[0.04] blur-[140px]" />
      </div>

      <div className="attentra-container relative">
        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <ShareNetwork
                size={16}
                weight="duotone"
              />
            </span>

            <span className="attentra-label text-[var(--color-accent)]">
              Architecture
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.7,
              delay: 0.1,
            }}
className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
            One integration.
            <br />

            <span className="text-[var(--color-accent)]">
              Multiple models.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: 0.2,
            }}
            className="mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg"
          >
            Your application talks to one routing layer. Attentra handles
            model selection, optimization, and provider complexity behind
            the scenes.
          </motion.p>
        </div>

        {/* =====================================================
            ARCHITECTURE VISUALIZATION
            ===================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: 0.8,
            delay: 0.15,
          }}
          className="mt-20 overflow-hidden rounded-[2rem] border border-[var(--color-dark-border)] bg-[var(--color-dark-soft)] shadow-[var(--shadow-lg)]"
        >
          {/* Top system bar */}

          <div className="flex items-center justify-between border-b border-[var(--color-dark-border)] px-6 py-4 sm:px-8">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]" />

              <span className="font-mono text-[10px] font-medium tracking-[0.1em] text-white/60">
                ATTENTRA ROUTING LAYER
              </span>
            </div>

            <span className="font-mono text-[10px] text-white/35">
              ARCH-001
            </span>
          </div>

          <div className="relative p-6 sm:p-10 lg:p-14">
            {/* =================================================
                APPLICATION
                ================================================= */}

            <ArchitectureNode
              icon={
                <TerminalWindow
                  size={20}
                  weight="duotone"
                />
              }
              eyebrow="SOURCE"
              title="Your application"
              description="One API endpoint"
              className="mx-auto max-w-sm"
            />

            {/* Connector */}

            <VerticalConnector />

            {/* =================================================
                ATTENTRA
                ================================================= */}

            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 p-1"
            >
              <div className="relative rounded-[1.35rem] bg-[var(--color-dark-soft)] p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                      <Brain
                        size={23}
                        weight="duotone"
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold tracking-[0.13em] text-[var(--color-accent)]">
                        DECISION LAYER
                      </div>

                      <h3 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-white">
                        Attentra Routing Engine
                      </h3>
                    </div>
                  </div>

                  <span className="hidden rounded-full border border-[var(--color-dark-border)] bg-white/[0.04] px-3 py-1.5 font-mono text-[9px] text-white/40 sm:block">
                    ACTIVE
                  </span>
                </div>

                {/* Metrics */}

                <div className="mt-6 grid grid-cols-3 divide-x divide-[var(--color-dark-border)] rounded-2xl border border-[var(--color-dark-border)] bg-white/[0.04]">
                  <Metric
                    icon={
                      <Sparkle
                        size={14}
                        weight="duotone"
                      />
                    }
                    label="QUALITY"
                    value="Optimized"
                  />

                  <Metric
                    icon={
                      <Gauge
                        size={14}
                        weight="duotone"
                      />
                    }
                    label="LATENCY"
                    value="Dynamic"
                  />

                  <Metric
                    icon={
                      <CurrencyDollar
                        size={14}
                        weight="duotone"
                      />
                    }
                    label="COST"
                    value="Adaptive"
                  />
                </div>
              </div>
            </motion.div>

            {/* Connector */}

            <VerticalConnector />

            {/* =================================================
                MODEL NETWORK
                ================================================= */}

            <div className="relative">
              <div className="mb-5 flex items-center justify-center gap-2 text-center">
                <Stack
                  size={14}
                  weight="duotone"
                  className="text-[var(--color-accent)]"
                />

                <span className="font-mono text-[9px] font-medium tracking-[0.14em] text-white/35">
                  AVAILABLE MODEL POOL
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {models.map((model, index) => (
                  <ModelNode
                    key={model.name}
                    model={model}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Bottom connector */}

            <div className="mx-auto mt-8 flex flex-col items-center">
              <div className="h-8 w-px bg-[var(--color-dark-border)]" />

              <ArrowDown
                size={14}
                weight="bold"
                className="-mt-1 text-[var(--color-accent)]"
              />
            </div>

            {/* =================================================
                RESULT
                ================================================= */}

            <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-5 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white">
                <CheckCircle
                  size={17}
                  weight="duotone"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-white">
                  Best-fit model selected
                </div>

                <div className="mt-0.5 text-[10px] text-white/60">
                  The request continues without changing your application.
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* =====================================================
            BOTTOM STATEMENT
            ===================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-14 flex flex-col gap-4 border-t border-[var(--color-dark-border)] pt-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Lightning
              size={19}
              weight="duotone"
              className="text-[var(--color-accent)]"
            />

            <p className="text-sm text-white/60">
              Your code stays the same while the routing layer evolves.
            </p>
          </div>

          <a
            href="#product"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-white"
          >
            See the product

            <ArrowRight
              size={15}
              weight="bold"
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   ARCHITECTURE NODE
   ============================================================ */

function ArchitectureNode({
  icon,
  eyebrow,
  title,
  description,
  className = "",
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-dark-border)] bg-white/[0.03] p-5 ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-dark-border)] bg-white/[0.05] text-[var(--color-accent)]">
          {icon}
        </div>

        <div>
          <div className="font-mono text-[9px] font-medium tracking-[0.13em] text-white/35">
            {eyebrow}
          </div>

          <div className="mt-1 text-sm font-semibold text-white">
            {title}
          </div>

          <div className="mt-0.5 text-xs text-white/60">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VERTICAL CONNECTOR
   ============================================================ */

function VerticalConnector() {
  return (
    <div className="mx-auto flex h-12 flex-col items-center justify-center">
      <div className="relative h-full w-px bg-[var(--color-dark-border)]">
        <motion.div
          initial={{
            scaleY: 0,
          }}
          whileInView={{
            scaleY: 1,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute inset-0 origin-top bg-[var(--color-accent)]"
        />
      </div>

      <div className="absolute mt-12 h-1.5 w-1.5 rotate-45 border-b border-r border-[var(--color-accent)]" />
    </div>
  );
}

/* ============================================================
   METRIC
   ============================================================ */

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 text-center">
      <div className="flex items-center gap-1 text-[var(--color-accent)]">
        {icon}

        <span className="font-mono text-[8px] tracking-[0.1em]">
          {label}
        </span>
      </div>

      <span className="text-[10px] font-medium text-white">
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   MODEL NODE
   ============================================================ */

function ModelNode({
  model,
  index,
}: {
  model: {
    name: string;
    provider: string;
    latency: string;
    cost: number;
  };
  index: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 15,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.5,
      }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
      }}
      className="group rounded-2xl border border-[var(--color-dark-border)] bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em] text-white">
            {model.name}
          </div>

          <div className="mt-1 text-[10px] text-white/35">
            {model.provider}
          </div>
        </div>

        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_7px_var(--color-accent)]" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--color-dark-border)] pt-4">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.1em] text-white/35">
            <Gauge
              size={11}
              weight="duotone"
            />
            LATENCY
          </div>

          <div className="mt-1 text-xs font-medium text-white">
            {model.latency}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.1em] text-white/35">
            <CurrencyDollar
              size={11}
              weight="duotone"
            />
            COST
          </div>

          <div className="mt-1 text-xs font-medium text-white">
            {formatDisplayCurrency(model.cost)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
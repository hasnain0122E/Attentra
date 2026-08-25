"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Gauge,
  Layers3,
  Zap,
} from "lucide-react";

import {
  Brain,
  Code,
  Lightning,
} from "@phosphor-icons/react";

const models = [
  {
    name: "GPT-4.1",
    provider: "OpenAI",
    strength: "Deep reasoning",
    cost: "$$$",
    latency: "620ms",
    accent: "bg-[var(--color-foreground)]",
    icon: Brain,
  },
  {
    name: "Claude Sonnet",
    provider: "Anthropic",
    strength: "Complex analysis",
    cost: "$$",
    latency: "480ms",
    accent: "bg-[var(--color-accent)]",
    icon: Code,
  },
  {
    name: "Gemini Flash",
    provider: "Google",
    strength: "Fast tasks",
    cost: "$",
    latency: "210ms",
    accent: "bg-[var(--color-accent)]",
    icon: Lightning,
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
                <Layers3 size={16} />
              </span>

              <span className="attentra-label text-[var(--color-accent)]">
                The problem
              </span>
            </div>

            <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--color-foreground)] sm:text-5xl lg:text-6xl">
              One model was never meant to do everything.
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
              Every AI request has a different cost, latency, and intelligence
              requirement. Sending everything to the same model means you're
              constantly trading one for another.
            </p>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-foreground-muted)]">
              Attentra sits between your application and the model providers,
              making that decision automatically.
            </p>
          </motion.div>
        </div>

        {/* =====================================================
            MODEL COMPARISON
            ===================================================== */}

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {models.map((model, index) => {
            const ModelIcon = model.icon;

            return (
              <motion.div
                key={model.name}
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
                  className={`absolute left-0 right-0 top-0 h-1 ${model.accent}`}
                />

                {/* Header */}

                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold text-[var(--color-foreground)]">
                      {model.name}
                    </div>

                    <div className="mt-1 text-xs text-[var(--color-foreground-muted)]">
                      {model.provider}
                    </div>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] transition-transform duration-300 group-hover:scale-105">
                    <ModelIcon
                      size={25}
                      weight="duotone"
                    />
                  </div>
                </div>

                {/* Strength */}

                <div className="mt-8">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                    Best at
                  </div>

                  <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
                    {model.strength}
                  </div>
                </div>

                {/* Metrics */}

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--color-background)] p-3">
                    <CircleDollarSign
                      size={14}
                      className="text-[var(--color-accent)]"
                    />

                    <div className="mt-3 text-[10px] uppercase tracking-wide text-[var(--color-foreground-muted)]">
                      Relative cost
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {model.cost}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[var(--color-background)] p-3">
                    <Gauge
                      size={14}
                      className="text-[var(--color-accent)]"
                    />

                    <div className="mt-3 text-[10px] uppercase tracking-wide text-[var(--color-foreground-muted)]">
                      Latency
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {model.latency}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* =====================================================
            ATTENTRA VALUE STRIP
            ===================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
        >
          <div className="grid md:grid-cols-[1fr_auto_1fr] md:items-center">
            {/* Before */}

            <div className="p-6 sm:p-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                Without Attentra
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-foreground-muted)]">
                  <Zap size={17} />
                </div>

                <div>
                  <div className="text-sm font-semibold text-[var(--color-foreground)]">
                    One model for everything
                  </div>

                  <div className="mt-1 text-xs text-[var(--color-foreground-secondary)]">
                    Expensive. Inflexible. Hard to optimize.
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}

            <div className="hidden h-16 w-px bg-[var(--color-accent)]/20 md:block" />

            {/* After */}

            <div className="border-t border-[var(--color-accent)]/20 p-6 sm:p-8 md:border-t-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                With Attentra
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white">
                  <Check size={17} />
                </div>

                <div>
                  <div className="text-sm font-semibold text-[var(--color-foreground)]">
                    The right model for every request
                  </div>

                  <div className="mt-1 text-xs text-[var(--color-foreground-secondary)]">
                    Automatically optimized for your priorities.
                  </div>
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
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="mt-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="attentra-label text-[var(--color-foreground-muted)]">
              The Attentra advantage
            </div>

            <p className="mt-3 max-w-2xl text-2xl font-medium leading-tight tracking-[-0.03em] text-[var(--color-foreground)] sm:text-3xl">
              Stop choosing a model.
              <br />
              <span className="text-[var(--color-accent)]">
                Let your infrastructure choose.
              </span>
            </p>
          </div>

          <a
            href="#how-it-works"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]"
          >
            See how routing works
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
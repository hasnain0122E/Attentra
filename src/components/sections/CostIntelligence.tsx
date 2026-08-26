"use client";

import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle,
  CurrencyDollar,
  Gauge,
  GitBranch,
  Sparkle,
  Stack,
  Lightning,
} from "@phosphor-icons/react";

const models = [
  {
    name: "Gemini Flash",
    provider: "Google",
    cost: "$",
    latency: "210ms",
    quality: "92",
    description: "Fast everyday workloads",
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "Claude Sonnet",
    provider: "Anthropic",
    cost: "$$",
    latency: "480ms",
    quality: "96",
    description: "Balanced quality + reasoning",
    accent: "bg-blue-50 text-blue-600",
  },
  {
    name: "GPT-4.1",
    provider: "OpenAI",
    cost: "$$$",
    latency: "620ms",
    quality: "98",
    description: "Complex reasoning tasks",
    accent: "bg-slate-100 text-slate-700",
  },
];

export default function CostIntelligence() {
  return (
    <section
      id="cost-intelligence"
      className="attentra-atmosphere attendra-atmosphere-subtle relative isolate overflow-hidden bg-[var(--color-background)] py-24 sm:py-32 lg:py-40"
    >
      {/* =========================================================
          BACKGROUND
          ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-20rem] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-20 blur-[150px]" />

        <div className="absolute bottom-[-18rem] left-[-12rem] h-[32rem] w-[32rem] rounded-full bg-[var(--color-accent-soft)] opacity-[0.08] blur-[140px]" />
      </div>

      <div className="attentra-container relative z-10">
        {/* =========================================================
            HEADER
            ========================================================= */}

        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <CurrencyDollar size={14} />
              </span>

              <span className="attentra-label text-[var(--color-accent)]">
                Cost intelligence
              </span>
            </div>

            <p className="mt-6 max-w-sm text-sm leading-6 text-[var(--color-foreground-secondary)]">
              Model selection becomes an optimization problem instead of
              a hard-coded decision.
            </p>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.7,
              delay: 0.1,
            }}
            className="max-w-5xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--color-foreground)] sm:text-5xl lg:text-6xl"
          >
            Why pay the highest price
            <br className="hidden sm:block" />

            <span className="text-[var(--color-accent)]">
              for every request?
            </span>
          </motion.h2>
        </div>

        {/* =========================================================
            MAIN COMPARISON
            ========================================================= */}

        <div className="mt-16 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          {/* =======================================================
              WITHOUT ATTENTRA
              ======================================================= */}

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="relative overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-white p-6 sm:p-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[8px] tracking-[0.14em] text-[var(--color-foreground-muted)]">
                  WITHOUT ATTENTRA
                </div>

                <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[var(--color-foreground)]">
                  One model for everything.
                </h3>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Stack size={16} />
              </div>
            </div>

            {/* Direct request visualization */}

            <div className="mt-10">
              <RequestNode label="APPLICATION REQUEST" />

              <div className="flex justify-center py-3">
                <motion.div
                  animate={{
                    y: [0, 4, 0],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-8 w-px bg-[var(--color-border)]"
                />
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Lightning size={16} />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[var(--color-foreground)]">
                      GPT-4.1
                    </div>

                    <div className="mt-1 text-[10px] text-[var(--color-foreground-secondary)]">
                      Used for every request
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <SmallMetric value="$$$" label="COST" />
                  <SmallMetric value="620ms" label="LATENCY" />
                  <SmallMetric value="98" label="QUALITY" />
                </div>
              </div>
            </div>

            {/* Bottom message */}

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                <ArrowRight size={11} />
              </span>

              <p className="text-[11px] leading-5 text-[var(--color-foreground-secondary)]">
                Simple requests still consume the most capable and
                expensive model.
              </p>
            </div>
          </motion.div>

          {/* =======================================================
              WITH ATTENTRA
              ======================================================= */}

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.65,
              delay: 0.1,
            }}
            className="relative overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-white p-6 sm:p-8"
          >
            {/* Accent glow */}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-[-8rem] top-[-8rem] h-64 w-64 rounded-full bg-[var(--color-accent-soft)] opacity-30 blur-[100px]"
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[8px] tracking-[0.14em] text-[var(--color-accent)]">
                    WITH ATTENTRA
                  </div>

                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[var(--color-foreground)]">
                    Every request finds its fit.
                  </h3>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <GitBranch size={16} />
                </div>
              </div>

              {/* Routing visualization */}

              <div className="mt-10">
                <RequestNode label="APPLICATION REQUEST" />

                <div className="relative flex justify-center py-5">
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--color-border)]" />

                  <motion.div
                    animate={{
                      y: [0, 34],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative z-10 h-5 w-5 rounded-full border border-[var(--color-accent)] bg-white p-1"
                  >
                    <div className="h-full w-full rounded-full bg-[var(--color-accent)]" />
                  </motion.div>
                </div>

                {/* Attentra decision layer */}

                <div className="relative rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)]/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--color-accent)] shadow-sm">
                      <Sparkle size={15} />
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--color-foreground)]">
                        Attentra decision layer
                      </div>

                      <div className="mt-1 text-[10px] text-[var(--color-foreground-secondary)]">
                        Evaluates quality, latency, complexity & cost
                      </div>
                    </div>
                  </div>
                </div>

                {/* Branch */}

                <div className="relative mt-5">
                  <div className="absolute left-[16.66%] right-[16.66%] top-0 h-px bg-[var(--color-border)]" />

                  <div className="grid grid-cols-3 gap-2">
                    {models.map((model, index) => (
                      <ModelCard
                        key={model.name}
                        model={model}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom message */}

              <div className="mt-6 flex items-start gap-3 rounded-xl bg-[var(--color-accent-soft)]/50 p-4">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-accent)] shadow-sm">
                  <CheckCircle size={11} />
                </span>

                <p className="text-[11px] leading-5 text-[var(--color-foreground-secondary)]">
                  Spend more only when the request actually needs more
                  capability.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* =========================================================
            BOTTOM VALUE STRIP
            ========================================================= */}

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
            delay: 0.15,
          }}
          className="mt-6 grid overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white sm:grid-cols-3"
        >
          <ValueItem
            icon={CurrencyDollar}
            title="Lower inference cost"
            description="Avoid unnecessary premium-model calls."
          />

          <ValueItem
            icon={Gauge}
            title="Better latency"
            description="Fast requests can stay on fast models."
          />

          <ValueItem
            icon={Sparkle}
            title="Preserve quality"
            description="Complex requests still get stronger models."
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ===============================================================
   REQUEST NODE
   =============================================================== */

function RequestNode({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--color-accent)] shadow-sm">
          <ArrowRight size={15} />
        </div>

        <div className="min-w-0">
          <div className="font-mono text-[7px] tracking-[0.13em] text-[var(--color-foreground-muted)]">
            {label}
          </div>

          <div className="mt-1 truncate text-xs font-medium text-[var(--color-foreground)]">
            User request enters Attentra
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===============================================================
   MODEL CARD
   =============================================================== */

function ModelCard({
  model,
  index,
}: {
  model: (typeof models)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
      }}
      transition={{
        duration: 0.45,
        delay: 0.2 + index * 0.1,
      }}
      className="relative min-w-0 pt-4"
    >
      {/* Connection line */}

      <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-[var(--color-border)]" />

      <div className="h-full rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-[0_6px_24px_rgba(0,0,0,0.03)]">
        <div
          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${model.accent}`}
        >
          <Sparkle size={13} />
        </div>

        <div className="mt-3 truncate text-center text-[10px] font-semibold text-[var(--color-foreground)]">
          {model.name}
        </div>

        <div className="mt-1 truncate text-center text-[8px] text-[var(--color-foreground-muted)]">
          {model.provider}
        </div>

        <div className="mt-3 space-y-1.5 border-t border-[var(--color-border)] pt-3">
          <div className="flex justify-between gap-1">
            <span className="text-[7px] text-[var(--color-foreground-muted)]">
              COST
            </span>

            <span className="text-[8px] font-semibold text-[var(--color-foreground)]">
              {model.cost}
            </span>
          </div>

          <div className="flex justify-between gap-1">
            <span className="text-[7px] text-[var(--color-foreground-muted)]">
              SPEED
            </span>

            <span className="text-[8px] font-semibold text-[var(--color-foreground)]">
              {model.latency}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ===============================================================
   SMALL METRIC
   =============================================================== */

function SmallMetric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white px-2 py-3 text-center">
      <div className="text-xs font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
        {value}
      </div>

      <div className="mt-1 font-mono text-[6px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
        {label}
      </div>
    </div>
  );
}

/* ===============================================================
   VALUE ITEM
   =============================================================== */

function ValueItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CurrencyDollar;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 border-[var(--color-border)] p-5 sm:p-6 sm:[&+div]:border-l">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        <Icon size={15} />
      </div>

      <div className="min-w-0">
        <div className="text-xs font-semibold text-[var(--color-foreground)]">
          {title}
        </div>

        <div className="mt-1 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          {description}
        </div>
      </div>
    </div>
  );
}
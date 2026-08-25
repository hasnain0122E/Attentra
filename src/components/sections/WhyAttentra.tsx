"use client";

import { motion } from "motion/react";
import {
  ArrowDownRight,
  ArrowRight,
  CircleDollarSign,
  Gauge,
  Layers3,
  Sparkles,
  Zap,
} from "lucide-react";

const advantages = [
  {
    number: "01",
    label: "COST",
    title: "Stop paying premium prices for simple requests.",
    description:
      "Not every request needs your most expensive model. Attentra can intelligently favor capable, lower-cost models when the task allows it.",
    metric: "$0.003",
    metricLabel: "example request cost",
    icon: CircleDollarSign,
  },
  {
    number: "02",
    label: "LATENCY",
    title: "Use speed when speed matters.",
    description:
      "Latency becomes another routing signal. Fast models can handle time-sensitive workloads while more capable models handle requests that need deeper reasoning.",
    metric: "210ms",
    metricLabel: "example response latency",
    icon: Gauge,
  },
  {
    number: "03",
    label: "QUALITY",
    title: "Match model capability to task complexity.",
    description:
      "Simple classification, creative generation, coding, and complex reasoning do not have identical model requirements. Attentra adapts to the request.",
    metric: "96",
    metricLabel: "example quality score",
    icon: Sparkles,
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
                <Layers3 size={14} />
              </span>

              <span className="attentra-label text-[var(--color-accent)]">
                Why Attentra
              </span>
            </div>

            <p className="mt-6 max-w-sm text-sm leading-6 text-[var(--color-foreground-secondary)]">
              AI infrastructure is becoming multi-model. Attentra gives
              your application one intelligent layer for managing that
              complexity.
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
            One intelligent layer
            <br />
            <span className="text-[var(--color-accent)]">
              between you and every model.
            </span>
          </motion.h2>
        </div>

        {/* =====================================================
            ROUTING VISUAL
            ===================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.8,
            delay: 0.15,
          }}
          className="relative mt-20 overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white px-6 py-10 sm:px-10 lg:px-16 lg:py-14"
        >
          {/* Grid */}

          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative">
            <div className="text-center">
              <span className="font-mono text-[8px] tracking-[0.16em] text-[var(--color-foreground-muted)]">
                YOUR APPLICATION
              </span>
            </div>

            {/* Routing diagram */}

            <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-0">
              {/* Application */}

              <Node
                icon={<Zap size={17} />}
                label="Your app"
                sublabel="One API"
              />

              {/* Connector */}

              <Connector />

              {/* Attentra */}

              <div className="relative flex h-20 w-40 items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.08, 1],
                    opacity: [0.15, 0.3, 0.15],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-1 rounded-2xl bg-[var(--color-accent)] blur-xl"
                />

                <div className="relative flex h-16 w-36 items-center justify-center gap-2 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-sm">
                  <Sparkles size={17} />

                  <div className="text-left">
                    <div className="text-xs font-semibold">
                      Attentra
                    </div>

                    <div className="font-mono text-[7px] tracking-[0.08em] opacity-70">
                      ROUTING ENGINE
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector */}

              <Connector />

              {/* Models */}

              <div className="grid grid-cols-3 gap-2">
                <ModelNode name="GPT" />
                <ModelNode name="Claude" />
                <ModelNode name="Gemini" />
              </div>
            </div>

            {/* Routing statement */}

            <div className="mt-10 text-center">
              <p className="text-sm text-[var(--color-foreground-secondary)]">
                One integration.
                <span className="mx-2 text-[var(--color-accent)]">
                  Multiple models.
                </span>
                Intelligent decisions.
              </p>
            </div>
          </div>
        </motion.div>

        {/* =====================================================
            ADVANTAGES
            ===================================================== */}

        <div className="mt-24 border-t border-[var(--color-border)]">
          {advantages.map((item, index) => {
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
                className="group grid gap-8 border-b border-[var(--color-border)] py-10 lg:grid-cols-[0.15fr_0.2fr_1fr_0.35fr] lg:items-center lg:gap-8"
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

                {/* Metric */}

                <div className="lg:text-right">
                  <div className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-foreground)]">
                    {item.metric}
                  </div>

                  <div className="mt-1 font-mono text-[7px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
                    {item.metricLabel.toUpperCase()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* =====================================================
            FINAL STATEMENT
            ===================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto mt-24 max-w-3xl text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-foreground)] text-white">
            <ArrowDownRight size={19} />
          </div>

          <h3 className="mt-7 text-3xl font-semibold tracking-[-0.045em] text-[var(--color-foreground)] sm:text-4xl">
            Build once.
            <br />

            <span className="text-[var(--color-accent)]">
              Route intelligently.
            </span>
          </h3>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[var(--color-foreground-secondary)]">
            Attentra abstracts away model selection so your team can focus
            on building AI products instead of constantly deciding which
            model should handle every request.
          </p>

          <a
            href="#product"
            className="group mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-medium text-[var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/30 hover:shadow-md"
          >
            Try the routing demo

            <ArrowRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   NODE
   ============================================================ */

function Node({
  icon,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex h-20 w-36 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--color-accent)] shadow-sm">
        {icon}
      </div>

      <div>
        <div className="text-xs font-semibold text-[var(--color-foreground)]">
          {label}
        </div>

        <div className="mt-0.5 font-mono text-[7px] tracking-[0.08em] text-[var(--color-foreground-muted)]">
          {sublabel}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MODEL NODE
   ============================================================ */

function ModelNode({
  name,
}: {
  name: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      className="flex h-20 min-w-[74px] flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 transition-shadow hover:shadow-md"
    >
      <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />

      <span className="mt-2 text-[9px] font-medium text-[var(--color-foreground)]">
        {name}
      </span>
    </motion.div>
  );
}

/* ============================================================
   CONNECTOR
   ============================================================ */

function Connector() {
  return (
    <div className="relative hidden h-px w-14 bg-[var(--color-border)] sm:block">
      <motion.div
        animate={{
          left: ["0%", "100%"],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
      />
    </div>
  );
}
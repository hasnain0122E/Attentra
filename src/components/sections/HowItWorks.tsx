"use client";

import { motion } from "motion/react";
import {
  ArrowsClockwise,
  ArrowRight,
  CheckCircle,
  CurrencyDollar,
  Funnel,
  Gauge,
  Lightning,
  ListMagnifyingGlass,
  PaperPlaneTilt,
  Scan,
  Sliders,
  Sparkle,
} from "@phosphor-icons/react";

const stages = [
  {
    number: "01",
    label: "SEND",
    title: "Send one request",
    description:
      'Point the official OpenAI SDK at Attentra and set model to "auto".',
    icon: PaperPlaneTilt,
  },
  {
    number: "02",
    label: "ANALYZE",
    title: "Read the task",
    description:
      "Attentra estimates what kind of work it is — writing, coding, reasoning — and how complex.",
    icon: Scan,
  },
  {
    number: "03",
    label: "SCORE",
    title: "Rank eligible models",
    description:
      "Active models that support the task and fit the context are ranked under your policy.",
    icon: Funnel,
  },
  {
    number: "04",
    label: "EXECUTE",
    title: "Get the answer",
    description:
      "The top-ranked model's provider generates the response.",
    icon: Lightning,
  },
  {
    number: "05",
    label: "RECOVER",
    title: "Fall back if needed",
    description:
      "If that attempt fails with a recoverable error, the next eligible model — preferably on another provider — is tried.",
    icon: ArrowsClockwise,
  },
  {
    number: "06",
    label: "INSPECT",
    title: "See why, and what it cost",
    description:
      "The decision, the model that actually answered, tokens and calculated cost are kept in History.",
    icon: ListMagnifyingGlass,
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="attentra-atmosphere attendra-atmosphere-medium relative overflow-hidden bg-white py-28 sm:py-36 lg:py-44"
    >
      {/* =====================================================
          BACKGROUND ATMOSPHERE
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-16rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-25 blur-[140px]" />

        <div className="absolute bottom-[-18rem] left-[-10rem] h-[32rem] w-[32rem] rounded-full bg-[var(--color-accent-soft)] opacity-10 blur-[140px]" />
      </div>

      <div className="attentra-container relative">
        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex items-center justify-center gap-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <ArrowsClockwise
                size={17}
                weight="duotone"
              />
            </span>

            <span className="attentra-label text-[var(--color-accent)]">
              How it works
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{
              duration: 0.7,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--color-foreground)] sm:text-5xl lg:text-6xl"
          >
            Follow one request
            <br />
            <span className="text-[var(--color-accent)]">
              through Attentra.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{
              duration: 0.6,
              delay: 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--color-foreground-secondary)] sm:text-lg"
          >
            Six steps happen inside a single API call. None of them need
            routing code in your application.
          </motion.p>
        </div>

        {/* =====================================================
            ROUTING PIPELINE
            ===================================================== */}

        <div className="relative mx-auto mt-24 max-w-6xl lg:mt-28">
          {/* STAGES */}

          <div className="grid gap-16 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-14 lg:grid-cols-3 lg:gap-x-12">
            {stages.map((stage, index) => {
              const Icon = stage.icon;

              return (
                <motion.div
                  key={stage.number}
                  initial={{
                    opacity: 0,
                    y: 24,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.3,
                  }}
                  transition={{
                    duration: 0.65,
                    delay: index * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative text-center"
                >
                  {/* NODE */}

                  <div className="relative z-10 mx-auto flex w-fit items-center justify-center">
                    <div
                      aria-hidden="true"
                      className="absolute h-16 w-16 rounded-full bg-[var(--color-accent-soft)] opacity-60 blur-xl"
                    />

                    <motion.div
                      whileHover={{
                        scale: 1.04,
                      }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[var(--color-accent)]/40 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        <Icon
                          size={21}
                          weight="duotone"
                        />
                      </div>
                    </motion.div>
                  </div>

                  {/* METADATA */}

                  <div className="mt-7 flex items-center justify-center gap-3">
                    <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-[var(--color-foreground-muted)]">
                      {stage.number}
                    </span>

                    <span className="h-px w-5 bg-[var(--color-border)]" />

                    <span className="text-[10px] font-semibold tracking-[0.15em] text-[var(--color-accent)]">
                      {stage.label}
                    </span>
                  </div>

                  {/* TITLE */}

                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.035em] text-[var(--color-foreground)] sm:text-2xl">
                    {stage.title}
                  </h3>

                  {/* DESCRIPTION */}

                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--color-foreground-secondary)]">
                    {stage.description}
                  </p>

                  {/* MOBILE CONNECTOR */}

                  {index < stages.length - 1 && (
                    <div className="absolute -bottom-12 left-1/2 flex h-8 -translate-x-1/2 flex-col items-center sm:hidden">
                      <div className="h-full w-px bg-[var(--color-border)]" />

                      <motion.div
                        initial={{
                          scaleY: 0,
                          opacity: 0,
                        }}
                        whileInView={{
                          scaleY: 1,
                          opacity: 1,
                        }}
                        viewport={{
                          once: true,
                        }}
                        transition={{
                          duration: 0.5,
                          delay: 0.4 + index * 0.15,
                        }}
                        className="absolute inset-y-0 w-px origin-top bg-[var(--color-accent)]"
                      />

                      <div className="absolute bottom-0 h-1.5 w-1.5 rotate-45 border-b border-r border-[var(--color-accent)]" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            DECISION MATRIX
            ===================================================== */}

        <motion.div
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
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mt-24 overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background)] lg:mt-28"
        >
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            {/* LEFT */}

            <div className="border-b border-[var(--color-border)] p-7 sm:p-10 lg:border-b-0 lg:border-r">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <ArrowsClockwise
                  size={20}
                  weight="duotone"
                />
              </div>

              <div className="mt-6 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-accent)]">
                What the router weighs (step 03)
              </div>

              <h3 className="mt-3 max-w-md text-2xl font-semibold leading-tight tracking-[-0.04em] text-[var(--color-foreground)] sm:text-3xl">
                Four inputs. One explainable choice.
              </h3>

              <p className="mt-4 max-w-md text-sm leading-6 text-[var(--color-foreground-secondary)]">
                No black box: the ranking and the reason come back with the
                response. Latency and capability are model-profile estimates,
                not live benchmarks.
              </p>
            </div>

            {/* RIGHT */}

            <div className="p-7 sm:p-10">
              <div className="grid gap-3 sm:grid-cols-2">
                <DecisionFactor
                  icon={<CurrencyDollar size={16} />}
                  label="Estimated cost"
                  description="Current provider pricing × the request's estimated tokens."
                />

                <DecisionFactor
                  icon={<Gauge size={16} />}
                  label="Latency estimate"
                  description="Expected speed of each model family."
                />

                <DecisionFactor
                  icon={<Sparkle size={16} />}
                  label="Capability"
                  description="Model tier and task support, weighted up for complex work."
                />

                <DecisionFactor
                  icon={<Sliders size={16} />}
                  label="Your policy"
                  description="balanced, cost_optimized, quality_first or speed_first shift the weights."
                />
              </div>

              {/* Result */}

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--color-success)]/20 bg-[var(--color-success-soft)] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-success)]">
                  <CheckCircle size={17} />
                </div>

                <div>
                  <div className="text-xs font-semibold text-[var(--color-foreground)]">
                    Explainable decision
                  </div>

                  <div className="mt-1 text-[11px] text-[var(--color-foreground-secondary)]">
                    The top-ranked eligible model is used, and the reason is
                    returned with the response.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* =====================================================
            BOTTOM MESSAGE
            ===================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.3,
          }}
          transition={{
            duration: 0.6,
          }}
          className="mt-16 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="max-w-2xl text-xl font-medium tracking-[-0.025em] text-[var(--color-foreground)] sm:text-2xl">
            Want to see a decision change?
            <span className="text-[var(--color-foreground-muted)]">
              {" "}
              Try different tasks in the simulation below.
            </span>
          </p>

          <a
            href="#product-demo"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]"
          >
            Open the simulation

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

/* ============================================================
   DECISION FACTOR
   ============================================================ */

function DecisionFactor({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          {icon}
        </span>

        <span className="text-sm font-semibold text-[var(--color-foreground)]">
          {label}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--color-foreground-secondary)]">
        {description}
      </p>
    </div>
  );
}
"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Gauge,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  ArrowsClockwise,
  Funnel,
  Scan,
} from "@phosphor-icons/react";

const stages = [
  {
    number: "01",
    label: "UNDERSTAND",
    title: "Read the request",
    description:
      "Attentra analyzes what your application is asking for before choosing a model.",
    icon: Scan,
  },
  {
    number: "02",
    label: "EVALUATE",
    title: "Score the options",
    description:
      "Every available model is evaluated against quality, latency, cost, and task requirements.",
    icon: Funnel,
  },
  {
    number: "03",
    label: "ROUTE",
    title: "Choose the best fit",
    description:
      "Attentra selects the model that delivers the best outcome for that specific request.",
    icon: ArrowsClockwise,
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
            One request.
            <br />
            <span className="text-[var(--color-accent)]">
              A better decision.
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
            Your application sends one request to Attentra. The routing
            layer handles the complexity of deciding what should happen next.
          </motion.p>
        </div>

        {/* =====================================================
            ROUTING PIPELINE
            ===================================================== */}

        <div className="relative mx-auto mt-24 max-w-6xl lg:mt-28">
          {/* DESKTOP CONNECTOR */}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-[34px] hidden lg:block"
          >
            <div className="relative h-px w-full bg-[var(--color-border)]">
              <motion.div
                initial={{
                  scaleX: 0,
                  opacity: 0,
                }}
                whileInView={{
                  scaleX: 1,
                  opacity: 1,
                }}
                viewport={{
                  once: true,
                  amount: 0.5,
                }}
                transition={{
                  duration: 1.4,
                  delay: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute inset-0 origin-left bg-[var(--color-accent)]"
              />

              <motion.div
                initial={{
                  left: "0%",
                  opacity: 0,
                }}
                whileInView={{
                  left: "100%",
                  opacity: [0, 1, 1, 0],
                }}
                viewport={{
                  once: true,
                  amount: 0.5,
                }}
                transition={{
                  duration: 1.7,
                  delay: 0.9,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] shadow-[0_0_14px_var(--color-accent)]"
              />
            </div>
          </div>

          {/* STAGES */}

          <div className="grid gap-16 lg:grid-cols-3 lg:gap-12">
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
                    <div className="absolute -bottom-12 left-1/2 flex h-8 -translate-x-1/2 flex-col items-center lg:hidden">
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
            SYSTEM STATUS
            ===================================================== */}

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
            duration: 0.6,
            delay: 0.3,
          }}
          className="mx-auto mt-16 flex max-w-md items-center justify-center gap-3"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]" />

          <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--color-foreground-muted)]">
            ROUTING DECISION ENGINE · ACTIVE
          </span>
        </motion.div>

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
                The decision layer
              </div>

              <h3 className="mt-3 max-w-md text-2xl font-semibold leading-tight tracking-[-0.04em] text-[var(--color-foreground)] sm:text-3xl">
                Every request gets its own routing decision.
              </h3>

              <p className="mt-4 max-w-md text-sm leading-6 text-[var(--color-foreground-secondary)]">
                Instead of hard-coding one model into your application,
                Attentra evaluates the request dynamically.
              </p>
            </div>

            {/* RIGHT */}

            <div className="p-7 sm:p-10">
              <div className="grid gap-3 sm:grid-cols-2">
                <DecisionFactor
                  icon={<Gauge size={16} />}
                  label="Latency"
                  description="Prefer faster models when speed matters."
                />

                <DecisionFactor
                  icon={<CircleDollarSign size={16} />}
                  label="Cost"
                  description="Avoid paying premium prices for simple work."
                />

                <DecisionFactor
                  icon={<Sparkles size={16} />}
                  label="Quality"
                  description="Use stronger models when complexity demands it."
                />

                <DecisionFactor
                  icon={<Zap size={16} />}
                  label="Task fit"
                  description="Match the model to what the request actually needs."
                />
              </div>

              {/* Result */}

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--color-success)]/20 bg-[var(--color-success-soft)] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-success)]">
                  <Check size={17} />
                </div>

                <div>
                  <div className="text-xs font-semibold text-[var(--color-foreground)]">
                    Optimized decision
                  </div>

                  <div className="mt-1 text-[11px] text-[var(--color-foreground-secondary)]">
                    The best available model is selected automatically.
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
            Your application stays simple.
            <span className="text-[var(--color-foreground-muted)]">
              {" "}
              Attentra handles the complexity behind it.
            </span>
          </p>

          <a
            href="#architecture"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]"
          >
            Explore the architecture

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
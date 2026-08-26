"use client";

import { useState, type ElementType } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Chat,
  Code,
  Headphones,
  ChartBar,
  Pen,
  Robot,
  ShieldCheck,
  Sparkle,
  Stack,
  Lightning,
} from "@phosphor-icons/react";

type RouteOption = {
  label: string;
  model: string;
  reason: string;
};

type UseCase = {
  id: string;
  label: string;
  shortLabel: string;
  icon: ElementType;
  title: string;
  description: string;
  example: string;
  route: RouteOption[];
  metrics: {
    cost: string;
    latency: string;
    quality: string;
  };
};

const useCases: UseCase[] = [
  {
    id: "support",
    label: "Customer support",
    shortLabel: "Support",
    icon: Headphones,
    title:
      "Handle more conversations without sending everything to your most expensive model.",
    description:
      "Route straightforward support requests to efficient models while reserving more capable models for conversations that require deeper reasoning or context.",
    example:
      "A customer is asking why their order has not arrived yet and wants an estimated delivery date.",
    route: [
      {
        label: "Simple request",
        model: "Gemini Flash",
        reason: "Fast + low cost",
      },
      {
        label: "Complex escalation",
        model: "Claude Sonnet",
        reason: "Deeper reasoning",
      },
    ],
    metrics: {
      cost: "−68%",
      latency: "210ms",
      quality: "96",
    },
  },

  {
    id: "coding",
    label: "Coding & development",
    shortLabel: "Coding",
    icon: Code,
    title:
      "Give engineering workloads the model capability they actually need.",
    description:
      "Not every developer request requires the same level of reasoning. Route simple transformations efficiently while sending complex debugging and architecture tasks to stronger models.",
    example:
      "Review this authentication middleware and identify potential security and performance issues.",
    route: [
      {
        label: "Simple code task",
        model: "Gemini Flash",
        reason: "Efficient execution",
      },
      {
        label: "Complex reasoning",
        model: "GPT-4.1",
        reason: "Higher capability",
      },
    ],
    metrics: {
      cost: "−42%",
      latency: "480ms",
      quality: "94",
    },
  },

  {
    id: "content",
    label: "Content & generation",
    shortLabel: "Content",
    icon: Pen,
    title:
      "Balance creative quality with the economics of high-volume generation.",
    description:
      "Use efficient models for repetitive content while routing nuanced creative work to models with stronger generation and instruction-following capabilities.",
    example:
      "Create three distinct campaign concepts for a premium technology product targeting developers.",
    route: [
      {
        label: "High-volume generation",
        model: "Gemini Flash",
        reason: "Efficient generation",
      },
      {
        label: "Creative direction",
        model: "Claude Sonnet",
        reason: "Strong instruction following",
      },
    ],
    metrics: {
      cost: "−54%",
      latency: "310ms",
      quality: "95",
    },
  },

  {
    id: "analysis",
    label: "Analysis & reasoning",
    shortLabel: "Analysis",
    icon: ChartBar,
    title:
      "Reserve expensive reasoning for the requests that actually require it.",
    description:
      "Attentra can distinguish lightweight analysis from complex reasoning workloads and route accordingly.",
    example:
      "Analyze this quarterly report, identify the three largest risks, and explain what could cause each one.",
    route: [
      {
        label: "Light analysis",
        model: "Gemini Flash",
        reason: "Fast evaluation",
      },
      {
        label: "Deep reasoning",
        model: "GPT-4.1",
        reason: "Advanced reasoning",
      },
    ],
    metrics: {
      cost: "−37%",
      latency: "620ms",
      quality: "91",
    },
  },
];

export default function UseCases() {
  const [activeId, setActiveId] = useState("support");

  const activeCase =
    useCases.find((item) => item.id === activeId) ?? useCases[0];

  const ActiveIcon = activeCase.icon;

  return (
    <section
      id="use-cases"
      className="attentra-atmosphere attendra-atmosphere-medium relative isolate overflow-hidden bg-white py-24 sm:py-32 lg:py-40"
    >
      {/* =========================================================
          BACKGROUND
          ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-15 blur-[140px]" />

        <div className="absolute bottom-[-15rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[var(--color-accent-soft)] opacity-[0.08] blur-[120px]" />
      </div>

      <div className="attentra-container relative z-10 min-w-0">
        {/* =========================================================
            HEADER
            ========================================================= */}

        <div className="grid min-w-0 gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="min-w-0"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Stack size={14} />
              </span>

              <span className="attentra-label text-[var(--color-accent)]">
                Use cases
              </span>
            </div>

            <p className="mt-6 max-w-sm text-sm leading-6 text-[var(--color-foreground-secondary)]">
              Different workloads have different requirements.
              Attentra adapts model selection to the work.
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
            className="min-w-0 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--color-foreground)] sm:text-5xl lg:text-6xl"
          >
            Built for workloads that
            <br className="hidden sm:block" />

            <span className="text-[var(--color-accent)]">
              don&apos;t need the same model.
            </span>
          </motion.h2>
        </div>

        {/* =========================================================
            USE CASE NAVIGATION
            ========================================================= */}

        <div className="relative z-50 mt-14 w-full">
          <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-2 sm:grid-cols-4">
            {useCases.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeId;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`Show ${item.label}`}
                  onClick={() => setActiveId(item.id)}
                  className={[
                    "relative",
                    "flex min-h-[52px] w-full",
                    "items-center justify-center gap-2",
                    "rounded-xl px-2 py-3",
                    "text-xs font-medium",
                    "cursor-pointer",
                    "select-none",
                    "transition-all duration-200",
                    "focus:outline-none",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--color-accent)]",
                    "focus-visible:ring-offset-2",
                    "sm:px-3",
                    isActive
                      ? "bg-white text-[var(--color-foreground)] shadow-[0_4px_20px_rgba(0,0,0,0.07)]"
                      : "text-[var(--color-foreground-muted)] hover:bg-white/70 hover:text-[var(--color-foreground-secondary)]",
                  ].join(" ")}
                >
                  <Icon
                    size={14}
                    strokeWidth={1.8}
                    className={
                      isActive
                        ? "shrink-0 text-[var(--color-accent)]"
                        : "shrink-0 text-current"
                    }
                  />

                  <span className="truncate">
                    <span className="sm:hidden">
                      {item.shortLabel}
                    </span>

                    <span className="hidden sm:inline">
                      {item.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            ACTIVE USE CASE
            ========================================================= */}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCase.id}
            initial={{
              opacity: 0,
              y: 14,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -8,
            }}
            transition={{
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative z-10 mt-8 min-w-0"
          >
            <div className="grid min-w-0 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* =====================================================
                  LEFT
                  ===================================================== */}

              <div className="min-w-0 rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-background)] p-6 sm:p-8 lg:p-10">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <ActiveIcon size={17} />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[var(--color-foreground)]">
                      {activeCase.label}
                    </div>

                    <div className="mt-1 font-mono text-[7px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
                      ATTENTRA WORKLOAD
                    </div>
                  </div>
                </div>

                <h3 className="mt-8 max-w-xl text-2xl font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--color-foreground)] sm:text-3xl lg:text-4xl">
                  {activeCase.title}
                </h3>

                <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--color-foreground-secondary)]">
                  {activeCase.description}
                </p>

                {/* Example */}

                <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Chat
                      size={13}
                      className="shrink-0 text-[var(--color-accent)]"
                    />

                    <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--color-foreground-muted)]">
                      EXAMPLE REQUEST
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[var(--color-foreground)]">
                    &quot;{activeCase.example}&quot;
                  </p>
                </div>
              </div>

              {/* =====================================================
                  RIGHT
                  ===================================================== */}

              <div className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-background)] p-5 sm:p-7 lg:p-8">
                <div className="relative z-10 min-w-0">
                  <div className="flex min-w-0 items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-mono text-[8px] tracking-[0.13em] text-[var(--color-foreground-muted)]">
                        ROUTING EXAMPLE
                      </span>

                      <div className="mt-2 truncate text-sm font-semibold text-[var(--color-foreground)]">
                        One workload. Different model paths.
                      </div>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--color-accent)] shadow-sm">
                      <Robot size={15} />
                    </div>
                  </div>

                  {/* Route options */}

                  <div className="mt-8 space-y-3">
                    {activeCase.route.map((route, index) => (
                      <div
                        key={`${activeCase.id}-${route.label}`}
                        className="relative"
                      >
                        {index > 0 && (
                          <div className="absolute left-5 top-[-12px] h-3 w-px bg-[var(--color-border)]" />
                        )}

                        <motion.div
                          initial={{
                            opacity: 0,
                            x: 10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay: index * 0.08,
                          }}
                          className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            {index === 0 ? (
                              <Lightning size={16} />
                            ) : (
                              <Sparkle size={16} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
                              {route.label.toUpperCase()}
                            </div>

                            <div className="mt-1 truncate text-sm font-semibold text-[var(--color-foreground)]">
                              {route.model}
                            </div>

                            <div className="mt-1 truncate text-[10px] text-[var(--color-foreground-secondary)]">
                              {route.reason}
                            </div>
                          </div>

                          <ArrowRight
                            size={15}
                            className="shrink-0 text-[var(--color-foreground-muted)]"
                          />
                        </motion.div>
                      </div>
                    ))}
                  </div>

                  {/* Metrics */}

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <Metric
                      value={activeCase.metrics.cost}
                      label="EST. COST"
                    />

                    <Metric
                      value={activeCase.metrics.latency}
                      label="LATENCY"
                    />

                    <Metric
                      value={activeCase.metrics.quality}
                      label="QUALITY"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* =========================================================
            TRUST STRIP
            ========================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 16,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.6,
          }}
          className="mt-6 flex min-w-0 flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-accent)] shadow-sm">
              <ShieldCheck size={16} />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-foreground)]">
                One routing layer
              </div>

              <div className="mt-0.5 text-[10px] leading-5 text-[var(--color-foreground-muted)]">
                Your application does not need to manage every
                provider independently.
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 font-mono text-[8px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            MULTI-MODEL READY
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ===============================================================
   METRIC
   =============================================================== */

function Metric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-white px-2 py-3 text-center">
      <div className="truncate text-sm font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
        {value}
      </div>

      <div className="mt-1 truncate font-mono text-[7px] tracking-[0.08em] text-[var(--color-foreground-muted)]">
        {label}
      </div>
    </div>
  );
}
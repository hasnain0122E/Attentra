"use client";

import { motion } from "motion/react";
import {
  ArrowDown,
  Check,
  CircleDollarSign,
  Gauge,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const models = [
  {
    name: "GPT-4.1",
    provider: "OpenAI",
    score: 88,
    color: "#191715",
    cost: "$0.012",
    latency: "620ms",
  },
  {
    name: "Claude Sonnet",
    provider: "Anthropic",
    score: 73,
    color: "bg-[var(--color-accent)]",
    cost: "$0.008",
    latency: "480ms",
  },
  {
    name: "Gemini Flash",
    provider: "Google",
    score: 68,
    color: "#8C8278",
    cost: "$0.003",
    latency: "210ms",
  },
];

const requestTypes = [
  "Summarize this customer ticket",
  "Extract the key points from this document",
  "Classify this support request",
];

export default function RoutingEngine() {
  const [activeModel, setActiveModel] = useState(2);
  const [requestIndex, setRequestIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsAnalyzing(true);

      window.setTimeout(() => {
        setActiveModel((current) => (current + 1) % models.length);
        setRequestIndex((current) => (current + 1) % requestTypes.length);
      }, 900);

      window.setTimeout(() => {
        setIsAnalyzing(false);
      }, 1700);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  const selectedModel = models[activeModel];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)]">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
          </span>

          <span className="text-xs font-semibold tracking-[0.08em] text-[var(--color-foreground-secondary)]">
            ATTENTRA DECISION ENGINE
          </span>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="h-1 w-1 rounded-full bg-[var(--color-border-strong)]" />

          <span className="text-xs text-[var(--color-foreground-muted)]">
            LIVE
          </span>
        </div>
      </div>

      {/* =====================================================
          MAIN ENGINE
          ===================================================== */}

      <div className="relative px-5 py-8 sm:px-10 sm:py-12">
        {/* Subtle background grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(17,19,18,0.035) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(17,19,18,0.035) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-5xl">
          {/* =================================================
              INCOMING REQUEST
              ================================================= */}

          <div className="flex flex-col items-center">
            <motion.div
              animate={{
                y: isAnalyzing ? -3 : 0,
              }}
              className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
                  Incoming request
                </span>

                <span className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-success)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                  RECEIVED
                </span>
              </div>

              <div className="mt-4 text-sm font-medium leading-6 text-[var(--color-foreground)] sm:text-base">
                "{requestTypes[requestIndex]}"
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-[var(--color-foreground-secondary)] shadow-[var(--shadow-sm)]">
                  Text
                </span>

                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-[var(--color-foreground-secondary)] shadow-[var(--shadow-sm)]">
                  Production
                </span>

                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-[var(--color-foreground-secondary)] shadow-[var(--shadow-sm)]">
                  Low complexity
                </span>
              </div>
            </motion.div>

            {/* Connector */}
            <div className="relative h-12 w-px bg-[var(--color-border)]">
              <motion.div
                animate={{
                  y: isAnalyzing ? [0, 48] : 0,
                  opacity: isAnalyzing ? [0, 1, 0] : 0.5,
                }}
                transition={{
                  duration: 0.9,
                  ease: "easeInOut",
                }}
                className="absolute left-1/2 top-0 h-5 w-1 -translate-x-1/2 rounded-full bg-[var(--color-accent)]"
              />
            </div>

            {/* =================================================
                ATTENTRA DECISION ENGINE
                ================================================= */}

            <motion.div
              animate={{
                scale: isAnalyzing ? 1.025 : 1,
              }}
              transition={{
                duration: 0.35,
              }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-5 sm:p-6"
            >
              {/* Active analysis indicator */}
              <div className="absolute right-5 top-5">
                <motion.div
                  animate={{
                    opacity: isAnalyzing ? [0.4, 1, 0.4] : 0.6,
                  }}
                  transition={{
                    duration: 1,
                    repeat: isAnalyzing ? Infinity : 0,
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--color-accent)] shadow-[var(--shadow-sm)]"
                >
                  <Sparkles size={17} />
                </motion.div>
              </div>

              <div className="max-w-[80%]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                  Decision layer
                </div>

                <div className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
                  Attentra is evaluating the request
                </div>
              </div>

              {/* Decision metrics */}
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DecisionMetric
                  label="Complexity"
                  value="34"
                  icon={<Sparkles size={13} />}
                />

                <DecisionMetric
                  label="Quality"
                  value="88+"
                  icon={<Check size={13} />}
                />

                <DecisionMetric
                  label="Latency"
                  value="Low"
                  icon={<Gauge size={13} />}
                />

                <DecisionMetric
                  label="Cost"
                  value="Min"
                  icon={<CircleDollarSign size={13} />}
                />
              </div>

              {/* Analysis line */}
              <div className="mt-5 overflow-hidden rounded-full bg-white/70">
                <motion.div
                  animate={{
                    width: isAnalyzing ? ["0%", "100%"] : "72%",
                  }}
                  transition={{
                    duration: isAnalyzing ? 1 : 0.5,
                    ease: "easeInOut",
                  }}
                  className="h-1 rounded-full bg-[var(--color-accent)]"
                />
              </div>

              <div className="mt-2 flex justify-between text-[10px] text-[var(--color-foreground-muted)]">
                <span>
                  {isAnalyzing
                    ? "Analyzing candidates..."
                    : "Analysis complete"}
                </span>

                <span>{isAnalyzing ? "..." : "4 signals evaluated"}</span>
              </div>
            </motion.div>

            {/* =================================================
                MODEL CONNECTOR
                ================================================= */}

            <div className="relative h-16 w-full max-w-4xl">
              <div className="absolute left-1/2 top-0 h-8 w-px bg-[var(--color-border)]" />

              <div className="absolute left-1/2 top-8 hidden h-px w-[68%] -translate-x-1/2 bg-[var(--color-border)] sm:block" />

              <div className="absolute left-[16%] top-8 hidden h-8 w-px bg-[var(--color-border)] sm:block" />

              <div className="absolute left-1/2 top-8 hidden h-8 w-px -translate-x-1/2 bg-[var(--color-border)] sm:block" />

              <div className="absolute right-[16%] top-8 hidden h-8 w-px bg-[var(--color-border)] sm:block" />

              <motion.div
                animate={{
                  opacity: isAnalyzing ? [0, 1, 0] : 0.35,
                }}
                transition={{
                  duration: 1.2,
                  repeat: isAnalyzing ? Infinity : 0,
                }}
                className="absolute left-1/2 top-0 h-6 w-1 -translate-x-1/2 rounded-full bg-[var(--color-accent)]"
              />
            </div>

            {/* =================================================
                MODEL CANDIDATES
                ================================================= */}

            <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-3">
              {models.map((model, index) => {
                const selected = index === activeModel;

                return (
                  <motion.div
                    key={model.name}
                    animate={{
                      y: selected ? -5 : 0,
                      scale: selected ? 1.025 : 1,
                    }}
                    transition={{
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={[
                      "relative rounded-2xl border p-4 transition-colors duration-500",
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-border)] bg-white",
                    ].join(" ")}
                  >
                    {selected && (
                      <motion.div
                        layoutId="selected-model"
                        className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--color-accent)] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white"
                      >
                        <Check size={10} />
                        Best fit
                      </motion.div>
                    )}

                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-foreground)]">
                          {model.name}
                        </div>

                        <div className="mt-1 text-[11px] text-[var(--color-foreground-muted)]">
                          {model.provider}
                        </div>
                      </div>

                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            index === 2
                              ? "var(--color-accent)"
                              : index === 1
                                ? "var(--color-foreground-secondary)"
                                : "var(--color-foreground)",
                        }}
                      />
                    </div>

                    {/* Score */}
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                          Fit score
                        </div>

                        <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
                          {model.score}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                          Cost
                        </div>

                        <div className="mt-1 text-xs font-semibold text-[var(--color-foreground)]">
                          {model.cost}
                        </div>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-background)]">
                      <motion.div
                        animate={{
                          width: `${model.score}%`,
                        }}
                        transition={{
                          duration: 0.8,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={
                          selected
                            ? "h-full rounded-full bg-[var(--color-accent)]"
                            : "h-full rounded-full bg-[var(--color-border-strong)]"
                        }
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--color-foreground-muted)]">
                      <span>{model.latency}</span>

                      <span>{selected ? "Selected" : "Candidate"}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* =================================================
                RESULT CONNECTOR
                ================================================= */}

            <div className="relative h-14 w-px bg-[var(--color-border)]">
              <motion.div
                animate={{
                  y: [0, 42],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 2.8,
                  ease: "easeInOut",
                }}
                className="absolute left-1/2 top-0 h-5 w-1 -translate-x-1/2 rounded-full bg-[var(--color-success)]"
              />
            </div>

            {/* =================================================
                ROUTING RESULT
                ================================================= */}

            <motion.div
              layout
              className="relative flex w-full max-w-lg items-center gap-4 rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-4 sm:p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-success)] shadow-[var(--shadow-sm)]">
                <Zap size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-success)]">
                    Routed
                  </span>

                  <span className="h-1 w-1 rounded-full bg-[var(--color-success)]" />

                  <span className="text-[9px] text-[var(--color-foreground-muted)]">
                    Optimal match
                  </span>
                </div>

                <div className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                  {selectedModel.name}
                </div>

                <div className="mt-1 text-[11px] text-[var(--color-foreground-secondary)]">
                  {selectedModel.latency} · {selectedModel.cost} estimated cost
                </div>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <div className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                  Efficiency
                </div>

                <div className="mt-1 text-sm font-semibold text-[var(--color-success)]">
                  +73%
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* =====================================================
          FOOTER STATUS
          ===================================================== */}

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Routing across
          </span>

          <span className="text-xs font-semibold text-[var(--color-foreground)]">
            3 models
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-[var(--color-foreground-muted)]">
          <span className="flex items-center gap-1.5">
            <Gauge size={12} />
            Latency aware
          </span>

          <span className="flex items-center gap-1.5">
            <CircleDollarSign size={12} />
            Cost aware
          </span>

          <span className="flex items-center gap-1.5">
            <Sparkles size={12} />
            Quality aware
          </span>
        </div>
      </div>
    </div>
  );
}

function DecisionMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/80 p-3">
      <div className="flex items-center gap-1.5 text-[var(--color-accent)]">
        {icon}

        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
          {label}
        </span>
      </div>

      <div className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
        {value}
      </div>
    </div>
  );
}

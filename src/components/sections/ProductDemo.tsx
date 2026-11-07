"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CaretDown,
  CheckCircle,
  ChartBar,
  CurrencyDollar,
  Gauge,
  Play,
  Sparkle,
  TerminalWindow,
  Lightning,
} from "@phosphor-icons/react";

// Illustrative figures for the in-browser simulation only — not live
// prices or measurements.
const models = [
  {
    name: "GPT-4.1",
    provider: "OpenAI",
    latency: "~620ms",
    cost: "$0.012",
    profile: "Strong reasoning",
  },
  {
    name: "Claude Sonnet",
    provider: "Anthropic",
    latency: "~480ms",
    cost: "$0.008",
    profile: "Balanced",
  },
  {
    name: "Gemini Flash",
    provider: "Google",
    latency: "~210ms",
    cost: "$0.003",
    profile: "Fast · low cost",
  },
];

const tasks = [
  "General",
  "Summarization",
  "Coding",
  "Reasoning",
  "Classification",
  "Creative writing",
];

const priorities = [
  "Balanced",
  "Lowest cost",
  "Lowest latency",
  "Highest quality",
];

export default function ProductDemo() {
  const [prompt, setPrompt] = useState(
    "Summarize this customer conversation and identify the three most important action items."
  );

  const [task, setTask] = useState("Summarization");
  const [priority, setPriority] = useState("Balanced");

  const [selectedModel, setSelectedModel] = useState(2);
  const [reason, setReason] = useState(
    "Summarization at this size is simple work, so the lowest estimated cost wins."
  );
  const [isRouting, setIsRouting] = useState(false);
  const [hasRouted, setHasRouted] = useState(true);
  const [routingStep, setRoutingStep] = useState(0);

  const currentModel = models[selectedModel];
  const fallbackModel = models[selectedModel === 2 ? 0 : 2];

  const promptTokens = useMemo(() => {
    if (!prompt.trim()) return 0;

    return Math.max(1, Math.ceil(prompt.trim().split(/\s+/).length * 1.3));
  }, [prompt]);

  function determineModel(): { index: number; reason: string } {
    const lowerPrompt = prompt.toLowerCase();

    /*
     * This is intentionally NOT the real routing algorithm.
     * It is deterministic demo behavior that mirrors the idea:
     * priority and task shift which model ranks first.
     */

    if (priority === "Lowest latency") {
      return { index: 2, reason: "Speed priority: the fastest capable model ranks first." };
    }

    if (priority === "Lowest cost") {
      return { index: 2, reason: "Cost priority: the lowest estimated cost ranks first." };
    }

    const looksLikeCode =
      task === "Coding" ||
      lowerPrompt.includes("code") ||
      lowerPrompt.includes("debug") ||
      lowerPrompt.includes("program");

    const looksComplex =
      task === "Reasoning" ||
      lowerPrompt.includes("reason") ||
      lowerPrompt.includes("complex") ||
      lowerPrompt.includes("analyze");

    if (priority === "Highest quality") {
      return looksLikeCode || looksComplex
        ? { index: 0, reason: "Quality priority on a hard task: the strongest reasoning model ranks first." }
        : { index: 1, reason: "Quality priority on a moderate task: a balanced model is strong enough." };
    }

    if (looksLikeCode) {
      return { index: 0, reason: "Coding task: capability outweighs the higher estimated cost." };
    }

    if (looksComplex) {
      return { index: 1, reason: "Multi-step reasoning: a balanced model is worth the extra cost." };
    }

    if (task === "Creative writing") {
      return { index: 1, reason: "Writing quality matters here, so a balanced model ranks first." };
    }

    return {
      index: 2,
      reason: `${task} at this size is simple work, so the lowest estimated cost wins.`,
    };
  }

  function handleRouting() {
    if (isRouting) return;

    const next = determineModel();

    setIsRouting(true);
    setHasRouted(false);
    setRoutingStep(1);

    window.setTimeout(() => {
      setRoutingStep(2);
    }, 500);

    window.setTimeout(() => {
      setRoutingStep(3);
    }, 1000);

    window.setTimeout(() => {
      setSelectedModel(next.index);
      setReason(next.reason);
      setHasRouted(true);
      setIsRouting(false);
      setRoutingStep(0);
    }, 1550);
  }

  return (
    <section
      id="product-demo"
      className="attentra-atmosphere attendra-atmosphere-strong relative overflow-hidden bg-white py-28 sm:py-36 lg:py-44"
    >
      {/* =====================================================
          ATMOSPHERE
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-[-15rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-20 blur-[140px]" />

        <div className="absolute bottom-[-15rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[var(--color-accent-soft)] opacity-10 blur-[130px]" />
      </div>

      <div className="attentra-container relative">
        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-2"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <TerminalWindow size={14} />
            </span>

            <span className="attentra-label text-[var(--color-accent)]">
              Interactive simulation
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
            className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--color-foreground)] sm:text-5xl lg:text-6xl"
          >
            Give it a task.
            <br />

            <span className="text-[var(--color-accent)]">
              See how it routes.
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
            className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--color-foreground-secondary)] sm:text-lg"
          >
            Change the task or the priority and watch a different model come
            out on top — with the reason spelled out. This version runs in
            your browser; the Playground runs the real router.
          </motion.p>
        </div>

        {/* =====================================================
            PLAYGROUND
            ===================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 35,
            scale: 0.98,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          viewport={{
            once: true,
            amount: 0.15,
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto mt-20 max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[0_30px_100px_rgba(0,0,0,0.08)]"
        >
          {/* =================================================
              TOP BAR
              ================================================= */}

          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-white px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-foreground)] text-white">
                <Sparkle size={14} />
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--color-foreground)]">
                  Attentra
                </div>

                <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
                  ROUTING PLAYGROUND
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success-soft)] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_7px_var(--color-success)]" />

              <span className="font-mono text-[9px] text-[var(--color-success)]">
                SIMULATION
              </span>
            </div>
          </div>

          {/* =================================================
              MAIN PLAYGROUND
              ================================================= */}

          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            {/* =================================================
                LEFT — INPUT
                ================================================= */}

            <div className="border-b border-[var(--color-border)] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.13em] text-[var(--color-foreground-muted)]">
                    01 / REQUEST
                  </div>

                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[var(--color-foreground)]">
                    What do you want to do?
                  </h3>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-accent)]">
                  <Play size={14} />
                </div>
              </div>

              {/* Prompt */}

              <div className="mt-7 rounded-2xl border border-[var(--color-border)] bg-white p-4 transition-colors focus-within:border-[var(--color-accent)]/40">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--color-foreground-muted)]">
                    PROMPT
                  </span>

                  <span className="text-[9px] text-[var(--color-foreground-muted)]">
                    {promptTokens} tokens
                  </span>
                </div>

                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe what you want the AI to do..."
                  rows={5}
                  className="w-full resize-none bg-transparent text-sm leading-6 text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-foreground-muted)]"
                />
              </div>

              {/* Options */}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Task"
                  value={task}
                  options={tasks}
                  onChange={setTask}
                  disabled={isRouting}
                />

                <SelectField
                  label="Priority"
                  value={priority}
                  options={priorities}
                  onChange={setPriority}
                  disabled={isRouting}
                />
              </div>

              {/* Routing button */}

              <button
                type="button"
                onClick={handleRouting}
                disabled={isRouting || !prompt.trim()}
                className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] px-5 py-3.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {isRouting ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    />

                    Routing request...
                  </>
                ) : (
                  <>
                    Check routing

                    <ArrowRight
                      size={15}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span
                  className={`h-1 w-1 rounded-full ${
                    isRouting
                      ? "animate-pulse bg-[var(--color-accent)]"
                      : "bg-[var(--color-success)]"
                  }`}
                />

                <span className="font-mono text-[8px] tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  {isRouting
                    ? "ANALYZING REQUEST"
                    : "READY TO ROUTE"}
                </span>
              </div>
            </div>

            {/* =================================================
                RIGHT — ROUTING RESULT
                ================================================= */}

            <div className="relative min-h-[560px] p-6 sm:p-8 lg:p-10">
              {/* Routing animation overlay */}

              <AnimatePresence>
                {isRouting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm"
                  >
                    <div className="w-full max-w-sm px-8 text-center">
                      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                        <motion.div
                          animate={{
                            scale: [1, 1.25, 1],
                            opacity: [0.35, 0.1, 0.35],
                          }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                          }}
                          className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
                        />

                        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-[0_0_30px_rgba(49,92,255,0.25)]">
                          <Sparkle size={19} />
                        </div>
                      </div>

                      <div className="mt-6">
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={routingStep}
                            initial={{
                              opacity: 0,
                              y: 8,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            exit={{
                              opacity: 0,
                              y: -8,
                            }}
                            className="text-sm font-semibold text-[var(--color-foreground)]"
                          >
                            {routingStep === 1 &&
                              "Understanding the request"}

                            {routingStep === 2 &&
                              "Evaluating available models"}

                            {routingStep === 3 &&
                              "Ranking the candidates"}
                          </motion.p>
                        </AnimatePresence>

                        <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{
                              width:
                                routingStep === 1
                                  ? "35%"
                                  : routingStep === 2
                                  ? "68%"
                                  : "94%",
                            }}
                            transition={{
                              duration: 0.4,
                            }}
                            className="h-full rounded-full bg-[var(--color-accent)]"
                          />
                        </div>

                        <p className="mt-3 font-mono text-[8px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
                          ATTENTRA ROUTING ENGINE
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result header */}

              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.13em] text-[var(--color-foreground-muted)]">
                    02 / DECISION
                  </div>

                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[var(--color-foreground)]">
                    Selected for this request
                  </h3>
                </div>

                <AnimatePresence mode="wait">
                  <motion.span
                    key={hasRouted ? "simulated" : "waiting"}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-full bg-[var(--color-success-soft)] px-3 py-1.5 text-[9px] font-medium text-[var(--color-success)]"
                  >
                    {hasRouted ? "SIMULATED" : "WAITING"}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Selected model */}

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentModel.name}
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.4,
                  }}
                  className="mt-7 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-1"
                >
                  <div className="rounded-[0.9rem] bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        >
                          <Sparkle size={17} />
                        </motion.div>

                        <div>
                          <div className="text-sm font-semibold text-[var(--color-foreground)]">
                            {currentModel.name}
                          </div>

                          <div className="mt-0.5 text-[10px] text-[var(--color-foreground-muted)]">
                            {currentModel.provider} · selected
                          </div>
                        </div>
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
                        <CheckCircle size={15} />
                      </div>
                    </div>

                    <p className="mt-4 text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
                      <span className="font-semibold text-[var(--color-foreground)]">
                        Why:{" "}
                      </span>
                      {reason}
                    </p>

                    <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
                      <ResultMetric
                        icon={<Sparkle size={12} />}
                        label="PROFILE"
                        value={currentModel.profile}
                      />

                      <ResultMetric
                        icon={<Gauge size={12} />}
                        label="EST. LATENCY"
                        value={currentModel.latency}
                      />

                      <ResultMetric
                        icon={<CurrencyDollar size={12} />}
                        label="EST. COST"
                        value={currentModel.cost}
                      />
                    </div>

                    <p className="mt-3 text-[11px] leading-5 text-[var(--color-foreground-muted)]">
                      If {currentModel.provider} fails, the request moves to
                      the next eligible model on another provider — here,{" "}
                      {fallbackModel.name}.
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Model comparison */}

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--color-foreground-muted)]">
                    MODEL COMPARISON
                  </span>

                  <span className="text-[9px] text-[var(--color-foreground-muted)]">
                    {models.length} candidates
                  </span>
                </div>

                <div className="space-y-2">
                  {models.map((model) => (
                    <ModelRow
                      key={model.name}
                      model={model}
                      selected={model.name === currentModel.name}
                      isRouting={isRouting}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              STATUS BAR
              ================================================= */}

          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-2">
              <Lightning
                size={12}
                className="text-[var(--color-accent)]"
              />

              <span className="font-mono text-[8px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
                {isRouting
                  ? "SIMULATING DECISION..."
                  : "SIMULATED DECISION · ILLUSTRATIVE FIGURES"}
              </span>
            </div>

            <span className="font-mono text-[8px] text-[var(--color-foreground-muted)]">
              SIMULATION MODE · NO API REQUIRED
            </span>
          </div>
        </motion.div>

        {/* =====================================================
            EXPLANATION
            ===================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 18,
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
          className="mx-auto mt-12 max-w-2xl text-center"
        >
          <p className="text-sm leading-6 text-[var(--color-foreground-secondary)]">
            This demo runs in your browser with fixed, illustrative numbers —
            no AI provider is called. The production router ranks currently
            priced models from OpenAI, Anthropic and Google and returns its
            reason with every response. Sign in to try it in the Playground.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   SELECT FIELD
   ============================================================ */

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label
      className={`relative block rounded-xl border border-[var(--color-border)] bg-white p-3 transition-colors ${
        disabled ? "opacity-60" : "focus-within:border-[var(--color-accent)]/40"
      }`}
    >
      <span className="font-mono text-[8px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
        {label.toUpperCase()}
      </span>

      <div className="relative mt-2">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-transparent pr-5 text-xs font-medium text-[var(--color-foreground)] outline-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <CaretDown
          size={12}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]"
        />
      </div>
    </label>
  );
}

/* ============================================================
   RESULT METRIC
   ============================================================ */

function ResultMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3 text-center">
      <div className="flex items-center gap-1 text-[var(--color-accent)]">
        {icon}

        <span className="font-mono text-[7px] tracking-[0.08em]">
          {label}
        </span>
      </div>

      <span className="mt-1 text-[10px] font-semibold text-[var(--color-foreground)]">
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   MODEL ROW
   ============================================================ */

function ModelRow({
  model,
  selected,
  isRouting,
}: {
  model: {
    name: string;
    provider: string;
    latency: string;
    cost: string;
    profile: string;
  };
  selected: boolean;
  isRouting: boolean;
}) {
  return (
    <motion.div
      layout
      className={`relative flex items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-300 ${
        selected
          ? "border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]/50"
          : "border-[var(--color-border)] bg-white"
      } ${isRouting ? "opacity-60" : "opacity-100"}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <motion.span
          animate={
            selected && !isRouting
              ? {
                  scale: [1, 1.25, 1],
                }
              : {
                  scale: 1,
                }
          }
          transition={{
            duration: 0.5,
          }}
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            selected
              ? "bg-[var(--color-accent)] shadow-[0_0_7px_var(--color-accent)]"
              : "bg-[var(--color-foreground-muted)]"
          }`}
        />

        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-[var(--color-foreground)]">
            {model.name}
          </div>

          <div className="mt-0.5 text-[9px] text-[var(--color-foreground-muted)]">
            {model.provider}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 text-right">
        <div className="hidden sm:block">
          <div className="font-mono text-[8px] text-[var(--color-foreground-muted)]">
            PROFILE
          </div>

          <div className="mt-0.5 text-[10px] font-medium text-[var(--color-foreground)]">
            {model.profile}
          </div>
        </div>

        <div>
          <div className="font-mono text-[8px] text-[var(--color-foreground-muted)]">
            EST. LATENCY
          </div>

          <div className="mt-0.5 text-[10px] font-medium text-[var(--color-foreground)]">
            {model.latency}
          </div>
        </div>

        <div>
          <div className="font-mono text-[8px] text-[var(--color-foreground-muted)]">
            EST. COST
          </div>

          <div className="mt-0.5 text-[10px] font-medium text-[var(--color-foreground)]">
            {model.cost}
          </div>
        </div>

        <AnimatePresence>
          {selected && !isRouting && (
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.5,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.5,
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]"
            >
              <CheckCircle size={13} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
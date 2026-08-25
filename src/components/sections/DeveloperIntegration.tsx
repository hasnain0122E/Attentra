"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Check,
  Copy,
  CurrencyDollar,
  Gauge,
  Lightning,
  Sparkle,
  TerminalWindow,
} from "@phosphor-icons/react";

const codeExamples = {
  before: `const response = await openai.chat.completions.create({
  model: "gpt-4.1",
  messages: messages
});`,

  after: `const response = await attentra.chat.completions.create({
  messages: messages
});`,
};

const routingModels = [
  {
    name: "Gemini Flash",
    reason: "Low complexity · Fastest fit",
    latency: "210ms",
    cost: "$",
  },
  {
    name: "Claude Sonnet",
    reason: "Balanced quality + reasoning",
    latency: "480ms",
    cost: "$$",
  },
  {
    name: "GPT-4.1",
    reason: "High complexity · Deep reasoning",
    latency: "620ms",
    cost: "$$$",
  },
];

export default function DeveloperIntegration() {
  const [copied, setCopied] = useState(false);
  const [showAfter, setShowAfter] = useState(true);
  const [activeModel, setActiveModel] = useState(0);

  /*
   * Simulated routing animation.
   *
   * Frontend-only demonstration of how
   * Attentra can dynamically select a model.
   */
  useEffect(() => {
    if (!showAfter) return;

    const interval = window.setInterval(() => {
      setActiveModel((current) => {
        return (current + 1) % routingModels.length;
      });
    }, 2800);

    return () => {
      window.clearInterval(interval);
    };
  }, [showAfter]);

  const copyCode = async () => {
    const code = showAfter
      ? codeExamples.after
      : codeExamples.before;

    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  const selectedModel = routingModels[activeModel];

  return (
    <section
      id="developers"
      className="attentra-dark-atmosphere relative isolate overflow-hidden bg-[var(--color-dark)] py-24 text-white sm:py-32 lg:py-40"
    >
      {/* =========================================================
          BACKGROUND ATMOSPHERE
          ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute right-[-18rem] top-[10%] h-[36rem] w-[36rem] rounded-full bg-[var(--color-accent)] opacity-[0.10] blur-[140px]" />

        <div className="absolute bottom-[5%] left-[-18rem] h-[32rem] w-[32rem] rounded-full bg-[var(--color-accent)] opacity-[0.07] blur-[140px]" />
      </div>

      <div className="attentra-container relative z-10 min-w-0">

        {/* =========================================================
            HEADER
            ========================================================= */}

        <div className="grid min-w-0 gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
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
            }}
            transition={{
              duration: 0.6,
            }}
            className="min-w-0"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                <TerminalWindow
                  size={15}
                  weight="duotone"
                />
              </span>

              <span className="attentra-label text-[var(--color-accent)]">
                For developers
              </span>
            </div>

            <p className="mt-6 max-w-sm text-sm leading-6 text-white/60">
              Keep your existing application architecture.
              Add intelligent model routing at the API layer.
            </p>
          </motion.div>

          <motion.h2
            initial={{
              opacity: 0,
              y: 25,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.7,
              delay: 0.1,
            }}
            className="min-w-0 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
            Add intelligent routing
            <br className="hidden sm:block" />

            <span className="text-[var(--color-accent)]">
              without rebuilding your stack.
            </span>
          </motion.h2>
        </div>

        {/* =========================================================
            MAIN DEVELOPER CONSOLE
            ========================================================= */}

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
          }}
          transition={{
            duration: 0.8,
            delay: 0.15,
          }}
          className="mt-14 min-w-0 max-w-full overflow-hidden rounded-[1.75rem] border border-[var(--color-dark-border)] bg-[var(--color-dark-soft)] shadow-[var(--shadow-lg)] sm:mt-16 sm:rounded-[2rem]"
        >

          {/* =======================================================
              BROWSER BAR
              ======================================================= */}

          <div className="flex h-11 items-center justify-between border-b border-[var(--color-dark-border)] px-4 sm:h-12 sm:px-5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#D8DAD8]" />
              <span className="h-2 w-2 rounded-full bg-[#D8DAD8]" />
              <span className="h-2 w-2 rounded-full bg-[#D8DAD8]" />
            </div>

            <div className="font-mono text-[7px] tracking-[0.12em] text-white/35 sm:text-[8px]">
              ATTENTRA / QUICKSTART
            </div>

            <div className="w-8 sm:w-10" />
          </div>

          {/* =======================================================
              MAIN GRID
              ======================================================= */}

          <div className="grid min-w-0 lg:grid-cols-[0.42fr_0.58fr]">

            {/* =====================================================
                LEFT — INTEGRATION STORY
                ===================================================== */}

            <div className="min-w-0 border-b border-[var(--color-dark-border)] p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
              <div className="font-mono text-[8px] tracking-[0.12em] text-white/35">
                INTEGRATION
              </div>

<h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
  One small change.
</h3>

              <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
                Keep your prompts, application logic, and user
                experience. Attentra becomes the intelligent layer
                between your application and model providers.
              </p>

              {/* =================================================
                  STEPS
                  ================================================= */}

              <div className="mt-9 space-y-7">
                <IntegrationStep
                  number="01"
                  title="Connect your application"
                  description="Use the Attentra API as your model endpoint."
                  active
                />

                <IntegrationStep
                  number="02"
                  title="Send your request"
                  description="Keep your existing prompts and messages."
                />

                <IntegrationStep
                  number="03"
                  title="Let Attentra route it"
                  description="The routing engine selects the best-fit model."
                />
              </div>

              {/* Architectural note */}

              <div className="mt-9 flex items-start gap-3 rounded-2xl border border-[var(--color-dark-border)] bg-white/[0.04] p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <Sparkle
                    size={15}
                    weight="duotone"
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    Your application stays yours.
                  </div>

                  <p className="mt-1 text-[10px] leading-5 text-white/60">
                    Attentra sits between your application and
                    the model providers.
                  </p>
                </div>
              </div>
            </div>

            {/* =====================================================
                RIGHT — DEVELOPER CONSOLE
                ===================================================== */}

            <div className="min-w-0 overflow-hidden bg-[var(--color-dark-soft)] p-3 sm:p-5 lg:p-8">

              {/* Console header */}

              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                    <TerminalWindow
                      size={14}
                      weight="duotone"
                    />
                  </span>

                  <span className="truncate font-mono text-[8px] tracking-[0.1em] text-white/50">
                    QUICKSTART.JS
                  </span>
                </div>

                <button
                  type="button"
                  onClick={copyCode}
                  className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 font-mono text-[8px] text-white/60 transition-colors hover:border-white/20 hover:text-white active:scale-[0.98]"
                >
                  {copied ? (
                    <>
                      <Check
                        size={12}
                        weight="bold"
                      />
                      COPIED
                    </>
                  ) : (
                    <>
                      <Copy
                        size={12}
                        weight="regular"
                      />
                      COPY
                    </>
                  )}
                </button>
              </div>

              {/* =================================================
                  BEFORE / AFTER
                  ================================================= */}

              <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAfter(false);
                    setCopied(false);
                  }}
                  className={[
                    "min-h-10 min-w-0 cursor-pointer rounded-md px-2 py-2",
                    "font-mono text-[7px] tracking-[0.06em]",
                    "transition-all active:scale-[0.98] sm:text-[8px]",
                    !showAfter
                      ? "bg-white/10 text-white"
                      : "text-white/35 hover:text-white/60",
                  ].join(" ")}
                >
                  BEFORE
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAfter(true);
                    setCopied(false);
                  }}
                  className={[
                    "min-h-10 min-w-0 cursor-pointer rounded-md px-2 py-2",
                    "font-mono text-[7px] tracking-[0.06em]",
                    "transition-all active:scale-[0.98] sm:text-[8px]",
                    showAfter
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : "text-white/35 hover:text-white/60",
                  ].join(" ")}
                >
                  WITH ATTENTRA
                </button>
              </div>

              {/* =================================================
                  CODE WINDOW
                  ================================================= */}

              <div className="mt-4 min-w-0 max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                <AnimatePresence mode="wait">
                  <motion.pre
                    key={showAfter ? "after-code" : "before-code"}
                    initial={{
                      opacity: 0,
                      y: 6,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -4,
                    }}
                    transition={{
                      duration: 0.22,
                    }}
                    className="min-w-max px-4 py-5 font-mono text-[10px] leading-7 text-white/70 sm:px-5 sm:text-xs"
                  >
                    <code>
                      {renderCode(
                        showAfter
                          ? codeExamples.after
                          : codeExamples.before
                      )}
                    </code>
                  </motion.pre>
                </AnimatePresence>
              </div>

              {/* =================================================
                  ROUTING RESULT
                  ================================================= */}

              <AnimatePresence mode="wait">
                {showAfter ? (
                  <motion.div
                    key={selectedModel.name}
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
                    transition={{
                      duration: 0.25,
                    }}
                    className="mt-4 min-w-0 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/[0.08] p-4"
                  >

                    {/* Routing header */}

                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[7px] tracking-[0.12em] text-white/40">
                          ATTENTRA ROUTING
                        </div>

                        <div className="mt-1 truncate text-xs font-medium text-white">
                          Best-fit model selected
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <motion.span
                          animate={{
                            opacity: [0.35, 1, 0.35],
                            scale: [0.9, 1.1, 0.9],
                          }}
                          transition={{
                            duration: 1.8,
                            repeat: Infinity,
                          }}
                          className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                        />

                        <span className="font-mono text-[8px] text-[var(--color-accent)]">
                          ROUTED
                        </span>
                      </div>
                    </div>

                    {/* Selected model */}

                    <div className="mt-4 flex min-w-0 items-center gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg bg-white/[0.07] px-3 py-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                          <Lightning
                            size={14}
                            weight="duotone"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-mono text-[9px] font-medium text-white">
                            {selectedModel.name}
                          </div>

                          <div className="mt-0.5 truncate text-[8px] text-white/35">
                            {selectedModel.reason}
                          </div>
                        </div>
                      </div>

                      <ArrowRight
                        size={13}
                        weight="regular"
                        className="shrink-0 text-white/30"
                      />
                    </div>

                    {/* Metrics */}

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <ConsoleMetric
                        icon={
                          <Gauge
                            size={11}
                            weight="duotone"
                          />
                        }
                        value={selectedModel.latency}
                        label="LATENCY"
                      />

                      <ConsoleMetric
                        icon={
                          <CurrencyDollar
                            size={11}
                            weight="duotone"
                          />
                        }
                        value={selectedModel.cost}
                        label="COST"
                      />

                      <ConsoleMetric
                        icon={
                          <Sparkle
                            size={11}
                            weight="duotone"
                          />
                        }
                        value="FIT"
                        label="DECISION"
                        className="hidden sm:flex"
                      />
                    </div>

                    {/* Model indicators */}

                    <div className="mt-4 flex items-center gap-1.5">
                      {routingModels.map((model, index) => (
                        <button
                          key={model.name}
                          type="button"
                          aria-label={`Preview ${model.name} routing`}
                          onClick={() => setActiveModel(index)}
                          className="flex h-6 cursor-pointer items-center gap-1.5 rounded-md px-1.5 transition-colors hover:bg-white/5"
                        >
                          <span
                            className={[
                              "h-1.5 w-1.5 rounded-full transition-all",
                              index === activeModel
                                ? "bg-[var(--color-accent)]"
                                : "bg-white/20",
                            ].join(" ")}
                          />

                          <span
                            className={[
                              "font-mono text-[7px]",
                              index === activeModel
                                ? "text-white/60"
                                : "text-white/25",
                            ].join(" ")}
                          >
                            {model.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="direct-request"
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
                    className="mt-4 flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/35">
                      <ArrowRight
                        size={13}
                        weight="regular"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="font-mono text-[7px] tracking-[0.12em] text-white/25">
                        DIRECT REQUEST
                      </div>

                      <div className="mt-1 truncate text-[10px] text-white/45">
                        Application is locked to one model.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* =========================================================
            VALUE STRIP
            ========================================================= */}

        <div className="mt-6 grid min-w-0 gap-3 sm:mt-8 sm:grid-cols-3">
          <Value
            icon={
              <TerminalWindow
                size={16}
                weight="duotone"
              />
            }
            title="One API"
            description="Integrate once and keep your application logic clean."
          />

          <Value
            icon={
              <Sparkle
                size={16}
                weight="duotone"
              />
            }
            title="Multiple models"
            description="Connect the models your workload actually needs."
          />

          <Value
            icon={
              <Lightning
                size={16}
                weight="duotone"
              />
            }
            title="Intelligent routing"
            description="Let Attentra handle model selection."
          />
        </div>
      </div>
    </section>
  );
}

/* ===============================================================
   INTEGRATION STEP
   =============================================================== */

function IntegrationStep({
  number,
  title,
  description,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div className="flex min-w-0 gap-4">
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[8px]",
          active
            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
            : "bg-white/[0.04] text-white/35",
        ].join(" ")}
      >
        {number}
      </div>

      <div className="min-w-0">
        <div className="text-sm font-medium text-white">
          {title}
        </div>

        <div className="mt-1 text-xs leading-5 text-white/60">
          {description}
        </div>
      </div>
    </div>
  );
}

/* ===============================================================
   CONSOLE METRIC
   =============================================================== */

function ConsoleMetric({
  icon,
  value,
  label,
  className = "",
}: {
  icon: ReactNode;
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2 ${
        className || "flex"
      }`}
    >
      <span className="shrink-0 text-white/30">
        {icon}
      </span>

      <div className="min-w-0">
        <div className="truncate font-mono text-[8px] text-white/60">
          {value}
        </div>

        <div className="mt-0.5 truncate font-mono text-[6px] tracking-[0.08em] text-white/20">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ===============================================================
   VALUE
   =============================================================== */

function Value({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className=" min-w-0 rounded-2xl border border-[var(--color-dark-border)] bg-white/[0.03] p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        {icon}
      </div>

      <div className="mt-4 text-sm font-semibold text-white">
        {title}
      </div>

      <p className="mt-1.5 text-xs leading-5 text-white/60">
        {description}
      </p>
    </div>
  );
}

/* ===============================================================
   CODE RENDERER
   =============================================================== */

function renderCode(code: string) {
  return code.split("\n").map((line, index) => (
    <div key={index}>
      <span className="mr-5 inline-block w-4 select-none text-right text-white/20">
        {index + 1}
      </span>

      {line}
    </div>
  ));
}
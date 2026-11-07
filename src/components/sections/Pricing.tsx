"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle,
  CurrencyDollar,
  Sparkle,
} from "@phosphor-icons/react";

const plans = [
  {
    name: "MVP access",
    eyebrow: "AVAILABLE NOW",
    description:
      "Try the Playground, call the API with your own key, and see the routing decision and calculated cost of every request.",
    priceDisplay: "Free",
    period: "during the MVP",
    highlight: null as string | null,
    features: [
      "Google sign-in",
      "Playground with routing explanations",
      "OpenAI-compatible API key",
      "Request History",
      "Calculated cost per request",
      "Comparison with a baseline model",
      "No credit card",
    ],
    cta: "Get started free",
    href: "/signup",
    featured: false,
  },
  {
    name: "Production pricing",
    eyebrow: "PREVIEW · NOT YET BILLED",
    description:
      "Planned model: pay for your model usage, plus 10% of the savings measured against a baseline model you choose. Payment collection is not live yet.",
    priceDisplay: null as string | null,
    period: null as string | null,
    highlight: "10% of savings",
    features: [
      "Personal and business API keys",
      "Automatic model routing",
      "Cross-provider fallback",
      "Usage and cost tracking",
      "Business workspace dashboard",
      "Baseline cost comparison",
    ],
    cta: "Try it free today",
    href: "/signup",
    featured: true,
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="attentra-atmosphere attendra-atmosphere-medium relative isolate overflow-hidden bg-[var(--color-background)] pt-24 pb-12 sm:pt-32 sm:pb-16 lg:pt-40 lg:pb-20"
    >
      {/* =========================================================
          BACKGROUND ATMOSPHERE
          ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-20 blur-[140px]" />

        <div className="absolute bottom-[-16rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[var(--color-accent-soft)] opacity-10 blur-[130px]" />
      </div>

      <div className="attentra-container relative z-10">
        {/* =========================================================
            HEADER
            ========================================================= */}

        <div className="mx-auto max-w-3xl text-center">
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
            className="flex items-center justify-center gap-2"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <CurrencyDollar size={14} />
            </span>

            <span className="attentra-label text-[var(--color-accent)]">
              Pricing preview
            </span>
          </motion.div>

          <motion.h2
            initial={{
              opacity: 0,
              y: 22,
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
            className="attentra-display mt-7 text-[var(--color-foreground)] sm:text-[3.25rem]"
          >
            We plan to earn only
            <br />
            <span className="text-[var(--color-accent)]">
            when routing saves you money.
            </span>
          </motion.h2>

          <motion.p
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
              delay: 0.2,
            }}
            className="attentra-body mx-auto mt-6 max-w-xl text-base sm:text-lg"
          >
            Attentra is free to try during the MVP. The planned model is
            simple: you pay for model usage, plus a share of savings — only
            when there are savings, and only once billing launches. No
            payments are collected today.
          </motion.p>
        </div>

        {/* =========================================================
            PRICING GRID
            ========================================================= */}

        <div className="mt-14 grid gap-4 lg:mt-16 lg:mx-auto lg:max-w-4xl lg:grid-cols-2 lg:items-stretch">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              index={index}
            />
          ))}
        </div>

        {/* =========================================================
            HOW IT WORKS — SAVINGS FORMULA
            ========================================================= */}

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
            delay: 0.2,
          }}
          className="mx-auto mt-10 max-w-3xl rounded-[1.5rem] border border-[var(--color-border)] bg-white px-6 py-6 sm:px-8 sm:py-8"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Sparkle size={14} />
            </div>

            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
              How the planned fee would work
            </span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <FormulaStep
              step="01"
              title="Measured savings"
              description="What a baseline model you choose would have cost for the same tokens, minus the actual routed cost. A per-request comparison, not a guarantee."
            />

            <FormulaStep
              step="02"
              title="10% of positive savings"
              description="If savings for the period are zero or negative, the fee is zero."
            />

            <FormulaStep
              step="03"
              title="You keep 90%"
              description="Everything saved beyond the fee stays with you."
            />
          </div>
        </motion.div>

      </div>
    </section>
  );
}

/* ===============================================================
   PRICING CARD
   =============================================================== */

function PricingCard({
  plan,
  index,
}: {
  plan: (typeof plans)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 28,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: "-60px",
      }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
      }}
      className={[
        "relative flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border p-6 sm:p-8",
        plan.featured
          ? "border-[var(--color-accent)]/30 bg-white shadow-[0_20px_70px_rgba(0,0,0,0.07)]"
          : "border-[var(--color-border)] bg-white",
      ].join(" ")}
    >
      {/* Featured glow */}

      {plan.featured && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-5rem] top-[-5rem] h-40 w-40 rounded-full bg-[var(--color-accent-soft)] opacity-60 blur-[70px]"
        />
      )}

      <div className="relative z-10 flex h-full flex-col">
        {/* Top */}

        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={[
                "font-mono text-[7px] tracking-[0.14em]",
                plan.featured
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-foreground-muted)]",
              ].join(" ")}
            >
              {plan.eyebrow}
            </div>

            <h3 className="mt-3 text-xl font-semibold tracking-[-0.035em] text-[var(--color-foreground)]">
              {plan.name}
            </h3>
          </div>

          {plan.featured && (
            <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 font-mono text-[7px] tracking-[0.08em] text-[var(--color-accent)]">
              PREVIEW
            </span>
          )}
        </div>

        {/* Description */}

        <p className="mt-4 min-h-[3rem] text-xs leading-5 text-[var(--color-foreground-secondary)]">
          {plan.description}
        </p>

        {/* Price */}

        <div className="mt-7 border-b border-[var(--color-border)] pb-7">
          {plan.highlight ? (
            <div>
              <div className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-accent)] sm:text-4xl">
                {plan.highlight}
              </div>

              <p className="mt-2 text-[10px] leading-4 text-[var(--color-foreground-muted)]">
                Planned, not yet billed. The fee would apply only when routing
                costs less than your baseline model; no positive savings, no
                fee.
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-[-0.055em] text-[var(--color-foreground)] sm:text-5xl">
                {plan.priceDisplay}
              </span>

              {plan.period && (
                <span className="pb-1 text-[10px] text-[var(--color-foreground-muted)]">
                  {plan.period}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Features */}

        <div className="mt-7 flex-1">
          <div className="font-mono text-[7px] tracking-[0.12em] text-[var(--color-foreground-muted)]">
            INCLUDED
          </div>

          <ul className="mt-4 space-y-3.5">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="flex min-w-0 items-start gap-2.5"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <CheckCircle size={9} strokeWidth={2.5} />
                </span>

                <span className="text-xs leading-5 text-[var(--color-foreground-secondary)]">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}

        <a
          href={plan.href}
          className={[
            "group mt-8 flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-all duration-200 active:scale-[0.98]",
            plan.featured
              ? "bg-[var(--color-foreground)] text-white hover:-translate-y-0.5 hover:bg-[#202320]"
              : "border border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:-translate-y-0.5 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-soft)]",
          ].join(" ")}
        >
          {plan.cta}

          <ArrowRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </a>
      </div>
    </motion.div>
  );
}

/* ===============================================================
   FORMULA STEP
   =============================================================== */

function FormulaStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="font-mono text-[8px] tracking-[0.12em] text-[var(--color-accent)]">
        {step}
      </div>

      <div className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">
        {title}
      </div>

      <p className="mt-1.5 text-[10px] leading-4 text-[var(--color-foreground-secondary)]">
        {description}
      </p>
    </div>
  );
}


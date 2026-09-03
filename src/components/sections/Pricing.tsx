"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle,
  CurrencyDollar,
  Gauge,
  GitBranch,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react";

const plans = [
  {
    name: "Free Access",
    eyebrow: "GET STARTED",
    description:
      "Explore intelligent routing, inspect decisions, and validate savings — at no platform cost.",
    priceDisplay: "PKR 0",
    period: "/ month",
    highlight: null as string | null,
    features: [
      "Playground access",
      "Intelligent model routing",
      "Request history",
      "Routing analytics",
      "Cost intelligence",
      "Baseline comparison",
      "Model performance insights",
      "No credit card required",
    ],
    cta: "Start for free",
    href: "/signup",
    featured: false,
  },
  {
    name: "Production API",
    eyebrow: "PAY AS YOU GO",
    description:
      "Route production traffic through Attentra. Pay for your model usage plus 10% of the verified savings Attentra generates.",
    priceDisplay: null as string | null,
    period: null as string | null,
    highlight: "10% of verified savings",
    features: [
      "Production API access",
      "API keys for workspace members",
      "Multi-model intelligent routing",
      "Automatic fallback execution",
      "Usage and spend tracking",
      "Business analytics dashboard",
      "Cost optimization intelligence",
      "Baseline cost comparison",
    ],
    cta: "Start routing",
    href: "/signup",
    featured: true,
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="attentra-atmosphere attendra-atmosphere-medium relative isolate overflow-hidden bg-[var(--color-background)] py-24 sm:py-32 lg:py-40"
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
              Performance-based pricing
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
            We make money when
            <br />
            <span className="text-[var(--color-accent)]">
            we save you money.
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
            Start free. Use Attentra&apos;s Playground, routing insights,
            request history, and cost intelligence at no platform cost. When
            you move production traffic through Attentra, pay for your model
            usage plus 10% of the verified savings Attentra generates.
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
              How the optimization fee works
            </span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <FormulaStep
              step="01"
              title="Verified Savings"
              description="Baseline cost minus your actual routed cost. Attentra measures every request."
            />

            <FormulaStep
              step="02"
              title="10% Optimization Fee"
              description="Attentra charges 10% of positive verified savings only. If savings are zero or negative, the fee is PKR 0."
            />

            <FormulaStep
              step="03"
              title="You Keep 90%"
              description="Every rupee of verified savings beyond the fee stays with you. The more Attentra saves, the more you benefit."
            />
          </div>
        </motion.div>

        {/* =========================================================
            VALUE STRIP
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
            delay: 0.3,
          }}
          className="mt-10 grid overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white sm:grid-cols-3"
        >
          <Value
            icon={<GitBranch size={15} />}
            title="Model agnostic"
            description="Route across the providers your application needs."
          />

          <Value
            icon={<Gauge size={15} />}
            title="Latency aware"
            description="Keep fast requests on fast models."
          />

          <Value
            icon={<Lightning size={15} />}
            title="Automatic fallback"
            description="If a provider fails, Attentra retries on the next best model."
          />
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
              RECOMMENDED
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
                Attentra&apos;s optimization fee applies only when Attentra
                reduces your cost relative to your configured baseline. If
                Attentra generates no positive savings, the optimization fee
                is PKR 0.
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

/* ===============================================================
   VALUE ITEM
   =============================================================== */

function Value({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 border-[var(--color-border)] p-5 sm:p-6 sm:[&+div]:border-l">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        {icon}
      </div>

      <div className="mt-4 text-xs font-semibold text-[var(--color-foreground)]">
        {title}
      </div>

      <p className="mt-1.5 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
        {description}
      </p>
    </div>
  );
}

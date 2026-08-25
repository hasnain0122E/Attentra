"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Gauge,
  GitBranch,
  Sparkles,
} from "lucide-react";

const plans = [
  {
    name: "Developer",
    eyebrow: "FOR EXPERIMENTS",
    description:
      "Explore intelligent routing and build your first AI workflows.",
    price: "$0",
    period: "forever",
    features: [
      "1,000 routed requests",
      "Core intelligent routing",
      "Multiple model providers",
      "Basic usage analytics",
      "API access",
    ],
    cta: "Start building",
    href: "#product-demo",
    featured: false,
  },
  {
    name: "Scale",
    eyebrow: "FOR PRODUCTION",
    description:
      "Optimize production AI workloads across cost, latency, and quality.",
    price: "$49",
    period: "per month",
    features: [
      "50,000 routed requests",
      "Advanced routing policies",
      "Cost-aware routing",
      "Latency-aware routing",
      "Usage & routing analytics",
      "API access",
      "Priority support",
    ],
    cta: "Start scaling",
    href: "#product-demo",
    featured: true,
  },
  {
    name: "Enterprise",
    eyebrow: "FOR AI AT SCALE",
    description:
      "Custom infrastructure and routing intelligence for high-volume teams.",
    price: "Custom",
    period: "tailored to you",
    features: [
      "Custom request volume",
      "Custom routing policies",
      "Dedicated infrastructure",
      "Advanced observability",
      "Custom integrations",
      "SLA & support",
    ],
    cta: "Talk to us",
    href: "#get-started",
    featured: false,
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
              <CircleDollarSign size={14} />
            </span>

            <span className="attentra-label text-[var(--color-accent)]">
              Simple pricing
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
            className="attentra-display mt-7 text-[var(--color-foreground)]"
          >
            Route smarter.
            <br />
            <span className="text-[var(--color-accent)]">
            Scale intelligent.
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
            className="attentra-body mx-auto mt-6 max-w-2xl text-base sm:text-lg"
          >
            Start with the tools you need today and add more
            routing intelligence as your AI workload grows.
          </motion.p>
        </div>

        {/* =========================================================
            PRICING GRID
            ========================================================= */}

        <div className="mt-14 grid gap-4 lg:mt-16 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              index={index}
            />
          ))}
        </div>

        {/* =========================================================
            VALUE STATEMENT
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
          className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 text-center sm:flex-row"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <Sparkles size={14} />
          </div>

          <p className="text-xs leading-5 text-[var(--color-foreground-secondary)]">
            Your infrastructure shouldn't force every request onto
            your most expensive model.
          </p>
        </motion.div>

        {/* =========================================================
            FEATURE STRIP
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
          className="mt-14 grid overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white sm:grid-cols-3"
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
            icon={<CircleDollarSign size={15} />}
            title="Cost conscious"
            description="Use premium capability when it actually matters."
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
          <div className="flex items-end gap-2">
            <span className="text-4xl font-semibold tracking-[-0.055em] text-[var(--color-foreground)] sm:text-5xl">
              {plan.price}
            </span>

            <span className="pb-1 text-[10px] text-[var(--color-foreground-muted)]">
              {plan.period}
            </span>
          </div>
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
                  <Check size={9} strokeWidth={2.5} />
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
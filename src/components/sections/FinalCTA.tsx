"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle,
  Code,
  GitBranch,
  Sparkle,
} from "@phosphor-icons/react";

export default function FinalCTA() {
  return (
    <section
      id="get-started"
      className="attentra-atmosphere attentra-atmosphere-strongest relative isolate overflow-hidden bg-[var(--color-background)] py-24 sm:py-32 lg:py-40"
    >
      {/* =========================================================
          ATMOSPHERE
          ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* Main central glow */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.35, 0.5, 0.35],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute left-1/2 top-[5%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] blur-[130px]"
        />

        {/* Secondary glow */}
        <div className="absolute bottom-[-18rem] left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-20 blur-[120px]" />
      </div>

      <div className="attentra-container relative z-10">
        {/* =========================================================
            MAIN CTA
            ========================================================= */}

        <div className="mx-auto max-w-5xl text-center">
          {/* Eyebrow */}

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
              <Sparkle size={14} />
            </span>

            <span className="attentra-label text-[var(--color-accent)]">
              Build with Attentra
            </span>
          </motion.div>

          {/* Headline */}

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
              duration: 0.75,
              delay: 0.1,
            }}
            className="attentra-display mx-auto mt-7 max-w-5xl text-[var(--color-foreground)]"
          >
            One request.
            <br />

            <span className="text-[var(--color-accent)]">
              The right model.
            </span>
            <br />

            Every time.
          </motion.h2>

          {/* Description */}

          <motion.p
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
              duration: 0.65,
              delay: 0.22,
            }}
            className="attentra-body mx-auto mt-7 max-w-2xl text-base sm:text-lg"
          >
            Intelligent model routing for the modern AI stack.
            Optimize quality, latency, and cost without rebuilding
            your application.
          </motion.p>

          {/* =======================================================
              BUTTONS
              ======================================================= */}

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
              duration: 0.65,
              delay: 0.34,
            }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <a
              href="#product"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-foreground)] px-6 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#202320] hover:shadow-[0_14px_35px_rgba(0,0,0,0.12)]"
            >
              Start routing

              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </a>

            <a
              href="#product-demo"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-medium text-[var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-soft)]"
            >
              Explore the demo

              <ArrowRight
                size={15}
                className="text-[var(--color-foreground-secondary)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--color-accent)]"
              />
            </a>
          </motion.div>
        </div>

        {/* =========================================================
            PRODUCT PRINCIPLES
            ========================================================= */}

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
            duration: 0.65,
            delay: 0.45,
          }}
          className="mx-auto mt-16 grid max-w-4xl overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white sm:mt-20 sm:grid-cols-3"
        >
          <Principle
            icon={<GitBranch size={15} />}
            title="Model agnostic"
            description="Route across providers without locking your application to one model."
          />

          <Principle
            icon={<Code size={15} />}
            title="API first"
            description="Designed to fit into the stack you're already building."
          />

          <Principle
            icon={<CheckCircle size={15} />}
            title="Cost aware"
            description="Use expensive capability when the request actually needs it."
          />
        </motion.div>

        {/* =========================================================
            SMALL BOTTOM SIGNAL
            ========================================================= */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          whileInView={{
            opacity: 1,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.7,
            delay: 0.6,
          }}
          className="mt-10 flex items-center justify-center gap-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-40" />

            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          </span>

          <span className="font-mono text-[7px] tracking-[0.14em] text-[var(--color-foreground-muted)]">
            INTELLIGENT ROUTING / READY
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* ===============================================================
   PRINCIPLE
   =============================================================== */

function Principle({
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
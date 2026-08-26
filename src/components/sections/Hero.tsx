"use client";

import { motion } from "motion/react";
import { ArrowRight, CaretRight, Brain } from "@phosphor-icons/react";

import RoutingEngine from "./RoutingEngine";

export default function Hero() {
  return (
    <section
      id="top"
      className="attentra-atmosphere attendra-atmosphere-strong relative isolate overflow-hidden bg-[var(--color-background)] pt-36 sm:pt-40 lg:pt-44"
    >
      {/* =====================================================
          BACKGROUND ATMOSPHERE
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* Main blue atmospheric glow */}
        <div className="absolute left-1/2 top-[-24rem] h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-70 blur-[120px]" />

        {/* Left soft light */}
        <div className="absolute left-[5%] top-[25%] h-64 w-64 rounded-full bg-white opacity-80 blur-[100px]" />

        {/* Right soft blue light */}
        <div className="absolute right-[5%] top-[45%] h-72 w-72 rounded-full bg-[var(--color-accent-soft)] opacity-30 blur-[120px]" />
      </div>

      <div className="attentra-container relative">
        {/* =====================================================
            HERO COPY
            ===================================================== */}

        <div className="mx-auto max-w-5xl text-center">
          {/* Eyebrow */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-6 flex items-center justify-center gap-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <motion.div
                animate={{
                  rotate: [0, -3, 3, 0],
                  scale: [1, 1.04, 1.04, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Brain size={18} weight="duotone" />
              </motion.div>
            </span>

            <span className="attentra-label text-[var(--color-accent)]">
              Intelligent LLM Routing
            </span>
          </motion.div>

          {/* Main headline */}

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="font-reservation uppercase text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-[var(--color-foreground)] sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
          >
            Your AI doesn't need
            <br />
            <span className="text-[var(--color-accent)]">one model.</span>
          </motion.h1>

          {/* Description */}

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="attentra-body mx-auto mt-7 max-w-2xl text-lg sm:text-xl"
          >
            Attentra automatically routes every AI request to the model that
            best fits its complexity, quality requirements, latency, and cost.
          </motion.p>

          {/* =====================================================
              CTA
              ===================================================== */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            {/* Primary CTA */}

            <a
              href="#product"
              className="group flex items-center gap-2 rounded-full bg-[var(--color-foreground)] px-6 py-3.5 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#202320]"
            >
              Start routing
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </a>

            {/* Secondary CTA */}

            <a
              href="#how-it-works"
              className="flex items-center gap-1 rounded-full px-5 py-3.5 text-sm font-medium text-[var(--color-foreground-secondary)] transition-colors hover:text-[var(--color-foreground)]"
            >
              See how it works
              <CaretRight size={16} />
            </a>
          </motion.div>
        </div>

        {/* =====================================================
            ATTENTRA DECISION ENGINE
            ===================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative mx-auto mt-20 max-w-6xl pb-20"
        >
          <RoutingEngine />
        </motion.div>
      </div>
    </section>
  );
}

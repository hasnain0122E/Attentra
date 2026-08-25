'use client';
import { motion } from 'framer-motion';
import { ArrowRight, FileSearch } from 'lucide-react';
import { RoutingLedger } from '@/components/ui/RoutingLedger';

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-40 sm:pt-48">
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-gold/10 blur-[140px] animate-pulseGlow" />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-paper-lineStrong bg-paper-raised px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
            <FileSearch className="h-3.5 w-3.5" />
            Every decision, logged
          </span>

          <h1 className="mt-6 font-display text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Stop guessing which
            <br />
            model your AI calls need.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-dim">
            Attentra sits between your app and every LLM provider. It scores each request in
            under 5ms, routes it to the cheapest model that can still do the job well, and keeps
            a full, exportable record of why — so cost cuts never come at the price of trust.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#calculator"
              className="group flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-paper transition-all hover:bg-gold"
            >
              See your estimated savings
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how-it-works"
              className="rounded-full border border-paper-lineStrong px-6 py-3 text-ink-dim transition-all hover:border-ink-faint hover:text-ink"
            >
              How routing works
            </a>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs text-ink-faint">
            <span>40–60% lower model spend</span>
            <span className="text-paper-lineStrong">/</span>
            <span>&lt;5ms routing decision</span>
            <span className="text-paper-lineStrong">/</span>
            <span>one API, every provider</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <RoutingLedger />
        </motion.div>
      </div>
    </section>
  );
}

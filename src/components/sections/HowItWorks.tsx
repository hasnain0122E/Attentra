'use client';
import { motion } from 'framer-motion';

const steps = [
  {
    mark: '01',
    title: 'Your app sends the request',
    body: 'Point your existing SDK at Attentra instead of a single provider. No code changes beyond the base URL — every OpenAI- and Anthropic-compatible call works as-is.',
  },
  {
    mark: '02',
    title: 'Attentra scores it in real time',
    body: 'A lightweight classifier reads task complexity, required context length, and your quality threshold, then checks live pricing across every connected provider — all in under 5ms.',
  },
  {
    mark: '03',
    title: 'It routes, logs, and reports back',
    body: 'The request goes to the cheapest model that clears your quality bar. The decision, cost, and latency are written to your ledger immediately — visible on the dashboard, not buried in logs.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-28">
      <div className="mb-16 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold">How it works</p>
        <h2 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
          One integration. A routing decision on every call.
        </h2>
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-paper-line bg-paper-line md:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.mark}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="bg-paper p-7"
          >
            <div className="font-mono text-sm text-ink-faint">{step.mark}</div>
            <h3 className="mt-4 font-display text-lg font-medium text-ink">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">{step.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

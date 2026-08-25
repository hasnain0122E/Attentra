'use client';
import { motion } from 'framer-motion';
import { ScrollText, Gauge, Users, ShieldCheck } from 'lucide-react';

const points = [
  {
    icon: ScrollText,
    title: 'Nothing routes silently',
    body: 'Every decision — which model, why, what it cost, how it compares to the default — is written to an exportable ledger. Finance and engineering read the same record.',
  },
  {
    icon: Users,
    title: 'Built for the person approving the bill',
    body: 'The dashboard is designed for whoever owns the budget, not just whoever owns the code. Plain-language summaries sit next to the raw log, not instead of it.',
  },
  {
    icon: Gauge,
    title: 'Quality is the floor, not the trade-off',
    body: 'Attentra never routes a request below the quality threshold you set. If no cheaper model clears the bar, it stays on your default — savings never come from silently downgrading output.',
  },
  {
    icon: ShieldCheck,
    title: 'Your keys, your data, your call',
    body: 'Requests are proxied, not stored. Bring your own provider keys, set retention to zero, and revoke access at any time — nothing about routing requires giving up control.',
  },
];

export function TrustSection() {
  return (
    <section id="trust" className="mx-auto max-w-6xl px-4 py-28">
      <div className="mb-16 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-teal">Trust &amp; audit</p>
        <h2 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Cutting costs only works if you can defend every decision.
        </h2>
        <p className="mt-4 text-ink-dim">
          Attentra was built on the assumption that someone will eventually ask "why did this
          request cost what it cost" — and that the answer needs to be immediate, not archaeological.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {points.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-paper-line bg-paper-raised p-7"
          >
            <p.icon className="h-5 w-5 text-teal" />
            <h3 className="mt-4 font-display text-lg font-medium text-ink">{p.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-dim">{p.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

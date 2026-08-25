'use client';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    blurb: 'For testing and individual developers.',
    price: '$0',
    period: '/month',
    features: [
      'Route up to $500/mo in AI spend',
      'Basic routing dashboard',
      'Standard API access',
    ],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Growth',
    blurb: 'For fast-growing AI products and SaaS teams.',
    price: '10%',
    period: 'of savings',
    note: 'If we save you $0, you pay $0.',
    features: [
      'Unlimited monthly routing volume',
      'Real-time pricing & benchmarking engine',
      'Quality fallback protection',
      'Live spend & savings dashboard',
    ],
    cta: 'Start saving',
    highlight: true,
  },
  {
    name: 'Enterprise',
    blurb: 'For strict compliance and large-scale deployments.',
    price: 'Custom',
    period: '',
    features: [
      'Private VPC deployment',
      'Zero data retention guarantee',
      'SOC 2 Type II compliance',
      'Dedicated account manager',
    ],
    cta: 'Contact sales',
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-28">
      <div className="mb-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold">Pricing</p>
        <h2 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Aligned outcome pricing
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-dim">
          We only earn when you save money — there's no scenario where our incentive and yours point different directions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={`relative flex flex-col justify-between rounded-3xl border p-8 ${
              tier.highlight
                ? 'border-gold/50 bg-gold/[0.06] shadow-[0_0_50px_-12px_rgba(216,169,74,0.25)]'
                : 'border-paper-line bg-paper-raised'
            }`}
          >
            {tier.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-paper">
                Most popular
              </span>
            )}
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">{tier.name}</h3>
              <p className="mt-1 text-xs text-ink-dim">{tier.blurb}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-semibold text-ink">{tier.price}</span>
                {tier.period && <span className="text-xs text-ink-faint">{tier.period}</span>}
              </div>
              {tier.note && <p className="mt-1 text-[11px] text-teal">{tier.note}</p>}
              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ink-dim">
                    <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tier.highlight ? 'text-gold' : 'text-teal'}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href="#contact"
              className={`mt-8 block w-full rounded-full py-3 text-center text-xs font-medium transition-all ${
                tier.highlight
                  ? 'bg-gold text-paper hover:bg-gold/90'
                  : 'border border-paper-lineStrong text-ink hover:bg-white/5'
              }`}
            >
              {tier.cta}
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

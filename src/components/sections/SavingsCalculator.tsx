'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, DollarSign } from 'lucide-react';

export function SavingsCalculator() {
  const [monthlySpend, setMonthlySpend] = useState<number>(20000);

  const estimatedSavingsMonth = Math.round(monthlySpend * 0.5);
  const estimatedSavingsYear = estimatedSavingsMonth * 12;
  const attentraFeeMonth = Math.round(estimatedSavingsMonth * 0.1);

  return (
    <section id="calculator" className="mx-auto max-w-5xl px-4 py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-paper-lineStrong bg-paper-raised p-8 sm:p-12"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/10 blur-[110px]" />

        <div className="relative mx-auto mb-10 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold">Estimate your savings</p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
            What would smarter routing save you?
          </h2>
          <p className="mt-3 text-sm text-ink-dim">
            Move the slider to your current monthly spend across all LLM providers.
          </p>
        </div>

        <div className="relative mx-auto max-w-xl">
          <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink-faint">
            Current monthly AI API spend:{' '}
            <span className="tabular text-ink">${monthlySpend.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={monthlySpend}
            onChange={(e) => setMonthlySpend(Number(e.target.value))}
            aria-label="Monthly AI API spend"
            className="w-full cursor-pointer accent-gold"
          />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-faint">
            <span>$1,000</span>
            <span>$50,000</span>
            <span>$100,000</span>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-teal/30 bg-teal/10 p-6">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-teal">
                <TrendingDown className="h-4 w-4" /> Estimated monthly savings
              </div>
              <div className="tabular font-mono text-3xl font-semibold text-ink">
                ${estimatedSavingsMonth.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] text-ink-faint">
                Attentra's 10% outcome fee: ${attentraFeeMonth.toLocaleString()}/mo
              </div>
            </div>

            <div className="rounded-2xl border border-gold/30 bg-gold/10 p-6">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-gold">
                <DollarSign className="h-4 w-4" /> Estimated annual savings
              </div>
              <div className="tabular font-mono text-3xl font-semibold text-ink">
                ${estimatedSavingsYear.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] text-ink-faint">
                Based on a 50% reduction, the middle of our typical 40–60% range
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

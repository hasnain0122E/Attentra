'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Entry = {
  id: number;
  task: string;
  model: string;
  latency: string;
  saved: string;
  tier: 'light' | 'mid' | 'heavy';
};

const TASKS: Omit<Entry, 'id'>[] = [
  { task: 'Classify support ticket', model: 'Haiku 4.5', latency: '210ms', saved: '$0.041', tier: 'light' },
  { task: 'Summarize call transcript', model: 'GPT-4o mini', latency: '640ms', saved: '$0.118', tier: 'light' },
  { task: 'Draft product spec', model: 'Sonnet 4.6', latency: '1.4s', saved: '$0.240', tier: 'mid' },
  { task: 'Extract invoice fields', model: 'Gemini 1.5 Flash', latency: '180ms', saved: '$0.029', tier: 'light' },
  { task: 'Multi-step code review', model: 'Opus 4.6', latency: '2.9s', saved: '$0.000', tier: 'heavy' },
  { task: 'Translate onboarding docs', model: 'Haiku 4.5', latency: '390ms', saved: '$0.076', tier: 'light' },
  { task: 'Rank search relevance', model: 'GPT-4o mini', latency: '260ms', saved: '$0.053', tier: 'light' },
  { task: 'Draft legal clause redline', model: 'Sonnet 4.6', latency: '1.1s', saved: '$0.190', tier: 'mid' },
];

const tierColor: Record<Entry['tier'], string> = {
  light: 'text-teal',
  mid: 'text-gold',
  heavy: 'text-ink-dim',
};

let uid = 0;

export function RoutingLedger() {
  const [entries, setEntries] = useState<Entry[]>(() =>
    TASKS.slice(0, 5).map((t) => ({ ...t, id: uid++ }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setEntries((prev) => {
        const next = TASKS[Math.floor(Math.random() * TASKS.length)];
        const updated = [{ ...next, id: uid++ }, ...prev].slice(0, 5);
        return updated;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full rounded-2xl border border-paper-line bg-paper-raised/80 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-paper-line px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-dim">
            Live routing ledger
          </span>
        </div>
        <span className="font-mono text-[11px] text-ink-faint">requests/sec: 340</span>
      </div>

      <div className="divide-y divide-paper-line">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between gap-4 px-5 py-3 font-mono text-xs"
            >
              <span className="truncate text-ink-dim">{e.task}</span>
              <span className="flex shrink-0 items-center gap-4">
                <span className={tierColor[e.tier]}>{e.model}</span>
                <span className="hidden text-ink-faint sm:inline">{e.latency}</span>
                <span className="w-16 text-right text-teal">
                  {e.saved === '$0.000' ? '—' : `+${e.saved}`}
                </span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-paper-line px-5 py-2.5">
        <span className="font-mono text-[10px] text-ink-faint">
          every routing decision is logged, timestamped, and exportable — nothing routes silently
        </span>
      </div>
    </div>
  );
}

import { Waypoints } from 'lucide-react';

export function Footer() {
  return (
    <footer id="contact" className="border-t border-paper-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-gold/30 bg-gold/10 p-1.5 text-gold">
              <Waypoints className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-semibold text-ink">Attentra</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-dim">
            The routing ledger for enterprise AI spend — lower model costs, with a record for every decision.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-ink-dim sm:flex sm:gap-12">
          <a href="#how-it-works" className="transition-colors hover:text-ink">How it works</a>
          <a href="#trust" className="transition-colors hover:text-ink">Trust &amp; audit</a>
          <a href="#pricing" className="transition-colors hover:text-ink">Pricing</a>
          <a href="mailto:hello@attentra.ai" className="transition-colors hover:text-ink">Contact</a>
        </div>
      </div>

      <div className="border-t border-paper-line px-4 py-6 text-center font-mono text-[11px] text-ink-faint">
        © 2026 Attentra. The routing ledger for enterprise AI.
      </div>
    </footer>
  );
}

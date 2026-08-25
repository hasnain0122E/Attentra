'use client';
import { motion } from 'framer-motion';
import { Waypoints, ArrowRight } from 'lucide-react';

function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed left-0 right-0 top-0 z-50 flex justify-center p-4"
    >
      <div className="flex h-14 w-full max-w-5xl items-center justify-between rounded-full border border-paper-lineStrong bg-paper/80 px-5 backdrop-blur-md">
        <a href="#" className="flex items-center gap-2">
          <div className="rounded-md border border-gold/30 bg-gold/10 p-1.5 text-gold">
            <Waypoints className="h-4 w-4" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-wide text-ink">
            Attentra
          </span>
        </a>

        <nav className="hidden items-center gap-7 text-sm text-ink-dim md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-ink">How it works</a>
          <a href="#trust" className="transition-colors hover:text-ink">Trust &amp; audit</a>
          <a href="#calculator" className="transition-colors hover:text-ink">Calculator</a>
          <a href="#pricing" className="transition-colors hover:text-ink">Pricing</a>
        </nav>

        <a
          href="#pricing"
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-all hover:bg-gold"
        >
          Get started
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </motion.header>
  );
}

export default Navbar;
export { Navbar };

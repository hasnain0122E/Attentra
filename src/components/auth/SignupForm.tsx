"use client";

import { motion } from "motion/react";
import GoogleButton from "./GoogleButton";

const formVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as any;

/**
 * Google is the only sign-up method during the MVP: the account is
 * created on first Google sign-in (Auth.js + Prisma adapter).
 */
export default function SignupForm() {
  return (
    <motion.div
      variants={formVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <GoogleButton />
      </motion.div>

      <motion.ul
        variants={itemVariants}
        className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-[11px] leading-5 text-[var(--color-foreground-secondary)]"
      >
        <li>Your account is created the first time you continue with Google.</li>
        <li>Free during the MVP — no credit card.</li>
        <li>Next: try the Playground, then create an API key.</li>
      </motion.ul>

      <motion.p
        variants={itemVariants}
        className="px-2 text-center text-[11px] leading-5 text-[var(--color-foreground-muted)]"
      >
        We never see your Google password. Prompts and responses you send are
        stored so you can review them in History.
      </motion.p>
    </motion.div>
  );
}

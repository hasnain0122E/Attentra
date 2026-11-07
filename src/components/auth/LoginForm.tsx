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
 * Google is the only sign-in method during the MVP (Auth.js Google
 * provider). No email/password fields: they would do nothing.
 */
export default function LoginForm() {
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

      <motion.p
        variants={itemVariants}
        className="px-2 text-center text-[11px] leading-5 text-[var(--color-foreground-muted)]"
      >
        Attentra uses Google sign-in during the MVP — we never see your
        Google password. Prompts and responses you send are stored so you can
        review them in History.
      </motion.p>
    </motion.div>
  );
}

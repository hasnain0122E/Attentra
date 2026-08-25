"use client";

import { motion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
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

export default function SignupForm() {
  return (
    <motion.form
      variants={formVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Google */}

      <motion.div variants={itemVariants}>
        <GoogleButton />
      </motion.div>

      {/* Divider */}

      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />

        <span className="font-mono text-[9px] tracking-[0.1em] text-[var(--color-foreground-muted)]">
          OR
        </span>

        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </motion.div>

      {/* Full name */}

      <motion.div variants={itemVariants}>
        <label
          htmlFor="name"
          className="mb-2 block text-xs font-medium text-[var(--color-foreground)]"
        >
          Full name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          className="
            h-12 w-full rounded-xl
            border border-[var(--color-border)]
            bg-[var(--color-background)]
            px-4
            text-sm text-[var(--color-foreground)]
            outline-none
            transition-all
            placeholder:text-[var(--color-foreground-muted)]
            focus:border-[var(--color-accent)]
            focus:ring-4
            focus:ring-[var(--color-accent-soft)]
          "
        />
      </motion.div>

      {/* Email */}

      <motion.div variants={itemVariants}>
        <label
          htmlFor="email"
          className="mb-2 block text-xs font-medium text-[var(--color-foreground)]"
        >
          Email address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className="
            h-12 w-full rounded-xl
            border border-[var(--color-border)]
            bg-[var(--color-background)]
            px-4
            text-sm text-[var(--color-foreground)]
            outline-none
            transition-all
            placeholder:text-[var(--color-foreground-muted)]
            focus:border-[var(--color-accent)]
            focus:ring-4
            focus:ring-[var(--color-accent-soft)]
          "
        />
      </motion.div>

      {/* Password */}

      <motion.div variants={itemVariants}>
        <label
          htmlFor="password"
          className="mb-2 block text-xs font-medium text-[var(--color-foreground)]"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          className="
            h-12 w-full rounded-xl
            border border-[var(--color-border)]
            bg-[var(--color-background)]
            px-4
            text-sm text-[var(--color-foreground)]
            outline-none
            transition-all
            placeholder:text-[var(--color-foreground-muted)]
            focus:border-[var(--color-accent)]
            focus:ring-4
            focus:ring-[var(--color-accent-soft)]
          "
        />

        <p className="mt-2 text-[10px] text-[var(--color-foreground-muted)]">
          Use at least 8 characters.
        </p>
      </motion.div>

      {/* CTA */}

      <motion.div variants={itemVariants}>
        <button
          type="submit"
          className="
            group flex h-12 w-full items-center justify-center gap-2
            rounded-xl
            bg-[var(--color-accent)]
            px-4
            text-sm font-semibold text-white
            transition-all duration-200
            hover:-translate-y-0.5
            hover:brightness-95
            hover:shadow-[0_10px_30px_var(--color-accent-soft)]
            active:translate-y-0
          "
        >
          Create account
          <ArrowRight
            size={16}
            weight="regular"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </motion.div>

      {/* Terms */}

      <motion.p
        variants={itemVariants}
        className="px-2 text-center text-[10px] leading-5 text-[var(--color-foreground-muted)]"
      >
        By creating an account, you agree to Attentra&apos;s{" "}
        <a
          href="#terms"
          className="text-[var(--color-foreground-secondary)] underline-offset-4 hover:underline"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="#privacy"
          className="text-[var(--color-foreground-secondary)] underline-offset-4 hover:underline"
        >
          Privacy Policy
        </a>
        .
      </motion.p>
    </motion.form>
  );
}

"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
} from "@phosphor-icons/react";

const productLinks = [
  { label: "Why routing", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Demo", href: "#product-demo" },
  { label: "Benefits", href: "#why-attentra" },
];

const developerLinks = [
  { label: "Documentation", href: "/docs" },
  { label: "Quickstart", href: "/docs/quickstart" },
  { label: "API reference", href: "/docs/api/chat-completions" },
  { label: "Pricing preview", href: "#pricing" },
];

const resourceLinks = [
  { label: "Get started", href: "/signup" },
  { label: "Log in", href: "/login" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-background)]">
      {/* =========================================================
          SUBTLE ATMOSPHERE
          ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute bottom-[-18rem] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] opacity-10 blur-[140px]" />
      </div>

      <div className="attentra-container relative z-10">
        {/* =======================================================
            MAIN FOOTER
            ======================================================= */}

        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10 lg:py-24">
          {/* =====================================================
              BRAND
              ===================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.55,
            }}
            className="max-w-sm"
          >
            <a
              href="#top"
              className="group inline-flex items-center"
              aria-label="Attentra home"
            >
              <span className="text-xl font-semibold tracking-[-0.045em] text-[var(--color-foreground)]">
                Attentra
              </span>

              <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-125" />
            </a>

            <p className="mt-5 max-w-xs text-sm leading-6 text-[var(--color-foreground-secondary)]">
              An OpenAI-compatible gateway that routes each request across
              OpenAI, Anthropic and Google — and shows you why.
            </p>

          </motion.div>

          {/* =====================================================
              PRODUCT
              ===================================================== */}

          <FooterColumn
            title="Product"
            links={productLinks}
            delay={0.08}
          />

          {/* =====================================================
              DEVELOPERS
              ===================================================== */}

          <FooterColumn
            title="Developers"
            links={developerLinks}
            delay={0.14}
          />

          {/* =====================================================
              RESOURCES
              ===================================================== */}

          <FooterColumn
            title="Resources"
            links={resourceLinks}
            delay={0.2}
          />
        </div>

        {/* =======================================================
            BOTTOM BAR
            ======================================================= */}

        <div className="flex flex-col gap-5 border-t border-[var(--color-border)] py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--color-foreground-muted)]">
              © {year} ATTENTRA
            </span>

            <span className="text-[10px] text-[var(--color-foreground-muted)]">
              Intelligent infrastructure for AI applications.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span
              className="text-[10px] text-[var(--color-foreground-muted)]"
            >
              Privacy
            </span>

            <span
              className="text-[10px] text-[var(--color-foreground-muted)]"
            >
              Terms
            </span>

            <a
              href="#top"
              className="group flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-foreground-secondary)] transition-colors hover:text-[var(--color-accent)]"
            >
              Back to top

              <ArrowUpRight
                size={11}
                className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ===============================================================
   FOOTER COLUMN
   =============================================================== */

function FooterColumn({
  title,
  links,
  delay,
}: {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
  delay: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 15,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
      }}
      transition={{
        duration: 0.55,
        delay,
      }}
    >
      <div className="font-mono text-[8px] tracking-[0.14em] text-[var(--color-foreground-muted)]">
        {title.toUpperCase()}
      </div>

      <nav className="mt-5 flex flex-col items-start gap-3.5">
        {links.map((link) => {
          const className =
            "group flex items-center gap-1 text-xs text-[var(--color-foreground-secondary)] transition-colors duration-200 hover:text-[var(--color-foreground)]";
          const content = (
            <>
              {link.label}

              <ArrowUpRight
                size={10}
                className="opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-50"
              />
            </>
          );
          // Routes use Next.js Link; in-page sections use anchors.
          return link.href.startsWith("/") ? (
            <Link key={link.label} href={link.href} className={className}>
              {content}
            </Link>
          ) : (
            <a key={link.label} href={link.href} className={className}>
              {content}
            </a>
          );
        })}
      </nav>
    </motion.div>
  );
}

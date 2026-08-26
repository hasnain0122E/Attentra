"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import Image from "next/image";
const navItems = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why Attentra", href: "#why-attentra" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Developer", href: "#developers" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* =========================================================
          DESKTOP + MOBILE HEADER
          ========================================================= */}

      <motion.header
        initial={{
          y: -20,
          opacity: 0,
        }}
        animate={{
          y: 0,
          opacity: 1,
        }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="pointer-events-none fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-6"
      >
        <motion.div
          animate={{
            maxWidth: scrolled ? 1100 : 1280,
            y: scrolled ? 4 : 0,
          }}
          transition={{
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={[
            "attentra-container",
            "pointer-events-auto",
            "relative flex h-16 items-center justify-between",
            "rounded-full px-4 sm:px-5",
            "transition-all duration-300",
            scrolled
              ? "border border-[var(--color-border)] bg-white/85 shadow-[var(--shadow-md)] backdrop-blur-xl"
              : "border border-transparent bg-transparent",
          ].join(" ")}
        >
          {/* =====================================================
              LOGO
              ===================================================== */}

          <a
            href="#top"
            className="group flex items-center gap-2"
            aria-label="Attentra home"
          >
            <Image
              src="/Attentra.png"
              alt="Attentra Logo"
              width={120}
              height={32}
              priority
              className="h-8 w-auto object-contain"
            />
          </a>

          {/* =====================================================
              DESKTOP NAVIGATION
              ===================================================== */}

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--color-foreground-secondary)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-foreground)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* =====================================================
              DESKTOP ACTIONS
              ===================================================== */}

          <div className="hidden items-center gap-2 md:flex">
            <a
              href="#docs"
              className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--color-foreground-secondary)] transition-colors hover:text-[var(--color-foreground)]"
            >
              Docs
            </a>

            <a
              href="/signup"
              className="group flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-[13px] font-medium text-white transition-transform duration-200 hover:-translate-y-0.5"
            >
              Get access
              <ArrowUpRight
                size={14}
                strokeWidth={1.8}
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </div>

          {/* =====================================================
              MOBILE MENU BUTTON
              ===================================================== */}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={18} /> : <List size={18} />}
          </button>
        </motion.div>
      </motion.header>

      {/* =========================================================
          MOBILE NAVIGATION

          IMPORTANT:
          This is intentionally OUTSIDE the fixed header.

          When closed, it is completely removed from the DOM.
          Therefore it cannot create an invisible overlay over
          the sections underneath.
          ========================================================= */}

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-navigation"
            initial={{
              opacity: 0,
              y: -10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            transition={{
              duration: 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="pointer-events-auto fixed left-0 right-0 top-0 z-40 px-4 pt-[5.25rem] sm:px-6 md:hidden"
          >
            <div className="attentra-container rounded-3xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-lg)]">
              <nav className="flex flex-col">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={closeMobile}
                    className="rounded-2xl px-4 py-3.5 text-sm font-medium text-[var(--color-foreground-secondary)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-foreground)]"
                  >
                    {item.label}
                  </a>
                ))}

                <a
                  href="#docs"
                  onClick={closeMobile}
                  className="rounded-2xl px-4 py-3.5 text-sm font-medium text-[var(--color-foreground-secondary)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-foreground)]"
                >
                  Docs
                </a>

                <a
                  href="/signup"
                  onClick={closeMobile}
                  className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] px-4 py-3.5 text-sm font-medium text-white"
                >
                  Get access
                  <ArrowUpRight size={15} />
                </a>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export { Navbar };

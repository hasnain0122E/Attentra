"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { List, X } from "@phosphor-icons/react";

import DocsSearch from "./DocsSearch";
import DocsSidebar from "./DocsSidebar";

/** Sticky docs header with search and an accessible mobile navigation drawer. */
export default function DocsHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  // Close the drawer after navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      menuRef.current?.focus();
    };
  }, [drawerOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0A0C0F]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <button
          ref={menuRef}
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open documentation menu"
          aria-expanded={drawerOpen}
          aria-controls="docs-drawer"
          className="-ml-1 rounded-md p-1.5 text-[#A7B0BA] hover:text-white lg:hidden"
        >
          <List size={22} />
        </button>

        <Link href="/docs" className="flex items-center gap-2.5" aria-label="Attentra documentation home">
          {/* The logo artwork is dark; invert it for the dark docs theme. */}
          <Image src="/Attentra.png" alt="Attentra" width={110} height={28} className="h-6 w-auto invert" priority />
          <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-[#A7B0BA]">
            Docs
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <DocsSearch />
          <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
            <Link href="/" className="rounded-md px-2.5 py-1.5 text-[13px] text-[#A7B0BA] hover:text-white">
              Home
            </Link>
            <Link href="/dashboard" className="rounded-md px-2.5 py-1.5 text-[13px] text-[#A7B0BA] hover:text-white">
              Dashboard
            </Link>
          </nav>
          <Link
            href="/dashboard/api-keys"
            className="hidden h-9 items-center rounded-lg bg-[var(--color-accent)] px-3.5 text-[13px] font-medium text-white transition hover:brightness-110 sm:inline-flex"
          >
            Get API key
          </Link>
        </div>
      </div>

      {/* Portal: the header's backdrop-filter would otherwise become the
          containing block for this fixed overlay and clip it to 64px. */}
      {drawerOpen && createPortal(
        <div className="fixed inset-0 z-[55] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div
            id="docs-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Documentation menu"
            className="absolute inset-y-0 left-0 flex w-[85vw] max-w-xs flex-col border-r border-white/10 bg-[#0D1014]"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <span className="text-[14px] font-semibold text-white">Documentation</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close documentation menu"
                className="rounded-md p-1.5 text-[#A7B0BA] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-5">
              <DocsSidebar onNavigate={() => setDrawerOpen(false)} />
              <div className="mt-8 space-y-1 border-t border-white/10 px-1 pt-5">
                <Link href="/" className="block rounded-lg px-3 py-1.5 text-[14px] text-[#A7B0BA] hover:text-white">
                  ← Attentra home
                </Link>
                <Link href="/dashboard" className="block rounded-lg px-3 py-1.5 text-[14px] text-[#A7B0BA] hover:text-white">
                  Dashboard
                </Link>
                <Link href="/dashboard/api-keys" className="block rounded-lg px-3 py-1.5 text-[14px] font-medium text-[#F2A97E]">
                  Get API key
                </Link>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}

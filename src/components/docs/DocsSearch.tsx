"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

import type { DocsSearchEntry } from "@/lib/docs/navigation";
import { searchDocs } from "@/lib/docs/search";

/** Search trigger button + modal dialog. Opens with "/" or Ctrl/⌘+K. */
export default function DocsSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const results = useMemo(() => searchDocs(query), [query]);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
    triggerRef.current?.focus();
  }

  function go(entry: DocsSearchEntry) {
    close();
    router.push(entry.href);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      go(results[active]);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search documentation"
        className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#8A939D] transition hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] sm:w-56"
      >
        <MagnifyingGlass size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Search docs…</span>
        <kbd className="ml-auto hidden rounded border border-white/10 px-1.5 font-mono text-[10px] text-[#6E7781] sm:inline">
          Ctrl K
        </kbd>
      </button>

      {/* Portal: escape the header's backdrop-filter containing block. */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search documentation"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#111418] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <MagnifyingGlass size={18} className="text-[#8A939D]" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Search: routing, 429, conversation history…"
                aria-label="Search query"
                aria-controls="docs-search-results"
                aria-activedescendant={results[active] ? `docs-result-${active}` : undefined}
                className="h-14 flex-1 bg-transparent text-[15px] text-white placeholder:text-[#5C6670] focus:outline-none"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="rounded-md p-1 text-[#8A939D] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <ul id="docs-search-results" role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
              {query.trim() === "" ? (
                <li className="px-3 py-6 text-center text-[13px] text-[#6E7781]">
                  Type to search page titles, sections and topics.
                </li>
              ) : results.length === 0 ? (
                <li className="px-3 py-6 text-center text-[13px] text-[#8A939D]">
                  No results for “{query}”.
                </li>
              ) : (
                results.map((entry, index) => (
                  <li
                    key={entry.href}
                    id={`docs-result-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(entry)}
                    className={[
                      "cursor-pointer rounded-lg px-3 py-2.5",
                      index === active ? "bg-white/[0.06]" : "",
                    ].join(" ")}
                  >
                    <p className="text-[14px] font-medium text-white">{entry.title}</p>
                    <p className="mt-0.5 text-[12px] text-[#8A939D]">
                      {entry.section}
                      {entry.href.includes("#") ? ` › ${entry.pageTitle}` : ""}
                    </p>
                  </li>
                ))
              )}
            </ul>
            <p className="border-t border-white/10 px-4 py-2 font-mono text-[11px] text-[#5C6670]">
              ↑↓ to move · Enter to open · Esc to close
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

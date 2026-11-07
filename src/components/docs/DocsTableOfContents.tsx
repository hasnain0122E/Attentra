"use client";

import { useEffect, useState } from "react";

import type { DocsHeading } from "@/lib/docs/navigation";

/** "On this page" list; highlights the section currently in view. */
export default function DocsTableOfContents({ headings }: { headings: DocsHeading[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(headings[0]?.id);

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page">
      <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#6E7781]">
        On this page
      </p>
      <ul className="space-y-1 border-l border-white/[0.08]">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? "location" : undefined}
              className={[
                "-ml-px block border-l py-1 pl-3 text-[13px] leading-5 transition",
                activeId === h.id
                  ? "border-[var(--color-accent)] text-white"
                  : "border-transparent text-[#8A939D] hover:text-white",
              ].join(" ")}
            >
              {h.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

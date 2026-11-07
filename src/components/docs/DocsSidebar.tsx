"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DOCS_SECTIONS, docsHref } from "@/lib/docs/navigation";

/** Documentation navigation. Highlights the current page. */
export default function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="space-y-7">
      {DOCS_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#6E7781]">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.pages.map((page) => {
              const href = docsHref(page);
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "block rounded-lg px-3 py-1.5 text-[14px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
                      active
                        ? "bg-[var(--color-accent)]/[0.12] font-medium text-[#F2A97E]"
                        : "text-[#A7B0BA] hover:bg-white/[0.04] hover:text-white",
                    ].join(" ")}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

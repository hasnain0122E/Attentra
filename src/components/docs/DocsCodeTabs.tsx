"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import type { DocsLanguage } from "@/lib/docs/highlight";

import { CopyButton, HighlightedCode } from "./DocsCodeBlock";

export interface DocsCodeTab {
  label: string;
  language: DocsLanguage;
  code: string;
}

/** Language switcher (e.g. Python / JavaScript / cURL) with ARIA tabs. */
export default function DocsCodeTabs({ tabs }: { tabs: DocsCodeTab[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (active + delta + tabs.length) % tabs.length;
    setActive(next);
    buttons.current[next]?.focus();
  }

  const tab = tabs[active];

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/10 bg-[#0D1014]">
      <div className="flex items-center justify-between border-b border-white/10 px-2">
        <div role="tablist" aria-label="Code language" className="flex">
          {tabs.map((t, index) => (
            <button
              key={t.label}
              ref={(el) => {
                buttons.current[index] = el;
              }}
              id={`${baseId}-tab-${index}`}
              role="tab"
              type="button"
              aria-selected={index === active}
              aria-controls={`${baseId}-panel`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={onKeyDown}
              className={[
                "border-b-2 px-3 py-2 text-[12px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
                index === active
                  ? "border-[var(--color-accent)] text-white"
                  : "border-transparent text-[#8A939D] hover:text-white",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CopyButton text={tab.code} />
      </div>
      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`}>
        <HighlightedCode code={tab.code} language={tab.language} />
      </div>
    </div>
  );
}

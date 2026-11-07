"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

import { highlight, type DocsLanguage, type TokenKind } from "@/lib/docs/highlight";

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "",
  comment: "text-[#6E7781] italic",
  string: "text-[#9FD4A8]",
  keyword: "text-[#F2A97E]",
  number: "text-[#E8C27D]",
  property: "text-[#8CC4FF]",
};

const LANGUAGE_LABEL: Record<DocsLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  bash: "Shell",
  powershell: "PowerShell",
  json: "JSON",
  text: "Text",
};

/** Copy-to-clipboard button with visible feedback. */
export function CopyButton({ text, label = "Copy code" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  /** Legacy fallback for contexts where the async Clipboard API is unavailable. */
  function legacyCopy(): boolean {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.appendChild(area);
    area.focus({ preventScroll: true });
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    previousFocus?.focus({ preventScroll: true });
    return ok;
  }

  async function copy() {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        // Some browsers leave the promise pending (e.g. a permission prompt);
        // don't wait forever before trying the fallback.
        ok = await Promise.race([
          navigator.clipboard.writeText(text).then(() => true),
          new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 1000)),
        ]);
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = legacyCopy();

    setState(ok ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), ok ? 1500 : 2500);
  }

  const labelText = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={state === "idle" ? label : labelText}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] text-[#9AA4AF] transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
    >
      {state === "copied" ? <Check size={13} weight="bold" /> : <Copy size={13} />}
      <span aria-live="polite">{labelText}</span>
    </button>
  );
}

/** Highlighted code. Rendered as text — never as HTML. */
export function HighlightedCode({ code, language }: { code: string; language: DocsLanguage }) {
  return (
    <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6 text-[#D5DAE0]">
      <code>
        {highlight(code, language).map((token, index) => (
          <span key={index} className={TOKEN_CLASS[token.kind]}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
}

export default function DocsCodeBlock({
  code,
  language,
  title,
}: {
  code: string;
  language: DocsLanguage;
  title?: string;
}) {
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/10 bg-[#0D1014]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] text-[#8A939D]">
          {title ?? LANGUAGE_LABEL[language]}
        </span>
        <CopyButton text={code} />
      </div>
      <HighlightedCode code={code} language={language} />
    </div>
  );
}

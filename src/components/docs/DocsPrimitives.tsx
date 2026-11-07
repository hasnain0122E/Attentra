import Link from "next/link";
import type { ReactNode } from "react";
import { Info, Lightbulb, Warning } from "@phosphor-icons/react/dist/ssr";

/**
 * Server-rendered typography for documentation pages, scoped to the
 * dark docs theme (no global CSS).
 */

export function DocsH2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="group mt-12 scroll-mt-24 border-t border-white/[0.06] pt-8 text-[22px] font-semibold tracking-[-0.02em] text-white first:mt-0 first:border-t-0 first:pt-0"
    >
      {children}
      <a
        href={`#${id}`}
        aria-label="Link to this section"
        className="ml-2 text-[#5C6670] opacity-0 transition group-hover:opacity-100 focus:opacity-100"
      >
        #
      </a>
    </h2>
  );
}

export function DocsH3({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 text-[16px] font-semibold text-white">{children}</h3>;
}

export function DocsP({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[15px] leading-7 text-[#BAC2CB]">{children}</p>;
}

export function DocsList({ children, ordered = false }: { children: ReactNode; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`mt-4 space-y-2 pl-5 text-[15px] leading-7 text-[#BAC2CB] marker:text-[#5C6670] ${
        ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {children}
    </Tag>
  );
}

/** Inline code. */
export function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[13px] text-[#E7E9EC]">
      {children}
    </code>
  );
}

export function DocsLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-[#F2A97E] underline decoration-[#F2A97E]/30 underline-offset-4 transition hover:decoration-[#F2A97E]"
    >
      {children}
    </Link>
  );
}

const CALLOUT_STYLES = {
  note: { icon: Info, label: "Note", border: "border-[#3B82F6]/30", bg: "bg-[#3B82F6]/[0.07]", text: "text-[#93C5FD]" },
  tip: { icon: Lightbulb, label: "Tip", border: "border-[#22C55E]/30", bg: "bg-[#22C55E]/[0.07]", text: "text-[#86EFAC]" },
  warning: { icon: Warning, label: "Important", border: "border-[#F59E0B]/35", bg: "bg-[#F59E0B]/[0.07]", text: "text-[#FCD34D]" },
};

export function DocsCallout({
  type = "note",
  title,
  children,
}: {
  type?: keyof typeof CALLOUT_STYLES;
  title?: string;
  children: ReactNode;
}) {
  const style = CALLOUT_STYLES[type];
  const Icon = style.icon;
  return (
    <div className={`my-6 rounded-xl border ${style.border} ${style.bg} px-4 py-3.5`}>
      <div className={`flex items-center gap-2 text-[13px] font-semibold ${style.text}`}>
        <Icon size={16} weight="duotone" aria-hidden="true" />
        {title ?? style.label}
      </div>
      <div className="mt-1.5 text-[14px] leading-6 text-[#C9D0D7] [&_code]:text-[12.5px]">{children}</div>
    </div>
  );
}

export function DocsTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        <thead className="bg-white/[0.03]">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="border-b border-white/10 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A939D]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.06] last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top leading-6 text-[#BAC2CB]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Simple boxed flow diagram (text only, accessible). */
export function DocsFlow({ steps }: { steps: string[] }) {
  return (
    <ol
      aria-label="Request flow"
      className="my-6 flex flex-col items-stretch gap-2 rounded-xl border border-white/10 bg-[#0D1014] p-4 sm:flex-row sm:flex-wrap sm:items-center"
    >
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2 sm:contents">
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[13px] font-medium text-[#E7E9EC]">
            {step}
          </span>
          {index < steps.length - 1 && (
            <span aria-hidden="true" className="text-center text-[#5C6670]">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

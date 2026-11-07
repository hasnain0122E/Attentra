import type { ReactNode } from "react";

import DocsHeader from "@/components/docs/DocsHeader";
import DocsSidebar from "@/components/docs/DocsSidebar";

/**
 * /docs — public developer documentation (no authentication).
 * Dark treatment is scoped to this layout; no global CSS changes.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div data-docs-root className="min-h-screen bg-[#0A0C0F] font-body text-[#D5DAE0] antialiased [color-scheme:dark]">
      {/*
        globals.css sets overflow-x: hidden on html/body, which makes body a
        scroll container and breaks position: sticky (header, sidebars).
        While the docs are mounted, use overflow-x: clip instead — same
        clipping, no scroll container. Scoped to docs via :has().
      */}
      <style>{`html:has([data-docs-root]), html:has([data-docs-root]) body { overflow-x: clip; background: #0A0C0F; }`}</style>
      <a
        href="#docs-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>
      <DocsHeader />
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-white/[0.06] px-3 py-8 lg:block">
          <DocsSidebar />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

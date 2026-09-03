"use client";

import {
  Bell,
  List,
} from "@phosphor-icons/react";

import { usePathname } from "next/navigation";

interface DashboardHeaderProps {
  onOpenSidebar: () => void;
}

const pageNames: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/playground": "Playground",
  "/dashboard/history": "History",
  "/dashboard/api-keys": "API keys",
  "/billing": "Billing",
  "/dashboard/settings": "Settings",
};

function getPageName(pathname: string) {
  if (
    pathname.startsWith(
      "/dashboard/history/",
    )
  ) {
    return "Request detail";
  }

  return (
    pageNames[pathname] ??
    "Workspace"
  );
}

export default function DashboardHeader({
  onOpenSidebar,
}: DashboardHeaderProps) {
  const pathname = usePathname();

  const currentPage =
    getPageName(pathname);

  return (
    <header
      className={[
        "sticky top-0 z-50",
        "h-[64px]",
        "border-b border-[var(--color-border)]",
        "bg-[var(--color-background)]/90",
        "backdrop-blur-xl",
      ].join(" ")}
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 2xl:px-10">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)] lg:hidden"
          >
            <List
              size={16}
              weight="bold"
            />
          </button>

          <div className="min-w-0">
            <div className="hidden items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)] sm:flex">
              <span>Attentra</span>
              <span>/</span>
              <span>Consumer</span>
            </div>

            <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)] sm:mt-1">
              {currentPage}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]"
          >
            <Bell
              size={14}
              weight="duotone"
            />

            <span className="absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          </button>

          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 transition hover:border-[var(--color-border-strong)] sm:px-2.5"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-foreground)] font-mono text-[7px] uppercase text-white">
              HA
            </div>

            <div className="hidden pr-1 text-left md:block">
              <div className="max-w-[110px] truncate text-[9px] font-medium text-[var(--color-foreground)]">
                Account
              </div>

              <div className="mt-0.5 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                Consumer
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
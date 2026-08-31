"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import type {
  ElementType,
  ReactNode,
} from "react";

import {
  ArrowUpRight,
  Buildings,
  ClockCounterClockwise,
  GearSix,
  GridFour,
  Key,
  Sparkle,
  X,
} from "@phosphor-icons/react";

interface DashboardSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const workspaceNavigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: GridFour,
    exact: true,
  },
  {
    label: "Playground",
    href: "/dashboard/playground",
    icon: Sparkle,
  },
  {
    label: "History",
    href: "/dashboard/history",
    icon: ClockCounterClockwise,
  },
  {
    label: "API keys",
    href: "/dashboard/api-keys",
    icon: Key,
  },
];

const accountNavigation = [
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: GearSix,
  },
];

export default function DashboardSidebar({
  mobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  function isActive(
    href: string,
    exact = false,
  ) {
    if (exact) {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onMobileClose}
        className={[
          "fixed inset-0 z-[80] bg-[var(--color-foreground)]/20 backdrop-blur-[2px]",
          "transition-opacity duration-200 lg:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-[90]",
          "flex w-[286px] flex-col",
          "border-r border-[var(--color-border)]",
          "bg-[var(--color-background)]",
          "transition-transform duration-200 ease-out",
          "lg:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5">
          <Link
            href="/dashboard"
            onClick={onMobileClose}
            className="flex items-center gap-3"
          >
            <img
              src="/Attentra.png"
              alt="Attentra"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-foreground-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-foreground)] lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Workspace identity */}
        <div className="px-4 pt-5">
          <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Buildings
                  size={15}
                  weight="duotone"
                />
              </div>

              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                  Personal workspace
                </div>

                <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]">
                  Consumer
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-5 pt-7">
          <NavigationLabel>
            Workspace
          </NavigationLabel>

          <div className="mt-3 space-y-1">
            {workspaceNavigation.map(
              (item) => (
                <NavigationItem
                  key={item.href}
                  {...item}
                  active={isActive(
                    item.href,
                    item.exact,
                  )}
                  onClick={
                    onMobileClose
                  }
                />
              ),
            )}
          </div>

          <div className="my-5 border-t border-[var(--color-border)]" />

          <div className="space-y-1">
            {accountNavigation.map(
              (item) => (
                <NavigationItem
                  key={item.href}
                  {...item}
                  active={isActive(
                    item.href,
                  )}
                  onClick={
                    onMobileClose
                  }
                />
              ),
            )}
          </div>
        </nav>

        {/* Business CTA */}
        <div className="shrink-0 p-4 pt-0">
          <Link
            href="/business"
            onClick={onMobileClose}
            className="group block rounded-[20px] bg-[var(--color-foreground)] p-4 text-white transition hover:opacity-[0.96]"
          >
            <div className="font-mono text-[7px] uppercase tracking-[0.13em] text-white/45">
              For teams
            </div>

            <div className="mt-3 max-w-[190px] font-reservation text-[20px] leading-[0.96] tracking-[-0.025em]">
              Manage AI usage across your
              business.
            </div>

            <div className="mt-5 flex items-center gap-1.5 text-[9px] font-medium text-white/75 transition group-hover:text-white">
              Business workspace

              <ArrowUpRight
                size={10}
                weight="bold"
              />
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}

interface NavigationItemProps {
  label: string;
  href: string;
  icon: ElementType;
  active: boolean;
  onClick: () => void;
}

function NavigationItem({
  label,
  href,
  icon: Icon,
  active,
  onClick,
}: NavigationItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "group flex min-h-11 items-center gap-3 rounded-xl px-3",
        "text-[11px] font-medium transition",
        active
          ? "bg-[var(--color-accent-soft)] text-[var(--color-foreground)]"
          : "text-[var(--color-foreground-secondary)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-foreground)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-7 w-7 items-center justify-center rounded-lg transition",
          active
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-foreground-muted)] group-hover:text-[var(--color-foreground-secondary)]",
        ].join(" ")}
      >
        <Icon
          size={15}
          weight={
            active
              ? "duotone"
              : "regular"
          }
        />
      </div>

      <span>{label}</span>
    </Link>
  );
}

function NavigationLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="px-3 font-mono text-[7px] uppercase tracking-[0.17em] text-[var(--color-foreground-muted)]">
      {children}
    </div>
  );
}
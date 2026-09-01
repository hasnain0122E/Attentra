import type { ReactNode } from "react";

import {
  CheckCircle,
  Clock,
  EnvelopeSimple,
  Prohibit,
} from "@phosphor-icons/react/dist/ssr";

import type {
  BusinessMember,
  BusinessMemberStatus,
} from "@/lib/business/member-data";

interface MemberDirectoryProps {
  members: BusinessMember[];
}

function formatLatency(value: number) {
  if (value === 0) {
    return "—";
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

function formatLastActive(
  value?: string,
) {
  if (!value) {
    return "Not active yet";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

export default function MemberDirectory({
  members,
}: MemberDirectoryProps) {
  if (members.length === 0) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <div className="font-reservation text-[25px] text-[var(--color-foreground)]">
          No matching members.
        </div>

        <p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Try changing the active search,
          role, or member status filter.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Member directory
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Organization access
        </h2>

        <p className="mt-2 max-w-[600px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Members, roles, application
          activity, and workspace access
          across Acme AI.
        </p>
      </div>

      {/* Desktop header */}
      <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/40 px-6 py-3 xl:grid xl:grid-cols-[minmax(220px,1.4fr)_105px_105px_105px_110px_130px_90px] xl:items-center xl:gap-4">
        <HeaderLabel>Member</HeaderLabel>
        <HeaderLabel>Requests</HeaderLabel>
        <HeaderLabel>Share</HeaderLabel>
        <HeaderLabel>Fallback</HeaderLabel>
        <HeaderLabel>Latency</HeaderLabel>
        <HeaderLabel>Last active</HeaderLabel>
        <HeaderLabel>Status</HeaderLabel>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {members.map((member) => (
          <article
            key={member.id}
            className="px-5 py-5 transition-colors hover:bg-[var(--color-surface-soft)]/30 sm:px-6"
          >
            {/* MOBILE / TABLET */}
            <div className="xl:hidden">
              {/* Identity row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-accent-soft)] font-mono text-[8px] font-semibold text-[var(--color-accent)]">
                    {member.initials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                        {member.name}
                      </div>

                      <RoleBadge
                        role={member.role}
                      />
                    </div>

                    <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                      <EnvelopeSimple
                        size={9}
                        className="shrink-0 text-[var(--color-foreground-muted)]"
                      />

                      <span className="truncate font-mono text-[7px] text-[var(--color-foreground-muted)]">
                        {member.email}
                      </span>
                    </div>
                  </div>
                </div>

                <StatusBadge
                  status={member.status}
                />
              </div>

              {/* API key labels */}
              {member.apiKeys.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 pl-[52px]">
                  {member.apiKeys.map(
                    (apiKey) => (
                      <span
                        key={apiKey}
                        className="rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.07em] text-[var(--color-foreground-muted)]"
                      >
                        {apiKey}
                      </span>
                    ),
                  )}
                </div>
              )}

              {/* Compact metrics */}
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
                <MobileMetric
                  label="Requests"
                  value={
                    member.requestCount === 0
                      ? "—"
                      : member.requestCount.toLocaleString()
                  }
                />

                <MobileMetric
                  label="Request share"
                  value={
                    member.requestShare === 0
                      ? "—"
                      : `${member.requestShare.toFixed(1)}%`
                  }
                  accent={
                    member.requestShare >= 20
                  }
                />

                <MobileMetric
                  label="Fallback"
                  value={
                    member.requestCount === 0
                      ? "—"
                      : `${member.fallbackRate.toFixed(1)}%`
                  }
                />

                <MobileMetric
                  label="Avg latency"
                  value={formatLatency(
                    member.avgLatencyMs,
                  )}
                />
              </div>

              {/* Last active footer */}
              <div className="mt-5 flex items-center gap-2 border-t border-[var(--color-border)] pt-4">
                <Clock
                  size={10}
                  className="shrink-0 text-[var(--color-foreground-muted)]"
                />

                <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  Last active
                </span>

                <span className="ml-auto text-[8px] text-[var(--color-foreground-secondary)]">
                  {formatLastActive(
                    member.lastActiveAt,
                  )}
                </span>
              </div>
            </div>

            {/* DESKTOP */}
            <div className="hidden xl:grid xl:grid-cols-[minmax(220px,1.4fr)_105px_105px_105px_110px_130px_90px] xl:items-center xl:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-accent-soft)] font-mono text-[8px] font-semibold text-[var(--color-accent)]">
                  {member.initials}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-[10px] font-semibold text-[var(--color-foreground)]">
                      {member.name}
                    </div>

                    <RoleBadge
                      role={member.role}
                    />
                  </div>

                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <EnvelopeSimple
                      size={9}
                      className="shrink-0 text-[var(--color-foreground-muted)]"
                    />

                    <span className="truncate font-mono text-[7px] text-[var(--color-foreground-muted)]">
                      {member.email}
                    </span>
                  </div>

                  {member.apiKeys.length >
                    0 && (
                    <div className="mt-1.5 truncate font-mono text-[6px] uppercase tracking-[0.06em] text-[var(--color-foreground-muted)]">
                      {member.apiKeys.join(
                        " · ",
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DesktopMetric
                value={
                  member.requestCount === 0
                    ? "—"
                    : member.requestCount.toLocaleString()
                }
              />

              <DesktopMetric
                value={
                  member.requestShare === 0
                    ? "—"
                    : `${member.requestShare.toFixed(1)}%`
                }
                accent={
                  member.requestShare >= 20
                }
              />

              <DesktopMetric
                value={
                  member.requestCount === 0
                    ? "—"
                    : `${member.fallbackRate.toFixed(1)}%`
                }
              />

              <DesktopMetric
                value={formatLatency(
                  member.avgLatencyMs,
                )}
              />

              <div className="flex items-center gap-1.5 text-[8px] text-[var(--color-foreground-secondary)]">
                <Clock
                  size={9}
                  className="shrink-0 text-[var(--color-foreground-muted)]"
                />

                <span className="truncate">
                  {formatLastActive(
                    member.lastActiveAt,
                  )}
                </span>
              </div>

              <StatusBadge
                status={member.status}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HeaderLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
      {children}
    </div>
  );
}

function MobileMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[6px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div
        className={[
          "mt-2 font-mono text-[9px]",
          accent
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-foreground)]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function DesktopMetric({
  value,
  accent = false,
}: {
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "font-mono text-[9px]",
        accent
          ? "text-[var(--color-accent)]"
          : "text-[var(--color-foreground)]",
      ].join(" ")}
    >
      {value}
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: BusinessMember["role"];
}) {
  const accent =
    role === "OWNER" ||
    role === "ADMIN";

  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 font-mono text-[6px] uppercase tracking-[0.08em]",
        accent
          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-muted)]",
      ].join(" ")}
    >
      {role}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: BusinessMemberStatus;
}) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <CheckCircle size={8} />
        Active
      </span>
    );
  }

  if (status === "INVITED") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-secondary)]">
        <EnvelopeSimple size={8} />
        Invited
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
      <Prohibit size={8} />
      Inactive
    </span>
  );
}
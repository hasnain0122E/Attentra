import Link from "next/link";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { businessMemberUsage } from "@/lib/business/overview-data";

export default function BusinessMemberActivity() {
  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Member activity
          </div>

          <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
            Who is generating usage
          </h2>

          <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
            Organization request volume grouped by
            active members.
          </p>
        </div>

        <Link
          href="/business/members"
          className="group hidden shrink-0 items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)] transition hover:text-[var(--color-accent)] sm:flex"
        >
          All members

          <ArrowRight
            size={9}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="mt-6 divide-y divide-[var(--color-border)]">
        {businessMemberUsage.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] font-mono text-[8px] font-semibold text-[var(--color-foreground-secondary)]">
              {member.initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-semibold text-[var(--color-foreground)]">
                    {member.name}
                  </div>

                  <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    {member.role}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-mono text-[9px] text-[var(--color-foreground)]">
                    {member.requestCount.toLocaleString()}
                  </div>

                  <div className="mt-1 font-mono text-[7px] text-[var(--color-foreground-muted)]">
                    {member.percentage}%
                  </div>
                </div>
              </div>

              <div className="mt-2.5 h-[4px] overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{
                    width: `${member.percentage}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/business/members"
        className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] py-2.5 font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)] sm:hidden"
      >
        View members
        <ArrowRight size={9} />
      </Link>
    </section>
  );
}
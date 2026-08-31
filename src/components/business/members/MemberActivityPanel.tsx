import {
  ArrowRight,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

import { businessMembers } from "@/lib/business/member-data";

export default function MemberActivityPanel() {
  const activeMembers =
    businessMembers
      .filter(
        (member) =>
          member.status === "ACTIVE" &&
          member.requestCount > 0,
      )
      .sort(
        (a, b) =>
          b.requestCount -
          a.requestCount,
      )
      .slice(0, 6);

  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Member activity
          </div>

          <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
            Who is generating traffic
          </h2>

          <p className="mt-2 max-w-[520px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
            Request contribution across
            the most active organization
            members.
          </p>
        </div>

        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] sm:flex">
          <UsersThree
            size={15}
            weight="duotone"
          />
        </div>
      </div>

      <div className="mt-7 space-y-5">
        {activeMembers.map(
          (member, index) => (
            <div key={member.id}>
              <div className="flex items-end justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-surface-soft)] font-mono text-[7px] font-semibold text-[var(--color-foreground-secondary)]">
                    {member.initials}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-semibold text-[var(--color-foreground)]">
                      {member.name}
                    </div>

                    <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                      {member.role}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-[9px] text-[var(--color-foreground)]">
                    {member.requestCount.toLocaleString()}
                  </div>

                  <div className="mt-1 font-mono text-[7px] text-[var(--color-accent)]">
                    {member.requestShare.toFixed(
                      1,
                    )}
                    %
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_20px] items-center gap-3">
                <div className="h-[5px] overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)]"
                    style={{
                      width: `${Math.min(
                        member.requestShare *
                          2.5,
                        100,
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex justify-end">
                  {index === 0 && (
                    <ArrowRight
                      size={9}
                      className="text-[var(--color-accent)]"
                    />
                  )}
                </div>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { UsersThree } from "@phosphor-icons/react";

import { useBusiness } from "@/components/business/BusinessContext";

interface MemberData {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER";
  joinedAt: string;
}

export default function MembersClient() {
  const { business } = useBusiness();

  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");

  // ── Fetch members ─────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!business) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch(
        `/api/business/${business.id}/members`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );

      if (!res.ok) throw new Error("Failed to load");

      const json = (await res.json()) as {
        success: boolean;
        data: MemberData[];
      };

      if (!json.success) throw new Error("API error");

      setMembers(json.data);
    } catch (err) {
      console.error("[members] Failed to load", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  // ── Filtered members ──────────────────────────────
  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        member.name.toLowerCase().includes(normalizedSearch) ||
        member.email.toLowerCase().includes(normalizedSearch);

      const matchesRole = role === "ALL" || member.role === role;

      return matchesSearch && matchesRole;
    });
  }, [search, role, members]);

  const hasFilters = search.length > 0 || role !== "ALL";

  function clearFilters() {
    setSearch("");
    setRole("ALL");
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  }

  // ── No business ───────────────────────────────────
  if (!business) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <div className="font-reservation text-[25px] text-[var(--color-foreground)]">
          No workspace available.
        </div>
      </section>
    );
  }

  // ── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-7">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Organization access
          </div>
          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            Members.
          </h1>
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────
  if (error) {
    return (
      <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
            Members could not be loaded.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchMembers()}
          className="w-fit rounded-full border border-[var(--color-border)] px-4 py-2 text-[10px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-soft)]"
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Organization access
        </div>

        <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
          Members.
        </h1>

        <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
          View workspace members and their roles.
        </p>
      </div>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Total members
          </div>
          <div className="mt-3 font-reservation text-[30px] leading-none tracking-[-0.03em] text-[var(--color-foreground)]">
            {members.length}
          </div>
          <div className="mt-2 text-[8px] text-[var(--color-foreground-muted)]">
            people with workspace access
          </div>
        </div>

        <div className="rounded-[20px] border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] p-5">
          <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Owners
          </div>
          <div className="mt-3 font-reservation text-[30px] leading-none tracking-[-0.03em] text-[var(--color-accent)]">
            {members.filter((m) => m.role === "OWNER").length}
          </div>
          <div className="mt-2 text-[8px] text-[var(--color-foreground-muted)]">
            full workspace control
          </div>
        </div>

        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Members
          </div>
          <div className="mt-3 font-reservation text-[30px] leading-none tracking-[-0.03em] text-[var(--color-foreground)]">
            {members.filter((m) => m.role === "MEMBER").length}
          </div>
          <div className="mt-2 text-[8px] text-[var(--color-foreground-muted)]">
            standard workspace access
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="space-y-3">
        <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[10px] text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-accent)] lg:max-w-[430px]"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Filter by role"
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[10px] text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] lg:w-auto"
            >
              <option value="ALL">All roles</option>
              <option value="OWNER">Owner</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>
        </section>

        <div className="flex items-center justify-between px-1">
          <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            {filteredMembers.length}{" "}
            {filteredMembers.length === 1 ? "member" : "members"}
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-accent)]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Member list */}
      {filteredMembers.length === 0 ? (
        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
          <UsersThree size={24} weight="duotone" className="mx-auto text-[var(--color-accent)]" />
          <div className="mt-4 font-reservation text-[25px] text-[var(--color-foreground)]">
            No matching members.
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="divide-y divide-[var(--color-border)]">
            {filteredMembers.map((member) => (
              <article
                key={member.id}
                className="flex items-center justify-between gap-4 px-5 py-5 transition-colors hover:bg-[var(--color-surface-soft)]/30 sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-accent-soft)] font-mono text-[8px] font-semibold text-[var(--color-accent)]">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                      {member.name}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[7px] text-[var(--color-foreground-muted)]">
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
                    {member.role}
                  </span>

                  <div className="hidden text-right sm:block">
                    <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                      Joined
                    </div>
                    <div className="mt-0.5 font-mono text-[8px] text-[var(--color-foreground)]">
                      {formatDate(member.joinedAt)}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

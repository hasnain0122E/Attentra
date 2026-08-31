"use client";

import {
  useMemo,
  useState,
} from "react";

import { UserPlus } from "@phosphor-icons/react";

import {
  businessMembers,
  memberMetrics,
} from "@/lib/business/member-data";

import InviteMemberModal from "./InviteMemberModal";
import MemberActivityPanel from "./MemberActivityPanel";
import MemberDirectory from "./MemberDirectory";
import MemberFilters from "./MemberFilters";
import MemberMetricCard from "./MemberMetricCard";
import RolePermissionsPanel from "./RolePermissionsPanel";

export default function MembersClient() {
  const [search, setSearch] =
    useState("");

  const [role, setRole] =
    useState("ALL");

  const [status, setStatus] =
    useState("ALL");

  const [inviteOpen, setInviteOpen] =
    useState(false);

  const filteredMembers =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return businessMembers.filter(
        (member) => {
          const matchesSearch =
            normalizedSearch.length ===
              0 ||
            member.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            member.email
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesRole =
            role === "ALL" ||
            member.role === role;

          const matchesStatus =
            status === "ALL" ||
            member.status === status;

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          );
        },
      );
    }, [search, role, status]);

  const hasFilters =
    search.length > 0 ||
    role !== "ALL" ||
    status !== "ALL";

  function clearFilters() {
    setSearch("");
    setRole("ALL");
    setStatus("ALL");
  }

  return (
    <>
      <div className="space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
              Organization access
            </div>

            <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
              Members.
            </h1>

            <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
              Manage workspace access,
              understand member activity,
              and keep organization roles
              clear as your AI traffic
              grows.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setInviteOpen(true)
            }
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 text-[9px] font-semibold text-white transition hover:opacity-90"
          >
            <UserPlus
              size={12}
              weight="bold"
            />

            Invite member
          </button>
        </div>

        {/* Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {memberMetrics.map(
            (metric) => (
              <MemberMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
                accent={metric.accent}
              />
            ),
          )}
        </section>

        {/* Filters */}
        <div className="space-y-3">
          <MemberFilters
            search={search}
            role={role}
            status={status}
            onSearchChange={
              setSearch
            }
            onRoleChange={setRole}
            onStatusChange={
              setStatus
            }
          />

          <div className="flex items-center justify-between px-1">
            <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
              {
                filteredMembers.length
              }{" "}
              {filteredMembers.length ===
              1
                ? "member"
                : "members"}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-accent)] transition-opacity hover:opacity-70"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Directory */}
        <MemberDirectory
          members={
            filteredMembers
          }
        />

        {/* Intelligence */}
        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <MemberActivityPanel />

          <RolePermissionsPanel />
        </section>
      </div>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() =>
          setInviteOpen(false)
        }
      />
    </>
  );
}
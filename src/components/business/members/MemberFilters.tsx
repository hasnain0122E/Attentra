"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";

import MemberFilterDropdown from "./MemberFilterDropdown";

interface MemberFiltersProps {
  search: string;
  role: string;
  status: string;

  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

const roleOptions = [
  {
    label: "All roles",
    value: "ALL",
  },
  {
    label: "Owner",
    value: "OWNER",
  },
  {
    label: "Admin",
    value: "ADMIN",
  },
  {
    label: "Developer",
    value: "DEVELOPER",
  },
  {
    label: "Viewer",
    value: "VIEWER",
  },
];

const statusOptions = [
  {
    label: "All status",
    value: "ALL",
  },
  {
    label: "Active",
    value: "ACTIVE",
  },
  {
    label: "Invited",
    value: "INVITED",
  },
  {
    label: "Inactive",
    value: "INACTIVE",
  },
];

export default function MemberFilters({
  search,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
}: MemberFiltersProps) {
  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-[430px]">
          <MagnifyingGlass
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              onSearchChange(
                event.target.value,
              )
            }
            placeholder="Search member or email..."
            className={[
              "h-10 w-full rounded-xl",
              "border border-[var(--color-border)]",
              "bg-[var(--color-background)]",
              "pl-10 pr-4",
              "text-[10px] text-[var(--color-foreground)]",
              "outline-none transition",
              "placeholder:text-[var(--color-foreground-muted)]",
              "focus:border-[var(--color-accent)]",
            ].join(" ")}
          />
        </div>

        <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:items-center">
          <MemberFilterDropdown
            value={role}
            options={roleOptions}
            onChange={onRoleChange}
            ariaLabel="Filter members by role"
          />

          <MemberFilterDropdown
            value={status}
            options={statusOptions}
            onChange={onStatusChange}
            ariaLabel="Filter members by status"
          />
        </div>
      </div>
    </section>
  );
}
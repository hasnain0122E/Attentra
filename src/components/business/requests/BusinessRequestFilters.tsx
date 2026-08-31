"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";

import BusinessFilterDropdown from "./BusinessFilterDropdown";

interface BusinessRequestFiltersProps {
  search: string;

  status: string;
  taskType: string;
  member: string;

  taskTypes: string[];
  members: string[];

  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTaskTypeChange: (value: string) => void;
  onMemberChange: (value: string) => void;
}

const statusOptions = [
  {
    label: "All status",
    value: "ALL",
  },
  {
    label: "Success",
    value: "SUCCESS",
  },
  {
    label: "Fallback",
    value: "FALLBACK",
  },
  {
    label: "Failed",
    value: "FAILED",
  },
];

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

export default function BusinessRequestFilters({
  search,
  status,
  taskType,
  member,
  taskTypes,
  members,
  onSearchChange,
  onStatusChange,
  onTaskTypeChange,
  onMemberChange,
}: BusinessRequestFiltersProps) {
  const taskOptions = [
    {
      label: "All tasks",
      value: "ALL",
    },
    ...taskTypes.map((task) => ({
      label: formatLabel(task),
      value: task,
    })),
  ];

  const memberOptions = [
    {
      label: "All members",
      value: "ALL",
    },
    ...members.map((memberName) => ({
      label: memberName,
      value: memberName,
    })),
  ];

  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-[440px]">
          <MagnifyingGlass
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search prompt, member, request ID or model..."
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

        <div className="grid w-full grid-cols-2 gap-2 xl:flex xl:w-auto xl:items-center">
          <BusinessFilterDropdown
            value={status}
            options={statusOptions}
            onChange={onStatusChange}
            ariaLabel="Filter organization requests by status"
          />

          <BusinessFilterDropdown
            value={taskType}
            options={taskOptions}
            onChange={onTaskTypeChange}
            ariaLabel="Filter organization requests by task type"
          />

          <div className="col-span-2 xl:col-span-1">
            <BusinessFilterDropdown
              value={member}
              options={memberOptions}
              onChange={onMemberChange}
              ariaLabel="Filter organization requests by member"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";

import FilterDropdown from "./FilterDropdown";

interface HistoryFiltersProps {
  search: string;
  status: string;
  taskType: string;
  taskTypes: string[];

  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTaskTypeChange: (value: string) => void;
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

export default function HistoryFilters({
  search,
  status,
  taskType,
  taskTypes,
  onSearchChange,
  onStatusChange,
  onTaskTypeChange,
}: HistoryFiltersProps) {
  const taskOptions = [
    {
      label: "All task",
      value: "ALL",
    },
    ...taskTypes.map((task) => ({
      label: formatTaskLabel(task),
      value: task,
    })),
  ];

  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative w-full lg:max-w-[460px]">
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
            placeholder="Search prompt, request ID or model..."
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

        {/* Filters */}
        <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:items-center">
          <FilterDropdown
            value={status}
            options={statusOptions}
            onChange={onStatusChange}
            ariaLabel="Filter request history by status"
          />

          <FilterDropdown
            value={taskType}
            options={taskOptions}
            onChange={onTaskTypeChange}
            ariaLabel="Filter request history by task type"
          />
        </div>
      </div>
    </section>
  );
}

function formatTaskLabel(task: string) {
  return task
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}
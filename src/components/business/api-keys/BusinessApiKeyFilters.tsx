"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";

import BusinessApiKeyFilterDropdown from "./BusinessApiKeyFilterDropdown";

interface BusinessApiKeyFiltersProps {
  search: string;
  status: string;
  environment: string;

  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onEnvironmentChange: (value: string) => void;
}

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
    label: "Revoked",
    value: "REVOKED",
  },
];

const environmentOptions = [
  {
    label: "All environments",
    value: "ALL",
  },
  {
    label: "Production",
    value: "PRODUCTION",
  },
  {
    label: "Development",
    value: "DEVELOPMENT",
  },
  {
    label: "Internal",
    value: "INTERNAL",
  },
];

export default function BusinessApiKeyFilters({
  search,
  status,
  environment,
  onSearchChange,
  onStatusChange,
  onEnvironmentChange,
}: BusinessApiKeyFiltersProps) {
  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-[430px]">
          <MagnifyingGlass
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]"
          />

          <input
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search key, creator or usage..."
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
          <BusinessApiKeyFilterDropdown
            value={status}
            options={statusOptions}
            onChange={onStatusChange}
            ariaLabel="Filter API keys by status"
          />

          <BusinessApiKeyFilterDropdown
            value={environment}
            options={environmentOptions}
            onChange={onEnvironmentChange}
            ariaLabel="Filter API keys by environment"
          />
        </div>
      </div>
    </section>
  );
}
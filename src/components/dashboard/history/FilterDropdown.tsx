"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CaretDown,
  Check,
} from "@phosphor-icons/react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

export default function FilterDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const selectedOption =
    options.find(
      (option) => option.value === value,
    ) ?? options[0];

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={[
        "relative w-full",
        open ? "z-[60]" : "z-10",
      ].join(" ")}
    >
      {/* Trigger */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() =>
          setOpen((current) => !current)
        }
        className={[
          "flex h-10 w-full min-w-0 items-center justify-between gap-4",
          "rounded-xl border px-3.5",
          "bg-[var(--color-background)]",
          "transition duration-150",
          "sm:min-w-[146px]",
          open
            ? "border-[var(--color-accent)]"
            : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
        ].join(" ")}
      >
        <span className="truncate font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-secondary)]">
          {selectedOption.label}
        </span>

        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <CaretDown
            size={11}
            weight="bold"
            className={[
              "text-[var(--color-foreground-muted)]",
              "transition-transform duration-200",
              open ? "rotate-180" : "",
            ].join(" ")}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className={[
            "absolute left-0 top-[calc(100%+7px)] z-[70]",
            "w-full min-w-0",
            "sm:left-auto sm:right-0 sm:w-[190px]",
            "rounded-[15px]",
            "border border-[var(--color-border)]",
            "bg-[var(--color-surface)]",
            "p-1.5",
            "shadow-[0_18px_50px_rgba(25,23,21,0.12)]",
          ].join(" ")}
        >
          <div className="max-h-[280px] overflow-y-auto">
            {options.map((option) => {
              const active =
                option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between gap-4",
                    "rounded-[10px] px-3 py-2.5",
                    "text-left transition-colors",
                    active
                      ? "bg-[var(--color-accent-soft)]"
                      : "hover:bg-[var(--color-surface-soft)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "truncate text-[10px] font-medium",
                      active
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-foreground-secondary)]",
                    ].join(" ")}
                  >
                    {option.label}
                  </span>

                  <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {active && (
                      <Check
                        size={10}
                        weight="bold"
                        className="text-[var(--color-accent)]"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
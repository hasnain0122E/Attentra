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

export interface SettingSelectOption {
  label: string;
  value: string;
  description?: string;
}

interface SettingSelectProps {
  value: string;
  options: SettingSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

export default function SettingSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: SettingSelectProps) {
  const [open, setOpen] = useState(false);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const selected =
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
        "relative w-full sm:w-[245px]",
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
          setOpen(
            (current) => !current,
          )
        }
        className={[
          "flex min-h-11 w-full",
          "items-center justify-between gap-4",
          "rounded-xl border px-3.5 py-2.5",
          "bg-[var(--color-background)]",
          "text-left transition",
          open
            ? "border-[var(--color-accent)]"
            : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-medium text-[var(--color-foreground)]">
            {selected.label}
          </div>

          {selected.description && (
            <div className="mt-0.5 truncate text-[8px] text-[var(--color-foreground-muted)]">
              {selected.description}
            </div>
          )}
        </div>

        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <CaretDown
            size={11}
            weight="bold"
            className={[
              "text-[var(--color-foreground-muted)]",
              "transition-transform duration-200",
              open
                ? "rotate-180"
                : "",
            ].join(" ")}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className={[
            "absolute right-0 top-[calc(100%+7px)] z-[70]",
            "w-[290px] max-w-[calc(100vw-40px)]",
            "rounded-[15px]",
            "border border-[var(--color-border)]",
            "bg-[var(--color-surface)]",
            "p-1.5",
            "shadow-[0_20px_60px_rgba(25,23,21,0.14)]",
          ].join(" ")}
        >
          <div className="max-h-[320px] overflow-y-auto">
            {options.map(
              (option) => {
                const active =
                  option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(
                        option.value,
                      );

                      setOpen(false);
                    }}
                    className={[
                      "flex w-full items-start justify-between",
                      "gap-4 rounded-[10px]",
                      "px-3 py-3",
                      "text-left transition-colors",
                      active
                        ? "bg-[var(--color-accent-soft)]"
                        : "hover:bg-[var(--color-surface-soft)]",
                    ].join(" ")}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={[
                          "text-[10px] font-medium",
                          active
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-foreground)]",
                        ].join(" ")}
                      >
                        {option.label}
                      </div>

                      {option.description && (
                        <div className="mt-1 max-w-[230px] text-[8px] leading-[1.55] text-[var(--color-foreground-muted)]">
                          {option.description}
                        </div>
                      )}
                    </div>

                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
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
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

interface SettingToggleProps {
  checked: boolean;

  onChange: (
    checked: boolean,
  ) => void;

  ariaLabel: string;
}

export default function SettingToggle({
  checked,
  onChange,
  ariaLabel,
}: SettingToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() =>
        onChange(!checked)
      }
      className={[
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
        checked
          ? "bg-[var(--color-accent)]"
          : "bg-[var(--color-border-strong)]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all duration-200",
          checked
            ? "left-[23px]"
            : "left-[4px]",
        ].join(" ")}
      />
    </button>
  );
}
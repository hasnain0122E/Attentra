"use client";

interface FallbackSettingsProps {
  enabled: boolean;
  maxAttempts: number;

  onEnabledChange: (
    value: boolean,
  ) => void;

  onMaxAttemptsChange: (
    value: number,
  ) => void;
}

const attempts = [1, 2, 3];

export default function FallbackSettings({
  enabled,
  maxAttempts,
  onEnabledChange,
  onMaxAttemptsChange,
}: FallbackSettingsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-5 rounded-[17px] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
        <div>
          <div className="text-[10px] font-semibold text-[var(--color-foreground)]">
            Automatic fallback
          </div>

          <p className="mt-1 text-[8px] leading-4 text-[var(--color-foreground-secondary)]">
            Allow Attentra to continue
            execution with another model
            when the primary target
            cannot complete the request.
          </p>
        </div>

        <Toggle
          enabled={enabled}
          onChange={onEnabledChange}
        />
      </div>

      <div
        className={[
          "transition-opacity",
          enabled
            ? "opacity-100"
            : "pointer-events-none opacity-40",
        ].join(" ")}
      >
        <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
          Maximum attempts
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {attempts.map((attempt) => (
            <button
              key={attempt}
              type="button"
              onClick={() =>
                onMaxAttemptsChange(attempt)
              }
              className={[
                "h-10 rounded-xl border font-mono text-[8px] transition",
                maxAttempts === attempt
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground-secondary)]",
              ].join(" ")}
            >
              {attempt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={[
        "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-200",
        enabled
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-soft)]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white",
          "shadow-[0_2px_6px_rgba(25,23,21,0.16)]",
          "transition-all duration-200",
          enabled
            ? "left-[25px]"
            : "left-[3px]",
        ].join(" ")}
      />
    </button>
  );
}
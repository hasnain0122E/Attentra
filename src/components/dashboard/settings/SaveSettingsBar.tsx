"use client";

import {
  CheckCircle,
  FloppyDisk,
} from "@phosphor-icons/react";

interface SaveSettingsBarProps {
  dirty: boolean;
  saved: boolean;

  onReset: () => void;
  onSave: () => void;
}

export default function SaveSettingsBar({
  dirty,
  saved,
  onReset,
  onSave,
}: SaveSettingsBarProps) {
  return (
    <div
      className={[
        "sticky bottom-4 z-30",
        "rounded-[18px] border",
        "bg-[var(--color-surface)]/95",
        "px-4 py-3",
        "shadow-[0_14px_50px_rgba(25,23,21,0.1)]",
        "backdrop-blur-xl",
        "transition",
        dirty
          ? "border-[var(--color-accent)]/25"
          : "border-[var(--color-border)]",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {saved ? (
            <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--color-accent)]">
              <CheckCircle
                size={13}
                weight="fill"
              />
              Preferences saved
            </div>
          ) : dirty ? (
            <>
              <div className="text-[10px] font-medium text-[var(--color-foreground)]">
                Unsaved changes
              </div>

              <div className="mt-1 text-[8px] text-[var(--color-foreground-muted)]">
                Save your updated workspace preferences.
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] font-medium text-[var(--color-foreground)]">
                Settings are up to date
              </div>

              <div className="mt-1 text-[8px] text-[var(--color-foreground-muted)]">
                No unsaved changes.
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={onReset}
            className="h-9 rounded-xl px-3.5 text-[9px] font-medium text-[var(--color-foreground-secondary)] transition hover:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Reset
          </button>

          <button
            type="button"
            disabled={!dirty}
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-[9px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FloppyDisk
              size={11}
              weight="bold"
            />

            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import {
  Key,
  X,
} from "@phosphor-icons/react";

interface CreateApiKeyModalProps {
  open: boolean;
  name: string;

  onNameChange: (
    value: string,
  ) => void;

  onClose: () => void;
  onCreate: () => void;
}

export default function CreateApiKeyModal({
  open,
  name,
  onNameChange,
  onClose,
  onCreate,
}: CreateApiKeyModalProps) {
  if (!open) {
    return null;
  }

  const valid =
    name.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close create API key dialog"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--color-foreground)]/25 backdrop-blur-[3px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-api-key-title"
        className="relative z-10 w-full max-w-[480px] rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_30px_90px_rgba(25,23,21,0.18)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Key
                size={18}
                weight="duotone"
              />
            </div>

            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-accent)]">
                Developer access
              </div>

              <h2
                id="create-api-key-title"
                className="mt-1.5 text-[18px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]"
              >
                Create API key
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-foreground-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-foreground)]"
          >
            <X size={14} />
          </button>
        </div>

        <p className="mt-5 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Give this key a descriptive name so
          you can identify where it is being
          used later.
        </p>

        <div className="mt-5">
          <label
            htmlFor="api-key-name"
            className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]"
          >
            Key name
          </label>

          <input
            id="api-key-name"
            type="text"
            autoFocus
            maxLength={48}
            value={name}
            onChange={(event) =>
              onNameChange(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                valid
              ) {
                onCreate();
              }
            }}
            placeholder="e.g. Production API"
            className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-[11px] text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-[9px] font-medium text-[var(--color-foreground-secondary)] transition hover:bg-[var(--color-surface-soft)]"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!valid}
            onClick={onCreate}
            className="h-10 rounded-xl bg-[var(--color-accent)] px-4 text-[9px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create key
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Key, X } from "@phosphor-icons/react";

interface CreateBusinessApiKeyModalProps {
  onClose: () => void;
  onCreated: (rawKey: string, keyName: string) => void;
  businessId: string;
}

export default function CreateBusinessApiKeyModal({
  onClose,
  onCreated,
  businessId,
}: CreateBusinessApiKeyModalProps) {
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) return;

    setSubmitting(true);
    setError(false);

    try {
      const body: Record<string, unknown> = { name: name.trim() };

      if (expiresAt.trim()) {
        body.expiresAt = new Date(expiresAt.trim()).toISOString();
      }

      const res = await fetch(
        `/api/business/${businessId}/api-keys`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) throw new Error("Create failed");

      const json = (await res.json()) as {
        success: boolean;
        data: { rawKey: string; name: string };
      };

      if (!json.success) throw new Error("API error");

      // Transition directly to created state — rawKey lives only in parent state
      onCreated(json.data.rawKey, json.data.name);
    } catch (err) {
      console.error("[api-keys] Create failed", err);
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close create API key modal"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--color-foreground)]/35 backdrop-blur-[3px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[540px] overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_30px_100px_rgba(25,23,21,0.20)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5 sm:p-6">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Key size={15} weight="duotone" />
            </div>

            <h2 className="mt-4 font-reservation text-[27px] leading-none tracking-[-0.025em] text-[var(--color-foreground)]">
              Create API key.
            </h2>

            <p className="mt-2 max-w-[390px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
              Prepare a shared organization credential for an application or
              environment.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)]"
          >
            <X size={12} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          <label
            htmlFor="business-key-name"
            className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]"
          >
            Key name
          </label>

          <input
            id="business-key-name"
            value={name}
            required
            maxLength={100}
            disabled={submitting}
            onChange={(event) => setName(event.target.value)}
            placeholder="Production backend"
            className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[10px] text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-accent)] disabled:opacity-50"
          />

          <div className="mt-5">
            <label
              htmlFor="business-key-expires"
              className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]"
            >
              Expires at (optional)
            </label>

            <input
              id="business-key-expires"
              type="datetime-local"
              value={expiresAt}
              disabled={submitting}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[10px] text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] disabled:opacity-50"
            />
          </div>

          <div className="mt-6 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
              Security
            </div>

            <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
              The complete API key will be displayed only once.
              Attentra stores only the secure key hash after creation.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-soft)] px-4 py-3 text-[9px] text-[var(--color-accent)]">
              Unable to create API key. Please try again.
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 rounded-xl border border-[var(--color-border)] px-5 text-[9px] text-[var(--color-foreground-secondary)] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="h-10 rounded-xl bg-[var(--color-foreground)] px-5 text-[9px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Creating\u2026" : "Create key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

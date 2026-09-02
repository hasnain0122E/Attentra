"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Buildings } from "@phosphor-icons/react";

/**
 * CreateBusinessForm
 *
 * Minimal form for an authenticated user to create their first
 * Business workspace. On success, triggers a server re-render
 * so the business layout picks up the new workspace.
 */
export default function CreateBusinessForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: trimmed }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: { id: string; name: string; role: string };
        error?: { code: string; message: string };
      };

      if (!res.ok || !json.success) {
        setError(
          json.error?.message ?? "Failed to create workspace",
        );
        return;
      }

      // Success — refresh the server component tree so the
      // layout re-fetches the business via getActiveBusiness().
      router.refresh();
    } catch (err) {
      console.error("[create-business] Failed", err);
      setError("Unable to create workspace. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-[440px]">
        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Buildings size={22} weight="duotone" />
        </div>

        <h1 className="mt-5 font-reservation text-[28px] leading-[1.02] tracking-[-0.025em] text-[var(--color-foreground)] sm:text-[32px]">
          Create your workspace.
        </h1>

        <p className="mt-3 text-[13px] leading-6 text-[var(--color-foreground-secondary)]">
          Set up an organization workspace to manage AI routing,
          track requests, and control access for your team.
        </p>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8">
          <div>
            <label
              htmlFor="business-name"
              className="block font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]"
            >
              Workspace name
            </label>

            <input
              id="business-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme AI"
              disabled={submitting}
              maxLength={100}
              className={[
                "mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3",
                "text-[13px] text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-muted)]",
                "outline-none transition-colors",
                "focus:border-[var(--color-accent)]",
                "disabled:opacity-50",
              ].join(" ")}
            />
          </div>

          {error && (
            <p className="mt-3 text-[11px] leading-5 text-[var(--color-accent)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className={[
              "mt-6 w-full rounded-full bg-[var(--color-foreground)] px-5 py-3",
              "text-[11px] font-medium text-white",
              "transition-opacity duration-200",
              "disabled:opacity-40",
            ].join(" ")}
          >
            {submitting ? "Creating..." : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  CheckCircle,
  EnvelopeSimple,
  UserPlus,
  X,
} from "@phosphor-icons/react";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
}

type InviteRole =
  | "ADMIN"
  | "DEVELOPER"
  | "VIEWER";

export default function InviteMemberModal({
  open,
  onClose,
}: InviteMemberModalProps) {
  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState<InviteRole>(
      "DEVELOPER",
    );

  const [submitted, setSubmitted] =
    useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow =
      "hidden";

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        "";

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setSubmitted(true);
  }

  function closeModal() {
    setEmail("");
    setRole("DEVELOPER");
    setSubmitted(false);

    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close invite member modal"
        onClick={closeModal}
        className="absolute inset-0 bg-[var(--color-foreground)]/35 backdrop-blur-[3px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
        className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_30px_100px_rgba(25,23,21,0.20)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5 sm:p-6">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <UserPlus
                size={15}
                weight="duotone"
              />
            </div>

            <h2
              id="invite-member-title"
              className="mt-4 font-reservation text-[27px] leading-none tracking-[-0.025em] text-[var(--color-foreground)]"
            >
              Invite member.
            </h2>

            <p className="mt-2 max-w-[380px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
              Add someone to the Acme
              AI workspace and choose
              their initial access role.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)] transition hover:text-[var(--color-foreground)]"
          >
            <X size={12} />
          </button>
        </div>

        {submitted ? (
          <div className="p-6">
            <div className="rounded-[20px] bg-[var(--color-accent-soft)] p-5">
              <CheckCircle
                size={22}
                weight="duotone"
                className="text-[var(--color-accent)]"
              />

              <div className="mt-4 text-[13px] font-semibold text-[var(--color-foreground)]">
                Invitation prepared
              </div>

              <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
                This is currently a
                frontend demonstration.
                No invitation email has
                been sent.
              </p>

              <div className="mt-4 rounded-xl bg-[var(--color-surface)] p-3">
                <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                  Invite
                </div>

                <div className="mt-1.5 break-all text-[9px] text-[var(--color-foreground)]">
                  {email}
                </div>

                <div className="mt-2 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
                  {role}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="mt-5 h-10 w-full rounded-xl bg-[var(--color-foreground)] text-[9px] font-semibold text-white transition hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-6"
          >
            <label
              htmlFor="invite-email"
              className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]"
            >
              Email address
            </label>

            <div className="relative mt-2">
              <EnvelopeSimple
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]"
              />

              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="developer@company.com"
                className={[
                  "h-11 w-full rounded-xl",
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

            <div className="mt-5">
              <div className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
                Role
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    "ADMIN",
                    "DEVELOPER",
                    "VIEWER",
                  ] as InviteRole[]
                ).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setRole(option)
                    }
                    className={[
                      "rounded-xl border px-3 py-3 text-left transition",
                      role === option
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-border-strong)]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "font-mono text-[7px] uppercase tracking-[0.08em]",
                        role === option
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--color-foreground-secondary)]",
                      ].join(" ")}
                    >
                      {option}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-xl border border-[var(--color-border)] px-5 text-[9px] font-medium text-[var(--color-foreground-secondary)] transition hover:border-[var(--color-border-strong)]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="h-10 rounded-xl bg-[var(--color-foreground)] px-5 text-[9px] font-semibold text-white transition hover:opacity-90"
              >
                Prepare invitation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
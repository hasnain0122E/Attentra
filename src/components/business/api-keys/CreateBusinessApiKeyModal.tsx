"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Check, Copy, Key, X } from "@phosphor-icons/react";

interface CreateBusinessApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

type Environment = "PRODUCTION" | "DEVELOPMENT" | "INTERNAL";

const demoSecret = "attentra_demo_generated_once_7F4K2M9P";

export default function CreateBusinessApiKeyModal({
  open,
  onClose,
}: CreateBusinessApiKeyModalProps) {
  const [name, setName] = useState("");

  const [environment, setEnvironment] = useState<Environment>("DEVELOPMENT");

  const [created, setCreated] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";

      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);
  if (!open) {
    return null;
  }

  function reset() {
    setName("");
    setEnvironment("DEVELOPMENT");
    setCreated(false);
    setCopied(false);
  }

  function closeModal() {
    reset();
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    setCreated(true);
  }

  async function copyDemoSecret() {
    await navigator.clipboard.writeText(demoSecret);

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1400);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close create API key modal"
        onClick={closeModal}
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
            onClick={closeModal}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)]"
          >
            <X size={12} />
          </button>
        </div>

        {!created ? (
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
              onChange={(event) => setName(event.target.value)}
              placeholder="Production backend"
              className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[10px] text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-accent)]"
            />

            <div className="mt-5">
              <div className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
                Environment
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  ["PRODUCTION", "DEVELOPMENT", "INTERNAL"] as Environment[]
                ).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setEnvironment(option)}
                    className={[
                      "rounded-xl border px-3 py-3 text-left transition",
                      environment === option
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-background)]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "font-mono text-[7px] uppercase tracking-[0.08em]",
                        environment === option
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

            <div className="mt-6 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
                Security
              </div>

              <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
                In production, the complete API key will be displayed only once.
                Attentra should store only the secure key hash after creation.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-xl border border-[var(--color-border)] px-5 text-[9px] text-[var(--color-foreground-secondary)]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="h-10 rounded-xl bg-[var(--color-foreground)] px-5 text-[9px] font-semibold text-white transition hover:opacity-90"
              >
                Create demo key
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 sm:p-6">
            <div className="rounded-[20px] bg-[var(--color-accent-soft)] p-5">
              <Check
                size={18}
                weight="bold"
                className="text-[var(--color-accent)]"
              />

              <div className="mt-4 text-[13px] font-semibold text-[var(--color-foreground)]">
                Demo credential prepared
              </div>

              <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
                No real organization API key has been created. This demonstrates
                the copy-once credential experience.
              </p>

              <div className="mt-5 rounded-[14px] bg-[var(--color-surface)] p-3.5">
                <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
                  Secret
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-[8px] text-[var(--color-foreground)]">
                    {demoSecret}
                  </code>

                  <button
                    type="button"
                    onClick={copyDemoSecret}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)]"
                  >
                    {copied ? (
                      <Check size={11} weight="bold" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="mt-5 h-10 w-full rounded-xl bg-[var(--color-foreground)] text-[9px] font-semibold text-white"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

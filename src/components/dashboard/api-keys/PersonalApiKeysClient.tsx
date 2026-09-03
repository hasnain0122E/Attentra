"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Check,
  Copy,
  Key,
  Plus,
  ShieldCheck,
  Warning,
  X,
  CheckCircle,
  Prohibit,
  Trash,
  MagnifyingGlass,
} from "@phosphor-icons/react";

import type { ReactNode, FormEvent } from "react";

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

/** Single API key as returned by the listing API. */
export interface PersonalApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function getKeyStatus(
  key: PersonalApiKeyData,
): "ACTIVE" | "REVOKED" | "EXPIRED" {
  if (key.revokedAt) return "REVOKED";
  if (key.expiresAt && new Date(key.expiresAt) <= new Date())
    return "EXPIRED";
  return "ACTIVE";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

// ─────────────────────────────────────────────────────
// MODAL STATE MACHINE
// ─────────────────────────────────────────────────────

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "created"; rawKey: string; keyName: string }
  | { type: "revoke"; apiKeyId: string; keyName: string };

// ─────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────

export default function PersonalApiKeysClient() {
  const [apiKeys, setApiKeys] = useState<PersonalApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [modalState, setModalState] = useState<ModalState>({ type: "closed" });

  // ── Fetch API keys ────────────────────────────────
  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/dashboard/api-keys", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error("Failed to load");

      const json = (await res.json()) as {
        success: boolean;
        data: PersonalApiKeyData[];
      };

      if (!json.success) throw new Error("API error");

      setApiKeys(json.data);
    } catch (err) {
      console.error("[api-keys] Failed to load", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  // ── Computed metrics ──────────────────────────────
  const metrics = useMemo(() => {
    const total = apiKeys.length;
    const active = apiKeys.filter(
      (k) => getKeyStatus(k) === "ACTIVE",
    ).length;
    const revoked = apiKeys.filter(
      (k) => getKeyStatus(k) === "REVOKED",
    ).length;

    return [
      {
        label: "Personal keys",
        value: String(total),
        detail: "credentials in your workspace",
      },
      {
        label: "Active",
        value: String(active),
        detail: "credentials currently available",
        accent: true,
      },
      {
        label: "Revoked",
        value: String(revoked),
        detail: "credentials no longer in use",
      },
    ];
  }, [apiKeys]);

  // ── Filtered keys ─────────────────────────────────
  const filteredKeys = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return apiKeys.filter((apiKey) => {
      const matchesSearch =
        !normalized ||
        apiKey.name.toLowerCase().includes(normalized) ||
        apiKey.keyPrefix.toLowerCase().includes(normalized);

      const keyStatus = getKeyStatus(apiKey);
      const matchesStatus =
        status === "ALL" ||
        (status === "ACTIVE" && keyStatus === "ACTIVE") ||
        (status === "REVOKED" &&
          (keyStatus === "REVOKED" || keyStatus === "EXPIRED"));

      return matchesSearch && matchesStatus;
    });
  }, [search, status, apiKeys]);

  const hasFilters = search.length > 0 || status !== "ALL";

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
  }

  // ── Revoke handler ────────────────────────────────
  const confirmRevoke = useCallback(async () => {
    if (modalState.type !== "revoke") return;

    try {
      const res = await fetch(
        `/api/dashboard/api-keys/${modalState.apiKeyId}`,
        { method: "DELETE", headers: { Accept: "application/json" } },
      );

      if (!res.ok) throw new Error("Revoke failed");

      setModalState({ type: "closed" });
      await fetchKeys();
    } catch (err) {
      console.error("[api-keys] Revoke failed", err);
    }
  }, [modalState, fetchKeys]);

  // ── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-7">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Developer access
          </div>
          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            API keys.
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
              <div className="mt-5 h-8 w-16 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────
  if (error) {
    return (
      <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            API keys
          </div>
          <p className="mt-2 text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
            API keys could not be loaded.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchKeys()}
          className="w-fit rounded-full border border-[var(--color-border)] px-4 py-2 text-[10px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-soft)]"
        >
          Try again
        </button>
      </section>
    );
  }

  // ── Empty state ───────────────────────────────────
  if (apiKeys.length === 0) {
    return (
      <>
        <div className="space-y-7">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
              Developer access
            </div>
            <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
              API keys.
            </h1>
            <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
              Create a personal API key to use Attentra from your
              applications. Requests made with your key are attributed
              to your account.
            </p>
          </div>

          <section className="flex flex-col items-center gap-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center sm:px-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Key size={24} weight="duotone" />
            </div>

            <div className="max-w-[480px]">
              <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
                No API keys yet.
              </h2>
              <p className="mt-3 text-[12px] leading-6 text-[var(--color-foreground-secondary)]">
                Create an API key to use Attentra from your applications.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModalState({ type: "create" })}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-3 text-[11px] font-medium text-white transition hover:opacity-[0.96]"
            >
              <Plus size={12} weight="bold" />
              Create API key
            </button>
          </section>

          {/* Billing notice */}
          <BillingNotice />
        </div>
      </>
    );
  }

  // ── Full view ─────────────────────────────────────
  return (
    <>
      <div className="space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
              Developer access
            </div>

            <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
              API keys.
            </h1>

            <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
              Manage personal credentials used by your applications to
              send requests through Attentra.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalState({ type: "create" })}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 text-[9px] font-semibold text-white transition hover:opacity-90"
          >
            <Plus size={12} weight="bold" />
            Create API key
          </button>
        </div>

        {/* Metrics */}
        <section className="grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={[
                "rounded-[20px] border p-5",
                metric.accent
                  ? "border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]",
              ].join(" ")}
            >
              <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                {metric.label}
              </div>
              <div
                className={[
                  "mt-3 font-reservation text-[30px] leading-none tracking-[-0.03em]",
                  metric.accent
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-foreground)]",
                ].join(" ")}
              >
                {metric.value}
              </div>
              <div className="mt-2 text-[8px] text-[var(--color-foreground-muted)]">
                {metric.detail}
              </div>
            </div>
          ))}
        </section>

        {/* Security callout */}
        <section className="relative overflow-hidden rounded-[22px] bg-[var(--color-foreground)] p-5 text-white sm:p-6">
          <div aria-hidden="true" className="absolute inset-0">
            <div
              className="absolute -right-[8%] -top-[100%] h-[240px] w-[320px]"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(217,119,69,0.18) 0%, rgba(217,119,69,0.05) 45%, rgba(217,119,69,0) 72%)",
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--color-accent)]">
                <ShieldCheck size={16} weight="duotone" />
              </div>

              <div>
                <div className="text-[11px] font-semibold">
                  Your personal credentials are hashed and secure.
                </div>
                <p className="mt-1.5 max-w-[630px] text-[8px] leading-4 text-white/45">
                  API keys are stored as SHA-256 hashes. The complete
                  secret is only displayed once at creation time.
                </p>
              </div>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
              <Key size={10} className="text-[var(--color-accent)]" />
              <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-white/45">
                Hashed storage
              </span>
            </div>
          </div>
        </section>

        {/* Filters */}
        <div className="space-y-3">
          <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-[430px]">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search key name or prefix..."
                  className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-4 text-[10px] text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-accent)]"
                />
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[10px] text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] lg:w-auto"
              >
                <option value="ALL">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </div>
          </section>

          <div className="flex items-center justify-between px-1">
            <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
              {filteredKeys.length}{" "}
              {filteredKeys.length === 1 ? "credential" : "credentials"}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-accent)]"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Key list */}
        {filteredKeys.length === 0 ? (
          <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
            <Key
              size={24}
              weight="duotone"
              className="mx-auto text-[var(--color-accent)]"
            />
            <div className="mt-4 font-reservation text-[25px] text-[var(--color-foreground)]">
              No matching API keys.
            </div>
            <p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
              Change the active search or credential filters.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
              <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
                Credential inventory
              </div>
              <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
                Personal API keys
              </h2>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {filteredKeys.map((apiKey) => {
                const keyStatus = getKeyStatus(apiKey);
                const isActive = keyStatus === "ACTIVE";

                return (
                  <article
                    key={apiKey.id}
                    className="px-5 py-5 transition-colors hover:bg-[var(--color-surface-soft)]/30 sm:px-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                          <Key size={15} weight="duotone" />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                            {apiKey.name}
                          </div>
                          <div className="mt-1.5 truncate font-mono text-[7px] text-[var(--color-foreground-muted)]">
                            {apiKey.keyPrefix}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={keyStatus} />
                        {isActive ? (
                          <button
                            type="button"
                            aria-label={`Revoke ${apiKey.name}`}
                            onClick={() => setModalState({ type: "revoke", apiKeyId: apiKey.id, keyName: apiKey.name })}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-accent)]"
                          >
                            <Trash size={11} />
                          </button>
                        ) : (
                          <span className="shrink-0 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                            Locked
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-x-5 gap-y-3">
                      <div>
                        <div className="font-mono text-[6px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                          Created
                        </div>
                        <div className="mt-1 font-mono text-[8px] text-[var(--color-foreground)]">
                          {formatDate(apiKey.createdAt)}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[6px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                          Expires
                        </div>
                        <div className="mt-1 font-mono text-[8px] text-[var(--color-foreground)]">
                          {formatDate(apiKey.expiresAt)}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[6px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                          Last used
                        </div>
                        <div className="mt-1 font-mono text-[8px] text-[var(--color-foreground)]">
                          {formatDate(apiKey.lastUsedAt)}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Billing notice */}
        <BillingNotice />
      </div>

      {modalState.type === "create" && (
        <CreateKeyModal
          onClose={() => setModalState({ type: "closed" })}
          onCreated={(rawKey, keyName) => {
            setModalState({ type: "created", rawKey, keyName });
            void fetchKeys();
          }}
        />
      )}

      {modalState.type === "created" && (
        <CreatedKeyModal
          rawKey={modalState.rawKey}
          keyName={modalState.keyName}
          onClose={() => setModalState({ type: "closed" })}
        />
      )}

      {modalState.type === "revoke" && (
        <RevokeModal
          keyName={modalState.keyName}
          onClose={() => setModalState({ type: "closed" })}
          onConfirm={confirmRevoke}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "ACTIVE" | "REVOKED" | "EXPIRED" }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <CheckCircle size={8} />
        Active
      </span>
    );
  }

  if (status === "EXPIRED") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
        <Prohibit size={8} />
        Expired
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
      <Prohibit size={8} />
      Revoked
    </span>
  );
}

// ─────────────────────────────────────────────────────
// BILLING NOTICE
// ─────────────────────────────────────────────────────

function BillingNotice() {
  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
        Usage &amp; billing
      </div>
      <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
        Production API usage is billed pay as you go. Attentra charges
        10% of verified savings.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// CREATE KEY MODAL (form only — no credential view)
// ─────────────────────────────────────────────────────

function CreateKeyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (rawKey: string, keyName: string) => void;
}) {
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

      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

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
              Prepare a personal credential for your application or
              development environment.
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
            htmlFor="personal-key-name"
            className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]"
          >
            Key name
          </label>
          <input
            id="personal-key-name"
            value={name}
            required
            maxLength={100}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
            placeholder="My app"
            className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[10px] text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-accent)] disabled:opacity-50"
          />

          <div className="mt-5">
            <label
              htmlFor="personal-key-expires"
              className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]"
            >
              Expires at (optional)
            </label>
            <input
              id="personal-key-expires"
              type="datetime-local"
              value={expiresAt}
              disabled={submitting}
              onChange={(e) => setExpiresAt(e.target.value)}
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

// ─────────────────────────────────────────────────────
// CREATED KEY MODAL (one-time credential display)
// ─────────────────────────────────────────────────────

function CreatedKeyModal({
  rawKey,
  keyName,
  onClose,
}: {
  rawKey: string;
  keyName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

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

  async function copySecret() {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[540px] overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_30px_100px_rgba(25,23,21,0.20)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5 sm:p-6">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Check size={15} weight="bold" />
            </div>
            <h2 className="mt-4 font-reservation text-[27px] leading-none tracking-[-0.025em] text-[var(--color-foreground)]">
              API key created.
            </h2>
            <p className="mt-2 max-w-[390px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
              Copy your API key now. You won&apos;t be able to see it
              again.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
              {keyName}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-5 text-[var(--color-foreground)] select-all">
                {rawKey}
              </code>
              <button
                type="button"
                onClick={copySecret}
                aria-label="Copy API key"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-accent)]"
              >
                {copied ? (
                  <Check size={13} weight="bold" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
            {copied && (
              <div className="mt-2 font-mono text-[7px] uppercase tracking-[0.09em] text-[var(--color-accent)]">
                Copied
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 h-10 w-full rounded-xl bg-[var(--color-foreground)] text-[9px] font-semibold text-white transition hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// REVOKE MODAL
// ─────────────────────────────────────────────────────

function RevokeModal({
  keyName,
  onClose,
  onConfirm,
}: {
  keyName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close revoke API key modal"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--color-foreground)]/35 backdrop-blur-[3px]"
      />

      <div className="relative z-10 w-full max-w-[470px] rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_30px_100px_rgba(25,23,21,0.20)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <Warning size={16} weight="duotone" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)]"
          >
            <X size={12} />
          </button>
        </div>

        <h2 className="mt-5 font-reservation text-[27px] leading-none tracking-[-0.025em] text-[var(--color-foreground)]">
          Revoke credential?
        </h2>

        <p className="mt-3 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Applications using{" "}
          <span className="font-semibold text-[var(--color-foreground)]">
            {keyName}
          </span>{" "}
          would no longer be able to authenticate with this credential.
        </p>

        <div className="mt-5 rounded-[16px] bg-[var(--color-background)] p-4">
          <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
            Credential
          </div>
          <div className="mt-2 text-[10px] font-semibold text-[var(--color-foreground)]">
            {keyName}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[var(--color-border)] px-5 text-[9px] text-[var(--color-foreground-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-xl bg-[var(--color-foreground)] px-5 text-[9px] font-semibold text-white transition hover:opacity-90"
          >
            Revoke credential
          </button>
        </div>
      </div>
    </div>
  );
}

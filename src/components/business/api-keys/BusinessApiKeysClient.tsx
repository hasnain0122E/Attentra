"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Key, Plus, ShieldCheck } from "@phosphor-icons/react";

import { useBusiness } from "@/components/business/BusinessContext";

import BusinessApiKeyFilters from "./BusinessApiKeyFilters";
import BusinessApiKeyMetric from "./BusinessApiKeyMetric";
import BusinessApiKeyTable from "./BusinessApiKeyTable";
import CreateBusinessApiKeyModal from "./CreateBusinessApiKeyModal";
import CreatedBusinessKeyModal from "./CreatedBusinessKeyModal";
import RevokeBusinessApiKeyModal from "./RevokeBusinessApiKeyModal";

/** Single API key as returned by the listing API. */
export interface BusinessApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// ── Modal state machine ────────────────────────────
type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "created"; rawKey: string; keyName: string }
  | { type: "revoke"; apiKeyId: string; keyName: string };

export default function BusinessApiKeysClient() {
  const { business } = useBusiness();

  const [apiKeys, setApiKeys] = useState<BusinessApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [modalState, setModalState] = useState<ModalState>({ type: "closed" });

  // ── Fetch API keys ────────────────────────────────
  const fetchKeys = useCallback(async () => {
    if (!business) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch(
        `/api/business/${business.id}/api-keys`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );

      if (!res.ok) throw new Error("Failed to load");

      const json = (await res.json()) as {
        success: boolean;
        data: BusinessApiKeyData[];
      };

      if (!json.success) throw new Error("API error");

      setApiKeys(json.data);
    } catch (err) {
      console.error("[api-keys] Failed to load", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  // ── Derived status helper ─────────────────────────
  function getKeyStatus(key: BusinessApiKeyData): "ACTIVE" | "REVOKED" | "EXPIRED" {
    if (key.revokedAt) return "REVOKED";
    if (key.expiresAt && new Date(key.expiresAt) <= new Date()) return "EXPIRED";
    return "ACTIVE";
  }

  // ── Computed metrics ──────────────────────────────
  const metrics = useMemo(() => {
    const total = apiKeys.length;
    const active = apiKeys.filter((k) => getKeyStatus(k) === "ACTIVE").length;
    const revoked = apiKeys.filter((k) => getKeyStatus(k) === "REVOKED").length;

    return [
      { label: "Organization keys", value: String(total), detail: "shared credentials in this workspace" },
      { label: "Active", value: String(active), detail: "credentials currently available", accent: true },
      { label: "Revoked", value: String(revoked), detail: "credentials no longer in use" },
      {
        label: "Total",
        value: String(total),
        detail: total === 1 ? "1 credential created" : `${total} credentials created`,
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
        (status === "REVOKED" && (keyStatus === "REVOKED" || keyStatus === "EXPIRED"));

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
    if (modalState.type !== "revoke" || !business) return;

    try {
      const res = await fetch(
        `/api/business/${business.id}/api-keys/${modalState.apiKeyId}`,
        { method: "DELETE", headers: { Accept: "application/json" } },
      );

      if (!res.ok) throw new Error("Revoke failed");

      setModalState({ type: "closed" });
      await fetchKeys();
    } catch (err) {
      console.error("[api-keys] Revoke failed", err);
    }
  }, [modalState, business, fetchKeys]);

  // ── No business ───────────────────────────────────
  if (!business) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <Key size={24} weight="duotone" className="mx-auto text-[var(--color-accent)]" />
        <div className="mt-4 font-reservation text-[25px] text-[var(--color-foreground)]">
          No workspace available.
        </div>
        <p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Create or join a business workspace to manage organization API keys.
        </p>
      </section>
    );
  }

  // ── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-7">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Organization credentials
          </div>
          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            API keys.
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
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

  return (
    <>
      <div className="space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
              Organization credentials
            </div>

            <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
              API keys.
            </h1>

            <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
              Manage credentials used by applications and teams to send
              organization traffic through Attentra.
            </p>
          </div>

          {business.role === "OWNER" && (
            <button
              type="button"
              onClick={() => setModalState({ type: "create" })}
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 text-[9px] font-semibold text-white transition hover:opacity-90"
            >
              <Plus size={12} weight="bold" />
              Create API key
            </button>
          )}
        </div>

        {/* Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <BusinessApiKeyMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              accent={metric.accent}
            />
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
                  Credentials stay scoped to the organization.
                </div>

                <p className="mt-1.5 max-w-[630px] text-[8px] leading-4 text-white/45">
                  Production integration should store only secure hashes of
                  credentials. Complete secrets should only be displayed during
                  creation.
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
          <BusinessApiKeyFilters
            search={search}
            status={status}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
          />

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

        <BusinessApiKeyTable
          apiKeys={filteredKeys}
          onRevoke={(key) => {
            if (key) setModalState({ type: "revoke", apiKeyId: key.id, keyName: key.name });
          }}
        />
      </div>

      {modalState.type === "create" && (
        <CreateBusinessApiKeyModal
          onClose={() => setModalState({ type: "closed" })}
          onCreated={(rawKey, keyName) => {
            setModalState({ type: "created", rawKey, keyName });
            void fetchKeys();
          }}
          businessId={business.id}
        />
      )}

      {modalState.type === "created" && (
        <CreatedBusinessKeyModal
          rawKey={modalState.rawKey}
          keyName={modalState.keyName}
          onClose={() => setModalState({ type: "closed" })}
        />
      )}

      {modalState.type === "revoke" && (
        <RevokeBusinessApiKeyModal
          keyName={modalState.keyName}
          onClose={() => setModalState({ type: "closed" })}
          onConfirm={confirmRevoke}
        />
      )}
    </>
  );
}

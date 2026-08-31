"use client";

import { useState } from "react";

import {
  Key,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";

import {
  initialApiKeys,
  type DashboardApiKey,
} from "@/lib/dashboard/api-key-data";

import ApiKeyStats from "./ApiKeyStats";
import ApiKeyTable from "./ApiKeyTable";
import CreateApiKeyModal from "./CreateApiKeyModal";
import CreatedKeyModal from "./CreatedKeyModal";
import RevokeKeyModal from "./RevokeKeyModal";

interface CreatedSecretState {
  name: string;
  secret: string;
}

function createDemoSecret() {
  const segment = Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase();

  const secretSegment = Math.random()
    .toString(36)
    .slice(2, 18);

  return `attentra_demo_${segment}_${secretSegment}`;
}

export default function ApiKeysClient() {
  const [apiKeys, setApiKeys] =
    useState<DashboardApiKey[]>(
      initialApiKeys,
    );

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [newKeyName, setNewKeyName] =
    useState("");

  const [
    createdSecret,
    setCreatedSecret,
  ] =
    useState<CreatedSecretState | null>(
      null,
    );

  const [
    revokeTarget,
    setRevokeTarget,
  ] =
    useState<DashboardApiKey | null>(null);

  function handleCreateKey() {
    const cleanName =
      newKeyName.trim();

    if (cleanName.length < 2) {
      return;
    }

    const secret =
      createDemoSecret();

    const prefix = secret.slice(
      0,
      22,
    );

    const newApiKey: DashboardApiKey = {
      id: `key_demo_${Date.now()}`,

      name: cleanName,

      prefix,

      maskedKey: `${prefix}••••••••••••••••`,

      status: "ACTIVE",

      createdAt:
        new Date().toISOString(),

      requestCount: 0,
    };

    setApiKeys((current) => [
      newApiKey,
      ...current,
    ]);

    setCreateModalOpen(false);
    setNewKeyName("");

    setCreatedSecret({
      name: cleanName,
      secret,
    });
  }

  function handleConfirmRevoke() {
    if (!revokeTarget) {
      return;
    }

    setApiKeys((current) =>
      current.map((apiKey) =>
        apiKey.id === revokeTarget.id
          ? {
              ...apiKey,
              status: "REVOKED",
            }
          : apiKey,
      ),
    );

    setRevokeTarget(null);
  }

  return (
    <>
      <div className="space-y-5">
        <ApiKeyStats apiKeys={apiKeys} />

        {/* Security notice */}
        <section className="flex flex-col gap-4 rounded-[22px] border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-accent)]">
              <ShieldCheck
                size={16}
                weight="duotone"
              />
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[var(--color-foreground)]">
                Keep API keys private
              </div>

              <p className="mt-1 max-w-[680px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
                API keys authenticate requests
                made to Attentra. Never expose
                them in browser code, public
                repositories, screenshots, or
                client-side applications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCreateModalOpen(true)
            }
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-[9px] font-medium text-white transition hover:opacity-90"
          >
            <Plus
              size={12}
              weight="bold"
            />
            Create API key
          </button>
        </section>

        {/* Ledger */}
        <div>
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.11em] text-[var(--color-foreground-muted)]">
                Credentials
              </div>

              <div className="mt-1 text-[10px] text-[var(--color-foreground-secondary)]">
                Manage keys used to access the
                Attentra API.
              </div>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] text-[var(--color-foreground-muted)]">
              <Key
                size={13}
                weight="duotone"
              />
            </div>
          </div>

          <ApiKeyTable
            apiKeys={apiKeys}
            onRevoke={setRevokeTarget}
          />
        </div>
      </div>

      <CreateApiKeyModal
        open={createModalOpen}
        name={newKeyName}
        onNameChange={setNewKeyName}
        onClose={() => {
          setCreateModalOpen(false);
          setNewKeyName("");
        }}
        onCreate={handleCreateKey}
      />

      <CreatedKeyModal
        open={createdSecret !== null}
        keyName={
          createdSecret?.name ?? ""
        }
        secret={
          createdSecret?.secret ?? ""
        }
        onClose={() =>
          setCreatedSecret(null)
        }
      />

      <RevokeKeyModal
        apiKey={revokeTarget}
        onClose={() =>
          setRevokeTarget(null)
        }
        onConfirm={
          handleConfirmRevoke
        }
      />
    </>
  );
}
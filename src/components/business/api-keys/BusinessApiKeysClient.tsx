"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Key,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";

import {
  businessApiKeyMetrics,
  businessApiKeys,
  type BusinessApiKey,
} from "@/lib/business/api-key-data";

import BusinessApiKeyFilters from "./BusinessApiKeyFilters";
import BusinessApiKeyMetric from "./BusinessApiKeyMetric";
import BusinessApiKeyTable from "./BusinessApiKeyTable";
import CreateBusinessApiKeyModal from "./CreateBusinessApiKeyModal";
import RevokeBusinessApiKeyModal from "./RevokeBusinessApiKeyModal";

export default function BusinessApiKeysClient() {
  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("ALL");

  const [
    environment,
    setEnvironment,
  ] = useState("ALL");

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [
    revokeTarget,
    setRevokeTarget,
  ] =
    useState<BusinessApiKey | null>(
      null,
    );

  const [
    simulatedRevokedIds,
    setSimulatedRevokedIds,
  ] = useState<string[]>([]);

  const effectiveApiKeys =
    useMemo(() => {
      return businessApiKeys.map(
        (apiKey) =>
          simulatedRevokedIds.includes(
            apiKey.id,
          )
            ? {
                ...apiKey,
                status:
                  "REVOKED" as const,
              }
            : apiKey,
      );
    }, [simulatedRevokedIds]);

  const filteredKeys =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      return effectiveApiKeys.filter(
        (apiKey) => {
          const matchesSearch =
            !normalized ||
            apiKey.name
              .toLowerCase()
              .includes(normalized) ||
            apiKey.prefix
              .toLowerCase()
              .includes(normalized) ||
            apiKey.createdBy.name
              .toLowerCase()
              .includes(normalized) ||
            apiKey.usageContext
              .toLowerCase()
              .includes(normalized);

          const matchesStatus =
            status === "ALL" ||
            apiKey.status === status;

          const matchesEnvironment =
            environment === "ALL" ||
            apiKey.environment ===
              environment;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesEnvironment
          );
        },
      );
    }, [
      search,
      status,
      environment,
      effectiveApiKeys,
    ]);

  const hasFilters =
    search.length > 0 ||
    status !== "ALL" ||
    environment !== "ALL";

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setEnvironment("ALL");
  }

  function confirmRevoke() {
    if (!revokeTarget) {
      return;
    }

    setSimulatedRevokedIds(
      (current) => [
        ...current,
        revokeTarget.id,
      ],
    );

    setRevokeTarget(null);
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
              Manage credentials used
              by applications and teams
              to send organization
              traffic through Attentra.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setCreateModalOpen(true)
            }
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 text-[9px] font-semibold text-white transition hover:opacity-90"
          >
            <Plus
              size={12}
              weight="bold"
            />

            Create API key
          </button>
        </div>

        {/* Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {businessApiKeyMetrics.map(
            (metric) => (
              <BusinessApiKeyMetric
                key={metric.label}
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
                accent={metric.accent}
              />
            ),
          )}
        </section>

        {/* Security callout */}
        <section className="relative overflow-hidden rounded-[22px] bg-[var(--color-foreground)] p-5 text-white sm:p-6">
          <div
            aria-hidden="true"
            className="absolute inset-0"
          >
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
                <ShieldCheck
                  size={16}
                  weight="duotone"
                />
              </div>

              <div>
                <div className="text-[11px] font-semibold">
                  Credentials stay scoped to the organization.
                </div>

                <p className="mt-1.5 max-w-[630px] text-[8px] leading-4 text-white/45">
                  Production integration
                  should store only secure
                  hashes of credentials.
                  Complete secrets should
                  only be displayed during
                  creation.
                </p>
              </div>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
              <Key
                size={10}
                className="text-[var(--color-accent)]"
              />

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
            environment={environment}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onEnvironmentChange={
              setEnvironment
            }
          />

          <div className="flex items-center justify-between px-1">
            <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
              {filteredKeys.length}{" "}
              {filteredKeys.length === 1
                ? "credential"
                : "credentials"}
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
          onRevoke={
            setRevokeTarget
          }
        />
      </div>

      <CreateBusinessApiKeyModal
        open={createModalOpen}
        onClose={() =>
          setCreateModalOpen(false)
        }
      />

      <RevokeBusinessApiKeyModal
        apiKey={revokeTarget}
        onClose={() =>
          setRevokeTarget(null)
        }
        onConfirm={confirmRevoke}
      />
    </>
  );
}
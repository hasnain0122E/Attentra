import type { ReactNode } from "react";

import {
  CheckCircle,
  DotsThree,
  Key,
  Prohibit,
} from "@phosphor-icons/react/dist/ssr";

import type { DashboardApiKey } from "@/lib/dashboard/api-key-data";

interface ApiKeyTableProps {
  apiKeys: DashboardApiKey[];

  onRevoke: (
    apiKey: DashboardApiKey,
  ) => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatLastUsed(value?: string) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ApiKeyTable({
  apiKeys,
  onRevoke,
}: ApiKeyTableProps) {
  if (apiKeys.length === 0) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Key
            size={18}
            weight="duotone"
          />
        </div>

        <div className="mt-5 font-reservation text-[24px] text-[var(--color-foreground)]">
          No API keys yet.
        </div>

        <p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Create a key when you are ready to
          connect an application to Attentra.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Desktop header */}
      <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/45 px-5 py-3 xl:grid xl:grid-cols-[minmax(240px,1.3fr)_minmax(220px,1fr)_130px_130px_100px_60px] xl:items-center xl:gap-5">
        <HeaderLabel>Key</HeaderLabel>
        <HeaderLabel>Credential</HeaderLabel>
        <HeaderLabel>Created</HeaderLabel>
        <HeaderLabel>Last used</HeaderLabel>
        <HeaderLabel>Requests</HeaderLabel>

        <div />
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {apiKeys.map((apiKey) => (
          <article
            key={apiKey.id}
            className="transition-colors hover:bg-[var(--color-surface-soft)]/35"
          >
            {/* Mobile / Tablet */}
            <div className="p-4 sm:p-5 xl:hidden">
              {/* Top */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      apiKey.status === "ACTIVE"
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-muted)]",
                    ].join(" ")}
                  >
                    <Key
                      size={15}
                      weight="duotone"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                      {apiKey.name}
                    </div>

                    <div className="mt-1.5">
                      <StatusBadge
                        status={apiKey.status}
                      />
                    </div>
                  </div>
                </div>

                {apiKey.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRevoke(apiKey)
                    }
                    aria-label={`Revoke ${apiKey.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <Prohibit
                      size={14}
                      weight="duotone"
                    />
                  </button>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-foreground-muted)]">
                    <DotsThree
                      size={16}
                      weight="bold"
                    />
                  </div>
                )}
              </div>

              {/* Credential */}
              <div className="mt-4">
                <div className="font-mono text-[7px] uppercase tracking-[0.11em] text-[var(--color-foreground-muted)]">
                  Credential
                </div>

                <div className="mt-2 truncate rounded-xl bg-[var(--color-background)] px-3 py-2.5 font-mono text-[8px] tracking-[0.03em] text-[var(--color-foreground-secondary)]">
                  {apiKey.maskedKey}
                </div>
              </div>

              {/* Compact metadata */}
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--color-border)] pt-4">
                <CompactMetric
                  label="Created"
                  value={formatDate(
                    apiKey.createdAt,
                  )}
                />

                <CompactMetric
                  label="Last used"
                  value={formatLastUsed(
                    apiKey.lastUsedAt,
                  )}
                />

                <CompactMetric
                  label="Requests"
                  value={String(
                    apiKey.requestCount,
                  )}
                />
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden px-5 py-5 xl:grid xl:grid-cols-[minmax(240px,1.3fr)_minmax(220px,1fr)_130px_130px_100px_60px] xl:items-center xl:gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      apiKey.status === "ACTIVE"
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-muted)]",
                    ].join(" ")}
                  >
                    <Key
                      size={14}
                      weight="duotone"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                      {apiKey.name}
                    </div>

                    <div className="mt-1">
                      <StatusBadge
                        status={apiKey.status}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="truncate rounded-lg bg-[var(--color-background)] px-3 py-2 font-mono text-[8px] tracking-[0.03em] text-[var(--color-foreground-secondary)]">
                  {apiKey.maskedKey}
                </div>
              </div>

              <Metric
                value={formatDate(
                  apiKey.createdAt,
                )}
              />

              <Metric
                value={formatLastUsed(
                  apiKey.lastUsedAt,
                )}
              />

              <Metric
                value={String(
                  apiKey.requestCount,
                )}
              />

              <div className="flex justify-end">
                {apiKey.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRevoke(apiKey)
                    }
                    aria-label={`Revoke ${apiKey.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <Prohibit
                      size={14}
                      weight="duotone"
                    />
                  </button>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center text-[var(--color-foreground-muted)]">
                    <DotsThree
                      size={16}
                      weight="bold"
                    />
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HeaderLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
      {children}
    </div>
  );
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[6px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-1.5 break-words text-[8px] leading-4 text-[var(--color-foreground-secondary)]">
        {value}
      </div>
    </div>
  );
}

function Metric({
  value,
}: {
  value: string;
}) {
  return (
    <div className="text-[9px] text-[var(--color-foreground-secondary)]">
      {value}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: DashboardApiKey["status"];
}) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <CheckCircle size={8} />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
      <Prohibit size={8} />
      Revoked
    </span>
  );
}
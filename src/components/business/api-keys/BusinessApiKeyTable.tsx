import type { ReactNode } from "react";

import {
  CheckCircle,
  Key,
  Prohibit,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import type {
  BusinessApiKey,
  BusinessApiKeyStatus,
} from "@/lib/business/api-key-data";

interface BusinessApiKeyTableProps {
  apiKeys: BusinessApiKey[];

  onRevoke: (
    apiKey: BusinessApiKey,
  ) => void;
}

function formatDate(value?: string) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function BusinessApiKeyTable({
  apiKeys,
  onRevoke,
}: BusinessApiKeyTableProps) {
  if (apiKeys.length === 0) {
    return (
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
          Change the active search or organization credential
          filters.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Credential inventory
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Organization API keys
        </h2>

        <p className="mt-2 max-w-[620px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Shared credentials used by applications and internal
          organization workloads.
        </p>
      </div>

      {/* Desktop table header */}
      <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/40 px-6 py-3 xl:grid xl:grid-cols-[minmax(220px,1.4fr)_110px_150px_100px_120px_95px_40px] xl:items-center xl:gap-4">
        <HeaderLabel>Credential</HeaderLabel>
        <HeaderLabel>Environment</HeaderLabel>
        <HeaderLabel>Created by</HeaderLabel>
        <HeaderLabel>Requests</HeaderLabel>
        <HeaderLabel>Last used</HeaderLabel>
        <HeaderLabel>Status</HeaderLabel>
        <div />
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {apiKeys.map((apiKey) => (
          <article
            key={apiKey.id}
            className="px-5 py-5 transition-colors hover:bg-[var(--color-surface-soft)]/30 sm:px-6"
          >
            {/* MOBILE / TABLET */}
            <div className="xl:hidden">
              {/* Main credential row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <Key
                      size={15}
                      weight="duotone"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-[var(--color-foreground)]">
                      {apiKey.name}
                    </div>

                    <div className="mt-1.5 truncate font-mono text-[7px] text-[var(--color-foreground-muted)]">
                      {apiKey.prefix}
                    </div>
                  </div>
                </div>

                <StatusBadge
                  status={apiKey.status}
                />
              </div>

              {/* Compact metadata */}
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
                <MobileMetric
                  label="Environment"
                  value={
                    <EnvironmentBadge
                      environment={apiKey.environment}
                    />
                  }
                />

                <MobileMetric
                  label="Requests"
                  value={apiKey.requestCount.toLocaleString()}
                />

                <MobileMetric
                  label="Created by"
                  value={
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] font-mono text-[6px] font-semibold text-[var(--color-foreground-secondary)]">
                        {apiKey.createdBy.initials}
                      </div>

                      <span className="truncate text-[8px] text-[var(--color-foreground-secondary)]">
                        {apiKey.createdBy.name}
                      </span>
                    </div>
                  }
                />

                <MobileMetric
                  label="Last used"
                  value={formatDate(apiKey.lastUsedAt)}
                />
              </div>

              {/* Footer */}
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4">
                <p className="min-w-0 line-clamp-1 text-[8px] leading-4 text-[var(--color-foreground-muted)]">
                  {apiKey.usageContext}
                </p>

                {apiKey.status === "ACTIVE" ? (
                  <button
                    type="button"
                    aria-label={`Revoke ${apiKey.name}`}
                    onClick={() =>
                      onRevoke(apiKey)
                    }
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

            {/* DESKTOP */}
            <div className="hidden xl:grid xl:grid-cols-[minmax(220px,1.4fr)_110px_150px_100px_120px_95px_40px] xl:items-center xl:gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <Key
                    size={15}
                    weight="duotone"
                  />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[10px] font-semibold text-[var(--color-foreground)]">
                    {apiKey.name}
                  </div>

                  <div className="mt-1.5 truncate font-mono text-[7px] text-[var(--color-foreground-muted)]">
                    {apiKey.prefix}
                  </div>

                  <div className="mt-2 line-clamp-1 text-[7px] text-[var(--color-foreground-muted)]">
                    {apiKey.usageContext}
                  </div>
                </div>
              </div>

              <EnvironmentBadge
                environment={apiKey.environment}
              />

              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] font-mono text-[6px] font-semibold text-[var(--color-foreground-secondary)]">
                  {apiKey.createdBy.initials}
                </div>

                <span className="truncate text-[8px] text-[var(--color-foreground-secondary)]">
                  {apiKey.createdBy.name}
                </span>
              </div>

              <DesktopMetric
                value={apiKey.requestCount.toLocaleString()}
              />

              <DesktopMetric
                value={formatDate(apiKey.lastUsedAt)}
              />

              <StatusBadge
                status={apiKey.status}
              />

              <div className="flex justify-end">
                {apiKey.status === "ACTIVE" ? (
                  <button
                    type="button"
                    aria-label={`Revoke ${apiKey.name}`}
                    onClick={() =>
                      onRevoke(apiKey)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-accent)]"
                  >
                    <Trash size={11} />
                  </button>
                ) : (
                  <span className="font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    Locked
                  </span>
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

function MobileMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[6px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
        {label}
      </div>

      <div className="mt-2 min-w-0 font-mono text-[8px] text-[var(--color-foreground)]">
        {value}
      </div>
    </div>
  );
}

function DesktopMetric({
  value,
}: {
  value: string;
}) {
  return (
    <div className="font-mono text-[8px] text-[var(--color-foreground)]">
      {value}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: BusinessApiKeyStatus;
}) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-accent)]">
        <CheckCircle size={8} />
        Active
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

function EnvironmentBadge({
  environment,
}: {
  environment: BusinessApiKey["environment"];
}) {
  return (
    <span
      className={[
        "inline-flex w-fit rounded-full px-2 py-1 font-mono text-[6px] uppercase tracking-[0.08em]",
        environment === "PRODUCTION"
          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          : "bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]",
      ].join(" ")}
    >
      {environment}
    </span>
  );
}
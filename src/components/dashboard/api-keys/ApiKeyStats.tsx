import type { ElementType } from "react";

import {
  Clock,
  Key,
  Lightning,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

import type { DashboardApiKey } from "@/lib/dashboard/api-key-data";

interface ApiKeyStatsProps {
  apiKeys: DashboardApiKey[];
}

export default function ApiKeyStats({
  apiKeys,
}: ApiKeyStatsProps) {
  const activeKeys = apiKeys.filter(
    (key) => key.status === "ACTIVE",
  );

  const totalRequests = apiKeys.reduce(
    (sum, key) => sum + key.requestCount,
    0,
  );

  const recentlyUsed = activeKeys.filter(
    (key) => key.lastUsedAt,
  ).length;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active keys"
        value={String(activeKeys.length)}
        detail={`${apiKeys.length} total keys`}
        icon={Key}
      />

      <StatCard
        label="API requests"
        value={String(totalRequests)}
        detail="Across visible keys"
        icon={Lightning}
      />

      <StatCard
        label="Recently used"
        value={String(recentlyUsed)}
        detail="Active keys with usage"
        icon={Clock}
      />

      <StatCard
        label="Key policy"
        value="Secure"
        detail="Secrets shown once"
        icon={ShieldCheck}
      />
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
          {label}
        </span>

        <Icon
          size={14}
          weight="duotone"
          className="text-[var(--color-accent)]"
        />
      </div>

      <div className="mt-5 text-[21px] font-semibold tracking-[-0.025em] text-[var(--color-foreground)]">
        {value}
      </div>

      <p className="mt-1 text-[9px] text-[var(--color-foreground-muted)]">
        {detail}
      </p>
    </article>
  );
}
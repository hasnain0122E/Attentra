import {
  ArrowsClockwise,
  Clock,
  Coins,
  Hash,
  Robot,
  Stack,
  Target,
} from "@phosphor-icons/react/dist/ssr";

import type { ElementType } from "react";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

import { getDisplayCurrencyConfig } from "@/lib/currency/display-currency";
import {
  NOT_AVAILABLE,
  describeTokens,
  formatRequestCost,
} from "@/lib/dashboard/request-display";

interface RequestMetadataGridProps {
  request: RequestHistoryItem;
}

function formatLatency(value: number) {
  if (!value || value <= 0) {
    return NOT_AVAILABLE;
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

function fallbackStatus(request: RequestHistoryItem) {
  if (request.status === "FAILED") {
    return { value: "—", detail: "Request failed" };
  }
  if (request.fallbackUsed) {
    return { value: "Fallback used", detail: "Executed model differs from routed model" };
  }
  return { value: "Not used", detail: "Routed model answered" };
}

export default function RequestMetadataGrid({
  request,
}: RequestMetadataGridProps) {
  const tokens = describeTokens(request);
  const fallback = fallbackStatus(request);
  const currency = getDisplayCurrencyConfig();
  const convertedDisplay = currency.valid && currency.currency !== "USD";

  return (
    <section>
      <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
        Request telemetry
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetadataItem
          label="Routed model"
          value={request.routedModel || NOT_AVAILABLE}
          detail={request.routedProvider || "Selected by the router"}
          icon={Target}
        />

        <MetadataItem
          label="Executed model"
          value={request.executedModel ?? NOT_AVAILABLE}
          detail={request.executedProvider ?? "No successful execution"}
          icon={Robot}
        />

        <MetadataItem
          label="Fallback"
          value={fallback.value}
          detail={fallback.detail}
          icon={ArrowsClockwise}
          emphasized={request.fallbackUsed}
        />

        <MetadataItem label="Input tokens" value={tokens.input} detail={tokens.detail} icon={Hash} />

        <MetadataItem label="Output tokens" value={tokens.output} detail={tokens.detail} icon={Hash} />

        <MetadataItem label="Total tokens" value={tokens.total} detail="Input + output" icon={Hash} />

        <MetadataItem
          label="Projected cost"
          value={formatRequestCost(request.projectedCost)}
          detail="Estimated before execution"
          icon={Coins}
        />

        <MetadataItem
          label="Actual calculated cost"
          value={formatRequestCost(request.actualCost)}
          detail={
            request.actualCost === undefined
              ? "No reported usage or pricing"
              : "From reported usage × stored pricing"
          }
          icon={Stack}
        />

        <MetadataItem
          label="Latency"
          value={formatLatency(request.latencyMs)}
          detail={
            request.fallbackUsed
              ? "Measured · includes fallback attempts"
              : "Measured execution time"
          }
          icon={Clock}
        />
      </div>

      <div className="mt-3 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
        <p>
          <strong className="font-semibold text-[var(--color-foreground)]">Projected cost</strong> is
          estimated before execution from estimated tokens.{" "}
          <strong className="font-semibold text-[var(--color-foreground)]">Actual calculated cost</strong>{" "}
          is computed after execution from provider-reported tokens and Attentra&apos;s stored pricing; it may
          differ from a provider invoice. Savings shown in Billing compare against a configured baseline model.
          Long conversations re-send earlier messages, which increases input tokens and cost.
        </p>
        {convertedDisplay && (
          <p className="mt-2">
            Amounts are shown in {currency.currency}, converted from USD at a fixed rate configured for this
            deployment.
          </p>
        )}
      </div>
    </section>
  );
}

interface MetadataItemProps {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
  emphasized?: boolean;
}

function MetadataItem({
  label,
  value,
  detail,
  icon: Icon,
  emphasized = false,
}: MetadataItemProps) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--color-foreground-muted)]">
          {label}
        </div>

        <Icon
          size={14}
          weight="duotone"
          className="shrink-0 text-[var(--color-accent)]"
        />
      </div>

      <div
        className={[
          "mt-5 break-words text-[13px] font-semibold",
          emphasized ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]",
        ].join(" ")}
      >
        {value}
      </div>

      <div className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.06em] text-[var(--color-foreground-muted)]">
        {detail}
      </div>
    </div>
  );
}

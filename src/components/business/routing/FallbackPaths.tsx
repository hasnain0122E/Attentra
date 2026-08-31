import {
  ArrowRight,
  ArrowsClockwise,
} from "@phosphor-icons/react/dist/ssr";

import { fallbackPaths } from "@/lib/business/routing-data";

export default function FallbackPaths() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Fallback paths
        </div>

        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          Where requests move when primary execution fails
        </h2>

        <p className="mt-2 max-w-[620px] text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
          Most common model-to-model fallback paths across
          organization traffic.
        </p>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {fallbackPaths.map((path, index) => (
          <div
            key={`${path.fromModel}-${path.toModel}`}
            className="p-5 sm:px-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <ArrowsClockwise
                    size={14}
                    weight="duotone"
                  />
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <ModelLabel
                    model={path.fromModel}
                    provider={path.fromProvider}
                  />

                  <ArrowRight
                    size={11}
                    className="text-[var(--color-accent)]"
                  />

                  <ModelLabel
                    model={path.toModel}
                    provider={path.toProvider}
                    accent
                  />
                </div>
              </div>

              <div className="flex items-center gap-5 md:text-right">
                <div>
                  <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    Requests
                  </div>

                  <div className="mt-1 font-mono text-[9px] text-[var(--color-foreground)]">
                    {path.count.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
                    Share
                  </div>

                  <div className="mt-1 font-mono text-[9px] text-[var(--color-accent)]">
                    {path.percentage.toFixed(1)}%
                  </div>
                </div>

                <div className="hidden h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] font-mono text-[7px] text-[var(--color-foreground-muted)] sm:flex">
                  {String(index + 1).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelLabel({
  model,
  provider,
  accent = false,
}: {
  model: string;
  provider: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div
        className={[
          "text-[10px] font-semibold",
          accent
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-foreground)]",
        ].join(" ")}
      >
        {model}
      </div>

      <div className="mt-1 font-mono text-[6px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
        {provider}
      </div>
    </div>
  );
}
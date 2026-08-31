import type { ElementType } from "react";

import {
  Buildings,
  ChartBar,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

export default function BusinessPage() {
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
        >
          <div
            className="absolute -right-[8%] -top-[50%] h-[155%] w-[55%]"
            style={{
              background:
                "radial-gradient(circle at center, rgba(217,119,69,0.20) 0%, rgba(217,119,69,0.09) 32%, rgba(217,119,69,0.03) 54%, rgba(217,119,69,0) 73%)",
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Business workspace
          </div>

          <h1 className="mt-3 max-w-[760px] font-reservation text-[clamp(2.1rem,4vw,4rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[var(--color-foreground)]">
            Organization-wide AI control.
          </h1>

          <p className="mt-5 max-w-[680px] text-[13px] leading-6 text-[var(--color-foreground-secondary)] sm:text-[14px]">
            Monitor how your organization routes,
            executes, and manages AI requests
            across teams, models, providers, and
            shared infrastructure.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <PreviewCard
          icon={Buildings}
          eyebrow="Organization"
          title="Acme AI"
          description="One shared workspace for organization-wide AI routing."
        />

        <PreviewCard
          icon={UsersThree}
          eyebrow="Team"
          title="Members"
          description="Monitor usage and access across organization members."
        />

        <PreviewCard
          icon={ChartBar}
          eyebrow="Intelligence"
          title="Routing visibility"
          description="Understand how workloads are distributed across your AI stack."
        />
      </section>

      <section className="rounded-[24px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center">
        <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-accent)]">
          Phase 10
        </div>

        <h2 className="mt-3 font-reservation text-[28px] tracking-[-0.025em] text-[var(--color-foreground)]">
          Business intelligence is next.
        </h2>

        <p className="mx-auto mt-3 max-w-[500px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Organization metrics, routing activity,
          request visibility, model usage, members,
          credentials, and controls will populate
          this workspace in the following steps.
        </p>
      </section>
    </div>
  );
}

interface PreviewCardProps {
  icon: ElementType;
  eyebrow: string;
  title: string;
  description: string;
}

function PreviewCard({
  icon: Icon,
  eyebrow,
  title,
  description,
}: PreviewCardProps) {
  return (
    <article className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        <Icon
          size={16}
          weight="duotone"
        />
      </div>

      <div className="mt-5 font-mono text-[7px] uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
        {eyebrow}
      </div>

      <h2 className="mt-2 text-[14px] font-semibold text-[var(--color-foreground)]">
        {title}
      </h2>

      <p className="mt-2 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
        {description}
      </p>
    </article>
  );
}
import Link from "next/link";
import {
  ArrowRight,
  BracketsCurly,
  EnvelopeSimple,
  Gauge,
  Receipt,
  ShieldCheck,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";

import { auth } from "@/auth";

export default async function SettingsPage() {
  const session = await auth();

  const displayName = session?.user?.name ?? "Attentra user";
  const email = session?.user?.email ?? "\u2014";

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Workspace information
          </div>

          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            Settings.
          </h1>

          <p className="mt-3 max-w-[670px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
            Your personal Attentra workspace at a glance.
            This surface is read-only — routing and
            execution behavior is engine-owned.
          </p>
        </div>

        <div className="w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
            Consumer workspace
          </span>
        </div>
      </div>

      {/* Account */}
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Account
          </div>
        </div>

        <InfoRow
          icon={UserCircle}
          label="Signed in as"
          value={displayName}
        />

        <InfoRow
          icon={EnvelopeSimple}
          label="Email"
          value={email}
        />

        <InfoRow
          icon={ShieldCheck}
          label="Sign-in method"
          value="Google"
          last
        />
      </section>

      {/* Workspace */}
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Workspace
          </div>
        </div>

        <InfoRow
          icon={Gauge}
          label="Workspace type"
          value="Personal"
        />

        <div className="flex flex-col gap-1 px-5 py-4 sm:px-6">
          <p className="max-w-[680px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
            Requests made through your session or personal API keys
            belong to your user account. Every request is routed,
            executed, and priced against the shared model registry.
          </p>
        </div>
      </section>

      {/* Cost & billing */}
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--color-foreground-muted)]">
            Cost &amp; billing
          </div>
        </div>

        <div className="flex flex-col gap-1 px-5 py-4 sm:px-6">
          <p className="max-w-[680px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
            Verified-savings billing applies a 10% optimization fee to
            net positive savings each billing period. Costs are computed
            in USD and presented in your display currency.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/billing"
              className="group inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-[10px] font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)]"
            >
              <Receipt size={13} weight="duotone" />
              View billing

              <ArrowRight
                size={11}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>

            <Link
              href="/dashboard/api-keys"
              className="group inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-[10px] font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)]"
            >
              <BracketsCurly size={13} weight="duotone" />
              Manage API keys

              <ArrowRight
                size={11}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ElementType;

  label: string;

  value: string;

  last?: boolean;
}

function InfoRow({ icon: Icon, label, value, last }: InfoRowProps) {
  return (
    <div
      className={`flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
        last ? "" : "border-b border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]">
          <Icon size={14} weight="duotone" />
        </div>

        <span className="text-[10px] font-medium text-[var(--color-foreground-secondary)]">
          {label}
        </span>
      </div>

      <span className="pl-[44px] text-[11px] font-medium text-[var(--color-foreground)] sm:pl-0">
        {value}
      </span>
    </div>
  );
}

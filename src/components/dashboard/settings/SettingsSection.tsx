import type { ReactNode } from "react";

interface SettingsSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export default function SettingsSection({
  eyebrow,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="relative rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="rounded-t-[24px] border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--color-accent)]">
          {eyebrow}
        </div>

        <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
          {title}
        </h2>

        <p className="mt-2 max-w-[650px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          {description}
        </p>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {children}
      </div>
    </section>
  );
}
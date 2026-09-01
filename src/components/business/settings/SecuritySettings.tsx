"use client";

import type { ElementType } from "react";

import { Key, ShieldCheck } from "@phosphor-icons/react";

interface SecuritySettingsProps {
  requireMemberAccess: boolean;
  auditLogging: boolean;

  onRequireMemberAccessChange: (value: boolean) => void;

  onAuditLoggingChange: (value: boolean) => void;
}

export default function SecuritySettings({
  requireMemberAccess,
  auditLogging,
  onRequireMemberAccessChange,
  onAuditLoggingChange,
}: SecuritySettingsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SecuritySetting
        icon={ShieldCheck}
        title="Member access enforcement"
        description="Restrict organization controls to authorized workspace members."
        enabled={requireMemberAccess}
        onChange={onRequireMemberAccessChange}
      />

      <SecuritySetting
        icon={Key}
        title="Audit activity"
        description="Record administrative workspace changes for operational visibility."
        enabled={auditLogging}
        onChange={onAuditLoggingChange}
      />
    </div>
  );
}

function SecuritySetting({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[17px] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Icon size={14} weight="duotone" />
        </div>

        <div>
          <div className="text-[10px] font-semibold text-[var(--color-foreground)]">
            {title}
          </div>

          <p className="mt-1 text-[8px] leading-4 text-[var(--color-foreground-secondary)]">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={[
          "relative mt-1 h-7 w-12 shrink-0 rounded-full border transition-all duration-200",
          enabled
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[var(--color-border)] bg-[var(--color-surface-soft)]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white",
            "shadow-[0_2px_6px_rgba(25,23,21,0.16)]",
            "transition-all duration-200",
            enabled ? "left-[25px]" : "left-[3px]",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

"use client";

import {
  useState,
} from "react";

import {
  Check,
  FloppyDisk,
} from "@phosphor-icons/react";

import type {
  BusinessSettingsState,
  RetentionPeriod,
  RoutingPriority,
} from "@/lib/business/settings-data";

import DangerZoneSettings from "./DangerZoneSettings";
import FallbackSettings from "./FallbackSettings";
import RetentionSettings from "./RetentionSettings";
import RoutingDefaultsSettings from "./RoutingDefaultsSettings";
import SecuritySettings from "./SecuritySettings";
import SettingsSection from "./SettingsSection";
import WorkspaceIdentitySettings from "./WorkspaceIdentitySettings";

const initialSettings: BusinessSettingsState = {
  organizationName: "Acme AI",
  organizationSlug: "acme-ai",

  routingPriority: "BALANCED",

  fallbackEnabled: true,
  maxFallbackAttempts: 2,

  requestRetention: "30_DAYS",

  requireMemberAccess: true,
  auditLogging: true,
};

export default function BusinessSettingsClient() {
  const [
    settings,
    setSettings,
  ] =
    useState<BusinessSettingsState>(
      initialSettings,
    );

  const [saved, setSaved] =
    useState(false);

  function update<K extends keyof BusinessSettingsState>(
    key: K,
    value: BusinessSettingsState[K],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  }

  function saveSettings() {
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  }

  return (
    <div className="space-y-7">
      {/* Page header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Organization configuration
          </div>

          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            Settings.
          </h1>

          <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
            Configure workspace identity,
            routing behavior, retention,
            fallback preferences, and
            organization security.
          </p>
        </div>

        <button
          type="button"
          onClick={saveSettings}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 text-[9px] font-semibold text-white transition hover:opacity-90"
        >
          {saved ? (
            <>
              <Check
                size={12}
                weight="bold"
              />
              Saved locally
            </>
          ) : (
            <>
              <FloppyDisk
                size={12}
                weight="bold"
              />
              Save changes
            </>
          )}
        </button>
      </div>

      {/* Settings grid */}
      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSection
          eyebrow="Workspace"
          title="Organization identity"
          description="Basic information used to identify this Attentra business workspace."
        >
          <WorkspaceIdentitySettings
            organizationName={
              settings.organizationName
            }
            organizationSlug={
              settings.organizationSlug
            }
            onOrganizationNameChange={(
              value,
            ) =>
              update(
                "organizationName",
                value,
              )
            }
            onOrganizationSlugChange={(
              value,
            ) =>
              update(
                "organizationSlug",
                value,
              )
            }
          />
        </SettingsSection>

        <SettingsSection
          eyebrow="Routing"
          title="Default routing priority"
          description="Choose the organization-level routing preference applied when a request does not specify its own priority."
        >
          <RoutingDefaultsSettings
            value={
              settings.routingPriority
            }
            onChange={(
              value: RoutingPriority,
            ) =>
              update(
                "routingPriority",
                value,
              )
            }
          />
        </SettingsSection>

        <SettingsSection
          eyebrow="Reliability"
          title="Fallback behavior"
          description="Control whether Attentra may continue execution when the selected primary model is unavailable."
        >
          <FallbackSettings
            enabled={
              settings.fallbackEnabled
            }
            maxAttempts={
              settings.maxFallbackAttempts
            }
            onEnabledChange={(
              value,
            ) =>
              update(
                "fallbackEnabled",
                value,
              )
            }
            onMaxAttemptsChange={(
              value,
            ) =>
              update(
                "maxFallbackAttempts",
                value,
              )
            }
          />
        </SettingsSection>

        <SettingsSection
          eyebrow="Data"
          title="Request retention"
          description="Choose how long organization request records remain available for operational review."
        >
          <RetentionSettings
            value={
              settings.requestRetention
            }
            onChange={(
              value: RetentionPeriod,
            ) =>
              update(
                "requestRetention",
                value,
              )
            }
          />
        </SettingsSection>
      </div>

      <SettingsSection
        eyebrow="Security"
        title="Workspace security"
        description="Administrative controls for organization access and activity visibility."
      >
        <SecuritySettings
          requireMemberAccess={
            settings.requireMemberAccess
          }
          auditLogging={
            settings.auditLogging
          }
          onRequireMemberAccessChange={(
            value,
          ) =>
            update(
              "requireMemberAccess",
              value,
            )
          }
          onAuditLoggingChange={(
            value,
          ) =>
            update(
              "auditLogging",
              value,
            )
          }
        />
      </SettingsSection>

      <DangerZoneSettings />

      <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--color-foreground-muted)]">
          Frontend configuration preview
        </div>

        <p className="mt-1.5 text-[8px] leading-4 text-[var(--color-foreground-secondary)]">
          Changes currently remain in
          local component state and do
          not modify the organization
          database or routing engine.
        </p>
      </div>
    </div>
  );
}
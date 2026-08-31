"use client";

import { useMemo, useState, type ElementType, type ReactNode } from "react";

import {
  BracketsCurly,
  Gauge,
  GearSix,
  Monitor,
  ShieldCheck,
} from "@phosphor-icons/react";

import {
  initialDashboardSettings,
  type CostPrecision,
  type DashboardSettings,
  type DefaultEnvironment,
  type RequestPriority,
} from "@/lib/dashboard/settings-data";

import SaveSettingsBar from "./SaveSettingsBar";
import SettingSelect from "./SettingSelect";
import SettingsSection from "./SettingsSection";
import SettingToggle from "./SettingToggle";

const environmentOptions = [
  {
    label: "Development",
    value: "DEVELOPMENT",
    description: "Default context for testing and local development.",
  },
  {
    label: "Production",
    value: "PRODUCTION",
    description: "Default context for production workloads.",
  },
];

const priorityOptions = [
  {
    label: "Balanced",
    value: "BALANCED",
    description: "Balance capability, cost, and latency.",
  },
  {
    label: "Cost efficiency",
    value: "COST",
    description: "Prefer lower projected execution cost.",
  },
  {
    label: "Quality first",
    value: "QUALITY",
    description: "Prefer stronger model capability.",
  },
  {
    label: "Low latency",
    value: "LATENCY",
    description: "Prefer faster expected execution.",
  },
];

const attemptOptions = [
  {
    label: "1 attempt",
    value: "1",
    description: "Do not continue after the first execution attempt.",
  },
  {
    label: "2 attempts",
    value: "2",
    description: "Allow one additional execution target.",
  },
  {
    label: "3 attempts",
    value: "3",
    description: "Recommended fallback depth.",
  },
  {
    label: "4 attempts",
    value: "4",
    description: "Allow a deeper fallback chain.",
  },
];

const costPrecisionOptions = [
  {
    label: "Standard",
    value: "STANDARD",
    description: "Compact cost values for everyday use.",
  },
  {
    label: "Detailed",
    value: "DETAILED",
    description: "Show additional decimal precision.",
  },
];

export default function SettingsClient() {
  const [savedSettings, setSavedSettings] = useState<DashboardSettings>(
    initialDashboardSettings,
  );

  const [draftSettings, setDraftSettings] = useState<DashboardSettings>(
    initialDashboardSettings,
  );

  const [saved, setSaved] = useState(false);

  const dirty = useMemo(() => {
    return JSON.stringify(savedSettings) !== JSON.stringify(draftSettings);
  }, [draftSettings, savedSettings]);

  function updateSetting<Key extends keyof DashboardSettings>(
    key: Key,
    value: DashboardSettings[Key],
  ) {
    setDraftSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  }

  function handleReset() {
    setDraftSettings(savedSettings);

    setSaved(false);
  }

  function handleSave() {
    setSavedSettings(draftSettings);

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  }

  return (
    <div className="space-y-5">
      {/* Workspace */}
      <SettingsSection
        eyebrow="Workspace"
        title="Workspace preferences"
        description="Configure the defaults used across your personal Attentra workspace."
      >
        <SettingRow
          icon={GearSix}
          title="Workspace name"
          description="A recognizable name for this Attentra workspace."
        >
          <input
            type="text"
            maxLength={48}
            value={draftSettings.workspaceName}
            onChange={(event) =>
              updateSetting("workspaceName", event.target.value)
            }
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-[10px] text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-accent)] sm:w-[230px]"
          />
        </SettingRow>

        <SettingRow
          icon={Monitor}
          title="Default environment"
          description="The environment label applied by default when working with Attentra."
        >
          <SettingSelect
            value={draftSettings.defaultEnvironment}
            options={environmentOptions}
            onChange={(value) =>
              updateSetting("defaultEnvironment", value as DefaultEnvironment)
            }
            ariaLabel="Select default environment"
          />
        </SettingRow>
      </SettingsSection>

      {/* Routing */}
      <SettingsSection
        eyebrow="Routing"
        title="Routing defaults"
        description="Set default request preferences without changing the underlying Attentra routing engine."
      >
        <SettingRow
          icon={Gauge}
          title="Request priority"
          description="Choose the default optimization preference used when sending requests."
        >
          <SettingSelect
            value={draftSettings.requestPriority}
            options={priorityOptions}
            onChange={(value) =>
              updateSetting("requestPriority", value as RequestPriority)
            }
            ariaLabel="Select request priority"
          />
        </SettingRow>

        <SettingRow
          icon={ShieldCheck}
          title="Automatic fallback"
          description="Allow Attentra to continue to eligible fallback models when the primary execution cannot complete."
        >
          <SettingToggle
            checked={draftSettings.automaticFallback}
            onChange={(checked) => {
              setDraftSettings((current) => ({
                ...current,

                automaticFallback: checked,

                maxExecutionAttempts: checked
                  ? Math.max(current.maxExecutionAttempts, 2)
                  : 1,
              }));

              setSaved(false);
            }}
            ariaLabel="Toggle automatic fallback"
          />
        </SettingRow>

        <SettingRow
          icon={Gauge}
          title="Maximum execution attempts"
          description="Limit how many execution targets may be attempted for a single routed request."
        >
          <div
            className={
              draftSettings.automaticFallback
                ? ""
                : "pointer-events-none opacity-45"
            }
          >
            <SettingSelect
              value={String(draftSettings.maxExecutionAttempts)}
              options={attemptOptions}
              onChange={(value) =>
                updateSetting("maxExecutionAttempts", Number(value))
              }
              ariaLabel="Select maximum execution attempts"
            />
          </div>
        </SettingRow>
      </SettingsSection>

      {/* Developer */}
      <SettingsSection
        eyebrow="Developer"
        title="Developer preferences"
        description="Control how routing and execution information is presented throughout your workspace."
      >
        <SettingRow
          icon={BracketsCurly}
          title="Routing metadata"
          description="Include routing and execution information in developer-facing request results."
        >
          <SettingToggle
            checked={draftSettings.includeRoutingMetadata}
            onChange={(checked) =>
              updateSetting("includeRoutingMetadata", checked)
            }
            ariaLabel="Toggle routing metadata"
          />
        </SettingRow>

        <SettingRow
          icon={Gauge}
          title="Cost precision"
          description="Choose how much decimal precision is shown for request-level cost values."
        >
          <SettingSelect
            value={draftSettings.costPrecision}
            options={costPrecisionOptions}
            onChange={(value) =>
              updateSetting("costPrecision", value as CostPrecision)
            }
            ariaLabel="Select cost precision"
          />
        </SettingRow>
      </SettingsSection>

      <SaveSettingsBar
        dirty={dirty}
        saved={saved}
        onReset={handleReset}
        onSave={handleSave}
      />
    </div>
  );
}

interface SettingRowProps {
  icon: ElementType;

  title: string;

  description: string;

  children: ReactNode;
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: SettingRowProps) {
  return (
    <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex max-w-[620px] gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] text-[var(--color-foreground-secondary)]">
          <Icon size={15} weight="duotone" />
        </div>

        <div>
          <div className="text-[11px] font-semibold text-[var(--color-foreground)]">
            {title}
          </div>

          <p className="mt-1.5 text-[9px] leading-5 text-[var(--color-foreground-secondary)]">
            {description}
          </p>
        </div>
      </div>

      <div className="shrink-0 pl-[50px] lg:pl-0">{children}</div>
    </div>
  );
}

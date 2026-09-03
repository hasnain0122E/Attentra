"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, FloppyDisk } from "@phosphor-icons/react";

import { useBusiness } from "@/components/business/BusinessContext";

import SettingsSection from "./SettingsSection";

interface BaselineModelOption {
  id: string;
  modelIdentifier: string;
  displayName: string;
  providerName: string;
  label: string;
}

interface SettingsData {
  name: string;
  role: "OWNER" | "MEMBER";
  baselineModel: {
    id: string;
    modelIdentifier: string;
    displayName: string;
    providerName: string;
  } | null;
}

export default function BusinessSettingsClient() {
  const { business } = useBusiness();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [baselineModels, setBaselineModels] = useState<BaselineModelOption[]>([]);
  const [selectedBaseline, setSelectedBaseline] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isOwner = settings?.role === "OWNER";

  // ── Fetch settings + baseline models ──────────────
  const fetchSettings = useCallback(async () => {
    if (!business) return;

    setLoading(true);
    setError(false);

    try {
      const [settingsRes, modelsRes] = await Promise.all([
        fetch(`/api/business/${business.id}/settings`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        fetch(`/api/business/${business.id}/baseline-models`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
      ]);

      if (!settingsRes.ok || !modelsRes.ok) throw new Error("Failed to load");

      const settingsJson = (await settingsRes.json()) as {
        success: boolean;
        data: SettingsData;
      };

      const modelsJson = (await modelsRes.json()) as {
        success: boolean;
        data: BaselineModelOption[];
      };

      if (!settingsJson.success || !modelsJson.success) throw new Error("API error");

      setSettings(settingsJson.data);
      setBaselineModels(modelsJson.data);
      setSelectedBaseline(settingsJson.data.baselineModel?.id ?? "");
    } catch (err) {
      console.error("[settings] Failed to load", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // ── Save baseline ─────────────────────────────────
  async function saveBaseline() {
    if (!business || !isOwner) return;

    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/business/${business.id}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          baselineModelId: selectedBaseline || null,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      const json = (await res.json()) as {
        success: boolean;
        data: { baselineModelId: string | null };
      };

      if (!json.success) throw new Error("API error");

      // Update local settings state to reflect saved baseline
      const matchedModel = baselineModels.find((m) => m.id === json.data.baselineModelId);

      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          baselineModel: matchedModel
            ? {
                id: matchedModel.id,
                modelIdentifier: matchedModel.modelIdentifier,
                displayName: matchedModel.displayName,
                providerName: matchedModel.providerName,
              }
            : null,
        };
      });

      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      console.error("[settings] Save failed", err);
    } finally {
      setSaving(false);
    }
  }

  // ── No business ───────────────────────────────────
  if (!business) {
    return (
      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <div className="font-reservation text-[25px] text-[var(--color-foreground)]">
          No workspace available.
        </div>
        <p className="mx-auto mt-2 max-w-[420px] text-[10px] leading-5 text-[var(--color-foreground-secondary)]">
          Create or join a business workspace to configure settings.
        </p>
      </section>
    );
  }

  // ── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-7">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Organization configuration
          </div>
          <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
            Settings.
          </h1>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
              <div className="mt-4 h-8 w-48 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────
  if (error || !settings) {
    return (
      <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Settings
          </div>
          <p className="mt-2 text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
            Settings could not be loaded.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchSettings()}
          className="w-fit rounded-full border border-[var(--color-border)] px-4 py-2 text-[10px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-soft)]"
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      {/* Page header */}
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
          Organization configuration
        </div>

        <h1 className="mt-2 font-reservation text-[34px] leading-none tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[40px]">
          Settings.
        </h1>

        <p className="mt-3 max-w-[720px] text-[11px] leading-6 text-[var(--color-foreground-secondary)]">
          Workspace identity and cost baseline configuration.
        </p>
      </div>

      {/* Settings grid */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Workspace identity — read-only */}
        <SettingsSection
          eyebrow="Workspace"
          title="Organization identity"
          description="Basic information about this Attentra business workspace."
        >
          <div className="space-y-4">
            <div>
              <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                Organization name
              </div>
              <div className="mt-1.5 text-[12px] font-semibold text-[var(--color-foreground)]">
                {settings.name}
              </div>
            </div>

            <div>
              <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                Your role
              </div>
              <div className="mt-1.5 text-[12px] font-semibold text-[var(--color-foreground)]">
                {settings.role === "OWNER" ? "Owner" : "Member"}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Cost baseline — OWNER editable, MEMBER read-only */}
        <SettingsSection
          eyebrow="Cost intelligence"
          title="Baseline model"
          description={
            isOwner
              ? "Select the model used as the cost baseline for savings calculations. All organization requests will be compared against this model's pricing."
              : "The model used as the cost baseline for savings calculations. Contact your workspace owner to change this."
          }
        >
          {isOwner ? (
            <div className="space-y-4">
              <select
                value={selectedBaseline}
                onChange={(e) => setSelectedBaseline(e.target.value)}
                disabled={saving}
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[10px] text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] disabled:opacity-50"
              >
                <option value="">No baseline configured</option>
                {baselineModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void saveBaseline()}
                disabled={saving}
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 text-[9px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <Check size={12} weight="bold" />
                    Saved
                  </>
                ) : saving ? (
                  "Saving\u2026"
                ) : (
                  <>
                    <FloppyDisk size={12} weight="bold" />
                    Save baseline
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              {settings.baselineModel ? (
                <div>
                  <div className="text-[12px] font-semibold text-[var(--color-foreground)]">
                    {settings.baselineModel.displayName}
                  </div>
                  <div className="mt-1 font-mono text-[8px] text-[var(--color-foreground-muted)]">
                    {settings.baselineModel.providerName} &middot; {settings.baselineModel.modelIdentifier}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-[var(--color-foreground-secondary)]">
                  No baseline model configured.
                </div>
              )}
            </div>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}

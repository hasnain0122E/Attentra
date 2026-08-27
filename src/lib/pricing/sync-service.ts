/**
 * Attentra — Pricing Sync Service
 *
 * Architecture.md v2.0 §7, §10
 *
 * Orchestrates pricing synchronization across all providers.
 * For each provider:
 * 1. Fetch pricing from the provider's pricing source
 * 2. Compare with current database records
 * 3. If changed: create new PricingSnapshot (preserving history)
 * 4. If unchanged: update last-checked timestamp only
 * 5. Record the sync attempt in PricingSyncLog
 *
 * Safe failure: if a source cannot be fetched/parsed, retain
 * last verified pricing and record the failure.
 */

import { PrismaClient } from "@prisma/client";
import type { PricingSource, SyncResult, PricingChangeResult } from "./types";
import { detectPricingChange, applyPricingChange, createModelWithSnapshot } from "./detector";

import { OpenAIPricingSource } from "./sources/openai";
import { AnthropicPricingSource } from "./sources/anthropic";
import { GooglePricingSource } from "./sources/google";

/**
 * All registered pricing sources.
 * Adding a new provider: create a PricingSource and add it here.
 */
const PRICING_SOURCES: PricingSource[] = [
  new OpenAIPricingSource(),
  new AnthropicPricingSource(),
  new GooglePricingSource(),
];

/**
 * Synchronize pricing for a single provider.
 */
async function syncProvider(
  prisma: PrismaClient,
  source: PricingSource,
  triggeredBy: string
): Promise<SyncResult> {
  const startedAt = new Date();
  const changes: PricingChangeResult[] = [];
  let modelsSynced = 0;
  let pricesUpdated = 0;

  try {
    // 1. Fetch pricing from source
    const result = await source.fetchPricing();

    if (!result.success) {
      throw new Error(result.error ?? "Pricing source returned failure");
    }

    // 2. Ensure provider exists in database
    let provider = await prisma.provider.findUnique({
      where: { name: source.providerName },
    });

    if (!provider) {
      provider = await prisma.provider.create({
        data: {
          name: source.providerName,
          pricingSourceUrl: source.sourceUrl,
        },
      });
    } else {
      await prisma.provider.update({
        where: { id: provider.id },
        data: { pricingSourceUrl: source.sourceUrl },
      });
    }

    // 3. Get current models for this provider
    const existingModels = await prisma.model.findMany({
      where: { providerId: provider.id },
    });

    // 4. Process each model from the fetched pricing
    for (const fetchedModel of result.models) {
      modelsSynced++;

      const existingDbModel = existingModels.find(
        (m) => m.modelIdentifier === fetchedModel.modelIdentifier
      ) ?? null;

      const change = detectPricingChange(existingDbModel, fetchedModel);
      changes.push(change);

      if (change.isNewModel) {
        // New model — create with initial snapshot
        await createModelWithSnapshot(prisma, provider.id, fetchedModel, source.sourceUrl);
        pricesUpdated++;
      } else if (change.hasChanged && existingDbModel) {
        // Existing model with changed pricing
        await applyPricingChange(prisma, existingDbModel.id, fetchedModel, source.sourceUrl);
        pricesUpdated++;
      }
      // If unchanged: no database write needed
    }

    // 5. Update provider's last sync timestamp
    await prisma.provider.update({
      where: { id: provider.id },
      data: { lastPricingSyncAt: new Date() },
    });

    // 6. Log successful sync
    const status = pricesUpdated > 0 ? "SUCCESS" : "SUCCESS";
    await prisma.pricingSyncLog.create({
      data: {
        providerId: provider.id,
        status,
        modelsSynced,
        pricesUpdated,
        triggeredBy,
        startedAt,
        completedAt: new Date(),
      },
    });

    return {
      providerName: source.providerName,
      status: "SUCCESS",
      modelsSynced,
      pricesUpdated,
      changes,
    };
  } catch (error) {
    // Safe failure: retain last verified pricing, log the failure
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Try to log the failure (best effort)
    try {
      const provider = await prisma.provider.findUnique({
        where: { name: source.providerName },
      });

      if (provider) {
        await prisma.pricingSyncLog.create({
          data: {
            providerId: provider.id,
            status: "FAILED",
            modelsSynced,
            pricesUpdated,
            error: errorMessage,
            triggeredBy,
            startedAt,
            completedAt: new Date(),
          },
        });
      }
    } catch {
      // If logging also fails, swallow — the sync already failed
      console.error(`[pricing-sync] Failed to log sync failure for ${source.providerName}`);
    }

    return {
      providerName: source.providerName,
      status: "FAILED",
      modelsSynced,
      pricesUpdated,
      error: errorMessage,
      changes,
    };
  }
}

/**
 * Run pricing synchronization for all registered providers.
 *
 * @param triggeredBy  Identifier for who/what triggered the sync
 *                     (e.g. "cron", "manual", "api")
 */
export async function syncAllPricing(
  prisma: PrismaClient,
  triggeredBy: string = "manual"
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const source of PRICING_SOURCES) {
    const result = await syncProvider(prisma, source, triggeredBy);
    results.push(result);

    console.log(
      `[pricing-sync] ${source.providerName}: ${result.status} ` +
      `(${result.modelsSynced} models, ${result.pricesUpdated} updated)` +
      (result.error ? ` — error: ${result.error}` : "")
    );
  }

  return results;
}

/**
 * Run pricing sync for a single provider by name.
 */
export async function syncProviderPricing(
  prisma: PrismaClient,
  providerName: string,
  triggeredBy: string = "manual"
): Promise<SyncResult> {
  const source = PRICING_SOURCES.find((s) => s.providerName === providerName);
  if (!source) {
    return {
      providerName,
      status: "FAILED",
      modelsSynced: 0,
      pricesUpdated: 0,
      error: `No pricing source registered for provider "${providerName}"`,
      changes: [],
    };
  }

  return syncProvider(prisma, source, triggeredBy);
}

/**
 * Get all registered pricing source names.
 */
export function getRegisteredSourceNames(): string[] {
  return PRICING_SOURCES.map((s) => s.providerName);
}

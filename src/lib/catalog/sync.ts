/**
 * Attentra — Catalog Database Synchronization
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog
 *
 * Synchronizes discovered eligible models into the EXISTING Prisma
 * Provider/Model architecture (spec §5):
 *
 * - upsert by (providerId, modelIdentifier): never duplicate rows,
 *   stable internal IDs are preserved across rediscoveries
 * - provider stays the LOGICAL provider (openai/anthropic/google)
 * - catalog metadata (displayName, contextWindow) is refreshed
 * - models absent from the listing are deactivated (never deleted —
 *   history stays intact)
 * - models present in the listing but WITHOUT an active PricingSnapshot
 *   are kept inactive: the pricing gate (spec §6) makes a model an
 *   ACTIVE ROUTING CANDIDATE only through a valid active snapshot.
 *   Catalog sync never invents prices — unpriced rows carry zero
 *   prices and no snapshot, and the candidate loader excludes them.
 *
 * Fail-safe (spec §16): a failed (or empty) discovery performs NO
 * database writes — previously synced entries are never destroyed.
 *
 * Ordering: run AFTER pricing sync. Pricing fills prices/snapshots
 * for the models it recognizes; catalog sync then deactivates
 * unavailable ones and registers newly discovered ones.
 */

import { PrismaClient } from "@prisma/client";
import type {
  CatalogProviderName,
  CatalogSyncResult,
} from "./types";
import { CATALOG_PROVIDERS } from "./types";
import { classifyModelProfile } from "./profiles";
import { discoverCatalog } from "./discovery";

/** Database Model row shape used by the sync (snapshots included). */
interface ExistingModelRow {
  id: string;
  modelIdentifier: string;
  displayName: string;
  contextWindow: number | null;
  active: boolean;
  pricingSnapshots: Array<{ id: string }>;
}

/**
 * Synchronize one provider's discovered catalog into the database.
 */
export async function syncProviderCatalog(
  prisma: PrismaClient,
  providerName: CatalogProviderName
): Promise<CatalogSyncResult> {
  // 1. Discover the provider catalog (listing only — no generation credits)
  const discovery = await discoverCatalog(providerName);

  if (!discovery.success) {
    console.log(
      `[catalog-sync] ${providerName}: discovery FAILED — database untouched (${discovery.error})`
    );
    return {
      providerName,
      status: "FAILED",
      discovered: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      error: discovery.error,
    };
  }

  // Fail-safe: a listing that yields zero eligible models is treated as
  // suspicious — never deactivate the whole provider catalog on it.
  if (discovery.eligibleModels.length === 0) {
    console.log(
      `[catalog-sync] ${providerName}: listing returned ${discovery.models.length} models ` +
        `but none passed eligibility — database untouched`
    );
    return {
      providerName,
      status: "FAILED",
      discovered: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      error: "Model listing returned zero eligible chat models",
    };
  }

  // 2. Ensure the logical provider row exists
  let provider = await prisma.provider.findUnique({
    where: { name: providerName },
  });
  if (!provider) {
    provider = await prisma.provider.create({
      data: { name: providerName },
    });
  }

  // 3. Load existing models with their active pricing snapshot
  const existingModels = await prisma.model.findMany({
    where: { providerId: provider.id },
    include: {
      pricingSnapshots: {
        where: { effectiveTo: null },
        take: 1,
      },
    },
  });

  const existingByIdentifier = new Map(
    existingModels.map((m) => [m.modelIdentifier, m])
  );
  const eligibleIdentifiers = new Set(
    discovery.eligibleModels.map((m) => m.modelIdentifier)
  );

  let created = 0;
  let updated = 0;

  // 4. Upsert every eligible discovered model
  for (const entry of discovery.eligibleModels) {
    const existing = existingByIdentifier.get(entry.modelIdentifier);
    const profile = classifyModelProfile(providerName, entry.modelIdentifier);
    const displayName = entry.displayName || profile.displayName;
    const contextWindow = entry.contextWindow ?? profile.contextWindow;

    if (!existing) {
      // First time seen: create INACTIVE with zero prices and no
      // snapshot — the pricing gate keeps it non-routable until a
      // valid PricingSnapshot exists (created later by pricing sync).
      await prisma.model.create({
        data: {
          providerId: provider.id,
          modelIdentifier: entry.modelIdentifier,
          displayName,
          capabilities: profile.capabilities,
          tier: profile.tier,
          contextWindow,
          inputPricePer1k: 0,
          outputPricePer1k: 0,
          expectedLatencyMs: profile.expectedLatencyMs,
          active: false,
        },
      });
      created++;
      continue;
    }

    // Existing row: refresh catalog metadata. Availability + pricing
    // gate decides routability — a model in the listing with an active
    // snapshot is routable; without one it must stay inactive.
    const hasActiveSnapshot = existing.pricingSnapshots.length > 0;
    const targetActive = hasActiveSnapshot;

    const metadataChanged =
      existing.displayName !== displayName ||
      existing.contextWindow !== contextWindow ||
      existing.active !== targetActive;

    if (metadataChanged) {
      await prisma.model.update({
        where: { id: existing.id },
        data: {
          displayName,
          contextWindow,
          active: targetActive,
        },
      });
      updated++;
    }
  }

  // 5. Deactivate models absent from the eligible listing (never delete)
  const deactivated = await prisma.model.updateMany({
    where: {
      providerId: provider.id,
      active: true,
      modelIdentifier: { notIn: Array.from(eligibleIdentifiers) },
    },
    data: { active: false },
  });

  console.log(
    `[catalog-sync] ${providerName}: ${discovery.models.length} listed, ` +
      `${discovery.eligibleModels.length} eligible — ` +
      `${created} created, ${updated} updated, ${deactivated.count} deactivated`
  );

  return {
    providerName,
    status: "SUCCESS",
    discovered: discovery.eligibleModels.length,
    created,
    updated,
    deactivated: deactivated.count,
  };
}

/**
 * Synchronize all provider catalogs sequentially.
 */
export async function syncAllCatalogs(
  prisma: PrismaClient
): Promise<CatalogSyncResult[]> {
  const results: CatalogSyncResult[] = [];
  for (const providerName of CATALOG_PROVIDERS) {
    results.push(await syncProviderCatalog(prisma, providerName));
  }
  return results;
}

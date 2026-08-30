/**
 * Attentra — Catalog & Pricing Sync CLI Script
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog
 *
 * Refreshes the database from the providers' official sources, in the
 * order required by the spec (§5/§6):
 *
 *   1. Pricing sync (Phase 5 sources) — upserts every model recognized
 *      in the official pricing tables with live prices and an active
 *      PricingSnapshot (the routing activation gate)
 *   2. Catalog sync (Phase 8 Step 3) — discovers every eligible chat
 *      model via the official model-listing APIs, upserts newly
 *      discovered rows (inactive, zero prices — never invented), and
 *      deactivates models that left the listings
 *
 * The result: a model is an ACTIVE ROUTING CANDIDATE exactly when it is
 * both listed (available) and priced (valid active snapshot).
 *
 * Usage:
 *   npm run catalog:sync                        # sync all providers
 *   npm run catalog:sync -- --provider openai   # sync a single provider
 *
 * Requires: provider API keys + DATABASE_URL in the environment.
 * Listing/pricing-documentation fetches only — no generation credits.
 */

import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { syncAllPricing, syncProviderPricing } from "../src/lib/pricing/sync-service";
import { syncAllCatalogs, syncProviderCatalog } from "../src/lib/catalog/sync";
import { CATALOG_PROVIDERS } from "../src/lib/catalog/types";
import type { CatalogProviderName } from "../src/lib/catalog/types";

// Load .env/.env.local exactly like `next dev` does (Prisma only loads
// .env on its own — provider API keys live in .env.local). Pre-existing
// process.env values are never overridden.
loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

function parseProviderArg(): CatalogProviderName | undefined {
  const args = process.argv.slice(2);
  const providerIndex = args.indexOf("--provider");
  if (providerIndex === -1) return undefined;

  const providerName = args[providerIndex + 1];
  const valid = CATALOG_PROVIDERS.find((p) => p === providerName);
  if (!valid) {
    console.error(
      `❌ Unknown provider "${providerName}". Valid providers: ${CATALOG_PROVIDERS.join(", ")}`
    );
    process.exit(1);
  }
  return valid;
}

async function main() {
  const providerName = parseProviderArg();

  console.log("🔄 Attentra — Catalog & Pricing Synchronization\n");
  console.log(`   Provider: ${providerName ?? "all"}`);
  console.log(`   Order: pricing first, then catalog (routing gate requirements)\n`);

  const startTime = Date.now();

  try {
    // ── Phase 1: Pricing sync (activation gate) ──────────
    console.log("─".repeat(50));
    console.log("1️⃣  Pricing sync (official pricing tables)");
    console.log("─".repeat(50));

    const pricingResults = providerName
      ? [await syncProviderPricing(prisma, providerName, "catalog-sync")]
      : await syncAllPricing(prisma, "catalog-sync");

    for (const result of pricingResults) {
      console.log(
        `   ${result.providerName}: ${result.status} ` +
          `(${result.modelsSynced} models, ${result.pricesUpdated} created/updated)` +
          (result.error ? ` — error: ${result.error}` : "")
      );
    }

    // ── Phase 2: Catalog sync (listing availability) ──────
    console.log("\n" + "─".repeat(50));
    console.log("2️⃣  Catalog sync (official model listings)");
    console.log("─".repeat(50));

    const catalogResults = providerName
      ? [await syncProviderCatalog(prisma, providerName)]
      : await syncAllCatalogs(prisma);

    for (const result of catalogResults) {
      console.log(
        `   ${result.providerName}: ${result.status} ` +
          `(${result.discovered} eligible — ${result.created} created, ` +
          `${result.updated} updated, ${result.deactivated} deactivated)` +
          (result.error ? ` — error: ${result.error}` : "")
      );
    }

    // ── Summary ────────────────────────────────────────────
    const pricedProviders = pricingResults.filter((r) => r.status === "SUCCESS").length;
    const catalogedProviders = catalogResults.filter((r) => r.status === "SUCCESS").length;
    const totalTarget = providerName ? 1 : CATALOG_PROVIDERS.length;

    console.log(`\n📊 Summary:`);
    console.log(`   Priced providers:   ${pricedProviders}/${totalTarget}`);
    console.log(`   Cataloged providers: ${catalogedProviders}/${totalTarget}`);

    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️  Completed in ${elapsed}ms`);

    if (pricedProviders < totalTarget || catalogedProviders < totalTarget) {
      console.log("⚠️  One or more providers failed — their data was left untouched (fail-safe).");
      process.exit(1);
    }

    console.log("✅ Sync complete.");
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

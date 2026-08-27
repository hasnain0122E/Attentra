/**
 * Attentra — Pricing Sync CLI Script
 *
 * Triggers a manual pricing synchronization for all providers
 * or a specific provider.
 *
 * Usage:
 *   npm run pricing:sync                    # sync all providers
 *   npm run pricing:sync -- --provider openai  # sync only OpenAI
 *
 * Requires: DATABASE_URL in .env
 */

import { PrismaClient } from "@prisma/client";
import { syncAllPricing, syncProviderPricing } from "../src/lib/pricing/sync-service";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const providerIndex = args.indexOf("--provider");
  const providerName = providerIndex !== -1 ? args[providerIndex + 1] : undefined;

  console.log("🔄 Attentra — Pricing Synchronization\n");
  console.log(`   Triggered by: manual`);
  console.log(`   Provider: ${providerName ?? "all"}\n`);

  const startTime = Date.now();

  try {
    if (providerName) {
      const result = await syncProviderPricing(prisma, providerName, "manual");
      console.log(`\n📊 Result: ${result.providerName} — ${result.status}`);
      console.log(`   Models synced: ${result.modelsSynced}`);
      console.log(`   Prices updated: ${result.pricesUpdated}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.changes.length > 0) {
        console.log("\n   Changes:");
        for (const change of result.changes) {
          if (change.isNewModel) {
            console.log(`   + NEW: ${change.modelIdentifier}`);
          } else if (change.hasChanged) {
            console.log(`   ~ ${change.modelIdentifier}: input ${change.previousInputPrice} → ${change.newInputPrice}, output ${change.previousOutputPrice} → ${change.newOutputPrice}`);
          } else {
            console.log(`   = ${change.modelIdentifier}: unchanged`);
          }
        }
      }
    } else {
      const results = await syncAllPricing(prisma, "manual");

      console.log("\n📊 Results:");
      for (const result of results) {
        console.log(`   ${result.providerName}: ${result.status} (${result.modelsSynced} models, ${result.pricesUpdated} updated)`);
        if (result.error) console.log(`     Error: ${result.error}`);
      }

      const totalUpdated = results.reduce((sum, r) => sum + r.pricesUpdated, 0);
      const totalSynced = results.reduce((sum, r) => sum + r.modelsSynced, 0);
      console.log(`\n   Total: ${totalSynced} models synced, ${totalUpdated} prices updated`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️  Completed in ${elapsed}ms`);
    console.log("✅ Sync complete.");
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

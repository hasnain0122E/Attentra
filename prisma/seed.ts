/**
 * Attentra — Database Seed Script
 *
 * Seeds the initial Provider and Model records with PricingSnapshots
 * using the pricing data from each provider's pricing source.
 *
 * Usage:
 *   npm run db:seed
 *   npx tsx prisma/seed.ts
 *
 * Requires: DATABASE_URL in .env
 */

import { PrismaClient } from "@prisma/client";
import { OpenAIPricingSource } from "../src/lib/pricing/sources/openai";
import { AnthropicPricingSource } from "../src/lib/pricing/sources/anthropic";
import { GooglePricingSource } from "../src/lib/pricing/sources/google";
import { createModelWithSnapshot } from "../src/lib/pricing/detector";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Attentra — Seeding database...\n");

  const sources = [
    new OpenAIPricingSource(),
    new AnthropicPricingSource(),
    new GooglePricingSource(),
  ];

  for (const source of sources) {
    console.log(`📦 Processing provider: ${source.providerName}`);

    // Upsert provider
    const provider = await prisma.provider.upsert({
      where: { name: source.providerName },
      update: {
        pricingSourceUrl: source.sourceUrl,
        lastPricingSyncAt: new Date(),
      },
      create: {
        name: source.providerName,
        pricingSourceUrl: source.sourceUrl,
        lastPricingSyncAt: new Date(),
      },
    });

    // Fetch pricing
    const result = await source.fetchPricing();

    if (!result.success) {
      console.log(`  ⚠️  Failed to fetch pricing for ${source.providerName}: ${result.error}`);
      continue;
    }

    console.log(`  📋 Found ${result.models.length} models`);

    for (const model of result.models) {
      // Check if model already exists
      const existing = await prisma.model.findFirst({
        where: {
          providerId: provider.id,
          modelIdentifier: model.modelIdentifier,
        },
      });

      if (existing) {
        console.log(`  ⏭️  ${model.displayName} (${model.modelIdentifier}) — already exists`);
        continue;
      }

      // Create model with initial pricing snapshot
      await createModelWithSnapshot(prisma, provider.id, model, source.sourceUrl);
      console.log(`  ✅ ${model.displayName} (${model.modelIdentifier}) — created`);
    }

    console.log("");
  }

  // Summary
  const providerCount = await prisma.provider.count();
  const modelCount = await prisma.model.count();
  const snapshotCount = await prisma.pricingSnapshot.count();

  console.log("📊 Seed summary:");
  console.log(`   Providers: ${providerCount}`);
  console.log(`   Models: ${modelCount}`);
  console.log(`   Pricing Snapshots: ${snapshotCount}`);
  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

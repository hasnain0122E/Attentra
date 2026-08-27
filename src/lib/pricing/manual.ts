/**
 * Attentra — Manual Model/Pricing Registration
 *
 * Architecture.md v2.0 §7
 *
 * Provides manual registration capability for cases where
 * automatic pricing extraction is unavailable.
 *
 * Manual updates:
 * - Create new models with initial PricingSnapshot
 * - Update existing models with new PricingSnapshot (preserving history)
 * - Never destroy historical records
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import type { ManualModelInput } from "./types";

/**
 * Register or update a model manually.
 *
 * If the model exists for this provider:
 * - Compare pricing — if changed, create new snapshot
 * - Update metadata (displayName, capabilities, etc.)
 *
 * If the model doesn't exist:
 * - Create it with an initial PricingSnapshot
 *
 * @returns The model's database ID
 */
export async function registerModelManually(
  prisma: PrismaClient,
  input: ManualModelInput
): Promise<{ modelId: string; created: boolean; pricingChanged: boolean }> {
  // 1. Ensure provider exists
  let provider = await prisma.provider.findUnique({
    where: { name: input.providerName },
  });

  if (!provider) {
    provider = await prisma.provider.create({
      data: { name: input.providerName },
    });
  }

  // 2. Check if model already exists
  const existingModel = await prisma.model.findFirst({
    where: {
      providerId: provider.id,
      modelIdentifier: input.modelIdentifier,
    },
  });

  if (!existingModel) {
    // 3a. New model — create with initial snapshot
    const now = new Date();
    const model = await prisma.model.create({
      data: {
        providerId: provider.id,
        modelIdentifier: input.modelIdentifier,
        displayName: input.displayName,
        capabilities: input.capabilities,
        tier: input.tier ?? undefined,
        contextWindow: input.contextWindow ?? undefined,
        inputPricePer1k: new Decimal(input.inputPricePer1k),
        outputPricePer1k: new Decimal(input.outputPricePer1k),
        expectedLatencyMs: input.expectedLatencyMs ?? undefined,
        active: input.active ?? true,
      },
    });

    // Create initial pricing snapshot
    await prisma.pricingSnapshot.create({
      data: {
        modelId: model.id,
        inputPricePer1k: new Decimal(input.inputPricePer1k),
        outputPricePer1k: new Decimal(input.outputPricePer1k),
        cachedInputPricePer1k: input.cachedInputPricePer1k
          ? new Decimal(input.cachedInputPricePer1k)
          : null,
        batchInputPricePer1k: input.batchInputPricePer1k
          ? new Decimal(input.batchInputPricePer1k)
          : null,
        batchOutputPricePer1k: input.batchOutputPricePer1k
          ? new Decimal(input.batchOutputPricePer1k)
          : null,
        pricingDimensions: (input.pricingDimensions as Prisma.InputJsonValue) ?? undefined,
        source: "manual",
        effectiveFrom: now,
      },
    });

    return { modelId: model.id, created: true, pricingChanged: false };
  }

  // 3b. Existing model — check for pricing change
  const inputChanged =
    Number(existingModel.inputPricePer1k) !== input.inputPricePer1k;
  const outputChanged =
    Number(existingModel.outputPricePer1k) !== input.outputPricePer1k;
  const pricingChanged = inputChanged || outputChanged;

  // Update model metadata (always safe)
  await prisma.model.update({
    where: { id: existingModel.id },
    data: {
      displayName: input.displayName,
      capabilities: input.capabilities,
      tier: input.tier ?? undefined,
      contextWindow: input.contextWindow ?? undefined,
      inputPricePer1k: new Decimal(input.inputPricePer1k),
      outputPricePer1k: new Decimal(input.outputPricePer1k),
      expectedLatencyMs: input.expectedLatencyMs ?? undefined,
      active: input.active ?? true,
    },
  });

  // If pricing changed, create new snapshot
  if (pricingChanged) {
    const now = new Date();

    // Close previous snapshot
    await prisma.pricingSnapshot.updateMany({
      where: {
        modelId: existingModel.id,
        effectiveTo: null,
      },
      data: {
        effectiveTo: now,
      },
    });

    // Create new snapshot
    await prisma.pricingSnapshot.create({
      data: {
        modelId: existingModel.id,
        inputPricePer1k: new Decimal(input.inputPricePer1k),
        outputPricePer1k: new Decimal(input.outputPricePer1k),
        cachedInputPricePer1k: input.cachedInputPricePer1k
          ? new Decimal(input.cachedInputPricePer1k)
          : null,
        batchInputPricePer1k: input.batchInputPricePer1k
          ? new Decimal(input.batchInputPricePer1k)
          : null,
        batchOutputPricePer1k: input.batchOutputPricePer1k
          ? new Decimal(input.batchOutputPricePer1k)
          : null,
        pricingDimensions: (input.pricingDimensions as Prisma.InputJsonValue) ?? undefined,
        source: "manual",
        effectiveFrom: now,
      },
    });
  }

  return { modelId: existingModel.id, created: false, pricingChanged };
}

/**
 * Manually register a new provider in the database.
 */
export async function registerProviderManually(
  prisma: PrismaClient,
  name: string,
  pricingSourceUrl?: string
): Promise<{ providerId: string; created: boolean }> {
  const existing = await prisma.provider.findUnique({
    where: { name },
  });

  if (existing) {
    if (pricingSourceUrl) {
      await prisma.provider.update({
        where: { id: existing.id },
        data: { pricingSourceUrl },
      });
    }
    return { providerId: existing.id, created: false };
  }

  const provider = await prisma.provider.create({
    data: {
      name,
      pricingSourceUrl: pricingSourceUrl ?? null,
    },
  });

  return { providerId: provider.id, created: true };
}

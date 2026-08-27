/**
 * Attentra — Pricing Change Detector
 *
 * Architecture.md v2.0 §10 — Pricing Snapshots
 *
 * Compares fetched pricing against current database records.
 * Creates new PricingSnapshot records only when pricing has
 * actually changed. Preserves historical snapshots.
 *
 * Key principles:
 * - Never overwrite historical pricing
 * - If unchanged: update last-checked metadata only
 * - If changed: create new snapshot, close previous one
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import type {
  NormalizedModelPricing,
  PricingChangeResult,
} from "./types";

/**
 * Precision-safe decimal comparison.
 * Converts Decimal and number types to comparable string representation.
 */
function decimalsEqual(a: Decimal | number | null, b: number | null | undefined): boolean {
  if (a === null && (b === null || b === undefined)) return true;
  if (a === null || b === null || b === undefined) return false;

  const aStr = a instanceof Decimal ? a.toFixed(8) : new Decimal(a).toFixed(8);
  const bStr = new Decimal(b).toFixed(8);
  return aStr === bStr;
}

/**
 * Detect pricing changes for a single model by comparing
 * the current database record against fetched pricing.
 */
export function detectPricingChange(
  dbModel: {
    modelIdentifier: string;
    inputPricePer1k: Decimal;
    outputPricePer1k: Decimal;
  } | null,
  fetchedPricing: NormalizedModelPricing
): PricingChangeResult {
  if (!dbModel) {
    return {
      modelIdentifier: fetchedPricing.modelIdentifier,
      hasChanged: true,
      newInputPrice: fetchedPricing.inputPricePer1k,
      newOutputPrice: fetchedPricing.outputPricePer1k,
      isNewModel: true,
    };
  }

  const inputChanged = !decimalsEqual(dbModel.inputPricePer1k, fetchedPricing.inputPricePer1k);
  const outputChanged = !decimalsEqual(dbModel.outputPricePer1k, fetchedPricing.outputPricePer1k);

  return {
    modelIdentifier: fetchedPricing.modelIdentifier,
    hasChanged: inputChanged || outputChanged,
    previousInputPrice: Number(dbModel.inputPricePer1k),
    newInputPrice: fetchedPricing.inputPricePer1k,
    previousOutputPrice: Number(dbModel.outputPricePer1k),
    newOutputPrice: fetchedPricing.outputPricePer1k,
    isNewModel: false,
  };
}

/**
 * Apply a pricing change to the database.
 *
 * For changed pricing:
 * 1. Close the current active PricingSnapshot (set effectiveTo = now)
 * 2. Update the Model record with new pricing
 * 3. Create a new PricingSnapshot with effectiveFrom = now
 *
 * For unchanged pricing:
 * - No snapshot created
 * - No model update needed (last-checked is tracked at Provider level)
 */
export async function applyPricingChange(
  prisma: PrismaClient,
  modelDbId: string,
  newPricing: NormalizedModelPricing,
  sourceUrl?: string
): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // 1. Close current active snapshot
    await tx.pricingSnapshot.updateMany({
      where: {
        modelId: modelDbId,
        effectiveTo: null,
      },
      data: {
        effectiveTo: now,
      },
    });

    // 2. Update Model record with new pricing
    await tx.model.update({
      where: { id: modelDbId },
      data: {
        inputPricePer1k: new Decimal(newPricing.inputPricePer1k),
        outputPricePer1k: new Decimal(newPricing.outputPricePer1k),
        displayName: newPricing.displayName,
        capabilities: newPricing.capabilities,
        tier: newPricing.tier ?? undefined,
        contextWindow: newPricing.contextWindow ?? undefined,
        expectedLatencyMs: newPricing.expectedLatencyMs ?? undefined,
        active: newPricing.active,
      },
    });

    // 3. Create new PricingSnapshot
    await tx.pricingSnapshot.create({
      data: {
        modelId: modelDbId,
        inputPricePer1k: new Decimal(newPricing.inputPricePer1k),
        outputPricePer1k: new Decimal(newPricing.outputPricePer1k),
        cachedInputPricePer1k: newPricing.cachedInputPricePer1k
          ? new Decimal(newPricing.cachedInputPricePer1k)
          : null,
        batchInputPricePer1k: newPricing.batchInputPricePer1k
          ? new Decimal(newPricing.batchInputPricePer1k)
          : null,
        batchOutputPricePer1k: newPricing.batchOutputPricePer1k
          ? new Decimal(newPricing.batchOutputPricePer1k)
          : null,
        pricingDimensions: (newPricing.pricingDimensions as Prisma.InputJsonValue) ?? undefined,
        source: sourceUrl ?? "sync",
        effectiveFrom: now,
      },
    });
  });
}

/**
 * Create a new model in the database with initial pricing snapshot.
 */
export async function createModelWithSnapshot(
  prisma: PrismaClient,
  providerDbId: string,
  pricing: NormalizedModelPricing,
  sourceUrl?: string
): Promise<string> {
  const now = new Date();

  const model = await prisma.model.create({
    data: {
      providerId: providerDbId,
      modelIdentifier: pricing.modelIdentifier,
      displayName: pricing.displayName,
      capabilities: pricing.capabilities,
      tier: pricing.tier ?? undefined,
      contextWindow: pricing.contextWindow ?? undefined,
      inputPricePer1k: new Decimal(pricing.inputPricePer1k),
      outputPricePer1k: new Decimal(pricing.outputPricePer1k),
      expectedLatencyMs: pricing.expectedLatencyMs ?? undefined,
      active: pricing.active,
    },
  });

  await prisma.pricingSnapshot.create({
    data: {
      modelId: model.id,
      inputPricePer1k: new Decimal(pricing.inputPricePer1k),
      outputPricePer1k: new Decimal(pricing.outputPricePer1k),
      cachedInputPricePer1k: pricing.cachedInputPricePer1k
        ? new Decimal(pricing.cachedInputPricePer1k)
        : null,
      batchInputPricePer1k: pricing.batchInputPricePer1k
        ? new Decimal(pricing.batchInputPricePer1k)
        : null,
      batchOutputPricePer1k: pricing.batchOutputPricePer1k
        ? new Decimal(pricing.batchOutputPricePer1k)
        : null,
      pricingDimensions: (pricing.pricingDimensions as Prisma.InputJsonValue) ?? undefined,
      source: sourceUrl ?? "seed",
      effectiveFrom: now,
    },
  });

  return model.id;
}

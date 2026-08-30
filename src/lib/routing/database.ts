/**
 * Attentra — Database Candidate Loader
 *
 * Phase 6 / Step 2 — Database-Backed Routing
 *
 * Loads active model candidates from PostgreSQL via Prisma.
 * This is the ONLY routing module that touches the database.
 *
 * Architecture:
 *   PURE ROUTING LOGIC (router.ts, scorer.ts, etc.)
 *     ↑
 *   DATABASE INTEGRATION (this file)
 *     ↑
 *   Prisma (schema.prisma)
 *
 * Responsibilities:
 * - Query active providers/models in ONE Prisma query
 * - Load current (active) PricingSnapshot for each model
 * - Convert Prisma records → ModelCandidate[]
 * - Exclude inactive models and providers
 * - Never expose Prisma types outside this module
 *
 * Performance:
 * - Single Prisma query with nested includes (no N+1)
 * - Only active PricingSnapshots (effectiveTo IS NULL) are loaded
 * - Historical snapshots are excluded from the query
 */

import { prisma } from "@/lib/prisma";
import type { ModelCandidate } from "./types";

/**
 * Result from loading routing candidates from the database.
 */
export interface CandidateLoadResult {
  /** Successfully loaded candidates */
  candidates: ModelCandidate[];

  /** Total number of active models found (before pricing filter) */
  totalActiveModels: number;

  /** Number of models excluded due to missing active pricing */
  modelsWithoutPricing: number;

  /** Error message if loading failed */
  error?: string;
}

/**
 * Load routing candidates from the database.
 *
 * Executes a single Prisma query to fetch:
 * - Active models from active providers
 * - Current active PricingSnapshot for each model
 *
 * Converts database records to provider-neutral ModelCandidate objects.
 * Models without an active PricingSnapshot are excluded with a count reported.
 *
 * @returns CandidateLoadResult with candidates and metadata
 */
export async function loadRoutingCandidates(): Promise<CandidateLoadResult> {
  try {
    // Single query: active models → active providers → active pricing snapshots
    const models = await prisma.model.findMany({
      where: {
        active: true,
        provider: {
          status: "ACTIVE",
        },
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        pricingSnapshots: {
          where: {
            effectiveTo: null,
          },
          orderBy: {
            effectiveFrom: "desc",
          },
          take: 1,
        },
      },
    });

    const totalActiveModels = models.length;
    let modelsWithoutPricing = 0;
    const candidates: ModelCandidate[] = [];

    for (const model of models) {
      const snapshot = model.pricingSnapshots[0];

      if (!snapshot) {
        // No active pricing snapshot — exclude from routing
        modelsWithoutPricing++;
        continue;
      }

      candidates.push({
        modelId: model.id,
        // The execution layer's ProviderRegistry resolves adapters by the
        // LOGICAL provider name ("openai"/"anthropic"/"google"), matching
        // the ModelCandidate.providerId contract — not the Prisma row id.
        providerId: model.provider.name,
        providerName: model.provider.name,
        modelIdentifier: model.modelIdentifier,
        displayName: model.displayName,
        capabilities: model.capabilities,
        tier: model.tier ?? undefined,
        contextWindow: model.contextWindow ?? undefined,
        inputPricePer1k: Number(snapshot.inputPricePer1k),
        outputPricePer1k: Number(snapshot.outputPricePer1k),
        expectedLatencyMs: model.expectedLatencyMs ?? undefined,
        active: model.active,
      });
    }

    return {
      candidates,
      totalActiveModels,
      modelsWithoutPricing,
    };
  } catch (error) {
    return {
      candidates: [],
      totalActiveModels: 0,
      modelsWithoutPricing: 0,
      error: error instanceof Error ? error.message : "Failed to load routing candidates",
    };
  }
}

import type { PrismaClient } from "@prisma/client";

import { calculateCostIntelligence } from "./calculator";
import type {
  CostIntelligenceResult,
  ModelPricing,
  TokenUsage,
} from "./types";

export interface PersistRequestCostInput {
  requestId: string;
  executedModelId: string;
  usage: TokenUsage;
  actualCost?: number;
}

export interface PersistRequestCostResult {
  persisted: boolean;
  costIntelligence?: CostIntelligenceResult;
  baselineModelId?: string;
  reason?: string;
}

function toModelPricing(model: {
  inputPricePer1k: unknown;
  outputPricePer1k: unknown;
}): ModelPricing {
  return {
    inputPricePer1k: Number(model.inputPricePer1k),
    outputPricePer1k: Number(model.outputPricePer1k),
  };
}

/**
 * Resolve the consumer baseline model from the CONSUMER_BASELINE_MODEL
 * environment variable.
 *
 * The variable holds a modelIdentifier (e.g. "claude-sonnet-5").
 * We look up the active model in the registry and return its pricing.
 *
 * Returns null when:
 * - The env variable is missing/empty
 * - No matching active model exists
 * - The model has invalid pricing
 */
async function resolveConsumerBaselineModel(
  prisma: PrismaClient,
): Promise<{ id: string; inputPricePer1k: unknown; outputPricePer1k: unknown } | null> {
  const identifier = process.env.CONSUMER_BASELINE_MODEL?.trim();

  if (!identifier) {
    return null;
  }

  const model = await prisma.model.findFirst({
    where: {
      modelIdentifier: identifier,
      active: true,
    },
    select: {
      id: true,
      inputPricePer1k: true,
      outputPricePer1k: true,
    },
  });

  if (!model) {
    return null;
  }

  /*
   * Validate that pricing is resolvable before returning.
   */
  const inputPrice = Number(model.inputPricePer1k);
  const outputPrice = Number(model.outputPricePer1k);

  if (!Number.isFinite(inputPrice) || !Number.isFinite(outputPrice)) {
    return null;
  }

  return model;
}

/**
 * Persist request-level execution and cost intelligence.
 *
 * Cost-intelligence failure must never invalidate a successful LLM execution.
 *
 * Baseline semantics:
 * The same actual token usage is priced against the configured baseline model.
 *
 * Baseline resolution order:
 * 1. Business requests: Business.baselineModelId (existing behavior)
 * 2. Consumer requests: CONSUMER_BASELINE_MODEL env variable (model identifier)
 * 3. No baseline: persist actual cost only, do not fabricate savings
 *
 * This is an equivalent-usage cost comparison, not a claim about what
 * another provider would literally have generated.
 */
export async function persistRequestCostIntelligence(
  prisma: PrismaClient,
  input: PersistRequestCostInput
): Promise<PersistRequestCostResult> {
  try {
    const request = await prisma.request.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        businessId: true,
        business: {
          select: {
            baselineModelId: true,
          },
        },
      },
    });

    if (!request) {
      return {
        persisted: false,
        reason: "REQUEST_NOT_FOUND",
      };
    }

    const executedModel = await prisma.model.findUnique({
      where: { id: input.executedModelId },
      select: {
        id: true,
        providerId: true,
        inputPricePer1k: true,
        outputPricePer1k: true,
      },
    });

    if (!executedModel) {
      return {
        persisted: false,
        reason: "EXECUTED_MODEL_NOT_FOUND",
      };
    }

    const actualPricing = toModelPricing(executedModel);

    const calculatedActualCost = calculateCostIntelligence(
      input.usage,
      actualPricing,
      actualPricing
    ).actualCost;

    /*
     * Prefer the orchestrator's actualCost when available because it was
     * calculated directly from the successful execution target.
     *
     * The local calculation is a safe deterministic fallback.
     */
    const actualCost =
      input.actualCost !== undefined
        ? input.actualCost
        : calculatedActualCost;

    /*
     * ── Baseline resolution ──────────────────────────────────────
     *
     * 1. Business baseline: Business.baselineModelId (highest priority)
     * 2. Consumer baseline: CONSUMER_BASELINE_MODEL env variable
     * 3. No baseline: persist execution facts only
     */
    const businessBaselineModelId = request.business?.baselineModelId;

    let baselineModelId: string | null = null;
    let baselineModel: { id: string; inputPricePer1k: unknown; outputPricePer1k: unknown } | null = null;

    if (businessBaselineModelId) {
      /*
       * Business baseline: look up by ID (existing behavior).
       */
      baselineModelId = businessBaselineModelId;

      baselineModel = await prisma.model.findUnique({
        where: { id: businessBaselineModelId },
        select: {
          id: true,
          inputPricePer1k: true,
          outputPricePer1k: true,
        },
      });
    } else if (!request.businessId) {
      /*
       * Consumer baseline: resolve CONSUMER_BASELINE_MODEL identifier
       * against the active model registry.
       *
       * Only applies to personal requests (businessId is null).
       */
      const consumerBaseline = await resolveConsumerBaselineModel(prisma);

      if (consumerBaseline) {
        baselineModel = consumerBaseline;
        baselineModelId = consumerBaseline.id;
      }
    }

    /*
     * No baseline resolved from either source:
     * Persist execution facts and actual cost, but do not fabricate savings.
     */
    if (!baselineModel) {
      await prisma.request.update({
        where: { id: input.requestId },
        data: {
          status: "SUCCESS",
          selectedProviderId: executedModel.providerId,
          selectedModelId: executedModel.id,
          inputTokens: input.usage.inputTokens,
          outputTokens: input.usage.outputTokens,
          actualCost,
          baselineCost: null,
          savings: null,
          savingsPercentage: null,
        },
      });

      const reason = businessBaselineModelId
        ? "BASELINE_MODEL_NOT_FOUND"
        : !request.businessId && process.env.CONSUMER_BASELINE_MODEL?.trim()
          ? "CONSUMER_BASELINE_MODEL_NOT_FOUND"
          : "BASELINE_NOT_CONFIGURED";

      return {
        persisted: true,
        baselineModelId: baselineModelId ?? undefined,
        reason,
      };
    }

    const baselinePricing = toModelPricing(baselineModel);

    const comparison = calculateCostIntelligence(
      input.usage,
      actualPricing,
      baselinePricing
    );

    /*
     * Preserve the orchestrator-calculated actual cost as authoritative
     * when it exists, and derive savings from that exact persisted value.
     */
    const baselineCost = comparison.baselineCost;

    const savings =
      Math.round((baselineCost - actualCost) * 1e8) / 1e8;

    const savingsPercentage =
      baselineCost > 0
        ? Math.round(
            ((savings / baselineCost) * 100 + Number.EPSILON) * 1e4
          ) / 1e4
        : 0;

    const costIntelligence: CostIntelligenceResult = {
      actualCost,
      baselineCost,
      savings,
      savingsPercentage,
    };

    await prisma.request.update({
      where: { id: input.requestId },
      data: {
        status: "SUCCESS",
        selectedProviderId: executedModel.providerId,
        selectedModelId: executedModel.id,
        inputTokens: input.usage.inputTokens,
        outputTokens: input.usage.outputTokens,
        actualCost,
        baselineCost,
        savings,
        savingsPercentage,
      },
    });

    return {
      persisted: true,
      baselineModelId: baselineModelId ?? undefined,
      costIntelligence,
    };
  } catch {
    /*
     * Analytics/persistence must not convert a successful provider response
     * into an API failure.
     */
    return {
      persisted: false,
      reason: "COST_INTELLIGENCE_ERROR",
    };
  }
}
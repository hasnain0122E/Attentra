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
 * Persist request-level execution and cost intelligence.
 *
 * Cost-intelligence failure must never invalidate a successful LLM execution.
 *
 * Baseline semantics:
 * The same actual token usage is priced against the business-configured
 * baseline model. This is an equivalent-usage cost comparison, not a claim
 * about what another provider would literally have generated.
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

    const baselineModelId = request.business?.baselineModelId;

    /*
     * No baseline configured:
     * Persist execution facts and actual cost, but do not fabricate savings.
     */
    if (!baselineModelId) {
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

      return {
        persisted: true,
        reason: "BASELINE_NOT_CONFIGURED",
      };
    }

    const baselineModel = await prisma.model.findUnique({
      where: { id: baselineModelId },
      select: {
        id: true,
        inputPricePer1k: true,
        outputPricePer1k: true,
      },
    });

    /*
     * A stale baseline reference should not destroy an otherwise successful
     * execution. Persist the execution facts and actual cost only.
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

      return {
        persisted: true,
        baselineModelId,
        reason: "BASELINE_MODEL_NOT_FOUND",
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
      baselineModelId,
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
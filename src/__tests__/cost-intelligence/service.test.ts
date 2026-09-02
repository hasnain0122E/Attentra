import { beforeEach, describe, expect, it, vi } from "vitest";

import { persistRequestCostIntelligence } from "@/lib/cost-intelligence";

function createPrismaMock() {
  return {
    request: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    model: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  };
}

describe("persistRequestCostIntelligence", () => {
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  it("returns REQUEST_NOT_FOUND when the request does not exist", async () => {
    prisma.request.findUnique.mockResolvedValue(null);

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_missing",
      executedModelId: "model_exec",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
      },
      actualCost: 0.005,
    });

    expect(result).toEqual({
      persisted: false,
      reason: "REQUEST_NOT_FOUND",
    });

    expect(prisma.request.update).not.toHaveBeenCalled();
  });

  it("returns EXECUTED_MODEL_NOT_FOUND when the executed model is missing", async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: "req_1",
      businessId: null,
      business: null,
    });

    prisma.model.findUnique.mockResolvedValueOnce(null);

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_1",
      executedModelId: "missing_model",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
      },
      actualCost: 0.005,
    });

    expect(result).toEqual({
      persisted: false,
      reason: "EXECUTED_MODEL_NOT_FOUND",
    });

    expect(prisma.request.update).not.toHaveBeenCalled();
  });

  it("persists actual execution data when no baseline is configured", async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: "req_1",
      businessId: null,
      business: null,
    });

    prisma.model.findUnique.mockResolvedValueOnce({
      id: "model_exec",
      providerId: "google",
      inputPricePer1k: 0.002,
      outputPricePer1k: 0.006,
    });

    prisma.request.update.mockResolvedValue({});

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_1",
      executedModelId: "model_exec",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
      },
      actualCost: 0.005,
    });

    expect(result).toEqual({
      persisted: true,
      reason: "BASELINE_NOT_CONFIGURED",
    });

    expect(prisma.request.update).toHaveBeenCalledWith({
      where: { id: "req_1" },
      data: {
        status: "SUCCESS",
        selectedProviderId: "google",
        selectedModelId: "model_exec",
        inputTokens: 1000,
        outputTokens: 500,
        actualCost: 0.005,
        baselineCost: null,
        savings: null,
        savingsPercentage: null,
      },
    });
  });

  it("calculates and persists savings against the configured baseline model", async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: "req_1",
      businessId: "business_1",
      business: {
        baselineModelId: "baseline_model",
      },
    });

    prisma.model.findUnique
      .mockResolvedValueOnce({
        id: "model_exec",
        providerId: "google",
        inputPricePer1k: 0.002,
        outputPricePer1k: 0.006,
      })
      .mockResolvedValueOnce({
        id: "baseline_model",
        inputPricePer1k: 0.01,
        outputPricePer1k: 0.03,
      });

    prisma.request.update.mockResolvedValue({});

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_1",
      executedModelId: "model_exec",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
      },
      actualCost: 0.005,
    });

    expect(result.persisted).toBe(true);
    expect(result.baselineModelId).toBe("baseline_model");

    expect(result.costIntelligence).toEqual({
      actualCost: 0.005,
      baselineCost: 0.025,
      savings: 0.02,
      savingsPercentage: 80,
    });

    expect(prisma.request.update).toHaveBeenCalledWith({
      where: { id: "req_1" },
      data: {
        status: "SUCCESS",
        selectedProviderId: "google",
        selectedModelId: "model_exec",
        inputTokens: 1000,
        outputTokens: 500,
        actualCost: 0.005,
        baselineCost: 0.025,
        savings: 0.02,
        savingsPercentage: 80,
      },
    });
  });

  it("persists negative savings when execution is more expensive than baseline", async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: "req_1",
      businessId: "business_1",
      business: {
        baselineModelId: "baseline_model",
      },
    });

    prisma.model.findUnique
      .mockResolvedValueOnce({
        id: "expensive_model",
        providerId: "anthropic",
        inputPricePer1k: 0.02,
        outputPricePer1k: 0.06,
      })
      .mockResolvedValueOnce({
        id: "baseline_model",
        inputPricePer1k: 0.01,
        outputPricePer1k: 0.03,
      });

    prisma.request.update.mockResolvedValue({});

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_1",
      executedModelId: "expensive_model",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
      },
      actualCost: 0.05,
    });

    expect(result.costIntelligence).toEqual({
      actualCost: 0.05,
      baselineCost: 0.025,
      savings: -0.025,
      savingsPercentage: -100,
    });
  });

  it("uses the executed model when fallback execution succeeds", async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: "req_1",
      businessId: "business_1",
      business: {
        baselineModelId: "baseline_model",
      },
    });

    prisma.model.findUnique
      .mockResolvedValueOnce({
        id: "fallback_model",
        providerId: "anthropic",
        inputPricePer1k: 0.003,
        outputPricePer1k: 0.015,
      })
      .mockResolvedValueOnce({
        id: "baseline_model",
        inputPricePer1k: 0.01,
        outputPricePer1k: 0.03,
      });

    prisma.request.update.mockResolvedValue({});

    await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_1",
      executedModelId: "fallback_model",
      usage: {
        inputTokens: 800,
        outputTokens: 200,
      },
      actualCost: 0.0054,
    });

    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          selectedProviderId: "anthropic",
          selectedModelId: "fallback_model",
          actualCost: 0.0054,
        }),
      }),
    );
  });

  it("persists actual cost only when the configured baseline model is missing", async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: "req_1",
      businessId: "business_1",
      business: {
        baselineModelId: "stale_baseline",
      },
    });

    prisma.model.findUnique
      .mockResolvedValueOnce({
        id: "model_exec",
        providerId: "google",
        inputPricePer1k: 0.002,
        outputPricePer1k: 0.006,
      })
      .mockResolvedValueOnce(null);

    prisma.request.update.mockResolvedValue({});

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_1",
      executedModelId: "model_exec",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
      },
      actualCost: 0.005,
    });

    expect(result).toEqual({
      persisted: true,
      baselineModelId: "stale_baseline",
      reason: "BASELINE_MODEL_NOT_FOUND",
    });

    expect(prisma.request.update).toHaveBeenCalledWith({
      where: { id: "req_1" },
      data: expect.objectContaining({
        actualCost: 0.005,
        baselineCost: null,
        savings: null,
        savingsPercentage: null,
      }),
    });
  });

  it("falls back to deterministic model pricing when actualCost is absent", async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: "req_1",
      businessId: null,
      business: null,
    });

    prisma.model.findUnique.mockResolvedValueOnce({
      id: "model_exec",
      providerId: "google",
      inputPricePer1k: 0.002,
      outputPricePer1k: 0.006,
    });

    prisma.request.update.mockResolvedValue({});

    await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_1",
      executedModelId: "model_exec",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
      },
    });

    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actualCost: 0.005,
        }),
      }),
    );
  });

  it("persists zero cost for a successful zero-token execution", async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: "req_zero",
      businessId: null,
      business: null,
    });

    prisma.model.findUnique.mockResolvedValueOnce({
      id: "model_exec",
      providerId: "google",
      inputPricePer1k: 0.002,
      outputPricePer1k: 0.006,
    });

    prisma.request.update.mockResolvedValue({});

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_zero",
      executedModelId: "model_exec",
      usage: {
        inputTokens: 0,
        outputTokens: 0,
      },
      actualCost: 0,
    });

    expect(result).toEqual({
      persisted: true,
      reason: "BASELINE_NOT_CONFIGURED",
    });

    expect(prisma.request.update).toHaveBeenCalledWith({
      where: {
        id: "req_zero",
      },
      data: {
        status: "SUCCESS",
        selectedProviderId: "google",
        selectedModelId: "model_exec",
        inputTokens: 0,
        outputTokens: 0,
        actualCost: 0,
        baselineCost: null,
        savings: null,
        savingsPercentage: null,
      },
    });
  });

  it("never throws when persistence fails", async () => {
    prisma.request.findUnique.mockRejectedValue(
      new Error("database unavailable"),
    );

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_1",
      executedModelId: "model_exec",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
      },
      actualCost: 0.005,
    });

    expect(result).toEqual({
      persisted: false,
      reason: "COST_INTELLIGENCE_ERROR",
    });
  });
});

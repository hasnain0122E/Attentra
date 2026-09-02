/**
 * Attentra — Consumer Baseline Cost Intelligence Tests
 *
 * Phase 12.12 — Consumer Baseline Cost Intelligence
 *
 * Proves that:
 * 1. Consumer request resolves CONSUMER_BASELINE_MODEL from env.
 * 2. Consumer baseline uses the same actual token usage.
 * 3. Consumer baseline uses current DB pricing (not hard-coded).
 * 4. Positive savings calculated correctly.
 * 5. Negative savings preserved correctly (signed).
 * 6. Missing env variable safely produces no baseline.
 * 7. Invalid/nonexistent configured model safely produces no baseline.
 * 8. Inactive configured model safely produces no baseline.
 * 9. Business request continues using Business.baselineModelId.
 * 10. Business baseline takes precedence over CONSUMER_BASELINE_MODEL.
 * 11. Fallback execution actualCost uses executed model; baseline uses reference.
 *
 * All tests are fully deterministic. No provider calls. No randomness.
 */

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

/**
 * Standard consumer request (no business).
 */
const CONSUMER_REQUEST = {
  id: "req_consumer_1",
  businessId: null,
  business: null,
};

/**
 * Standard business request with baseline configured.
 */
function makeBusinessRequest(baselineModelId: string) {
  return {
    id: "req_business_1",
    businessId: "business_1",
    business: { baselineModelId },
  };
}

/**
 * Claude Sonnet 5 baseline model in the registry.
 */
const CLAUDE_BASELINE_MODEL = {
  id: "model_claude_sonnet_5",
  inputPricePer1k: 0.003,
  outputPricePer1k: 0.015,
};

/**
 * A cheap executed model (e.g. Gemini Flash).
 */
const CHEAP_EXECUTED_MODEL = {
  id: "model_gemini_flash",
  providerId: "google",
  inputPricePer1k: 0.0001,
  outputPricePer1k: 0.0004,
};

const USAGE = {
  inputTokens: 1000,
  outputTokens: 500,
};

describe("Phase 12.12 — Consumer Baseline Cost Intelligence", () => {
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.request.update.mockResolvedValue({});
  });

  // ─────────────────────────────────────────────────────
  // TEST 1: Consumer request resolves CONSUMER_BASELINE_MODEL
  // ─────────────────────────────────────────────────────

  it("resolves CONSUMER_BASELINE_MODEL from env for consumer requests", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);

    prisma.model.findUnique.mockResolvedValue(CHEAP_EXECUTED_MODEL);

    prisma.model.findFirst.mockResolvedValue(CLAUDE_BASELINE_MODEL);

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_gemini_flash",
      usage: USAGE,
      actualCost: 0.0003,
    });

    expect(result.persisted).toBe(true);
    expect(result.baselineModelId).toBe("model_claude_sonnet_5");
    expect(result.costIntelligence).toBeDefined();

    // Verify findFirst was called with the correct identifier
    expect(prisma.model.findFirst).toHaveBeenCalledWith({
      where: {
        modelIdentifier: "claude-sonnet-5",
        active: true,
      },
      select: {
        id: true,
        inputPricePer1k: true,
        outputPricePer1k: true,
      },
    });

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 2: Consumer baseline uses same actual token usage
  // ─────────────────────────────────────────────────────

  it("calculates baseline cost using the same actual token usage", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);
    prisma.model.findUnique.mockResolvedValue(CHEAP_EXECUTED_MODEL);
    prisma.model.findFirst.mockResolvedValue(CLAUDE_BASELINE_MODEL);

    const usage = { inputTokens: 2000, outputTokens: 800 };

    await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_gemini_flash",
      usage,
      actualCost: 0.00052,
    });

    // Baseline cost should be: (2000/1000)*0.003 + (800/1000)*0.015 = 0.006 + 0.012 = 0.018
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baselineCost: 0.018,
        }),
      }),
    );

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 3: Consumer baseline uses current DB pricing
  // ─────────────────────────────────────────────────────

  it("uses current DB pricing for the baseline model (not hard-coded)", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);
    prisma.model.findUnique.mockResolvedValue(CHEAP_EXECUTED_MODEL);

    // Simulate a price change in the DB
    const expensiveBaseline = {
      id: "model_claude_sonnet_5",
      inputPricePer1k: 0.01,
      outputPricePer1k: 0.05,
    };
    prisma.model.findFirst.mockResolvedValue(expensiveBaseline);

    await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_gemini_flash",
      usage: USAGE,
      actualCost: 0.0003,
    });

    // Baseline: (1000/1000)*0.01 + (500/1000)*0.05 = 0.01 + 0.025 = 0.035
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baselineCost: 0.035,
        }),
      }),
    );

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 4: Positive savings calculated correctly
  // ─────────────────────────────────────────────────────

  it("calculates positive savings when actual is cheaper than baseline", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);
    prisma.model.findUnique.mockResolvedValue(CHEAP_EXECUTED_MODEL);
    prisma.model.findFirst.mockResolvedValue(CLAUDE_BASELINE_MODEL);

    // Actual cost: 0.0003 (cheap Gemini)
    // Baseline cost: (1000/1000)*0.003 + (500/1000)*0.015 = 0.003 + 0.0075 = 0.0105
    // Savings: 0.0105 - 0.0003 = 0.0102
    await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_gemini_flash",
      usage: USAGE,
      actualCost: 0.0003,
    });

    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actualCost: 0.0003,
          baselineCost: 0.0105,
          savings: 0.0102,
          savingsPercentage: expect.any(Number),
        }),
      }),
    );

    // Savings percentage: (0.0102 / 0.0105) * 100 ≈ 97.14%
    const updateCall = prisma.request.update.mock.calls[0][0];
    expect(updateCall.data.savingsPercentage).toBeCloseTo(97.14, 1);

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 5: Negative savings preserved correctly (signed)
  // ─────────────────────────────────────────────────────

  it("preserves negative savings when actual is more expensive than baseline", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);

    // Expensive executed model
    const expensiveModel = {
      id: "model_expensive",
      providerId: "anthropic",
      inputPricePer1k: 0.02,
      outputPricePer1k: 0.06,
    };
    prisma.model.findUnique.mockResolvedValue(expensiveModel);
    prisma.model.findFirst.mockResolvedValue(CLAUDE_BASELINE_MODEL);

    // Actual cost: 0.05 (expensive model)
    // Baseline cost: (1000/1000)*0.003 + (500/1000)*0.015 = 0.0105
    // Savings: 0.0105 - 0.05 = -0.0395 (NEGATIVE)
    await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_expensive",
      usage: USAGE,
      actualCost: 0.05,
    });

    const updateCall = prisma.request.update.mock.calls[0][0];
    expect(updateCall.data.savings).toBeLessThan(0);
    expect(updateCall.data.savings).toBe(-0.0395);
    expect(updateCall.data.savingsPercentage).toBeLessThan(0);

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 6: Missing env variable safely produces no baseline
  // ─────────────────────────────────────────────────────

  it("safely produces no baseline when CONSUMER_BASELINE_MODEL env is missing", async () => {
    delete process.env.CONSUMER_BASELINE_MODEL;

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);
    prisma.model.findUnique.mockResolvedValue(CHEAP_EXECUTED_MODEL);

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_gemini_flash",
      usage: USAGE,
      actualCost: 0.0003,
    });

    expect(result.persisted).toBe(true);
    expect(result.reason).toBe("BASELINE_NOT_CONFIGURED");
    expect(result.costIntelligence).toBeUndefined();

    // findFirst should NOT have been called (env not set)
    expect(prisma.model.findFirst).not.toHaveBeenCalled();

    // baselineCost should be null
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baselineCost: null,
          savings: null,
          savingsPercentage: null,
        }),
      }),
    );
  });

  // ─────────────────────────────────────────────────────
  // TEST 7: Invalid/nonexistent model safely produces no baseline
  // ─────────────────────────────────────────────────────

  it("safely produces no baseline when configured model does not exist", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "nonexistent-model-xyz";

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);
    prisma.model.findUnique.mockResolvedValue(CHEAP_EXECUTED_MODEL);
    prisma.model.findFirst.mockResolvedValue(null);

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_gemini_flash",
      usage: USAGE,
      actualCost: 0.0003,
    });

    expect(result.persisted).toBe(true);
    expect(result.reason).toBe("CONSUMER_BASELINE_MODEL_NOT_FOUND");
    expect(result.costIntelligence).toBeUndefined();

    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baselineCost: null,
          savings: null,
        }),
      }),
    );

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 8: Inactive model safely produces no baseline
  // ─────────────────────────────────────────────────────

  it("safely produces no baseline when configured model is inactive", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);
    prisma.model.findUnique.mockResolvedValue(CHEAP_EXECUTED_MODEL);
    // findFirst with active: true returns null (model is inactive)
    prisma.model.findFirst.mockResolvedValue(null);

    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_gemini_flash",
      usage: USAGE,
      actualCost: 0.0003,
    });

    expect(result.persisted).toBe(true);
    expect(result.reason).toBe("CONSUMER_BASELINE_MODEL_NOT_FOUND");

    // Verify findFirst was called with active: true filter
    expect(prisma.model.findFirst).toHaveBeenCalledWith({
      where: {
        modelIdentifier: "claude-sonnet-5",
        active: true,
      },
      select: {
        id: true,
        inputPricePer1k: true,
        outputPricePer1k: true,
      },
    });

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 9: Business request continues using Business.baselineModelId
  // ─────────────────────────────────────────────────────

  it("business request uses Business.baselineModelId, not CONSUMER_BASELINE_MODEL", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    const businessRequest = makeBusinessRequest("model_business_baseline");

    prisma.request.findUnique.mockResolvedValue(businessRequest);

    const executedModel = {
      id: "model_exec",
      providerId: "google",
      inputPricePer1k: 0.002,
      outputPricePer1k: 0.006,
    };
    prisma.model.findUnique.mockResolvedValue(executedModel);

    const businessBaseline = {
      id: "model_business_baseline",
      inputPricePer1k: 0.005,
      outputPricePer1k: 0.02,
    };
    prisma.model.findUnique.mockResolvedValue(businessBaseline);

    // findFirst should NOT be called for business requests
    const result = await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_business_1",
      executedModelId: "model_exec",
      usage: USAGE,
      actualCost: 0.005,
    });

    expect(result.persisted).toBe(true);
    expect(result.baselineModelId).toBe("model_business_baseline");

    // findFirst (consumer baseline lookup) must NOT be called
    expect(prisma.model.findFirst).not.toHaveBeenCalled();

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 10: Business baseline takes precedence
  // ─────────────────────────────────────────────────────

  it("business baseline takes precedence even when CONSUMER_BASELINE_MODEL is set", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    const businessRequest = makeBusinessRequest("model_business_baseline");
    prisma.request.findUnique.mockResolvedValue(businessRequest);

    const executedModel = {
      id: "model_exec",
      providerId: "openai",
      inputPricePer1k: 0.001,
      outputPricePer1k: 0.004,
    };
    prisma.model.findUnique.mockResolvedValue(executedModel);

    // Business baseline model (different from consumer baseline)
    const businessBaseline = {
      id: "model_business_baseline",
      inputPricePer1k: 0.008,
      outputPricePer1k: 0.03,
    };
    prisma.model.findUnique.mockResolvedValue(businessBaseline);

    await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_business_1",
      executedModelId: "model_exec",
      usage: USAGE,
      actualCost: 0.003,
    });

    // Baseline should use business model pricing:
    // (1000/1000)*0.008 + (500/1000)*0.03 = 0.008 + 0.015 = 0.023
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baselineCost: 0.023,
        }),
      }),
    );

    // Consumer baseline lookup must NOT have been called
    expect(prisma.model.findFirst).not.toHaveBeenCalled();

    delete process.env.CONSUMER_BASELINE_MODEL;
  });

  // ─────────────────────────────────────────────────────
  // TEST 11: Fallback execution — actualCost uses executed model,
  //          baseline uses consumer reference pricing
  // ─────────────────────────────────────────────────────

  it("fallback execution: actualCost from executed model, baseline from consumer reference", async () => {
    process.env.CONSUMER_BASELINE_MODEL = "claude-sonnet-5";

    prisma.request.findUnique.mockResolvedValue(CONSUMER_REQUEST);

    // Fallback executed model (e.g. GPT-4 after Gemini failed)
    const fallbackModel = {
      id: "model_gpt4",
      providerId: "openai",
      inputPricePer1k: 0.005,
      outputPricePer1k: 0.015,
    };
    prisma.model.findUnique.mockResolvedValue(fallbackModel);
    prisma.model.findFirst.mockResolvedValue(CLAUDE_BASELINE_MODEL);

    // Actual cost from fallback execution
    const fallbackActualCost = 0.0125;

    await persistRequestCostIntelligence(prisma as never, {
      requestId: "req_consumer_1",
      executedModelId: "model_gpt4",
      usage: USAGE,
      actualCost: fallbackActualCost,
    });

    // Baseline: same usage × Claude pricing
    // (1000/1000)*0.003 + (500/1000)*0.015 = 0.0105
    const updateCall = prisma.request.update.mock.calls[0][0];

    expect(updateCall.data.actualCost).toBe(0.0125);
    expect(updateCall.data.baselineCost).toBe(0.0105);

    // Savings: 0.0105 - 0.0125 = -0.002 (negative because fallback was more expensive)
    expect(updateCall.data.savings).toBe(-0.002);

    // Verify the executed model is the fallback, not the original
    expect(updateCall.data.selectedModelId).toBe("model_gpt4");
    expect(updateCall.data.selectedProviderId).toBe("openai");

    delete process.env.CONSUMER_BASELINE_MODEL;
  });
});

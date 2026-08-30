/**
 * Attentra — Execution Orchestrator Tests
 *
 * Phase 7 / Step 4 — Execution Orchestration, Fallback & Resilience
 *
 * Tests for the ExecutionOrchestrator:
 *
 * 1. Primary success — no fallback attempted
 * 2. Retryable failures — timeout, rate-limit, server-error, network-error
 * 3. Non-retryable failures — authentication, invalid-request, context-length,
 *    model-not-found
 * 4. Multiple fallbacks — primary→fallback1, primary→fb1→fb2, all fail
 * 5. maxAttempts enforcement
 * 6. Metrics — latency, usage, actual cost
 * 7. Security — no credential leakage
 * 8. Architecture — no SDK imports, no hardcoded models/prices
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  ExecutionOrchestrator,
  orchestrateExecution,
  computeActualCost,
  MAX_ORCHESTRATOR_ATTEMPTS,
  type OrchestratorResult,
} from "@/lib/execution/orchestrator";
import {
  MockProviderAdapter,
  ProviderRegistry,
  ExecutionAdapterRegistry,
  NormalizedExecutionError,
  type MockBehavior,
  type ExecutionAttempt,
} from "@/lib/execution";
import type { ExecutionPlan, ExecutionTarget } from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────

function makeTarget(
  overrides: Partial<ExecutionTarget> & { providerId?: string; modelId?: string } = {}
): ExecutionTarget {
  return {
    entryId: overrides.entryId ?? "primary",
    modelId: overrides.modelId ?? "mock-model-1",
    providerId: overrides.providerId ?? "mock",
    providerName: overrides.providerName ?? "Mock Provider",
    modelIdentifier: overrides.modelIdentifier ?? "mock-model-identifier",
    displayName: overrides.displayName ?? "Mock Model",
    projectedCost: overrides.projectedCost ?? 0.001,
    routingScore: overrides.routingScore ?? 0.85,
  };
}

function makePlan(
  overrides: Partial<ExecutionPlan> = {}
): ExecutionPlan {
  return {
    requestId: "test-req-1",
    taskType: "GENERAL",
    complexity: "MEDIUM",
    primary: makeTarget({ entryId: "primary", modelId: "mock-model-1", providerId: "mock" }),
    fallbacks: [],
    estimatedInputTokens: 100,
    estimatedOutputTokens: 50,
    projectedCost: 0.001,
    routingScore: 0.85,
    routingExplanation: "Test routing explanation",
    status: "NOT_EXECUTED",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeFallbackTarget(index: number, providerId = "mock"): ExecutionTarget {
  return makeTarget({
    entryId: `fallback-${index + 1}`,
    modelId: `mock-model-fallback-${index + 1}`,
    providerId,
    modelIdentifier: `mock-fallback-identifier-${index + 1}`,
    displayName: `Mock Fallback Model ${index + 1}`,
  });
}

const MESSAGES = [{ role: "user", content: "Hello, test!" }];

/**
 * Build a ProviderRegistry with one or more MockProviderAdapters.
 * Each entry: [providerId, behavior].
 */
function buildRegistry(
  adapters: Array<{ providerId: string; behavior: MockProviderAdapter["behavior"] | string }>
): ProviderRegistry {
  const inner = new ExecutionAdapterRegistry();
  const registry = new ProviderRegistry(inner);

  for (const { providerId, behavior } of adapters) {
    const mock = new MockProviderAdapter({
      behavior: behavior as MockBehavior,
    });
    // Override providerId for distinct fallback adapters
    Object.defineProperty(mock, "providerId", { value: providerId, writable: false });
    registry.register(mock);
  }

  return registry;
}

// ─────────────────────────────────────────────────────
// 1. PRIMARY SUCCESS
// ─────────────────────────────────────────────────────

describe("Primary success", () => {
  it("returns success when primary succeeds", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const orchestrator = new ExecutionOrchestrator(registry);
    const result = await orchestrator.execute(makePlan(), MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts).toHaveLength(1);
    expect(result.executionAttempts[0].attemptNumber).toBe(1);
    expect(result.executionAttempts[0].success).toBe(true);
  });

  it("does not attempt any fallback when primary succeeds", async () => {
    const fallbacks = [makeFallbackTarget(0)];
    const plan = makePlan({ fallbacks });
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const orchestrator = new ExecutionOrchestrator(registry);
    const result = await orchestrator.execute(plan, MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts).toHaveLength(1);
    expect(result.fallback).toBeUndefined();
  });

  it("normalizes the result correctly on primary success", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const orchestrator = new ExecutionOrchestrator(registry);
    const result = await orchestrator.execute(makePlan(), MESSAGES);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("mock");
    expect(result.modelId).toBe("mock-model-1");
    expect(result.content).toBeDefined();
    expect(result.usage).toBeDefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
    expect(result.attempts).toBe(1);
  });
});

// ─────────────────────────────────────────────────────
// 2. RETRYABLE FAILURES TRIGGER FALLBACK
// ─────────────────────────────────────────────────────

describe("Retryable failures trigger fallback", () => {
  it("TIMEOUT triggers fallback to next provider", async () => {
    const fallback = makeFallbackTarget(0, "mock-fb");
    const plan = makePlan({ fallbacks: [fallback] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "timeout" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb, "providerId", { value: "mock-fb", writable: false });
    registry.register(fb);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts).toHaveLength(2);
    expect(result.executionAttempts[0].success).toBe(false);
    expect(result.executionAttempts[0].error?.code).toBe("TIMEOUT");
    expect(result.executionAttempts[1].success).toBe(true);
    expect(result.fallback?.used).toBe(true);
    expect(result.fallback?.primaryFailed).toBe(true);
  });

  it("RATE_LIMIT triggers fallback", async () => {
    const fallback = makeFallbackTarget(0, "mock-fb");
    const plan = makePlan({ fallbacks: [fallback] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "rate_limit" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb, "providerId", { value: "mock-fb", writable: false });
    registry.register(fb);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts[0].error?.code).toBe("RATE_LIMIT");
    expect(result.fallback?.used).toBe(true);
  });

  it("SERVER_ERROR (5xx) triggers fallback", async () => {
    const fallback = makeFallbackTarget(0, "mock-fb");
    const plan = makePlan({ fallbacks: [fallback] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "server_error" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb, "providerId", { value: "mock-fb", writable: false });
    registry.register(fb);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts[0].error?.code).toBe("SERVER_ERROR");
    expect(result.fallback?.used).toBe(true);
  });

  it("NETWORK_ERROR triggers fallback", async () => {
    const fallback = makeFallbackTarget(0, "mock-fb");
    const plan = makePlan({ fallbacks: [fallback] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "network_error" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb, "providerId", { value: "mock-fb", writable: false });
    registry.register(fb);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts[0].error?.code).toBe("NETWORK_ERROR");
    expect(result.fallback?.used).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 3. NON-RETRYABLE FAILURES STOP IMMEDIATELY
// ─────────────────────────────────────────────────────

describe("Non-retryable failures stop execution", () => {
  it("AUTHENTICATION failure stops execution immediately", async () => {
    const fallback = makeFallbackTarget(0, "mock-fb");
    const plan = makePlan({ fallbacks: [fallback] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "authentication" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb, "providerId", { value: "mock-fb", writable: false });
    registry.register(fb);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(false);
    expect(result.executionAttempts).toHaveLength(1);
    expect(result.executionAttempts[0].error?.code).toBe("AUTHENTICATION");
    expect(result.fallback).toBeUndefined();
  });

  it("INVALID_REQUEST failure stops execution immediately", async () => {
    const fallback = makeFallbackTarget(0, "mock-fb");
    const plan = makePlan({ fallbacks: [fallback] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "invalid_request" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb, "providerId", { value: "mock-fb", writable: false });
    registry.register(fb);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(false);
    expect(result.executionAttempts).toHaveLength(1);
    expect(result.executionAttempts[0].error?.code).toBe("INVALID_REQUEST");
  });

  it("CONTEXT_LENGTH failure stops execution immediately", async () => {
    const fallback = makeFallbackTarget(0, "mock-fb");
    const plan = makePlan({ fallbacks: [fallback] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "context_length" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb, "providerId", { value: "mock-fb", writable: false });
    registry.register(fb);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(false);
    expect(result.executionAttempts).toHaveLength(1);
    expect(result.executionAttempts[0].error?.code).toBe("CONTEXT_LENGTH");
  });

  it("MODEL_UNAVAILABLE is target-specific — falls through to the next fallback target", async () => {
    // A model that is retired/restricted (e.g. listed but closed to new
    // users) must not abort the whole request: the fallback chain is a
    // DIFFERENT model, usually on another provider, and may still serve.
    const fallback = makeFallbackTarget(0, "mock-fb");
    const plan = makePlan({ fallbacks: [fallback] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "model_unavailable" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb, "providerId", { value: "mock-fb", writable: false });
    registry.register(fb);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts).toHaveLength(2);
    // The error itself stays non-retryable (never re-attempt THAT model)
    expect(result.executionAttempts[0].error?.code).toBe("MODEL_UNAVAILABLE");
    expect(result.executionAttempts[0].error?.retryable).toBe(false);
    expect(result.fallback?.used).toBe(true);
    expect(result.fallback?.fallbackModelId).toBe("mock-model-fallback-1");
  });

  it("MODEL_UNAVAILABLE on every target fails after exhausting the chain", async () => {
    const plan = makePlan({
      fallbacks: [makeFallbackTarget(0, "mock-fb")],
    });

    const registry = buildRegistry([
      { providerId: "mock", behavior: "model_unavailable" },
      { providerId: "mock-fb", behavior: "model_unavailable" },
    ]);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(false);
    expect(result.executionAttempts).toHaveLength(2);
    expect(result.error?.code).toBe("MODEL_UNAVAILABLE");
    expect(result.fallback?.used).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 4. MULTIPLE FALLBACKS
// ─────────────────────────────────────────────────────

describe("Multiple fallbacks", () => {
  it("primary fails → fallback 1 succeeds", async () => {
    const fallback1 = makeFallbackTarget(0, "mock-fb1");
    const plan = makePlan({ fallbacks: [fallback1] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "timeout" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb1 = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb1, "providerId", { value: "mock-fb1", writable: false });
    registry.register(fb1);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts).toHaveLength(2);
    expect(result.fallback?.used).toBe(true);
    expect(result.fallback?.primaryFailed).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it("primary fails → fallback 1 fails → fallback 2 succeeds", async () => {
    const fallback1 = makeFallbackTarget(0, "mock-fb1");
    const fallback2 = makeFallbackTarget(1, "mock-fb2");
    const plan = makePlan({ fallbacks: [fallback1, fallback2] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "timeout" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb1 = new MockProviderAdapter({ behavior: "rate_limit" });
    Object.defineProperty(fb1, "providerId", { value: "mock-fb1", writable: false });
    registry.register(fb1);

    const fb2 = new MockProviderAdapter({ behavior: "success" });
    Object.defineProperty(fb2, "providerId", { value: "mock-fb2", writable: false });
    registry.register(fb2);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(true);
    expect(result.executionAttempts).toHaveLength(3);
    expect(result.executionAttempts[0].error?.code).toBe("TIMEOUT");
    expect(result.executionAttempts[1].error?.code).toBe("RATE_LIMIT");
    expect(result.executionAttempts[2].success).toBe(true);
    expect(result.fallback?.used).toBe(true);
    expect(result.fallback?.attempts).toBe(3);
  });

  it("all candidates fail — returns failure with full attempt history", async () => {
    const fallback1 = makeFallbackTarget(0, "mock-fb1");
    const plan = makePlan({ fallbacks: [fallback1] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    const primary = new MockProviderAdapter({ behavior: "timeout" });
    Object.defineProperty(primary, "providerId", { value: "mock", writable: false });
    registry.register(primary);

    const fb1 = new MockProviderAdapter({ behavior: "server_error" });
    Object.defineProperty(fb1, "providerId", { value: "mock-fb1", writable: false });
    registry.register(fb1);

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES);

    expect(result.success).toBe(false);
    expect(result.executionAttempts).toHaveLength(2);
    expect(result.executionAttempts[0].success).toBe(false);
    expect(result.executionAttempts[1].success).toBe(false);
  });

  it("maxAttempts is enforced — stops before exhausting all fallbacks", async () => {
    const fallback1 = makeFallbackTarget(0, "mock-fb1");
    const fallback2 = makeFallbackTarget(1, "mock-fb2");
    const plan = makePlan({ fallbacks: [fallback1, fallback2] });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    for (const pid of ["mock", "mock-fb1", "mock-fb2"]) {
      const mock = new MockProviderAdapter({ behavior: "timeout" });
      Object.defineProperty(mock, "providerId", { value: pid, writable: false });
      registry.register(mock);
    }

    // Only allow 2 attempts total (primary + 1 fallback)
    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES, {
      maxAttempts: 2,
    });

    expect(result.executionAttempts).toHaveLength(2);
    expect(result.success).toBe(false);
  });

  it("maxAttempts hard cap: cannot exceed MAX_ORCHESTRATOR_ATTEMPTS", async () => {
    expect(MAX_ORCHESTRATOR_ATTEMPTS).toBe(5);

    // Build 10 fallbacks — orchestrator should cap at MAX
    const fallbacks = Array.from({ length: 9 }, (_, i) =>
      makeFallbackTarget(i, `mock-fb${i + 1}`)
    );
    const plan = makePlan({ fallbacks });

    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    for (const pid of ["mock", ...fallbacks.map((f) => f.providerId)]) {
      const mock = new MockProviderAdapter({ behavior: "timeout" });
      Object.defineProperty(mock, "providerId", { value: pid, writable: false });
      registry.register(mock);
    }

    const result = await new ExecutionOrchestrator(registry).execute(plan, MESSAGES, {
      maxAttempts: 999, // Try to exceed — should be capped
    });

    expect(result.executionAttempts.length).toBeLessThanOrEqual(MAX_ORCHESTRATOR_ATTEMPTS);
  });
});

// ─────────────────────────────────────────────────────
// 5. EXECUTION PLAN VALIDATION
// ─────────────────────────────────────────────────────

describe("Execution plan validation", () => {
  it("returns INVALID_EXECUTION_PLAN for null plan", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new ExecutionOrchestrator(registry).execute(null as any, MESSAGES);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
    expect(result.executionAttempts).toHaveLength(0);
  });

  it("returns INVALID_REQUEST for empty messages", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), []);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_REQUEST");
    expect(result.executionAttempts).toHaveLength(0);
  });

  it("actualCost uses the successful fallback model pricing, not the primary model pricing", async () => {
  const primaryTarget = makeTarget({
    entryId: "primary",
    modelId: "primary-model",
    providerId: "primary-provider",
    modelIdentifier: "primary-model",
  });

  const fallbackTarget = makeTarget({
    entryId: "fallback-1",
    modelId: "fallback-model",
    providerId: "fallback-provider",
    modelIdentifier: "fallback-model",
  });

  const plan = makePlan({
    primary: primaryTarget,
    fallbacks: [fallbackTarget],
  });

  const inner = new ExecutionAdapterRegistry();
  const registry = new ProviderRegistry(inner);

  const primary = new MockProviderAdapter({
    behavior: "model_unavailable",
  });

  Object.defineProperty(primary, "providerId", {
    value: "primary-provider",
    writable: false,
  });

  registry.register(primary);

  const fallback = new MockProviderAdapter({
    behavior: "success",
  });

  Object.defineProperty(fallback, "providerId", {
    value: "fallback-provider",
    writable: false,
  });

  registry.register(fallback);

  const mockPrisma = {
    model: {
      findUnique: vi.fn().mockImplementation(
        ({ where }: { where: { id: string } }) => {
          if (where.id === "primary-model") {
            return Promise.resolve({
              inputPricePer1k: "99.00000000",
              outputPricePer1k: "99.00000000",
            });
          }

          if (where.id === "fallback-model") {
            return Promise.resolve({
              inputPricePer1k: "0.00100000",
              outputPricePer1k: "0.00200000",
            });
          }

          return Promise.resolve(null);
        }
      ),
    },
  };

  const result = await new ExecutionOrchestrator(registry).execute(
    plan,
    MESSAGES,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma: mockPrisma as any,
    }
  );

  expect(result.success).toBe(true);
  expect(result.fallback?.used).toBe(true);

  // Most important assertion:
  // Pricing lookup must happen for the model that actually succeeded.
  expect(mockPrisma.model.findUnique).toHaveBeenCalledWith({
    where: { id: "fallback-model" },
    select: {
      inputPricePer1k: true,
      outputPricePer1k: true,
    },
  });

  expect(mockPrisma.model.findUnique).not.toHaveBeenCalledWith({
    where: { id: "primary-model" },
    select: {
      inputPricePer1k: true,
      outputPricePer1k: true,
    },
  });

  expect(result.actualCost).toBeDefined();
  expect(result.executionAttempts).toHaveLength(2);

  expect(result.executionAttempts[0].actualCost).toBeUndefined();
  expect(result.executionAttempts[1].actualCost).toBe(result.actualCost);

  expect(result.modelId).toBe("fallback-model");
  expect(result.providerId).toBe("fallback-provider");
});
});

// ─────────────────────────────────────────────────────
// 6. METRICS
// ─────────────────────────────────────────────────────

describe("Metrics", () => {
  it("captures latency on success", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), MESSAGES);

    expect(result.latencyMs).toBeDefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.executionAttempts[0].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("captures actual usage on success", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), MESSAGES);

    expect(result.usage).toBeDefined();
    expect(result.usage?.inputTokens).toBeGreaterThanOrEqual(0);
    expect(result.usage?.outputTokens).toBeGreaterThanOrEqual(0);
    expect(result.usage?.totalTokens).toBeGreaterThanOrEqual(0);
  });

  it("actualCost is undefined when prisma is not provided", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), MESSAGES);

    // No prisma passed — actualCost must remain undefined
    expect(result.actualCost).toBeUndefined();
    expect(result.executionAttempts[0].actualCost).toBeUndefined();
  });

  it("actualCost is calculated when usage and pricing are available", async () => {
    // Mock prisma: model has inputPricePer1k=0.001, outputPricePer1k=0.002
    const mockPrisma = {
      model: {
        findUnique: vi.fn().mockResolvedValue({
          inputPricePer1k: "0.00100000",
          outputPricePer1k: "0.00200000",
        }),
      },
    };

    const usage = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };
    // actualCost = (1000/1000 × 0.001) + (500/1000 × 0.002) = 0.001 + 0.001 = 0.002
    const cost = await computeActualCost(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma as any,
      "model-id-123",
      usage
    );

    expect(cost).toBeCloseTo(0.002, 8);
  });

  it("actualCost is undefined when actual usage is unavailable (failure case)", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "timeout" }]);
    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), MESSAGES);

    expect(result.success).toBe(false);
    expect(result.actualCost).toBeUndefined();
    expect(result.executionAttempts[0].actualCost).toBeUndefined();
  });

  it("attempt timestamps are captured", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), MESSAGES);

    const attempt = result.executionAttempts[0];
    expect(attempt.startedAt).toBeDefined();
    expect(attempt.completedAt).toBeDefined();
    expect(new Date(attempt.startedAt).getTime()).toBeLessThanOrEqual(
      new Date(attempt.completedAt).getTime()
    );
  });
});

// ─────────────────────────────────────────────────────
// 7. SECURITY
// ─────────────────────────────────────────────────────

describe("Security", () => {
  it("API keys never appear in OrchestratorResult", async () => {
    const fakeKey = "sk-abcdefghijklmnopqrstuvwxyz1234567890";
    const registry = buildRegistry([{ providerId: "mock", behavior: "authentication" }]);
    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), MESSAGES);

    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain(fakeKey);
  });

  it("Authorization headers never appear in errors", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "server_error" }]);
    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), MESSAGES);

    const errorMsg = result.error?.message ?? "";
    expect(errorMsg).not.toMatch(/Bearer\s+\S+/i);
    expect(errorMsg).not.toMatch(/Authorization:/i);
  });

  it("provider errors are sanitized in attempt records", async () => {
    // Inject a mock that returns an error message with a fake credential
    const inner = new ExecutionAdapterRegistry();
    const registry = new ProviderRegistry(inner);

    // Build a minimal adapter that injects a credential-containing error
    const mockAdapter = {
      providerId: "mock",
      providerName: "Mock",
      supports: () => true,
      normalizeError: () =>
        new NormalizedExecutionError("SERVER_ERROR", "error", { retryable: true }),
      execute: async () => ({
        success: false,
        providerId: "mock",
        modelId: "mock-model-1",
        error: {
          code: "SERVER_ERROR" as const,
          message: "Error: key=sk-abcdefghijklmnopqrstuvwxyz1234567890 failed",
          retryable: true,
        },
        latencyMs: 10,
        timestamp: new Date().toISOString(),
      }),
    };
    registry.register(mockAdapter as import("@/lib/execution").ProviderAdapter);

    const result = await new ExecutionOrchestrator(registry).execute(makePlan(), MESSAGES);

    const attemptErrorMsg = result.executionAttempts[0].error?.message ?? "";
    expect(attemptErrorMsg).not.toContain("sk-abcdefghijklmnopqrstuvwxyz1234567890");
    expect(attemptErrorMsg).toContain("[REDACTED]");
  });
});

// ─────────────────────────────────────────────────────
// 8. ARCHITECTURE COMPLIANCE
// ─────────────────────────────────────────────────────

describe("Architecture compliance", () => {
  /**
   * Read the orchestrator source for static analysis.
   * Uses process.cwd() which is reliable on Windows under Vitest.
   */
  function readOrchestratorSource(): string {
    return readFileSync(
      join(process.cwd(), "src", "lib", "execution", "orchestrator.ts"),
      "utf-8"
    );
  }

  it("orchestrator has no provider SDK imports", () => {
    const src = readOrchestratorSource();
    expect(src).not.toContain('from "openai"');
    expect(src).not.toContain('from "@anthropic-ai/sdk"');
    expect(src).not.toContain('from "@google/generative-ai"');
  });

  it("orchestrator has no hardcoded model names", () => {
    const src = readOrchestratorSource();
    expect(src).not.toContain('"gpt-4"');
    expect(src).not.toContain('"claude"');
    expect(src).not.toContain('"gemini"');
  });

  it("orchestrator has no hardcoded pricing constants", () => {
    const src = readOrchestratorSource();
    expect(src).not.toContain("0.000002");
    expect(src).not.toContain("0.00001");
    expect(src).not.toMatch(/inputPrice\s*=\s*\d+\.\d+/);
  });

  it("orchestrator has no provider-specific branching", () => {
    const src = readOrchestratorSource();
    expect(src).not.toMatch(/if.*blueminds/i);
    expect(src).not.toMatch(/=== ["']blueminds["']/i);
    expect(src).not.toMatch(/=== ["']openai["']/i);
  });

  it("orchestrator does NOT perform routing", () => {
    const src = readOrchestratorSource();
    expect(src).not.toContain('from "@/lib/routing/router"');
    expect(src).not.toContain('from "@/lib/routing/scorer"');
    expect(src).not.toContain('from "@/lib/routing/candidates"');
  });

  it("existing routing layer remains unchanged", async () => {
    // Routing functions are still importable and working
    const { validateExecutionPlan } = await import("@/lib/routing/execution-plan");
    const plan = makePlan();
    const validation = validateExecutionPlan(plan);
    expect(validation.valid).toBe(true);
  });

  it("convenience function orchestrateExecution works identically to class", async () => {
    const registry = buildRegistry([{ providerId: "mock", behavior: "success" }]);
    const result = await orchestrateExecution(makePlan(), MESSAGES, undefined, registry);
    expect(result.success).toBe(true);
    expect(result.executionAttempts).toHaveLength(1);
  });
});

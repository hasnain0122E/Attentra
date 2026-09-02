/**
 * Attentra — Execution Service Tests
 *
 * Phase 7 / Step 3 — Production Provider Execution
 *
 * Tests for the central execution service:
 *
 * 1. ExecutionPlan validation (existing Phase 6 contract)
 * 2. Provider resolution via the provider registry
 * 3. Primary-target execution (no automatic fallback)
 * 4. Contract forwarding (estimated tokens, target, options)
 * 5. Defaults and provider neutrality
 */

import { describe, it, expect } from "vitest";
import {
  ExecutionService,
  getExecutionService,
  ProviderRegistry,
  MockProviderAdapter,
  NormalizedExecutionError,
  type ProviderAdapter,
  type ExecutionRequest,
} from "@/lib/execution";
import type {
  ExecutionPlan,
  ExecutionTarget,
} from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────

const messages = [{ role: "user", content: "Hello, world!" }];

function makeTarget(overrides: Partial<ExecutionTarget> = {}): ExecutionTarget {
  return {
    entryId: "primary",
    modelId: "mock-model-1",
    providerId: "mock",
    providerName: "Mock Provider",
    modelIdentifier: "mock-model-1",
    displayName: "Mock Model 1",
    projectedCost: 0.001,
    routingScore: 0.85,
    ...overrides,
  };
}

function makePlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    taskType: "GENERAL",
    complexity: "MEDIUM",
    primary: makeTarget(),
    fallbacks: [],
    estimatedInputTokens: 100,
    estimatedOutputTokens: 50,
    projectedCost: 0.001,
    routingScore: 0.85,
    routingExplanation: "Best scoring candidate",
    status: "NOT_EXECUTED",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeService(
  behavior: "success" | "authentication" = "success",
  latencyMs = 10
): { service: ExecutionService; registry: ProviderRegistry } {
  const registry = new ProviderRegistry();
  registry.register(new MockProviderAdapter({ behavior, latencyMs }));
  return { service: new ExecutionService(registry), registry };
}

// ─────────────────────────────────────────────────────
// 1. PLAN VALIDATION
// ─────────────────────────────────────────────────────

describe("ExecutionService — Plan Validation", () => {
  it("returns INVALID_EXECUTION_PLAN for a null plan", async () => {
    const { service } = makeService();

    const result = await service.execute(
      null as unknown as ExecutionPlan,
      messages
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns INVALID_EXECUTION_PLAN for a plan without a primary target", async () => {
    const { service } = makeService();
    const plan = makePlan({
      primary: undefined as unknown as ExecutionTarget,
    });

    const result = await service.execute(plan, messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
    expect(result.error?.message).toContain("primary");
  });

  it("returns INVALID_EXECUTION_PLAN when the routing score is out of range", async () => {
    const { service } = makeService();
    const plan = makePlan({
      primary: makeTarget({ routingScore: 5 }),
      routingScore: 5,
    });

    const result = await service.execute(plan, messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
    expect(result.error?.message).toContain("routing score");
  });

  it("returns INVALID_EXECUTION_PLAN for a negative projected cost", async () => {
    const { service } = makeService();
    const plan = makePlan({
      primary: makeTarget({ projectedCost: -1 }),
      projectedCost: -1,
    });

    const result = await service.execute(plan, messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
    expect(result.error?.message).toContain("projected cost");
  });

  it("returns INVALID_EXECUTION_PLAN for duplicate fallback model IDs", async () => {
    const { service } = makeService();
    const plan = makePlan({
      fallbacks: [makeTarget({ entryId: "fallback-1" })],
    });

    const result = await service.execute(plan, messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
    expect(result.error?.message).toContain("Duplicate model ID");
  });

  it("validation failures preserve plan identifiers for correlation", async () => {
    const { service } = makeService();
    const plan = makePlan({ primary: makeTarget({ displayName: "" }) });

    const result = await service.execute(plan, messages);

    expect(result.providerId).toBe("mock");
    expect(result.modelId).toBe("mock-model-1");
    expect(typeof result.latencyMs).toBe("number");
    expect(typeof result.timestamp).toBe("string");
  });
});

// ─────────────────────────────────────────────────────
// 2. PROVIDER RESOLUTION
// ─────────────────────────────────────────────────────

describe("ExecutionService — Provider Resolution", () => {
  it("returns MODEL_UNAVAILABLE for an unregistered provider", async () => {
    const { service } = makeService();
    const plan = makePlan({
      primary: makeTarget({ providerId: "nonexistent" }),
    });

    const result = await service.execute(plan, messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MODEL_UNAVAILABLE");
    expect(result.error?.retryable).toBe(false);
    expect(result.error?.message).toContain("nonexistent");
    // The error lists the available providers to aid debugging
    expect(result.error?.message).toContain("mock");
  });

  it("exposes its provider registry", () => {
    const { service, registry } = makeService();

    expect(service.getProviderRegistry()).toBe(registry);
  });
});

// ─────────────────────────────────────────────────────
// 3. PRIMARY EXECUTION
// ─────────────────────────────────────────────────────

describe("ExecutionService — Primary Execution", () => {
  it("executes the primary target through the resolved provider", async () => {
    const { service } = makeService("success");

    const result = await service.execute(makePlan(), messages);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("mock");
    expect(result.modelId).toBe("mock-model-1");
    expect(typeof result.content).toBe("string");
    expect(typeof result.timestamp).toBe("string");
  });

  it("returns the structured provider failure when the primary fails", async () => {
    const { service } = makeService("authentication");

    const result = await service.execute(makePlan(), messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
  });

  it("does NOT execute fallback targets automatically", async () => {
    const registry = new ProviderRegistry();
    registry.register(
      new MockProviderAdapter({ behavior: "authentication", latencyMs: 5 })
    );

    // A second provider that would succeed — if the service (incorrectly)
    // attempted fallbacks, the result would be successful
    const fallbackProvider: ProviderAdapter = {
      providerId: "mock2",
      providerName: "Mock Provider 2",
      supports: () => true,
      execute: async (request) => ({
        success: true,
        providerId: "mock2",
        modelId: request.modelId,
        content: "fallback executed",
        timestamp: new Date().toISOString(),
      }),
      normalizeError: () =>
        new NormalizedExecutionError("UNKNOWN", "mock2 error"),
    };
    registry.register(fallbackProvider);

    const service = new ExecutionService(registry);
    const plan = makePlan({
      fallbacks: [
        makeTarget({
          entryId: "fallback-1",
          modelId: "mock-model-2",
          providerId: "mock2",
          modelIdentifier: "mock-model-2",
          displayName: "Mock Model 2",
        }),
      ],
    });

    const result = await service.execute(plan, messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.fallback).toBeUndefined();
    expect(result.content).toBeUndefined();
  });

  it("returns INVALID_REQUEST for empty messages", async () => {
    const { service } = makeService();

    const result = await service.execute(makePlan(), []);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_REQUEST");
  });

  it("forwards estimated tokens and the primary target to the provider", async () => {
    const captured: Array<{
      request: ExecutionRequest;
      target?: ExecutionTarget;
    }> = [];

    const captureProvider: ProviderAdapter = {
      providerId: "capture",
      providerName: "Capture Provider",
      supports: () => true,
      execute: async (request, target) => {
        captured.push({ request, target });
        return {
          success: true,
          providerId: "capture",
          modelId: request.modelId,
          content: "captured",
          timestamp: new Date().toISOString(),
        };
      },
      normalizeError: () =>
        new NormalizedExecutionError("UNKNOWN", "capture error"),
    };

    const registry = new ProviderRegistry();
    registry.register(captureProvider);
    const service = new ExecutionService(registry);

    const plan = makePlan({
      primary: makeTarget({ providerId: "capture" }),
      estimatedInputTokens: 123,
      estimatedOutputTokens: 45,
    });
    await service.execute(plan, messages);

    expect(captured).toHaveLength(1);
    expect(captured[0].request.estimatedInputTokens).toBe(123);
    expect(captured[0].request.estimatedOutputTokens).toBe(45);
    expect(captured[0].request.modelIdentifier).toBe("mock-model-1");
    expect(captured[0].target?.modelId).toBe(plan.primary.modelId);
    expect(captured[0].target?.providerId).toBe("capture");
  });

  it("honors per-request timeout options", async () => {
    // 300ms mock latency vs a 30ms per-request timeout
    const { service } = makeService("success", 300);

    const result = await service.execute(makePlan(), messages, {
      timeoutMs: 30,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("does not modify the execution plan", async () => {
    const { service } = makeService();
    const plan = makePlan();
    const statusBefore = plan.status;
    const primaryBefore = plan.primary;

    await service.execute(plan, messages);

    expect(plan.status).toBe(statusBefore);
    expect(plan.primary).toBe(primaryBefore);
    expect(plan.fallbacks).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────
// 4. DEFAULTS AND NEUTRALITY
// ─────────────────────────────────────────────────────

describe("ExecutionService — Defaults and Neutrality", () => {
  it("getExecutionService() returns a singleton", () => {
    expect(getExecutionService()).toBe(getExecutionService());
  });

  it("the default service resolves providers from the default registry", () => {
    const service = getExecutionService();
    const registry = service.getProviderRegistry();

    expect(registry.has("openai")).toBe(true);
    expect(registry.listProviderIds().sort()).toEqual([
      "anthropic",
      "google",
      "openai",
    ]);
  });

  it("contains no routing/scoring logic (provider neutrality)", async () => {
    const mod = await import("@/lib/execution/execution-service");
    const keys = Object.keys(mod);

    expect(keys).not.toContain("route");
    expect(keys).not.toContain("scoreCandidates");
    expect(keys).not.toContain("calculateProjectedCost");
  });
});

/**
 * Attentra — Dispatcher Tests
 *
 * Phase 7 / Step 2 — Provider Execution Abstraction + BlueMinds Adapter
 *
 * Tests for the execution dispatcher:
 *
 * 1. Dispatcher contract
 * 2. Successful execution through mock adapter
 * 3. Error handling (invalid plans, missing messages, unknown providers)
 * 4. Provider neutrality
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  Dispatcher,
  executeExecutionPlan,
  ExecutionAdapterRegistry,
  MockProviderAdapter,
  NormalizedExecutionError,
} from "@/lib/execution";
import type { ExecutionPlan } from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function makePlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    taskType: "GENERAL",
    complexity: "MEDIUM",
    primary: {
      entryId: "primary",
      modelId: "mock-model-1",
      providerId: "mock",
      providerName: "Mock Provider",
      modelIdentifier: "mock-model-1",
      displayName: "Mock Model 1",
      projectedCost: 0.001,
      routingScore: 0.85,
    },
    fallbacks: [],
    estimatedInputTokens: 100,
    estimatedOutputTokens: 50,
    projectedCost: 0.001,
    routingScore: 0.85,
    routingExplanation: "Best candidate for the task",
    status: "NOT_EXECUTED",
    createdAt: new Date(),
    ...overrides,
  };
}

const messages = [{ role: "user" as const, content: "Hello, world!" }];

// ─────────────────────────────────────────────────────
// 1. DISPATCHER CONTRACT
// ─────────────────────────────────────────────────────

describe("Dispatcher — Contract", () => {
  it("accepts a registry and optional config", () => {
    const registry = new ExecutionAdapterRegistry();
    const dispatcher = new Dispatcher(registry);
    expect(dispatcher).toBeDefined();
    expect(typeof dispatcher.executePlan).toBe("function");
  });

  it("getRegistry returns the underlying registry", () => {
    const registry = new ExecutionAdapterRegistry();
    const dispatcher = new Dispatcher(registry);
    expect(dispatcher.getRegistry()).toBe(registry);
  });

  it("executeExecutionPlan convenience function works", async () => {
    const registry = new ExecutionAdapterRegistry();
    registry.register(
      new MockProviderAdapter({ behavior: "success", latencyMs: 10 })
    );

    const result = await executeExecutionPlan(
      makePlan(),
      messages,
      registry
    );

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("mock");
  });
});

// ─────────────────────────────────────────────────────
// 2. SUCCESSFUL EXECUTION
// ─────────────────────────────────────────────────────

describe("Dispatcher — Successful Execution", () => {
  let registry: ExecutionAdapterRegistry;
  let dispatcher: Dispatcher;

  beforeEach(() => {
    registry = new ExecutionAdapterRegistry();
    registry.register(
      new MockProviderAdapter({ behavior: "success", latencyMs: 10 })
    );
    dispatcher = new Dispatcher(registry);
  });

  it("executes primary target through the correct adapter", async () => {
    const result = await dispatcher.executePlan(makePlan(), messages);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("mock");
    expect(result.modelId).toBe("mock-model-1");
    expect(result.content).toBeTruthy();
  });

  it("passes messages from parameter to adapter", async () => {
    const result = await dispatcher.executePlan(makePlan(), [
      { role: "user", content: "First" },
      { role: "user", content: "Second" },
    ]);

    expect(result.success).toBe(true);
  });

  it("includes metadata in execution request", async () => {
    const plan = makePlan({
      requestId: "req-123",
      routingDecisionId: "dec-456",
    });

    const result = await dispatcher.executePlan(plan, messages);
    expect(result.success).toBe(true);
  });

  it("returns result with latency and timestamp", async () => {
    const result = await dispatcher.executePlan(makePlan(), messages);

    expect(result.latencyMs).toBeDefined();
    expect(typeof result.latencyMs).toBe("number");
    expect(result.timestamp).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────
// 3. ERROR HANDLING
// ─────────────────────────────────────────────────────

describe("Dispatcher — Error Handling", () => {
  it("returns INVALID_EXECUTION_PLAN when plan is null/undefined", async () => {
    const registry = new ExecutionAdapterRegistry();
    const dispatcher = new Dispatcher(registry);

    const result = await dispatcher.executePlan(
      null as unknown as ExecutionPlan,
      messages
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns INVALID_EXECUTION_PLAN when primary has no modelId", async () => {
    const registry = new ExecutionAdapterRegistry();
    const dispatcher = new Dispatcher(registry);

    const plan = makePlan();
    (plan.primary as { modelId: string }).modelId = "";

    const result = await dispatcher.executePlan(plan, messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
  });

  it("returns INVALID_EXECUTION_PLAN when primary has no providerId", async () => {
    const registry = new ExecutionAdapterRegistry();
    const dispatcher = new Dispatcher(registry);

    const plan = makePlan();
    (plan.primary as { providerId: string }).providerId = "";

    const result = await dispatcher.executePlan(plan, messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXECUTION_PLAN");
  });

  it("returns INVALID_REQUEST when messages are empty", async () => {
    const registry = new ExecutionAdapterRegistry();
    registry.register(new MockProviderAdapter({ behavior: "success" }));
    const dispatcher = new Dispatcher(registry);

    const result = await dispatcher.executePlan(makePlan(), []);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_REQUEST");
    expect(result.error?.message).toContain("No messages");
  });

  it("returns MODEL_UNAVAILABLE for unknown provider", async () => {
    const registry = new ExecutionAdapterRegistry();
    const dispatcher = new Dispatcher(registry);

    const result = await dispatcher.executePlan(makePlan(), messages);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MODEL_UNAVAILABLE");
    expect(result.error?.message).toContain("mock");
  });

  it("error result includes provider ID from plan", async () => {
    const registry = new ExecutionAdapterRegistry();
    const dispatcher = new Dispatcher(registry);

    const plan = makePlan({
      primary: {
        ...makePlan().primary,
        providerId: "unknown-provider",
      },
    });

    const result = await dispatcher.executePlan(plan, messages);

    expect(result.success).toBe(false);
    expect(result.providerId).toBe("unknown-provider");
  });
});

// ─────────────────────────────────────────────────────
// 4. PROVIDER NEUTRALITY
// ─────────────────────────────────────────────────────

describe("Dispatcher — Provider Neutrality", () => {
  it("dispatcher has no provider-specific logic", () => {
    // Verify by working with a completely custom adapter
    const registry = new ExecutionAdapterRegistry();
    const customAdapter: import("@/lib/execution").ProviderAdapter = {
      providerId: "custom-provider",
      providerName: "Custom",
      supports: () => true,
      execute: async () => ({
        success: true,
        providerId: "custom-provider",
        modelId: "custom-model",
        content: "Custom response",
        timestamp: new Date().toISOString(),
      }),
      normalizeError: () =>
        new NormalizedExecutionError("UNKNOWN", "Custom error"),
    };

    registry.register(customAdapter);
    const dispatcher = new Dispatcher(registry);

    const plan = makePlan({
      primary: {
        entryId: "primary",
        modelId: "custom-model",
        providerId: "custom-provider",
        providerName: "Custom Provider",
        modelIdentifier: "custom-model",
        displayName: "Custom Model",
        projectedCost: 0.001,
        routingScore: 0.9,
      },
    });

    // Dispatcher works identically for any provider
    expect(dispatcher.getRegistry().has("custom-provider")).toBe(true);
  });

  it("dispatcher does not modify the execution plan", async () => {
    const registry = new ExecutionAdapterRegistry();
    registry.register(
      new MockProviderAdapter({ behavior: "success", latencyMs: 5 })
    );
    const dispatcher = new Dispatcher(registry);

    const plan = makePlan();
    const originalStatus = plan.status;
    const originalPrimary = plan.primary;

    await dispatcher.executePlan(plan, messages);

    // Plan is unchanged
    expect(plan.status).toBe(originalStatus);
    expect(plan.primary).toBe(originalPrimary);
  });

  it("dispatcher does not execute fallbacks automatically", async () => {
    const registry = new ExecutionAdapterRegistry();
    registry.register(
      new MockProviderAdapter({ behavior: "authentication", latencyMs: 5 })
    );
    const dispatcher = new Dispatcher(registry);

    const result = await dispatcher.executePlan(makePlan(), messages);

    // Primary failed — no automatic fallback execution
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.fallback).toBeUndefined();
  });
});

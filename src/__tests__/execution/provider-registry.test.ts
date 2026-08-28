/**
 * Attentra — Provider Registry Tests
 *
 * Phase 7 / Step 3 — Production Provider Execution
 *
 * Tests for the providerId → ExecutionProvider registry:
 *
 * 1. Registration and resolution
 * 2. Structured errors for unknown providers
 * 3. Default registry composition
 * 4. Singleton behavior
 * 5. ExecutionProvider contract satisfaction
 * 6. Provider neutrality (no routing logic)
 */

import { describe, it, expect } from "vitest";
import {
  ProviderRegistry,
  createDefaultProviderRegistry,
  getProviderRegistry,
  createBlueMindsAdapter,
  createOpenAIAdapter,
  NormalizedExecutionError,
  BLUEMINDS_PROVIDER_ID,
  type ExecutionProvider,
} from "@/lib/execution";

// ─────────────────────────────────────────────────────
// 1. REGISTRATION AND RESOLUTION
// ─────────────────────────────────────────────────────

describe("Provider Registry — Registration and Resolution", () => {
  it("registers and resolves an ExecutionProvider by providerId", () => {
    const registry = new ProviderRegistry();
    const provider = createBlueMindsAdapter({ apiKey: "test-key" });
    registry.register(provider);

    expect(registry.resolve("blueminds")).toBe(provider);
  });

  it("resolve() throws a structured error for unknown providers", () => {
    const registry = new ProviderRegistry();

    expect(() => registry.resolve("nonexistent")).toThrow(
      NormalizedExecutionError
    );

    try {
      registry.resolve("nonexistent");
    } catch (error) {
      const normalized = error as NormalizedExecutionError;
      expect(normalized.code).toBe("MODEL_UNAVAILABLE");
      expect(normalized.retryable).toBe(false);
    }
  });

  it("rejects duplicate registration with a structured error", () => {
    const registry = new ProviderRegistry();
    registry.register(createBlueMindsAdapter());

    expect(() => registry.register(createBlueMindsAdapter())).toThrow(
      NormalizedExecutionError
    );
  });

  it("has() reflects registration state", () => {
    const registry = new ProviderRegistry();

    expect(registry.has("blueminds")).toBe(false);

    registry.register(createBlueMindsAdapter());

    expect(registry.has("blueminds")).toBe(true);
  });

  it("unregister() removes a provider", () => {
    const registry = new ProviderRegistry();
    registry.register(createBlueMindsAdapter());

    expect(registry.unregister("blueminds")).toBe(true);
    expect(registry.has("blueminds")).toBe(false);
    expect(registry.unregister("blueminds")).toBe(false);
  });

  it("listProviderIds() and listProviders() expose registrations", () => {
    const registry = new ProviderRegistry();
    registry.register(createBlueMindsAdapter());

    expect(registry.listProviderIds()).toContain("blueminds");
    expect(registry.listProviders()).toHaveLength(1);
    expect(registry.listProviders()[0].providerId).toBe("blueminds");
  });
});

// ─────────────────────────────────────────────────────
// 2. DEFAULT REGISTRY
// ─────────────────────────────────────────────────────

describe("Provider Registry — Default Registry", () => {
  it("resolves blueminds → BlueMinds execution provider", () => {
    const registry = createDefaultProviderRegistry();
    const provider = registry.resolve("blueminds");

    expect(provider.providerId).toBe(BLUEMINDS_PROVIDER_ID);
    expect(provider.providerName).toBe("BlueMinds");
    expect(typeof provider.execute).toBe("function");
    expect(typeof provider.supports).toBe("function");
  });

  it("includes the existing Step 1 provider adapters", () => {
    const ids = createDefaultProviderRegistry().listProviderIds().sort();

    expect(ids).toEqual(["anthropic", "blueminds", "google", "openai"]);
  });

  it("resolves every registered provider without error", () => {
    const registry = createDefaultProviderRegistry();

    for (const id of registry.listProviderIds()) {
      const provider = registry.resolve(id);
      expect(provider.providerId).toBe(id);
    }
  });

  it("getProviderRegistry() returns a singleton", () => {
    expect(getProviderRegistry()).toBe(getProviderRegistry());
  });
});

// ─────────────────────────────────────────────────────
// 3. EXECUTION PROVIDER CONTRACT
// ─────────────────────────────────────────────────────

describe("Provider Registry — ExecutionProvider Contract", () => {
  it("existing adapters satisfy the ExecutionProvider contract", () => {
    const blueMinds: ExecutionProvider = createBlueMindsAdapter();
    const openAI: ExecutionProvider = createOpenAIAdapter();

    for (const provider of [blueMinds, openAI]) {
      expect(typeof provider.providerId).toBe("string");
      expect(typeof provider.providerName).toBe("string");
      expect(typeof provider.supports).toBe("function");
      expect(typeof provider.execute).toBe("function");
      expect(typeof provider.normalizeError).toBe("function");
    }
  });

  it("custom providers can implement ExecutionProvider", () => {
    const custom: ExecutionProvider = {
      providerId: "custom",
      providerName: "Custom Provider",
      supports: () => true,
      execute: async (request) => ({
        success: true,
        providerId: "custom",
        modelId: request.modelId,
        content: "ok",
        timestamp: new Date().toISOString(),
      }),
      normalizeError: () =>
        new NormalizedExecutionError("UNKNOWN", "custom error"),
    };

    const registry = new ProviderRegistry();
    registry.register(custom);

    expect(registry.resolve("custom")).toBe(custom);
  });
});

// ─────────────────────────────────────────────────────
// 4. PROVIDER NEUTRALITY
// ─────────────────────────────────────────────────────

describe("Provider Registry — Provider Neutrality", () => {
  it("registry module contains no routing/scoring/pricing logic", async () => {
    const mod = await import("@/lib/execution/provider-registry");
    const keys = Object.keys(mod);

    expect(keys).not.toContain("route");
    expect(keys).not.toContain("scoreCandidates");
    expect(keys).not.toContain("calculateProjectedCost");
    expect(keys).not.toContain("PricingSnapshot");
  });

  it("registry exposes no model catalog (model selection stays in routing)", () => {
    const registry = createDefaultProviderRegistry();

    // Only providerId-level APIs exist — no model listing or model routing
    const api = registry as unknown as Record<string, unknown>;
    expect(typeof registry.resolve).toBe("function");
    expect(typeof registry.listProviderIds).toBe("function");
    expect(api.listModels).toBeUndefined();
    expect(api.selectModel).toBeUndefined();
  });
});

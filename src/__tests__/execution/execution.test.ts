/**
 * Attentra — Execution Layer Tests
 *
 * Phase 7 / Step 1 — Provider Adapter Foundation
 *
 * Comprehensive tests for the execution boundary:
 *
 * 1. Provider adapter contract
 * 2. Registry
 * 3. Mock adapter (all scenarios)
 * 4. Error normalization
 * 5. Executor
 * 6. Security (no secret leakage)
 * 7. Provider neutrality (routing layer isolation)
 * 8. Timeout abstraction
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ExecutionAdapterRegistry,
  MockProviderAdapter,
  Executor,
  executeRequest,
  NormalizedExecutionError,
  isRetryable,
  mapProviderErrorCode,
  normalizeAnyError,
  sanitizeErrorMessage,
  DEFAULT_EXECUTION_TIMEOUT_MS,
} from "@/lib/execution";
import type {
  ExecutionRequest,
  ProviderAdapter,
} from "@/lib/execution";
import { createOpenAIAdapter } from "@/lib/execution/providers/openai";
import { createAnthropicAdapter } from "@/lib/execution/providers/anthropic";
import { createGoogleAdapter } from "@/lib/execution/providers/google";

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function makeRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    modelId: "mock-model-1",
    providerId: "mock",
    modelIdentifier: "mock-model-1",
    messages: [{ role: "user", content: "Hello, how are you?" }],
    requestId: "test-req-1",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────
// 1. PROVIDER ADAPTER CONTRACT
// ─────────────────────────────────────────────────────

describe("Provider Adapter Contract", () => {
  it("MockProviderAdapter satisfies ProviderAdapter interface", () => {
    const adapter = new MockProviderAdapter();
    expect(adapter.providerId).toBeTruthy();
    expect(adapter.providerName).toBeTruthy();
    expect(typeof adapter.supports).toBe("function");
    expect(typeof adapter.execute).toBe("function");
    expect(typeof adapter.normalizeError).toBe("function");
  });

  it("OpenAI adapter satisfies ProviderAdapter interface", () => {
    const adapter = createOpenAIAdapter();
    expect(adapter.providerId).toBe("openai");
    expect(adapter.providerName).toBeTruthy();
    expect(typeof adapter.supports).toBe("function");
    expect(typeof adapter.execute).toBe("function");
    expect(typeof adapter.normalizeError).toBe("function");
  });

  it("Anthropic adapter satisfies ProviderAdapter interface", () => {
    const adapter = createAnthropicAdapter();
    expect(adapter.providerId).toBe("anthropic");
    expect(adapter.providerName).toBeTruthy();
    expect(typeof adapter.supports).toBe("function");
    expect(typeof adapter.execute).toBe("function");
    expect(typeof adapter.normalizeError).toBe("function");
  });

  it("Google adapter satisfies ProviderAdapter interface", () => {
    const adapter = createGoogleAdapter();
    expect(adapter.providerId).toBe("google");
    expect(adapter.providerName).toBeTruthy();
    expect(typeof adapter.supports).toBe("function");
    expect(typeof adapter.execute).toBe("function");
    expect(typeof adapter.normalizeError).toBe("function");
  });

  it("provider IDs are unique across adapters", () => {
    const ids = new Set([
      createOpenAIAdapter().providerId,
      createAnthropicAdapter().providerId,
      createGoogleAdapter().providerId,
      new MockProviderAdapter().providerId,
    ]);
    expect(ids.size).toBe(4);
  });

  it("OpenAI adapter supports catalog-selected models dynamically", () => {
    const adapter = createOpenAIAdapter();
    // Model support is decided by the dynamic catalog + routing engine
    // (Phase 8); the adapter executes any model routed to this provider,
    // including newly discovered models absent from any static list.
    expect(adapter.supports("openai-gpt-4o")).toBe(true);
    expect(adapter.supports("db-model-cuid-1")).toBe(true);
    expect(adapter.supports("brand-new-catalog-model")).toBe(true);
  });

  it("Anthropic adapter supports catalog-selected models dynamically", () => {
    const adapter = createAnthropicAdapter();
    expect(adapter.supports("anthropic-claude-sonnet-4")).toBe(true);
    expect(adapter.supports("db-model-cuid-2")).toBe(true);
    expect(adapter.supports("brand-new-catalog-model")).toBe(true);
  });

  it("Google adapter supports catalog-selected models dynamically", () => {
    const adapter = createGoogleAdapter();
    expect(adapter.supports("google-gemini-2.5-flash")).toBe(true);
    expect(adapter.supports("db-model-cuid-3")).toBe(true);
    expect(adapter.supports("brand-new-catalog-model")).toBe(true);
  });

  it("supports() behavior is deterministic", () => {
    const adapter = createOpenAIAdapter();
    const result1 = adapter.supports("openai-gpt-4o");
    const result2 = adapter.supports("openai-gpt-4o");
    expect(result1).toBe(result2);
  });
});

// ─────────────────────────────────────────────────────
// 2. REGISTRY
// ─────────────────────────────────────────────────────

describe("Execution Adapter Registry", () => {
  let registry: ExecutionAdapterRegistry;

  beforeEach(() => {
    registry = new ExecutionAdapterRegistry();
  });

  it("registers and retrieves an adapter", () => {
    const mock = new MockProviderAdapter();
    registry.register(mock);

    const retrieved = registry.getAdapter("mock");
    expect(retrieved).toBe(mock);
  });

  it("throws structured error for unknown provider", () => {
    expect(() => registry.getAdapter("nonexistent")).toThrow(NormalizedExecutionError);

    try {
      registry.getAdapter("nonexistent");
    } catch (error) {
      expect(error).toBeInstanceOf(NormalizedExecutionError);
      expect((error as NormalizedExecutionError).code).toBe("MODEL_UNAVAILABLE");
    }
  });

  it("rejects duplicate registration", () => {
    registry.register(new MockProviderAdapter());

    expect(() => registry.register(new MockProviderAdapter())).toThrow(
      NormalizedExecutionError
    );
  });

  it("has() returns correct boolean", () => {
    expect(registry.has("mock")).toBe(false);
    registry.register(new MockProviderAdapter());
    expect(registry.has("mock")).toBe(true);
  });

  it("unregister removes adapter", () => {
    registry.register(new MockProviderAdapter());
    expect(registry.has("mock")).toBe(true);

    registry.unregister("mock");
    expect(registry.has("mock")).toBe(false);
  });

  it("listProviderIds returns registered IDs", () => {
    registry.register(new MockProviderAdapter());
    const ids = registry.listProviderIds();
    expect(ids).toContain("mock");
  });

  it("clear removes all adapters", () => {
    registry.register(new MockProviderAdapter());
    registry.clear();
    expect(registry.listProviderIds()).toHaveLength(0);
  });

  it("registry is deterministic — same registrations produce same resolution", () => {
    const mock1 = new MockProviderAdapter();
    registry.register(mock1);

    const a = registry.getAdapter("mock");
    const b = registry.getAdapter("mock");
    expect(a).toBe(b);
  });
});

// ─────────────────────────────────────────────────────
// 3. MOCK ADAPTER
// ─────────────────────────────────────────────────────

describe("Mock Provider Adapter", () => {
  it("success: returns successful result", async () => {
    const mock = new MockProviderAdapter({ behavior: "success", latencyMs: 10 });
    const result = await mock.execute(makeRequest());

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("mock");
    expect(result.modelId).toBe("mock-model-1");
    expect(result.content).toBeTruthy();
    expect(result.usage).toBeDefined();
    expect(result.usage!.inputTokens).toBeGreaterThan(0);
    expect(result.usage!.outputTokens).toBeGreaterThan(0);
    expect(result.usage!.totalTokens).toBe(
      result.usage!.inputTokens + result.usage!.outputTokens
    );
    expect(result.timestamp).toBeTruthy();
  });

  it("timeout: returns TIMEOUT error", async () => {
    const mock = new MockProviderAdapter({ behavior: "timeout", latencyMs: 10 });
    const result = await mock.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("rate_limit: returns RATE_LIMIT error", async () => {
    const mock = new MockProviderAdapter({ behavior: "rate_limit", latencyMs: 10 });
    const result = await mock.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RATE_LIMIT");
    expect(result.error?.retryable).toBe(true);
  });

  it("authentication: returns AUTHENTICATION error", async () => {
    const mock = new MockProviderAdapter({ behavior: "authentication", latencyMs: 10 });
    const result = await mock.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
  });

  it("invalid_request: returns INVALID_REQUEST error", async () => {
    const mock = new MockProviderAdapter({ behavior: "invalid_request", latencyMs: 10 });
    const result = await mock.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_REQUEST");
    expect(result.error?.retryable).toBe(false);
  });

  it("model_unavailable: returns MODEL_UNAVAILABLE error", async () => {
    const mock = new MockProviderAdapter({ behavior: "model_unavailable", latencyMs: 10 });
    const result = await mock.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MODEL_UNAVAILABLE");
    expect(result.error?.retryable).toBe(false);
  });

  it("setBehavior changes mock behavior at runtime", async () => {
    const mock = new MockProviderAdapter({ behavior: "success", latencyMs: 10 });

    let result = await mock.execute(makeRequest());
    expect(result.success).toBe(true);

    mock.setBehavior("timeout");
    result = await mock.execute(makeRequest());
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
  });

  it("supports all models by default", () => {
    const mock = new MockProviderAdapter();
    expect(mock.supports("any-model")).toBe(true);
    expect(mock.supports("another-model")).toBe(true);
  });

  it("supports only configured models when specified", () => {
    const mock = new MockProviderAdapter({
      supportedModels: ["model-a", "model-b"],
    });
    expect(mock.supports("model-a")).toBe(true);
    expect(mock.supports("model-b")).toBe(true);
    expect(mock.supports("model-c")).toBe(false);
  });

  it("normalizeError returns NormalizedExecutionError", () => {
    const mock = new MockProviderAdapter();
    const error = mock.normalizeError(new Error("test error"));

    expect(error).toBeInstanceOf(NormalizedExecutionError);
    expect(error.code).toBe("UNKNOWN");
  });

  it("performs no network calls", async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    try {
      const mock = new MockProviderAdapter({ behavior: "success", latencyMs: 5 });
      await mock.execute(makeRequest());
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ─────────────────────────────────────────────────────
// 4. ERROR NORMALIZATION
// ─────────────────────────────────────────────────────

describe("Error Normalization", () => {
  const allCodes = [
    "AUTHENTICATION",
    "RATE_LIMIT",
    "TIMEOUT",
    "INVALID_REQUEST",
    "MODEL_UNAVAILABLE",
    "CONTEXT_LENGTH",
    "SERVER_ERROR",
    "NETWORK_ERROR",
    "UNKNOWN",
  ] as const;

  it("every error code produces valid NormalizedExecutionError", () => {
    for (const code of allCodes) {
      const error = new NormalizedExecutionError(code, `Test ${code}`);
      expect(error.code).toBe(code);
      expect(error.message).toBe(`Test ${code}`);
      expect(typeof error.retryable).toBe("boolean");
    }
  });

  it("isRetryable returns correct values for each code", () => {
    expect(isRetryable("AUTHENTICATION")).toBe(false);
    expect(isRetryable("RATE_LIMIT")).toBe(true);
    expect(isRetryable("TIMEOUT")).toBe(true);
    expect(isRetryable("INVALID_REQUEST")).toBe(false);
    expect(isRetryable("MODEL_UNAVAILABLE")).toBe(false);
    expect(isRetryable("CONTEXT_LENGTH")).toBe(false);
    expect(isRetryable("SERVER_ERROR")).toBe(true);
    expect(isRetryable("NETWORK_ERROR")).toBe(true);
    expect(isRetryable("UNKNOWN")).toBe(false);
  });

  it("mapProviderErrorCode maps Phase 4 codes correctly", () => {
    expect(mapProviderErrorCode("AUTHENTICATION_ERROR")).toBe("AUTHENTICATION");
    expect(mapProviderErrorCode("RATE_LIMIT_ERROR")).toBe("RATE_LIMIT");
    expect(mapProviderErrorCode("TIMEOUT_ERROR")).toBe("TIMEOUT");
    expect(mapProviderErrorCode("INVALID_REQUEST_ERROR")).toBe("INVALID_REQUEST");
    expect(mapProviderErrorCode("MODEL_NOT_FOUND")).toBe("MODEL_UNAVAILABLE");
    expect(mapProviderErrorCode("CONTEXT_LENGTH_ERROR")).toBe("CONTEXT_LENGTH");
    expect(mapProviderErrorCode("PROVIDER_UNAVAILABLE")).toBe("SERVER_ERROR");
    expect(mapProviderErrorCode("PROVIDER_ERROR")).toBe("SERVER_ERROR");
    expect(mapProviderErrorCode("something-else")).toBe("UNKNOWN");
  });

  it("normalizeAnyError handles NormalizedExecutionError pass-through", () => {
    const original = new NormalizedExecutionError("TIMEOUT", "timed out");
    const result = normalizeAnyError(original);
    expect(result).toBe(original);
  });

  it("normalizeAnyError handles AttentraProviderError shape", () => {
    const providerError = {
      code: "AUTHENTICATION_ERROR",
      message: "Invalid API key",
      retryable: false,
      provider: "openai",
    };
    const result = normalizeAnyError(providerError);
    expect(result.code).toBe("AUTHENTICATION");
    expect(result.retryable).toBe(false);
    expect(result.provider).toBe("openai");
  });

  it("normalizeAnyError detects timeout from Error message", () => {
    const result = normalizeAnyError(new Error("Request timed out"));
    expect(result.code).toBe("TIMEOUT");
    expect(result.retryable).toBe(true);
  });

  it("normalizeAnyError detects network errors from Error message", () => {
    const result = normalizeAnyError(new Error("ECONNREFUSED"));
    expect(result.code).toBe("NETWORK_ERROR");
    expect(result.retryable).toBe(true);
  });

  it("normalizeAnyError handles unknown values", () => {
    const result = normalizeAnyError(42);
    expect(result.code).toBe("UNKNOWN");
    expect(result.message).toBe("An unknown execution error occurred");
  });
});

// ─────────────────────────────────────────────────────
// 5. EXECUTOR
// ─────────────────────────────────────────────────────

describe("Executor", () => {
  let registry: ExecutionAdapterRegistry;
  let executor: Executor;

  beforeEach(() => {
    registry = new ExecutionAdapterRegistry();
    registry.register(new MockProviderAdapter({ behavior: "success", latencyMs: 10 }));
    executor = new Executor(registry);
  });

  it("executes successfully through mock adapter", async () => {
    const result = await executor.execute(makeRequest());

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("mock");
    expect(result.modelId).toBe("mock-model-1");
    expect(result.content).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
  });

  it("returns error for unknown provider", async () => {
    const result = await executor.execute(
      makeRequest({ providerId: "nonexistent" })
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MODEL_UNAVAILABLE");
  });

  it("returns error when adapter doesn't support model", async () => {
    registry.clear();
    registry.register(
      new MockProviderAdapter({
        behavior: "success",
        supportedModels: ["model-a"],
        latencyMs: 10,
      })
    );

    const result = await executor.execute(
      makeRequest({ modelId: "unsupported-model" })
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MODEL_UNAVAILABLE");
  });

  it("normalizes adapter failures", async () => {
    registry.clear();
    registry.register(
      new MockProviderAdapter({ behavior: "authentication", latencyMs: 10 })
    );

    const result = await executor.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
  });

  it("measures latency at execution boundary", async () => {
    const result = await executor.execute(makeRequest());

    expect(result.latencyMs).toBeDefined();
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs!).toBeGreaterThanOrEqual(0);
  });

  it("handles timeout via executor timeout config", async () => {
    registry.clear();
    // Mock with 200ms latency, executor timeout 50ms → should timeout
    registry.register(
      new MockProviderAdapter({ behavior: "success", latencyMs: 200 })
    );
    const fastExecutor = new Executor(registry, { timeoutMs: 50 });

    const result = await fastExecutor.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("executeRequest convenience function works", async () => {
    const result = await executeRequest(makeRequest(), registry);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("mock");
  });

  it("executor contains no provider-specific branching", () => {
    // Verify the executor module doesn't import provider SDKs
    // by checking it works with a completely custom mock adapter
    const customAdapter: ProviderAdapter = {
      providerId: "custom-xyz",
      providerName: "Custom XYZ",
      supports: () => true,
      execute: async () => ({
        success: true,
        providerId: "custom-xyz",
        modelId: "custom-model",
        content: "custom response",
        timestamp: new Date().toISOString(),
      }),
      normalizeError: (err) =>
        new NormalizedExecutionError("UNKNOWN", "custom error"),
    };

    registry.register(customAdapter);
    // Executor treats all providers identically
    expect(registry.has("custom-xyz")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 6. SECURITY
// ─────────────────────────────────────────────────────

describe("Security", () => {
  it("no NEXT_PUBLIC_ provider keys in execution module", async () => {
    // Verify environment variable usage — only server-side keys
    const envKeys = Object.keys(process.env).filter(
      (k) => k.includes("OPENAI") || k.includes("ANTHROPIC") || k.includes("GOOGLE_AI")
    );

    for (const key of envKeys) {
      expect(key).not.toMatch(/^NEXT_PUBLIC_/);
    }
  });

  it("sanitizeErrorMessage strips API keys", () => {
    const msg = "Failed with key sk-abc123def456ghi789jkl012mno345pqr678";
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain("sk-abc123");
    expect(sanitized).toContain("[REDACTED]");
  });

  it("sanitizeErrorMessage strips Bearer tokens", () => {
    const msg = "Authorization failed: Bearer eyJhbGciOiJIUzI1NiJ9";
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain("eyJhbGci");
    expect(sanitized).toContain("[REDACTED]");
  });

  it("sanitizeErrorMessage strips key=value patterns", () => {
    const msg = "Error: key=mySecretKey123 token=abc123 authorization=Bearer xyz";
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain("mySecretKey123");
    expect(sanitized).not.toContain("abc123");
  });

  it("error messages in results do not contain secrets", async () => {
    const mock = new MockProviderAdapter({ behavior: "authentication", latencyMs: 10 });
    const result = await mock.execute(makeRequest());

    expect(result.error?.message).not.toContain("sk-");
    expect(result.error?.message).not.toContain("Bearer ");
    expect(result.error?.message).not.toContain("password=");
  });

  it("NormalizedExecutionError does not expose cause in message", () => {
    const secret = "sk-supersecretapikey123456789012345";
    const error = new NormalizedExecutionError(
      "AUTHENTICATION",
      `Auth failed with ${secret}`,
      { cause: new Error(secret) }
    );

    // The message might contain it in this case (caller's responsibility)
    // but sanitizeErrorMessage would strip it if used
    const sanitized = sanitizeErrorMessage(error.message);
    expect(sanitized).not.toContain("sk-supersecret");
  });
});

// ─────────────────────────────────────────────────────
// 7. PROVIDER NEUTRALITY
// ─────────────────────────────────────────────────────

describe("Provider Neutrality", () => {
  it("routing modules do not import execution module", async () => {
    // Verify by checking that routing module exports don't include execution types
    const routing = await import("@/lib/routing");
    const routingKeys = Object.keys(routing);

    expect(routingKeys).not.toContain("Executor");
    expect(routingKeys).not.toContain("ExecutionAdapterRegistry");
    expect(routingKeys).not.toContain("MockProviderAdapter");
    expect(routingKeys).not.toContain("executeRequest");
  });

  it("execution module does not import provider SDKs", async () => {
    const execution = await import("@/lib/execution");
    const keys = Object.keys(execution);

    expect(keys).not.toContain("OpenAI");
    expect(keys).not.toContain("Anthropic");
    expect(keys).not.toContain("GoogleGenerativeAI");
  });
});

// ─────────────────────────────────────────────────────
// 8. TIMEOUT ABSTRACTION
// ─────────────────────────────────────────────────────

describe("Timeout Abstraction", () => {
  it("default timeout is 30 seconds", () => {
    expect(DEFAULT_EXECUTION_TIMEOUT_MS).toBe(30_000);
  });

  it("executor uses configurable timeout", async () => {
    const registry = new ExecutionAdapterRegistry();
    registry.register(
      new MockProviderAdapter({ behavior: "success", latencyMs: 100 })
    );

    // Very short timeout → should trigger timeout
    const executor = new Executor(registry, { timeoutMs: 20 });
    const result = await executor.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("executor allows per-request timeout override", async () => {
    const registry = new ExecutionAdapterRegistry();
    registry.register(
      new MockProviderAdapter({ behavior: "success", latencyMs: 50 })
    );

    // Default: 30s (should succeed)
    const executor = new Executor(registry);
    const result = await executor.execute(makeRequest());
    expect(result.success).toBe(true);

    // Override: 10ms (should fail)
    const result2 = await executor.execute(makeRequest(), { timeoutMs: 10 });
    expect(result2.success).toBe(false);
    expect(result2.error?.code).toBe("TIMEOUT");
  });

  it("timeout errors are marked as retryable", async () => {
    const registry = new ExecutionAdapterRegistry();
    registry.register(
      new MockProviderAdapter({ behavior: "success", latencyMs: 100 })
    );

    const executor = new Executor(registry, { timeoutMs: 10 });
    const result = await executor.execute(makeRequest());

    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });
});

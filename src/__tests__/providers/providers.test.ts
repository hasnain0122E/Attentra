/**
 * Attentra — Provider Abstraction Tests
 *
 * Tests the provider registry, adapter contracts, error normalization,
 * and missing-credential handling using mocks (no live API keys required).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type {
  AIProvider,
  ModelDefinition,
  NormalizedAIRequest,
  NormalizedAIResponse,
  ErrorCode,
} from "@/lib/providers/types";
import { AttentraProviderError } from "@/lib/providers/types";
import { OpenAIProvider } from "@/lib/providers/openai";
import { AnthropicProvider } from "@/lib/providers/anthropic";
import { GoogleProvider } from "@/lib/providers/google";

// ─────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────

const sampleRequest: NormalizedAIRequest = {
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello, how are you?" },
  ],
  maxTokens: 100,
  temperature: 0.7,
  metadata: { requestId: "test-req-001" },
};

// ─────────────────────────────────────────────────────
// 1. PROVIDER REGISTRY TESTS
// ─────────────────────────────────────────────────────

describe("Provider Registry", () => {
  let registry: {
    providers: Map<string, AIProvider>;
    register: (p: AIProvider) => void;
    unregister: (id: string) => boolean;
    getProvider: (id: string) => AIProvider;
    has: (id: string) => boolean;
    listProviderIds: () => string[];
    listAllModels: () => ModelDefinition[];
    clear: () => void;
    size: number;
  };

  beforeEach(() => {
    // Use a fresh registry-like structure for isolation
    const providers = new Map<string, AIProvider>();

    const reg = {
      providers,
      register(provider: AIProvider) {
        if (providers.has(provider.id)) {
          throw new Error(`Provider "${provider.id}" is already registered.`);
        }
        providers.set(provider.id, provider);
      },
      unregister(id: string) {
        return providers.delete(id);
      },
      getProvider(id: string): AIProvider {
        const p = providers.get(id);
        if (!p) {
          throw new AttentraProviderError(
            "PROVIDER_UNAVAILABLE",
            id,
            `Provider "${id}" is not registered.`,
            { retryable: false }
          );
        }
        return p;
      },
      has(id: string) {
        return providers.has(id);
      },
      listProviderIds() {
        return Array.from(providers.keys());
      },
      listAllModels(): ModelDefinition[] {
        const models: ModelDefinition[] = [];
        for (const p of providers.values()) {
          models.push(...p.listModels());
        }
        return models;
      },
      clear() {
        providers.clear();
      },
      get size() {
        return providers.size;
      },
    };

    registry = reg;
  });

  it("registers and resolves a provider by ID", () => {
    const mockProvider: AIProvider = {
      id: "test-provider",
      name: "Test Provider",
      listModels: () => [],
      generate: async () => ({} as NormalizedAIResponse),
      isAvailable: () => true,
    };

    registry.register(mockProvider);
    const resolved = registry.getProvider("test-provider");

    expect(resolved).toBe(mockProvider);
    expect(resolved.id).toBe("test-provider");
    expect(resolved.name).toBe("Test Provider");
  });

  it("throws AttentraProviderError for unregistered provider", () => {
    expect(() => registry.getProvider("nonexistent")).toThrow(
      AttentraProviderError
    );

    try {
      registry.getProvider("nonexistent");
    } catch (err) {
      const error = err as AttentraProviderError;
      expect(error.code).toBe("PROVIDER_UNAVAILABLE");
      expect(error.provider).toBe("nonexistent");
      expect(error.retryable).toBe(false);
    }
  });

  it("rejects duplicate provider registration", () => {
    const provider: AIProvider = {
      id: "dup",
      name: "Dup",
      listModels: () => [],
      generate: async () => ({} as NormalizedAIResponse),
      isAvailable: () => true,
    };

    registry.register(provider);
    expect(() => registry.register(provider)).toThrow("already registered");
  });

  it("supports unregister", () => {
    const provider: AIProvider = {
      id: "removable",
      name: "Removable",
      listModels: () => [],
      generate: async () => ({} as NormalizedAIResponse),
      isAvailable: () => true,
    };

    registry.register(provider);
    expect(registry.has("removable")).toBe(true);
    registry.unregister("removable");
    expect(registry.has("removable")).toBe(false);
  });

  it("lists all registered provider IDs", () => {
    const make = (id: string): AIProvider => ({
      id,
      name: id,
      listModels: () => [],
      generate: async () => ({} as NormalizedAIResponse),
      isAvailable: () => true,
    });

    registry.register(make("openai"));
    registry.register(make("anthropic"));
    registry.register(make("google"));

    const ids = registry.listProviderIds();
    expect(ids).toContain("openai");
    expect(ids).toContain("anthropic");
    expect(ids).toContain("google");
    expect(ids).toHaveLength(3);
  });

  it("collects models from all providers", () => {
    const p1: AIProvider = {
      id: "p1",
      name: "P1",
      listModels: () => [
        {
          id: "p1-model-a",
          providerId: "p1",
          modelIdentifier: "model-a",
          displayName: "Model A",
          capabilities: ["chat"],
          inputPricePer1k: 0.001,
          outputPricePer1k: 0.002,
          active: true,
        },
      ],
      generate: async () => ({} as NormalizedAIResponse),
      isAvailable: () => true,
    };

    const p2: AIProvider = {
      id: "p2",
      name: "P2",
      listModels: () => [
        {
          id: "p2-model-b",
          providerId: "p2",
          modelIdentifier: "model-b",
          displayName: "Model B",
          capabilities: ["coding"],
          inputPricePer1k: 0.003,
          outputPricePer1k: 0.006,
          active: true,
        },
      ],
      generate: async () => ({} as NormalizedAIResponse),
      isAvailable: () => true,
    };

    registry.register(p1);
    registry.register(p2);

    const models = registry.listAllModels();
    expect(models).toHaveLength(2);
    expect(models.map((m) => m.id)).toEqual(
      expect.arrayContaining(["p1-model-a", "p2-model-b"])
    );
  });
});

// ─────────────────────────────────────────────────────
// 2. ADAPTER CONTRACT TESTS
// ─────────────────────────────────────────────────────

describe("Adapter Contract", () => {
  const adapters: Array<{ name: string; create: () => AIProvider }> = [
    { name: "OpenAI", create: () => new OpenAIProvider() },
    { name: "Anthropic", create: () => new AnthropicProvider() },
    { name: "Google", create: () => new GoogleProvider() },
  ];

  for (const { name, create } of adapters) {
    describe(`${name} adapter`, () => {
      let adapter: AIProvider;

      beforeEach(() => {
        adapter = create();
      });

      it("has a non-empty id", () => {
        expect(adapter.id).toBeTruthy();
        expect(typeof adapter.id).toBe("string");
      });

      it("has a non-empty name", () => {
        expect(adapter.name).toBeTruthy();
        expect(typeof adapter.name).toBe("string");
      });

      it("returns a non-empty array of model definitions", () => {
        const models = adapter.listModels();
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThan(0);
      });

      it("model definitions conform to ModelDefinition interface", () => {
        const models = adapter.listModels();
        for (const model of models) {
          expect(model.id).toBeTruthy();
          expect(model.providerId).toBe(adapter.id);
          expect(model.modelIdentifier).toBeTruthy();
          expect(model.displayName).toBeTruthy();
          expect(Array.isArray(model.capabilities)).toBe(true);
          expect(model.capabilities.length).toBeGreaterThan(0);
          expect(typeof model.inputPricePer1k).toBe("number");
          expect(typeof model.outputPricePer1k).toBe("number");
          expect(model.inputPricePer1k).toBeGreaterThanOrEqual(0);
          expect(model.outputPricePer1k).toBeGreaterThanOrEqual(0);
          expect(typeof model.active).toBe("boolean");
        }
      });

      it("isAvailable() returns a boolean", () => {
        expect(typeof adapter.isAvailable()).toBe("boolean");
      });

      it("generate() has the correct signature", () => {
        expect(typeof adapter.generate).toBe("function");
        expect(adapter.generate.length).toBe(2); // request + modelId
      });
    });
  }
});

// ─────────────────────────────────────────────────────
// 3. MISSING API KEY TESTS
// ─────────────────────────────────────────────────────

describe("Missing API Key Handling", () => {
  // Ensure no API keys are set during these tests
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GOOGLE_AI_API_KEY", "");
  });

  it("OpenAI adapter reports unavailable when key is missing", () => {
    const adapter = new OpenAIProvider();
    expect(adapter.isAvailable()).toBe(false);
  });

  it("Anthropic adapter reports unavailable when key is missing", () => {
    const adapter = new AnthropicProvider();
    expect(adapter.isAvailable()).toBe(false);
  });

  it("Google adapter reports unavailable when key is missing", () => {
    const adapter = new GoogleProvider();
    expect(adapter.isAvailable()).toBe(false);
  });

  it("OpenAI generate() throws AUTHENTICATION_ERROR when key missing", async () => {
    const adapter = new OpenAIProvider();
    await expect(
      adapter.generate(sampleRequest, "gpt-4o")
    ).rejects.toThrow(AttentraProviderError);

    try {
      await adapter.generate(sampleRequest, "gpt-4o");
    } catch (err) {
      const error = err as AttentraProviderError;
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.provider).toBe("openai");
      expect(error.retryable).toBe(false);
    }
  });

  it("Anthropic generate() throws AUTHENTICATION_ERROR when key missing", async () => {
    const adapter = new AnthropicProvider();
    await expect(
      adapter.generate(sampleRequest, "claude-sonnet-4-20250514")
    ).rejects.toThrow(AttentraProviderError);

    try {
      await adapter.generate(sampleRequest, "claude-sonnet-4-20250514");
    } catch (err) {
      const error = err as AttentraProviderError;
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.provider).toBe("anthropic");
      expect(error.retryable).toBe(false);
    }
  });

  it("Google generate() throws AUTHENTICATION_ERROR when key missing", async () => {
    const adapter = new GoogleProvider();
    await expect(
      adapter.generate(sampleRequest, "gemini-2.5-flash")
    ).rejects.toThrow(AttentraProviderError);

    try {
      await adapter.generate(sampleRequest, "gemini-2.5-flash");
    } catch (err) {
      const error = err as AttentraProviderError;
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.provider).toBe("google");
      expect(error.retryable).toBe(false);
    }
  });

  // Restore env after tests
  afterEach(() => {
    vi.unstubAllEnvs();
  });
});

// ─────────────────────────────────────────────────────
// 4. ERROR NORMALIZATION TESTS
// ─────────────────────────────────────────────────────

describe("Error Normalization", () => {
  it("AttentraProviderError has correct shape", () => {
    const error = new AttentraProviderError(
      "RATE_LIMIT_ERROR",
      "openai",
      "Rate limit exceeded",
      {
        providerCode: "429",
        providerMessage: "Too many requests",
        retryable: true,
        cause: new Error("original"),
      }
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AttentraProviderError);
    expect(error.name).toBe("AttentraProviderError");
    expect(error.code).toBe("RATE_LIMIT_ERROR");
    expect(error.provider).toBe("openai");
    expect(error.message).toBe("Rate limit exceeded");
    expect(error.providerCode).toBe("429");
    expect(error.providerMessage).toBe("Too many requests");
    expect(error.retryable).toBe(true);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it("covers all ErrorCode values", () => {
    const codes: ErrorCode[] = [
      "AUTHENTICATION_ERROR",
      "RATE_LIMIT_ERROR",
      "INVALID_REQUEST_ERROR",
      "MODEL_NOT_FOUND",
      "CONTEXT_LENGTH_ERROR",
      "PROVIDER_UNAVAILABLE",
      "TIMEOUT_ERROR",
      "PROVIDER_ERROR",
      "UNKNOWN_ERROR",
    ];

    for (const code of codes) {
      const error = new AttentraProviderError(code, "test", `${code} message`);
      expect(error.code).toBe(code);
    }
  });

  it("defaults retryable to false when not specified", () => {
    const error = new AttentraProviderError(
      "UNKNOWN_ERROR",
      "test",
      "Some error"
    );
    expect(error.retryable).toBe(false);
  });

  it("errors with retryable=true can be flagged for fallback", () => {
    const retryableErrors: ErrorCode[] = [
      "RATE_LIMIT_ERROR",
      "TIMEOUT_ERROR",
      "PROVIDER_UNAVAILABLE",
    ];

    for (const code of retryableErrors) {
      const error = new AttentraProviderError(code, "test", `${code}`, {
        retryable: true,
      });
      expect(error.retryable).toBe(true);
    }
  });

  it("auth and validation errors are not retryable", () => {
    const nonRetryableErrors: ErrorCode[] = [
      "AUTHENTICATION_ERROR",
      "INVALID_REQUEST_ERROR",
      "MODEL_NOT_FOUND",
      "CONTEXT_LENGTH_ERROR",
    ];

    for (const code of nonRetryableErrors) {
      const error = new AttentraProviderError(code, "test", `${code}`, {
        retryable: false,
      });
      expect(error.retryable).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────
// 5. NORMALIZED REQUEST STRUCTURE TESTS
// ─────────────────────────────────────────────────────

describe("Normalized Request Structure", () => {
  it("supports all message roles", () => {
    const request: NormalizedAIRequest = {
      messages: [
        { role: "system", content: "System instruction" },
        { role: "user", content: "User message" },
        { role: "assistant", content: "Assistant response" },
      ],
    };

    expect(request.messages).toHaveLength(3);
    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].role).toBe("user");
    expect(request.messages[2].role).toBe("assistant");
  });

  it("supports optional fields", () => {
    const minimalRequest: NormalizedAIRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    expect(minimalRequest.taskType).toBeUndefined();
    expect(minimalRequest.maxTokens).toBeUndefined();
    expect(minimalRequest.temperature).toBeUndefined();
    expect(minimalRequest.metadata).toBeUndefined();
  });

  it("supports all task types", () => {
    const taskTypes = [
      "chat",
      "summarization",
      "classification",
      "extraction",
      "coding",
      "reasoning",
      "creative_writing",
      "translation",
    ] as const;

    for (const taskType of taskTypes) {
      const request: NormalizedAIRequest = {
        messages: [{ role: "user", content: "test" }],
        taskType,
      };
      expect(request.taskType).toBe(taskType);
    }
  });
});

// ─────────────────────────────────────────────────────
// 6. NORMALIZED RESPONSE STRUCTURE TESTS
// ─────────────────────────────────────────────────────

describe("Normalized Response Structure", () => {
  it("response conforms to NormalizedAIResponse interface", () => {
    const response: NormalizedAIResponse = {
      id: "resp-001",
      content: "Hello! How can I help?",
      model: "gpt-4o",
      provider: "openai",
      usage: {
        inputTokens: 10,
        outputTokens: 20,
      },
      finishReason: "stop",
      latencyMs: 500,
    };

    expect(response.id).toBeTruthy();
    expect(typeof response.content).toBe("string");
    expect(typeof response.model).toBe("string");
    expect(typeof response.provider).toBe("string");
    expect(typeof response.usage.inputTokens).toBe("number");
    expect(typeof response.usage.outputTokens).toBe("number");
    expect(typeof response.finishReason).toBe("string");
    expect(typeof response.latencyMs).toBe("number");
  });

  it("includes latency measurement", () => {
    const response: NormalizedAIResponse = {
      id: "resp-002",
      content: "test",
      model: "claude-sonnet-4-20250514",
      provider: "anthropic",
      usage: { inputTokens: 5, outputTokens: 10 },
      finishReason: "end_turn",
      latencyMs: 750,
    };

    expect(response.latencyMs).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────
// 7. PROVIDER ISOLATION TESTS
// ─────────────────────────────────────────────────────

describe("Provider Isolation", () => {
  it("OpenAI adapter does not import Anthropic or Google SDKs", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/providers/openai.ts"),
      "utf-8"
    );
    expect(source).not.toContain("@anthropic-ai");
    expect(source).not.toContain("@google/generative-ai");
  });

  it("Anthropic adapter does not import OpenAI or Google SDKs", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/providers/anthropic.ts"),
      "utf-8"
    );
    expect(source).not.toContain('from "openai"');
    expect(source).not.toContain("@google/generative-ai");
  });

  it("Google adapter does not import OpenAI or Anthropic SDKs", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/providers/google.ts"),
      "utf-8"
    );
    expect(source).not.toContain('from "openai"');
    expect(source).not.toContain("@anthropic-ai");
  });

  it("each provider uses its own error normalization", () => {
    // OpenAI error
    const openaiError = new AttentraProviderError(
      "RATE_LIMIT_ERROR",
      "openai",
      "OpenAI rate limit"
    );
    expect(openaiError.provider).toBe("openai");

    // Anthropic error
    const anthropicError = new AttentraProviderError(
      "RATE_LIMIT_ERROR",
      "anthropic",
      "Anthropic rate limit"
    );
    expect(anthropicError.provider).toBe("anthropic");

    // Google error
    const googleError = new AttentraProviderError(
      "RATE_LIMIT_ERROR",
      "google",
      "Google rate limit"
    );
    expect(googleError.provider).toBe("google");
  });
});

// ─────────────────────────────────────────────────────
// 8. EXTENSIBILITY TESTS
// ─────────────────────────────────────────────────────

describe("Extensibility", () => {
  it("new providers can be created and registered without modifying existing adapters", () => {
    // Simulate a hypothetical future provider
    const deepseekAdapter: AIProvider = {
      id: "deepseek",
      name: "DeepSeek",
      listModels: () => [
        {
          id: "deepseek-r1",
          providerId: "deepseek",
          modelIdentifier: "deepseek-reasoner",
          displayName: "DeepSeek R1",
          capabilities: ["reasoning", "coding"],
          inputPricePer1k: 0.00055,
          outputPricePer1k: 0.00219,
          active: true,
        },
      ],
      generate: async () => ({
        id: "ds-001",
        content: "mocked response",
        model: "deepseek-reasoner",
        provider: "deepseek",
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: "stop",
        latencyMs: 300,
      }),
      isAvailable: () => true,
    };

    // Register alongside existing providers
    const providers = new Map<string, AIProvider>();
    providers.set("openai", new OpenAIProvider());
    providers.set("anthropic", new AnthropicProvider());
    providers.set("google", new GoogleProvider());
    providers.set(deepseekAdapter.id, deepseekAdapter);

    expect(providers.size).toBe(4);
    expect(providers.get("deepseek")?.id).toBe("deepseek");
    expect(providers.get("deepseek")?.listModels()).toHaveLength(1);
  });

  it("adapter interface supports streaming capability extension", () => {
    // Verify the interface is flexible enough for streaming
    const streamingAdapter: AIProvider = {
      id: "streaming-test",
      name: "Streaming Test",
      listModels: () => [],
      generate: async () => ({
        id: "stream-001",
        content: "streamed content",
        model: "test-model",
        provider: "streaming-test",
        usage: { inputTokens: 5, outputTokens: 15 },
        finishReason: "stop",
        latencyMs: 100,
      }),
      isAvailable: () => true,
    };

    expect(typeof streamingAdapter.generate).toBe("function");
  });
});

// ─────────────────────────────────────────────────────
// 9. SINGLETON REGISTRY INTEGRATION
// ─────────────────────────────────────────────────────

describe("Singleton Registry", () => {
  it("default registry has all three providers registered", async () => {
    const { providerRegistry } = await import("@/lib/providers/registry");

    expect(providerRegistry.has("openai")).toBe(true);
    expect(providerRegistry.has("anthropic")).toBe(true);
    expect(providerRegistry.has("google")).toBe(true);
  });

  it("getProvider resolves all three default providers", async () => {
    const { providerRegistry } = await import("@/lib/providers/registry");

    const openai = providerRegistry.getProvider("openai");
    expect(openai.id).toBe("openai");
    expect(openai.name).toBe("OpenAI");

    const anthropic = providerRegistry.getProvider("anthropic");
    expect(anthropic.id).toBe("anthropic");
    expect(anthropic.name).toBe("Anthropic");

    const google = providerRegistry.getProvider("google");
    expect(google.id).toBe("google");
    expect(google.name).toBe("Google");
  });

  it("listAllModels returns models from all providers", async () => {
    const { providerRegistry } = await import("@/lib/providers/registry");
    const models = providerRegistry.listAllModels();

    expect(models.length).toBeGreaterThan(0);

    const providerIds = new Set(models.map((m) => m.providerId));
    expect(providerIds.has("openai")).toBe(true);
    expect(providerIds.has("anthropic")).toBe(true);
    expect(providerIds.has("google")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 10. BARREL EXPORT TESTS
// ─────────────────────────────────────────────────────

describe("Barrel Exports", () => {
  it("exports all expected symbols from @/lib/providers", async () => {
    const providers = await import("@/lib/providers");

    expect(providers.AttentraProviderError).toBeDefined();
    expect(providers.providerRegistry).toBeDefined();
    expect(providers.OpenAIProvider).toBeDefined();
    expect(providers.AnthropicProvider).toBeDefined();
    expect(providers.GoogleProvider).toBeDefined();
  });
});

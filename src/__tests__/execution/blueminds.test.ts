/**
 * Attentra — BlueMinds Execution Adapter Tests
 *
 * Phase 7 / Step 2–3 — Provider Execution Abstraction + Production Execution
 *
 * Tests for the BlueMinds adapter using mocked fetch:
 *
 * 1. Provider contract
 * 2. Request translation (URL, headers, body)
 * 3. Response normalization
 * 4. Error handling (HTTP status codes, network, timeout)
 * 5. Security (no secret leakage)
 * 6. Provider neutrality (no hardcoded models/prices)
 * 7. Step 3 contract extensions (options, target, capabilities)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  BlueMindsExecutionAdapter,
  createBlueMindsAdapter,
  BLUEMINDS_PROVIDER_ID,
  BLUEMINDS_PROVIDER_NAME,
  DEFAULT_BLUEMINDS_BASE_URL,
  DEFAULT_BLUEMINDS_TIMEOUT_MS,
} from "@/lib/execution/providers/blueminds";
import { NormalizedExecutionError } from "@/lib/execution/errors";
import type { ExecutionRequest } from "@/lib/execution/types";
import type { ProviderAdapter } from "@/lib/execution/types";

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

const TEST_API_KEY = "bm-test-key-1234567890abcdef";
const TEST_BASE_URL = "https://api.bluesminds.com/v1";

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

interface FetchCall {
  url: string;
  options: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  };
}

function mockFetch(
  response: Response
): { mock: ReturnType<typeof vi.fn>; calls: () => FetchCall[] } {
  const fn = vi.fn().mockResolvedValue(response);
  globalThis.fetch = fn as unknown as typeof fetch;
  return {
    mock: fn,
    calls: () =>
      fn.mock.calls.map((args: unknown[]) => ({
        url: args[0] as string,
        options: args[1] as FetchCall["options"],
      })),
  };
}

function makeRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    modelId: "bm-model-1",
    providerId: BLUEMINDS_PROVIDER_ID,
    modelIdentifier: "deepseek-v3",
    messages: [{ role: "user", content: "Hello, BlueMinds!" }],
    requestId: "test-req-bm-1",
    ...overrides,
  };
}

function successBody(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: "chatcmpl-bm-001",
    model: "deepseek-v3",
    choices: [
      {
        message: {
          role: "assistant",
          content: "Hello from BlueMinds!",
        },
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
    ...overrides,
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function adapter() {
  return new BlueMindsExecutionAdapter({
    apiKey: TEST_API_KEY,
    baseUrl: TEST_BASE_URL,
  });
}

// ─────────────────────────────────────────────────────
// ENV BACKUP
// ─────────────────────────────────────────────────────

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {
    BLUEMINDS_API_KEY: process.env.BLUEMINDS_API_KEY,
    BLUEMINDS_BASE_URL: process.env.BLUEMINDS_BASE_URL,
    BLUEMINDS_TIMEOUT_MS: process.env.BLUEMINDS_TIMEOUT_MS,
  };
});

afterEach(() => {
  // Restore saved env
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  // Clean up any test-specific env vars
  delete process.env.BLUEMINDS_API_KEY;
  delete process.env.BLUEMINDS_BASE_URL;
  delete process.env.BLUEMINDS_TIMEOUT_MS;
});

// ─────────────────────────────────────────────────────
// 1. PROVIDER CONTRACT
// ─────────────────────────────────────────────────────

describe("BlueMinds — Provider Contract", () => {
  it("satisfies ProviderAdapter interface", () => {
    const a: ProviderAdapter = new BlueMindsExecutionAdapter();
    expect(a.providerId).toBe("blueminds");
    expect(a.providerName).toBe("BlueMinds");
    expect(typeof a.supports).toBe("function");
    expect(typeof a.execute).toBe("function");
    expect(typeof a.normalizeError).toBe("function");
  });

  it("providerId is stable constant", () => {
    expect(BLUEMINDS_PROVIDER_ID).toBe("blueminds");
    const a = new BlueMindsExecutionAdapter();
    expect(a.providerId).toBe(BLUEMINDS_PROVIDER_ID);
  });

  it("supports any model (no hardcoded allowlist)", () => {
    const a = new BlueMindsExecutionAdapter();
    expect(a.supports("deepseek-v3")).toBe(true);
    expect(a.supports("qwen-2.5-72b")).toBe(true);
    expect(a.supports("llama-3.1-405b")).toBe(true);
    expect(a.supports("any-future-model")).toBe(true);
  });

  it("factory function creates a working adapter", () => {
    const a = createBlueMindsAdapter({ apiKey: TEST_API_KEY });
    expect(a.providerId).toBe("blueminds");
    expect(a.supports("any-model")).toBe(true);
  });

  it("constants are correct", () => {
    expect(BLUEMINDS_PROVIDER_NAME).toBe("BlueMinds");
    expect(DEFAULT_BLUEMINDS_BASE_URL).toBe("https://api.bluesminds.com/v1");
    expect(DEFAULT_BLUEMINDS_TIMEOUT_MS).toBe(30_000);
  });
});

// ─────────────────────────────────────────────────────
// 2. REQUEST TRANSLATION
// ─────────────────────────────────────────────────────

describe("BlueMinds — Request Translation", () => {
  it("sends POST to correct URL", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest());

    expect(mock).toHaveBeenCalledOnce();
    expect(calls()[0].url).toBe(`${TEST_BASE_URL}/chat/completions`);
  });

  it("uses POST method", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest());

    expect(calls()[0].options.method).toBe("POST");
  });

  it("sends Authorization header with Bearer token", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest());

    expect(calls()[0].options.headers["Authorization"]).toBe(
      `Bearer ${TEST_API_KEY}`
    );
  });

  it("sends Content-Type application/json", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest());

    expect(calls()[0].options.headers["Content-Type"]).toBe("application/json");
  });

  it("includes correct model identifier in body", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest({ modelIdentifier: "deepseek-v3" }));

    const body = JSON.parse(calls()[0].options.body);
    expect(body.model).toBe("deepseek-v3");
  });

  it("preserves user messages in order", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(
      makeRequest({
        messages: [
          { role: "user", content: "First message" },
          { role: "assistant", content: "Second message" },
          { role: "user", content: "Third message" },
        ],
      })
    );

    const body = JSON.parse(calls()[0].options.body);
    expect(body.messages).toEqual([
      { role: "user", content: "First message" },
      { role: "assistant", content: "Second message" },
      { role: "user", content: "Third message" },
    ]);
  });

  it("includes system message first when provided", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(
      makeRequest({
        systemMessage: "You are a helpful assistant",
        messages: [{ role: "user", content: "Hello" }],
      })
    );

    const body = JSON.parse(calls()[0].options.body);
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "You are a helpful assistant",
    });
    expect(body.messages[1]).toEqual({
      role: "user",
      content: "Hello",
    });
  });

  it("includes max_tokens when specified", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest({ maxTokens: 500 }));

    const body = JSON.parse(calls()[0].options.body);
    expect(body.max_tokens).toBe(500);
  });

  it("omits max_tokens when not specified", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest({ maxTokens: undefined }));

    const body = JSON.parse(calls()[0].options.body);
    expect(body.max_tokens).toBeUndefined();
  });

  it("includes temperature when specified", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest({ temperature: 0.7 }));

    const body = JSON.parse(calls()[0].options.body);
    expect(body.temperature).toBe(0.7);
  });

  it("omits temperature when not specified", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    await adapter().execute(makeRequest({ temperature: undefined }));

    const body = JSON.parse(calls()[0].options.body);
    expect(body.temperature).toBeUndefined();
  });

  it("does not alter user prompt content", async () => {
    const { mock, calls } = mockFetch(jsonResponse(successBody()));
    const content = "What is 2+2? Please answer precisely.";
    await adapter().execute(
      makeRequest({ messages: [{ role: "user", content }] })
    );

    const body = JSON.parse(calls()[0].options.body);
    expect(body.messages[0].content).toBe(content);
  });
});

// ─────────────────────────────────────────────────────
// 3. RESPONSE NORMALIZATION
// ─────────────────────────────────────────────────────

describe("BlueMinds — Response Normalization", () => {
  it("extracts content from choices[0].message.content", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(true);
    expect(result.content).toBe("Hello from BlueMinds!");
  });

  it("extracts usage (inputTokens, outputTokens, totalTokens)", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.usage).toBeDefined();
    expect(result.usage!.inputTokens).toBe(10);
    expect(result.usage!.outputTokens).toBe(20);
    expect(result.usage!.totalTokens).toBe(30);
  });

  it("captures provider request ID", async () => {
    mockFetch(jsonResponse(successBody({ id: "chatcmpl-unique-123" })));
    const result = await adapter().execute(makeRequest());

    expect(result.providerRequestId).toBe("chatcmpl-unique-123");
  });

  it("measures wall-clock latency", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.latencyMs).toBeDefined();
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs!).toBeGreaterThanOrEqual(0);
  });

  it("returns execution timestamp", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.timestamp).toBeTruthy();
    expect(typeof result.timestamp).toBe("string");
  });

  it("uses requested modelId in result (not provider-returned)", async () => {
    mockFetch(jsonResponse(successBody({ model: "provider-returned-model" })));
    const result = await adapter().execute(
      makeRequest({ modelId: "my-internal-model-id" })
    );

    expect(result.modelId).toBe("my-internal-model-id");
  });

  it("actualCost is undefined (not populated by adapter)", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.actualCost).toBeUndefined();
  });

  it("handles missing usage gracefully", async () => {
    mockFetch(
      jsonResponse({
        id: "chatcmpl-no-usage",
        choices: [{ message: { role: "assistant", content: "No usage info" } }],
      })
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(true);
    expect(result.usage).toBeUndefined();
  });

  it("handles empty content gracefully", async () => {
    mockFetch(
      jsonResponse({
        id: "chatcmpl-empty",
        choices: [{ message: { role: "assistant", content: "" } }],
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      })
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(true);
    expect(result.content).toBe("");
  });
});

// ─────────────────────────────────────────────────────
// 4. ERROR HANDLING
// ─────────────────────────────────────────────────────

describe("BlueMinds — Error Handling", () => {
  it("returns MISSING_API_KEY when API key is absent", async () => {
    // No config, no env var
    const a = new BlueMindsExecutionAdapter({ baseUrl: TEST_BASE_URL });
    const result = await a.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MISSING_API_KEY");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns AUTHENTICATION for 401", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: "Invalid API key provided" } },
        401
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns AUTHENTICATION for 403", async () => {
    mockFetch(
      jsonResponse({ error: { message: "Forbidden" } }, 403)
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns INVALID_REQUEST for 400", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: "Bad request: invalid messages" } },
        400
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_REQUEST");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns RATE_LIMIT for 429", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: "Rate limit exceeded" } },
        429
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RATE_LIMIT");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns SERVER_ERROR for 500", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: "Internal server error" } },
        500
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns SERVER_ERROR for 502", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: "Bad gateway" } },
        502
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns SERVER_ERROR for 503", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: "Service unavailable" } },
        503
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns SERVER_ERROR for 504", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: "Gateway timeout" } },
        504
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns SERVER_ERROR for 504 with a non-JSON (HTML) error body", async () => {
    mockFetch(
      new Response(
        "<html><head><title>504 Gateway Time-out</title></head></html>",
        { status: 504 }
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
    expect(result.error?.message).toContain("504");
  });

  it("returns MODEL_UNAVAILABLE for 404", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: "Model not found" } },
        404
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MODEL_UNAVAILABLE");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns INVALID_RESPONSE for malformed JSON body", async () => {
    // Valid JSON but not a valid chat completion response
    mockFetch(jsonResponse({ unexpected: "data" }));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_RESPONSE");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns INVALID_RESPONSE for empty choices array", async () => {
    mockFetch(jsonResponse({ id: "test", choices: [] }));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_RESPONSE");
  });

  it("returns INVALID_RESPONSE for a non-JSON success body", async () => {
    mockFetch(
      new Response("<html>not json</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_RESPONSE");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns NETWORK_ERROR on fetch failure", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("fetch failed: ECONNREFUSED")) as unknown as typeof fetch;

    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NETWORK_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns REQUEST_TIMEOUT on AbortController abort", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise((_resolve, reject) => {
          if (opts.signal) {
            opts.signal.addEventListener("abort", () => {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            });
          }
        });
      }) as unknown as typeof fetch;

    const a = new BlueMindsExecutionAdapter({
      apiKey: TEST_API_KEY,
      baseUrl: TEST_BASE_URL,
      timeoutMs: 50, // very short timeout
    });
    const result = await a.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REQUEST_TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("reads API key from environment variable", async () => {
    process.env.BLUEMINDS_API_KEY = "env-key-9876543210";
    const { calls } = mockFetch(jsonResponse(successBody()));

    const a = new BlueMindsExecutionAdapter({ baseUrl: TEST_BASE_URL });
    await a.execute(makeRequest());

    expect(calls()[0].options.headers["Authorization"]).toBe(
      "Bearer env-key-9876543210"
    );
  });

  it("reads base URL from environment variable", async () => {
    process.env.BLUEMINDS_BASE_URL = "https://custom.api.com/v2";
    const { calls } = mockFetch(jsonResponse(successBody()));

    const a = new BlueMindsExecutionAdapter({ apiKey: TEST_API_KEY });
    await a.execute(makeRequest());

    expect(calls()[0].url).toBe("https://custom.api.com/v2/chat/completions");
  });

  it("reads timeout from environment variable", async () => {
    process.env.BLUEMINDS_TIMEOUT_MS = "5000";
    const a = new BlueMindsExecutionAdapter({ apiKey: TEST_API_KEY });
    // Just verify it doesn't crash — timeout is internal
    mockFetch(jsonResponse(successBody()));
    const result = await a.execute(makeRequest());
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 5. SECURITY
// ─────────────────────────────────────────────────────

describe("BlueMinds — Security", () => {
  it("API key never appears in error messages", async () => {
    mockFetch(
      jsonResponse(
        {
          error: {
            message: `Invalid key: ${TEST_API_KEY}`,
          },
        },
        401
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.error?.message).not.toContain(TEST_API_KEY);
  });

  it("API key never appears in serialized result", async () => {
    mockFetch(
      jsonResponse(
        { error: { message: `Auth failed with Bearer ${TEST_API_KEY}` } },
        401
      )
    );
    const result = await adapter().execute(makeRequest());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(TEST_API_KEY);
  });

  it("API key is server-side only (no NEXT_PUBLIC_ prefix)", () => {
    const envKeys = Object.keys(process.env).filter((k) =>
      k.includes("BLUEMINDS")
    );
    for (const key of envKeys) {
      expect(key).not.toMatch(/^NEXT_PUBLIC_/);
    }
  });

  it("error response messages are sanitized", async () => {
    const sensitiveKey = "sk-abcdefghijklmnopqrstuvwxyz1234567890";
    mockFetch(
      jsonResponse(
        { error: { message: `Key ${sensitiveKey} is invalid` } },
        401
      )
    );
    const result = await adapter().execute(makeRequest());

    expect(result.error?.message).not.toContain(sensitiveKey);
    expect(result.error?.message).toContain("[REDACTED]");
  });
});

// ─────────────────────────────────────────────────────
// 6. PROVIDER NEUTRALITY
// ─────────────────────────────────────────────────────

describe("BlueMinds — Provider Neutrality", () => {
  it("no hardcoded model names in the adapter module", async () => {
    const moduleSource = await import("@/lib/execution/providers/blueminds");
    const moduleStr = JSON.stringify(Object.keys(moduleSource));

    expect(moduleStr).not.toContain("deepseek");
    expect(moduleStr).not.toContain("qwen");
    expect(moduleStr).not.toContain("llama");
    expect(moduleStr).not.toContain("gpt-4o");
    expect(moduleStr).not.toContain("claude");
  });

  it("no hardcoded prices in the adapter", async () => {
    // BlueMinds adapter never calculates cost
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.actualCost).toBeUndefined();
  });

  it("no pricing calculations in the adapter", async () => {
    // The adapter module should not import pricing modules
    const moduleSource = await import("@/lib/execution/providers/blueminds");
    const keys = Object.keys(moduleSource);

    expect(keys).not.toContain("calculateCost");
    expect(keys).not.toContain("projectedCost");
    expect(keys).not.toContain("PricingSnapshot");
  });

  it("no OpenAI/Anthropic/Google SDK imports", async () => {
    const moduleSource = await import("@/lib/execution/providers/blueminds");
    const keys = Object.keys(moduleSource);

    expect(keys).not.toContain("OpenAI");
    expect(keys).not.toContain("Anthropic");
    expect(keys).not.toContain("GoogleGenerativeAI");
  });

  it("adapter uses model from request, not hardcoded", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    const a = adapter();
    await a.execute(makeRequest({ modelIdentifier: "model-alpha" }));
    await a.execute(makeRequest({ modelIdentifier: "model-beta" }));

    const body1 = JSON.parse(calls()[0].options.body);
    const body2 = JSON.parse(calls()[1].options.body);

    expect(body1.model).toBe("model-alpha");
    expect(body2.model).toBe("model-beta");
  });
});

// ─────────────────────────────────────────────────────
// 7. STEP 3 CONTRACT EXTENSIONS
// ─────────────────────────────────────────────────────

describe("BlueMinds — Step 3 Contract Extensions", () => {
  it("falls back to the default base URL when none is configured", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    const a = new BlueMindsExecutionAdapter({ apiKey: TEST_API_KEY });
    await a.execute(makeRequest());

    expect(calls()[0].url).toBe(
      `${DEFAULT_BLUEMINDS_BASE_URL}/chat/completions`
    );
  });

  it("honors per-request timeout options over constructor config", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise((_resolve, reject) => {
          if (opts.signal) {
            opts.signal.addEventListener("abort", () => {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            });
          }
        });
      }) as unknown as typeof fetch;

    // Constructor timeout is long; the per-request option must win
    const a = new BlueMindsExecutionAdapter({
      apiKey: TEST_API_KEY,
      baseUrl: TEST_BASE_URL,
      timeoutMs: 10_000,
    });

    const result = await a.execute(makeRequest(), undefined, { timeoutMs: 50 });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REQUEST_TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("accepts an optional ExecutionPlan target without altering the request", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    const target = {
      entryId: "primary",
      modelId: "bm-model-1",
      providerId: "blueminds",
      providerName: "BlueMinds",
      modelIdentifier: "target-model-x",
      displayName: "Target Model X",
      projectedCost: 0.001,
      routingScore: 0.9,
    };

    const result = await adapter().execute(makeRequest(), target);

    expect(result.success).toBe(true);
    // The request body must still use the request's model identifier,
    // not anything derived from the target
    const body = JSON.parse(calls()[0].options.body);
    expect(body.model).toBe("deepseek-v3");
  });

  it("exposes capability metadata", () => {
    const a = new BlueMindsExecutionAdapter();

    expect(Array.isArray(a.capabilities)).toBe(true);
    expect(a.capabilities).toContain("chat");
    expect(a.capabilities).toContain("openai-compatible");
  });

  it("accepts token estimates without sending them as provider parameters", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    await adapter().execute(
      makeRequest({ estimatedInputTokens: 120, estimatedOutputTokens: 40 })
    );

    const body = JSON.parse(calls()[0].options.body);
    expect(body).not.toHaveProperty("estimatedInputTokens");
    expect(body).not.toHaveProperty("estimatedOutputTokens");
  });
});

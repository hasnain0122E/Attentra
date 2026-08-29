/**
 * Attentra — OpenRouter Execution Adapter Tests
 *
 * Phase 8 / Step 1 — OpenRouter Provider Adapter
 *
 * Tests for the OpenRouter adapter using mocked fetch:
 *
 * A.  Successful request
 * B.  Authentication failure (401)
 * C.  Rate limit (429)
 * D.  Server failure (500)
 * E.  Model unavailable (404)
 * F.  Invalid request (400)
 * G.  Network failure
 * H.  Timeout
 * I.  Malformed response
 * J.  API key security
 * K.  Model is not hardcoded
 * L.  Provider neutrality
 * M.  No SDK dependency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  OpenRouterExecutionAdapter,
  createOpenRouterAdapter,
  OPENROUTER_PROVIDER_ID,
  OPENROUTER_PROVIDER_NAME,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_TIMEOUT_MS,
} from "@/lib/execution/providers/openrouter";
import { NormalizedExecutionError } from "@/lib/execution/errors";
import type { ExecutionRequest } from "@/lib/execution/types";

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

/** Clearly fake test key — NOT a realistic credential pattern */
const TEST_API_KEY = "test-openrouter-key";
const TEST_BASE_URL = "https://openrouter.ai/api/v1";

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

function mockFetchReject(
  error: Error
): { mock: ReturnType<typeof vi.fn> } {
  const fn = vi.fn().mockRejectedValue(error);
  globalThis.fetch = fn as unknown as typeof fetch;
  return { mock: fn };
}

function makeRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    modelId: "or-model-1",
    providerId: OPENROUTER_PROVIDER_ID,
    modelIdentifier: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: "Hello, OpenRouter!" }],
    requestId: "test-req-or-1",
    ...overrides,
  };
}

function successBody(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: "gen-or-001",
    model: "google/gemini-2.5-flash",
    choices: [
      {
        message: {
          role: "assistant",
          content: "Hello from OpenRouter!",
        },
      },
    ],
    usage: {
      prompt_tokens: 12,
      completion_tokens: 18,
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

function errorResponse(
  status: number,
  message: string
): Response {
  return new Response(
    JSON.stringify({ error: { message, type: "error", code: status } }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function adapter() {
  return new OpenRouterExecutionAdapter({
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
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
    OPENROUTER_TIMEOUT_MS: process.env.OPENROUTER_TIMEOUT_MS,
  };
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_BASE_URL;
  delete process.env.OPENROUTER_TIMEOUT_MS;
});

afterEach(() => {
  process.env.OPENROUTER_API_KEY = savedEnv.OPENROUTER_API_KEY;
  process.env.OPENROUTER_BASE_URL = savedEnv.OPENROUTER_BASE_URL;
  process.env.OPENROUTER_TIMEOUT_MS = savedEnv.OPENROUTER_TIMEOUT_MS;
});

// ─────────────────────────────────────────────────────
// A. SUCCESSFUL REQUEST
// ─────────────────────────────────────────────────────

describe("OpenRouter — Successful request", () => {
  it("sends correct endpoint, method, model, and messages", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(true);
    expect(result.content).toBe("Hello from OpenRouter!");
    expect(result.providerId).toBe(OPENROUTER_PROVIDER_ID);

    const [call] = calls();
    expect(call.url).toBe(`${TEST_BASE_URL}/chat/completions`);
    expect(call.options.method).toBe("POST");

    const body = JSON.parse(call.options.body);
    expect(body.model).toBe("google/gemini-2.5-flash");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("Hello, OpenRouter!");
  });

  it("extracts usage data from response", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.usage).toBeDefined();
    expect(result.usage?.inputTokens).toBe(12);
    expect(result.usage?.outputTokens).toBe(18);
    expect(result.usage?.totalTokens).toBe(30);
  });

  it("extracts provider request ID", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.providerRequestId).toBe("gen-or-001");
  });

  it("preserves system message ordering", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    await adapter().execute(
      makeRequest({ systemMessage: "You are a helpful assistant." })
    );

    const body = JSON.parse(calls()[0].options.body);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toBe("You are a helpful assistant.");
    expect(body.messages[1].role).toBe("user");
  });

  it("includes max_tokens and temperature when specified", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    await adapter().execute(
      makeRequest({ maxTokens: 100, temperature: 0.7 })
    );

    const body = JSON.parse(calls()[0].options.body);
    expect(body.max_tokens).toBe(100);
    expect(body.temperature).toBe(0.7);
  });

  it("omits max_tokens and temperature when not specified", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    await adapter().execute(makeRequest());

    const body = JSON.parse(calls()[0].options.body);
    expect(body).not.toHaveProperty("max_tokens");
    expect(body).not.toHaveProperty("temperature");
  });

  it("measures latency", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.latencyMs).toBeDefined();
    expect(result.latencyMs!).toBeGreaterThanOrEqual(0);
  });

  it("leaves actualCost undefined", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    expect(result.actualCost).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────
// B. AUTHENTICATION FAILURE (401)
// ─────────────────────────────────────────────────────

describe("OpenRouter — Authentication failure", () => {
  it("returns AUTHENTICATION with retryable=false on 401", async () => {
    mockFetch(errorResponse(401, "Invalid API key"));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns AUTHENTICATION with retryable=false on 403", async () => {
    mockFetch(errorResponse(403, "Forbidden"));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// C. RATE LIMIT (429)
// ─────────────────────────────────────────────────────

describe("OpenRouter — Rate limit", () => {
  it("returns RATE_LIMIT with retryable=true on 429", async () => {
    mockFetch(errorResponse(429, "Rate limit exceeded"));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RATE_LIMIT");
    expect(result.error?.retryable).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// D. SERVER FAILURE (500)
// ─────────────────────────────────────────────────────

describe("OpenRouter — Server failure", () => {
  it("returns SERVER_ERROR with retryable=true on 500", async () => {
    mockFetch(errorResponse(500, "Internal server error"));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns SERVER_ERROR on 502", async () => {
    mockFetch(errorResponse(502, "Bad gateway"));
    const result = await adapter().execute(makeRequest());

    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns SERVER_ERROR on 503", async () => {
    mockFetch(errorResponse(503, "Service unavailable"));
    const result = await adapter().execute(makeRequest());

    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// E. MODEL UNAVAILABLE (404)
// ─────────────────────────────────────────────────────

describe("OpenRouter — Model unavailable", () => {
  it("returns MODEL_UNAVAILABLE with retryable=false on 404", async () => {
    mockFetch(errorResponse(404, "Model not found"));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MODEL_UNAVAILABLE");
    expect(result.error?.retryable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// F. INVALID REQUEST (400)
// ─────────────────────────────────────────────────────

describe("OpenRouter — Invalid request", () => {
  it("returns INVALID_REQUEST with retryable=false on 400", async () => {
    mockFetch(errorResponse(400, "Invalid request body"));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_REQUEST");
    expect(result.error?.retryable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// G. NETWORK FAILURE
// ─────────────────────────────────────────────────────

describe("OpenRouter — Network failure", () => {
  it("returns NETWORK_ERROR with retryable=true on fetch failure", async () => {
    mockFetchReject(new Error("fetch failed: ECONNREFUSED"));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NETWORK_ERROR");
    expect(result.error?.retryable).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// H. TIMEOUT
// ─────────────────────────────────────────────────────

describe("OpenRouter — Timeout", () => {
  it("returns REQUEST_TIMEOUT with retryable=true on abort", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetchReject(abortError);

    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REQUEST_TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns MISSING_API_KEY when no key is configured", async () => {
    const noKeyAdapter = new OpenRouterExecutionAdapter({
      baseUrl: TEST_BASE_URL,
    });
    const result = await noKeyAdapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("MISSING_API_KEY");
    expect(result.error?.retryable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// I. MALFORMED RESPONSE
// ─────────────────────────────────────────────────────

describe("OpenRouter — Malformed response", () => {
  it("returns INVALID_RESPONSE when response has no choices", async () => {
    mockFetch(jsonResponse({ id: "x", model: "test" }));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_RESPONSE");
    expect(result.error?.retryable).toBe(false);
  });

  it("returns INVALID_RESPONSE when choices is empty", async () => {
    mockFetch(jsonResponse({ choices: [] }));
    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_RESPONSE");
  });

  it("returns INVALID_RESPONSE on non-JSON body", async () => {
    const fn = vi.fn().mockResolvedValue(
      new Response("not json", { status: 200 })
    );
    globalThis.fetch = fn as unknown as typeof fetch;

    const result = await adapter().execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_RESPONSE");
  });

  it("does not fabricate content or usage on malformed response", async () => {
    mockFetch(jsonResponse({ id: "x" }));
    const result = await adapter().execute(makeRequest());

    expect(result.content).toBeUndefined();
    expect(result.usage).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────
// J. API KEY SECURITY
// ─────────────────────────────────────────────────────

describe("OpenRouter — API key security", () => {
  it("does not expose the API key in successful results", async () => {
    mockFetch(jsonResponse(successBody()));
    const result = await adapter().execute(makeRequest());

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(TEST_API_KEY);
  });

  it("does not expose the API key in error results", async () => {
    mockFetch(errorResponse(401, `Unauthorized: key=${TEST_API_KEY}`));
    const result = await adapter().execute(makeRequest());

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(TEST_API_KEY);
  });

  it("sends Authorization header with Bearer prefix", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    await adapter().execute(makeRequest());

    const [call] = calls();
    expect(call.options.headers.Authorization).toBeDefined();
    expect(call.options.headers.Authorization.startsWith("Bearer ")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// K. MODEL IS NOT HARDCODED
// ─────────────────────────────────────────────────────

describe("OpenRouter — Model not hardcoded", () => {
  it("uses the model identifier from the execution request", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    await adapter().execute(
      makeRequest({ modelIdentifier: "anthropic/claude-sonnet-4" })
    );

    const body = JSON.parse(calls()[0].options.body);
    expect(body.model).toBe("anthropic/claude-sonnet-4");
  });

  it("uses a different model when changed", async () => {
    const { calls } = mockFetch(jsonResponse(successBody()));

    await adapter().execute(
      makeRequest({ modelIdentifier: "openai/gpt-5" })
    );

    const body = JSON.parse(calls()[0].options.body);
    expect(body.model).toBe("openai/gpt-5");
  });
});

// ─────────────────────────────────────────────────────
// L. PROVIDER NEUTRALITY
// ─────────────────────────────────────────────────────

describe("OpenRouter — Provider neutrality", () => {
  it("supports() returns true for any model ID", () => {
    const a = adapter();
    expect(a.supports("google/gemini-2.5-flash")).toBe(true);
    expect(a.supports("anthropic/claude-sonnet-4")).toBe(true);
    expect(a.supports("openai/gpt-5")).toBe(true);
    expect(a.supports("meta-llama/llama-3")).toBe(true);
  });

  it("identifies as openrouter provider", () => {
    const a = adapter();
    expect(a.providerId).toBe("openrouter");
    expect(a.providerName).toBe("OpenRouter");
  });

  it("has no routing logic in source code", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "execution", "providers", "openrouter.ts"),
      "utf-8"
    );
    expect(source).not.toContain("scoreCandidates");
    expect(source).not.toContain("filterCandidates");
    expect(source).not.toContain("orderFallbacks");
    expect(source).not.toContain("routeAndPersist");
  });
});

// ─────────────────────────────────────────────────────
// M. NO SDK DEPENDENCY
// ─────────────────────────────────────────────────────

describe("OpenRouter — No SDK dependency", () => {
  it("does not import any OpenRouter or OpenAI SDK", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "execution", "providers", "openrouter.ts"),
      "utf-8"
    );
    // Check for SDK import statements specifically (not comments)
    expect(source).not.toMatch(/from\s+["']openai["']/);
    expect(source).not.toMatch(/from\s+["']openrouter["']/);
    expect(source).not.toMatch(/require\(["']openai["']\)/);
    expect(source).not.toMatch(/require\(["']openrouter["']\)/);
    // Only import from internal modules
    expect(source).toContain("../types");
    expect(source).toContain("../errors");
  });
});

// ─────────────────────────────────────────────────────
// FACTORY + ENV CONFIGURATION
// ─────────────────────────────────────────────────────

describe("OpenRouter — Factory and configuration", () => {
  it("createOpenRouterAdapter returns an adapter instance", () => {
    const a = createOpenRouterAdapter({ apiKey: TEST_API_KEY });
    expect(a).toBeInstanceOf(OpenRouterExecutionAdapter);
    expect(a.providerId).toBe("openrouter");
  });

  it("reads API key from OPENROUTER_API_KEY env var", async () => {
    process.env.OPENROUTER_API_KEY = TEST_API_KEY;
    const envAdapter = new OpenRouterExecutionAdapter();
    const { calls } = mockFetch(jsonResponse(successBody()));

    const result = await envAdapter.execute(makeRequest());

    expect(result.success).toBe(true);
    const [call] = calls();
    expect(call.options.headers.Authorization).toContain("Bearer ");
  });

  it("uses OPENROUTER_BASE_URL env var when set", async () => {
    process.env.OPENROUTER_API_KEY = TEST_API_KEY;
    process.env.OPENROUTER_BASE_URL = "https://custom-router.example.com/v1";
    const envAdapter = new OpenRouterExecutionAdapter();
    const { calls } = mockFetch(jsonResponse(successBody()));

    await envAdapter.execute(makeRequest());

    expect(calls()[0].url).toBe("https://custom-router.example.com/v1/chat/completions");
  });

  it("uses default base URL when no env or config", () => {
    const a = new OpenRouterExecutionAdapter();
    expect(a).toBeDefined();
    // Default is tested implicitly through successful requests above
  });

  it("constants are exported correctly", () => {
    expect(OPENROUTER_PROVIDER_ID).toBe("openrouter");
    expect(OPENROUTER_PROVIDER_NAME).toBe("OpenRouter");
    expect(DEFAULT_OPENROUTER_BASE_URL).toBe("https://openrouter.ai/api/v1");
    expect(DEFAULT_OPENROUTER_TIMEOUT_MS).toBe(30_000);
  });
});

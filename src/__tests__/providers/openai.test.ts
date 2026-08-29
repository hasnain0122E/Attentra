/**
 * Attentra — OpenAI Execution Adapter Tests
 *
 * Phase 8 / Step 2 — Direct Provider Execution Activation
 *
 * Tests the full execution chain with the OpenAI SDK client mocked:
 *
 *   ExecutionRequest
 *     → OpenAIExecutionAdapter (BaseExecutionAdapter)
 *     → OpenAIProvider.generate()           [real]
 *     → openai SDK chat.completions.create  [MOCKED]
 *     → ExecutionResult
 *
 * Sections:
 *   A. Request mapping + response normalization (success)
 *   B. System message mapping
 *   C. GPT-5 / o-series max_completion_tokens compatibility
 *   D. Missing API key → AUTHENTICATION
 *   E. 401 → AUTHENTICATION
 *   F. 429 → RATE_LIMIT
 *   G. 500 → SERVER_ERROR
 *   H. Timeout → TIMEOUT
 *   I. No credential leakage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import OpenAI from "openai";
import type { ExecutionRequest } from "@/lib/execution/types";
import { createOpenAIAdapter } from "@/lib/execution/providers/openai";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  // Class-based mock: supports `new OpenAI(...)` while re-exposing the real
  // error classes as statics so the provider's `instanceof OpenAI.APIError`
  // checks keep working against errors constructed in these tests.
  class MockOpenAIClient {
    static readonly APIError = actual.APIError;
    static readonly APIConnectionError = actual.APIConnectionError;
    static readonly APIConnectionTimeoutError =
      actual.APIConnectionTimeoutError;
    chat = { completions: { create: mockCreate } };
  }
  return { ...actual, default: MockOpenAIClient } as unknown as typeof actual;
});

/** Fake key used ONLY for env stubbing — never sent anywhere (client is mocked). */
const MOCK_API_KEY = "sk-unit-test-mock-key-000000000000";

function makeRequest(overrides?: Partial<ExecutionRequest>): ExecutionRequest {
  return {
    modelId: "openai-gpt-4o-mini",
    providerId: "openai",
    modelIdentifier: "gpt-4o-mini",
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
    maxTokens: 32,
    temperature: 0,
    requestId: "unit-test-openai-001",
    ...overrides,
  };
}

function mockSuccessResponse(overrides?: Record<string, unknown>) {
  return {
    id: "chatcmpl-unit-001",
    choices: [
      { message: { role: "assistant", content: "OK" }, finish_reason: "stop" },
    ],
    model: "gpt-4o-mini",
    usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
    ...overrides,
  };
}

describe("OpenAI Execution Adapter", () => {
  beforeEach(() => {
    // Deterministic key presence for the client-construction path, regardless
    // of whether real credentials exist in the environment.
    vi.stubEnv("OPENAI_API_KEY", MOCK_API_KEY);
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("A. maps the request and normalizes a successful response", async () => {
    mockCreate.mockResolvedValue(mockSuccessResponse());

    const adapter = createOpenAIAdapter();
    const result = await adapter.execute(makeRequest());

    // The SDK receives the provider-native identifier, not the internal model ID
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 32,
      temperature: 0,
    });

    // Normalized ExecutionResult
    expect(result.success).toBe(true);
    expect(result.providerId).toBe("openai");
    expect(result.modelId).toBe("openai-gpt-4o-mini");
    expect(result.providerRequestId).toBe("chatcmpl-unit-001");
    expect(result.content).toBe("OK");
    expect(result.usage).toEqual({
      inputTokens: 12,
      outputTokens: 4,
      totalTokens: 16,
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeTruthy();
    // Cost stays in the pricing layer — adapters never populate actualCost
    expect(result.actualCost).toBeUndefined();
  });

  it("B. maps the system message into the OpenAI messages array", async () => {
    mockCreate.mockResolvedValue(mockSuccessResponse());

    const adapter = createOpenAIAdapter();
    await adapter.execute(
      makeRequest({
        systemMessage: "You are terse.",
        messages: [{ role: "user", content: "Hi" }],
        temperature: undefined,
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "system", content: "You are terse." },
          { role: "user", content: "Hi" },
        ],
      })
    );
  });

  it("C. sends max_completion_tokens for GPT-5 / o-series models", async () => {
    mockCreate.mockResolvedValue(
      mockSuccessResponse({ model: "gpt-5-nano" })
    );

    const adapter = createOpenAIAdapter();
    await adapter.execute(
      makeRequest({
        modelIdentifier: "gpt-5-nano",
        temperature: undefined,
      })
    );

    const arg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.model).toBe("gpt-5-nano");
    expect(arg.max_completion_tokens).toBe(32);
    expect(arg.max_tokens).toBeUndefined();
  });

  it("D. returns AUTHENTICATION when the API key is not configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const adapter = createOpenAIAdapter();

    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
    expect(result.timestamp).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("E. maps a 401 provider failure to AUTHENTICATION", async () => {
    mockCreate.mockRejectedValue(
      new OpenAI.APIError(401, undefined, "Incorrect API key provided", undefined)
    );

    const adapter = createOpenAIAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
    expect(result.timestamp).toBeTruthy();
  });

  it("F. maps a 429 provider failure to RATE_LIMIT (retryable)", async () => {
    mockCreate.mockRejectedValue(
      new OpenAI.APIError(429, undefined, "Rate limit reached", undefined)
    );

    const adapter = createOpenAIAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RATE_LIMIT");
    expect(result.error?.retryable).toBe(true);
  });

  it("G. maps a 5xx provider failure to SERVER_ERROR (retryable)", async () => {
    mockCreate.mockRejectedValue(
      new OpenAI.APIError(500, undefined, "Internal server error", undefined)
    );

    const adapter = createOpenAIAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("H. maps a connection timeout to TIMEOUT (retryable)", async () => {
    mockCreate.mockRejectedValue(new OpenAI.APIConnectionTimeoutError());

    const adapter = createOpenAIAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("I. never leaks credentials in the normalized result", async () => {
    mockCreate.mockRejectedValue(
      new OpenAI.APIError(
        401,
        undefined,
        "Incorrect API key provided: sk-abc123def456ghi789jkl012",
        undefined
      )
    );

    const adapter = createOpenAIAdapter();
    const result = await adapter.execute(makeRequest());

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("sk-abc123def456ghi789jkl012");
    expect(serialized).not.toContain(MOCK_API_KEY);
    expect(result.error?.message).toContain("[REDACTED]");
  });
});

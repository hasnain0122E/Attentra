/**
 * Attentra — Anthropic Execution Adapter Tests
 *
 * Phase 8 / Step 2 — Direct Provider Execution Activation
 *
 * Tests the full execution chain with the Anthropic SDK client mocked:
 *
 *   ExecutionRequest
 *     → AnthropicExecutionAdapter (BaseExecutionAdapter)
 *     → AnthropicProvider.generate()       [real]
 *     → @anthropic-ai/sdk messages.create  [MOCKED]
 *     → ExecutionResult
 *
 * Sections:
 *   A. Request mapping + response normalization (success)
 *   B. System message handling (top-level `system` param) + required max_tokens
 *   C. Missing API key → AUTHENTICATION
 *   D. 401 → AUTHENTICATION
 *   E. 429 → RATE_LIMIT
 *   F. 500 → SERVER_ERROR
 *   G. Timeout → TIMEOUT
 *   H. No credential leakage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import type { ExecutionRequest } from "@/lib/execution/types";
import { createAnthropicAdapter } from "@/lib/execution/providers/anthropic";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  // Class-based mock: supports `new Anthropic(...)` while re-exposing the
  // real error classes as statics so the provider's
  // `instanceof Anthropic.APIError` checks keep working.
  class MockAnthropicClient {
    static readonly APIError = actual.APIError;
    static readonly APIConnectionError = actual.APIConnectionError;
    static readonly APIConnectionTimeoutError =
      actual.APIConnectionTimeoutError;
    messages = { create: mockCreate };
  }
  return { ...actual, default: MockAnthropicClient } as unknown as typeof actual;
});

/** Fake key used ONLY for env stubbing — never sent anywhere (client is mocked). */
const MOCK_API_KEY = "sk-ant-unit-test-mock-key-000000000000";

function makeRequest(overrides?: Partial<ExecutionRequest>): ExecutionRequest {
  return {
    modelId: "anthropic-claude-haiku-3-5",
    providerId: "anthropic",
    modelIdentifier: "claude-3-5-haiku-20241022",
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
    maxTokens: 32,
    temperature: 0,
    requestId: "unit-test-anthropic-001",
    ...overrides,
  };
}

function mockSuccessResponse(overrides?: Record<string, unknown>) {
  return {
    id: "msg_unit_001",
    content: [{ type: "text", text: "OK" }],
    model: "claude-3-5-haiku-20241022",
    usage: { input_tokens: 12, output_tokens: 4 },
    stop_reason: "end_turn",
    ...overrides,
  };
}

describe("Anthropic Execution Adapter", () => {
  beforeEach(() => {
    // Deterministic key presence for the client-construction path, regardless
    // of whether real credentials exist in the environment.
    vi.stubEnv("ANTHROPIC_API_KEY", MOCK_API_KEY);
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("A. maps the request and normalizes a successful response", async () => {
    mockCreate.mockResolvedValue(mockSuccessResponse());

    const adapter = createAnthropicAdapter();
    const result = await adapter.execute(makeRequest());

    // The SDK receives the provider-native identifier and the required
    // Anthropic max_tokens parameter.
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 32,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      temperature: 0,
    });

    // Normalized ExecutionResult
    expect(result.success).toBe(true);
    expect(result.providerId).toBe("anthropic");
    expect(result.modelId).toBe("anthropic-claude-haiku-3-5");
    expect(result.providerRequestId).toBe("msg_unit_001");
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

  it("B. moves the system message to the top-level system parameter", async () => {
    mockCreate.mockResolvedValue(mockSuccessResponse());

    const adapter = createAnthropicAdapter();
    await adapter.execute(
      makeRequest({
        systemMessage: "You are terse.",
        maxTokens: undefined,
        temperature: undefined,
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
          { role: "user", content: "Bye" },
        ],
      })
    );

    // Anthropic requires the system prompt as a top-level parameter and
    // only user/assistant roles inside messages. max_tokens is required —
    // when the request has no budget the provider default (1024) is used.
    expect(mockCreate).toHaveBeenCalledWith({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: "You are terse.",
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
        { role: "user", content: "Bye" },
      ],
    });
  });

  it("C. returns AUTHENTICATION when the API key is not configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const adapter = createAnthropicAdapter();

    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
    expect(result.timestamp).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("D. maps a 401 provider failure to AUTHENTICATION", async () => {
    mockCreate.mockRejectedValue(
      new Anthropic.APIError(401, undefined, "invalid x-api-key", undefined)
    );

    const adapter = createAnthropicAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
    expect(result.timestamp).toBeTruthy();
  });

  it("E. maps a 429 provider failure to RATE_LIMIT (retryable)", async () => {
    mockCreate.mockRejectedValue(
      new Anthropic.APIError(429, undefined, "Number of requests exceeds quota", undefined)
    );

    const adapter = createAnthropicAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RATE_LIMIT");
    expect(result.error?.retryable).toBe(true);
  });

  it("F. maps a 5xx provider failure to SERVER_ERROR (retryable)", async () => {
    mockCreate.mockRejectedValue(
      new Anthropic.APIError(500, undefined, "Internal server error", undefined)
    );

    const adapter = createAnthropicAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("G. maps a connection timeout to TIMEOUT (retryable)", async () => {
    mockCreate.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());

    const adapter = createAnthropicAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("H. never leaks credentials in the normalized result", async () => {
    mockCreate.mockRejectedValue(
      new Anthropic.APIError(
        401,
        undefined,
        "invalid x-api-key: MOCK_API_KEY",
        undefined
      )
    );

    const adapter = createAnthropicAdapter();
    const result = await adapter.execute(makeRequest());

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("MOCK_API_KEY");
    expect(serialized).not.toContain(MOCK_API_KEY);
    expect(result.error?.message).toContain("[REDACTED]");
  });
});

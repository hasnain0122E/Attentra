/**
 * Attentra — Google (Gemini) Execution Adapter Tests
 *
 * Phase 8 / Step 2 — Direct Provider Execution Activation
 *
 * Tests the full execution chain with the Google SDK client mocked:
 *
 *   ExecutionRequest
 *     → GoogleExecutionAdapter (BaseExecutionAdapter)
 *     → GoogleProvider.generate()              [real]
 *     → @google/generative-ai generateContent  [MOCKED]
 *     → ExecutionResult
 *
 * Sections:
 *   A. Request mapping + response normalization (success)
 *   B. System instruction + assistant → model role mapping
 *   C. Missing API key → AUTHENTICATION
 *   D. Authentication failure → AUTHENTICATION
 *   E. Rate limit → RATE_LIMIT
 *   F. Server error → SERVER_ERROR
 *   G. Timeout → TIMEOUT
 *   H. No credential leakage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ExecutionRequest } from "@/lib/execution/types";
import { createGoogleAdapter } from "@/lib/execution/providers/google";

const { mockGetGenerativeModel, mockGenerateContent } = vi.hoisted(() => ({
  mockGetGenerativeModel: vi.fn(),
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/generative-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/generative-ai")>();
  // Class-based mock: supports `new GoogleGenerativeAI(apiKey)`. Google
  // errors are normalized by message text (no instanceof checks), so no
  // static error classes are needed on the mock.
  class MockGoogleGenerativeAI {
    getGenerativeModel = mockGetGenerativeModel;
  }
  return {
    ...actual,
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  } as unknown as typeof actual;
});

/** Fake key used ONLY for env stubbing — never sent anywhere (client is mocked). */
const MOCK_API_KEY = "google-unit-test-mock-key-000000";

function makeRequest(overrides?: Partial<ExecutionRequest>): ExecutionRequest {
  return {
    modelId: "google-gemini-2.0-flash",
    providerId: "google",
    modelIdentifier: "gemini-2.0-flash",
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
    maxTokens: 32,
    temperature: 0,
    requestId: "unit-test-google-001",
    ...overrides,
  };
}

function mockSuccessResult(overrides?: Record<string, unknown>) {
  return {
    response: {
      text: () => "OK",
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4 },
      candidates: [{ finishReason: "STOP" }],
      ...overrides,
    },
  };
}

describe("Google Execution Adapter", () => {
  beforeEach(() => {
    // Deterministic key presence for the client-construction path, regardless
    // of whether real credentials exist in the environment.
    vi.stubEnv("GOOGLE_AI_API_KEY", MOCK_API_KEY);
    mockGetGenerativeModel.mockReset();
    mockGetGenerativeModel.mockImplementation(() => ({
      generateContent: mockGenerateContent,
    }));
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("A. maps the request and normalizes a successful response", async () => {
    mockGenerateContent.mockResolvedValue(mockSuccessResult());

    const adapter = createGoogleAdapter();
    const result = await adapter.execute(makeRequest());

    // The SDK receives the provider-native identifier via getGenerativeModel
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1);
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 32, temperature: 0 },
    });

    // Conversation is translated to Google's contents format
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith({
      contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
    });

    // Normalized ExecutionResult
    expect(result.success).toBe(true);
    expect(result.providerId).toBe("google");
    expect(result.modelId).toBe("google-gemini-2.0-flash");
    expect(result.providerRequestId).toBeTruthy();
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

  it("B. maps system messages to systemInstruction and assistant to model role", async () => {
    mockGenerateContent.mockResolvedValue(mockSuccessResult());

    const adapter = createGoogleAdapter();
    await adapter.execute(
      makeRequest({
        systemMessage: "You are terse.",
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
          { role: "user", content: "Bye" },
        ],
        temperature: undefined,
      })
    );

    // System prompt becomes a Google systemInstruction parameter
    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.0-flash",
        systemInstruction: "You are terse.",
        generationConfig: expect.objectContaining({ maxOutputTokens: 32 }),
      })
    );

    // "assistant" is translated to Google's "model" role
    expect(mockGenerateContent).toHaveBeenCalledWith({
      contents: [
        { role: "user", parts: [{ text: "Hi" }] },
        { role: "model", parts: [{ text: "Hello!" }] },
        { role: "user", parts: [{ text: "Bye" }] },
      ],
    });
  });

  it("C. returns AUTHENTICATION when the API key is not configured", async () => {
    vi.stubEnv("GOOGLE_AI_API_KEY", "");
    const adapter = createGoogleAdapter();

    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
    expect(result.timestamp).toBeTruthy();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("D. maps an invalid-key provider failure to AUTHENTICATION", async () => {
    mockGenerateContent.mockRejectedValue(
      new Error("API key not valid. Please pass a valid API key.")
    );

    const adapter = createGoogleAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTHENTICATION");
    expect(result.error?.retryable).toBe(false);
    expect(result.timestamp).toBeTruthy();
  });

  it("E. maps a quota provider failure to RATE_LIMIT (retryable)", async () => {
    mockGenerateContent.mockRejectedValue(
      new Error("429 Quota exceeded for generateContent")
    );

    const adapter = createGoogleAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RATE_LIMIT");
    expect(result.error?.retryable).toBe(true);
  });

  it("F. maps a server provider failure to SERVER_ERROR (retryable)", async () => {
    mockGenerateContent.mockRejectedValue(
      new Error("500 Internal error encountered")
    );

    const adapter = createGoogleAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SERVER_ERROR");
    expect(result.error?.retryable).toBe(true);
  });

  it("G. maps a deadline provider failure to TIMEOUT (retryable)", async () => {
    mockGenerateContent.mockRejectedValue(
      new Error("Request timeout: deadline exceeded")
    );

    const adapter = createGoogleAdapter();
    const result = await adapter.execute(makeRequest());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("H. never leaks credentials in the normalized result", async () => {
    mockGenerateContent.mockRejectedValue(
      new Error("API key not valid: sk-abc123def456ghi789jkl012")
    );

    const adapter = createGoogleAdapter();
    const result = await adapter.execute(makeRequest());

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("sk-abc123def456ghi789jkl012");
    expect(serialized).not.toContain(MOCK_API_KEY);
    expect(result.error?.message).toContain("[REDACTED]");
  });
});

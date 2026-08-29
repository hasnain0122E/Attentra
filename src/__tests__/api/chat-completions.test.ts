/**
 * Attentra — Chat Completions API Tests
 *
 * Phase 7 / Step 5 — Consumer Execution API
 *
 * Focused test suite for POST /api/v1/chat/completions:
 *
 * 1–5.   Request validation (400 errors)
 * 6–7.   Request ID preservation / generation
 * 8.     Successful execution → normalized response
 * 9.     Execution failure → structured error
 * 10.    No credential leakage
 * 11–12. Architecture compliance (no SDK, no direct calls)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import { validateChatRequest } from "@/app/api/v1/chat/completions/validation";
import type { ExecutionPlan } from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// MODULE MOCKS
// ─────────────────────────────────────────────────────

const { mockRouteAndPersist, mockPrepareExecutionFlow, mockExecute } =
  vi.hoisted(() => ({
    mockRouteAndPersist: vi.fn(),
    mockPrepareExecutionFlow: vi.fn(),
    mockExecute: vi.fn(),
  }));

vi.mock("@/lib/routing", () => ({
  routeAndPersist: mockRouteAndPersist,
  prepareExecutionFlow: mockPrepareExecutionFlow,
}));

vi.mock("@/lib/execution", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/execution")>(
      "@/lib/execution"
    );
  // Use a class mock so `new ExecutionOrchestrator()` works correctly
  class MockOrchestrator {
    execute(...args: unknown[]) {
      return mockExecute(...args);
    }
  }
  return {
    ...actual,
    ExecutionOrchestrator: MockOrchestrator,
  };
});

// ─────────────────────────────────────────────────────
// IMPORTS (after mocks)
// ─────────────────────────────────────────────────────

import { POST } from "@/app/api/v1/chat/completions/route";

// ─────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

const VALID_MESSAGES = [{ role: "user", content: "Hello" }];

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

/** Minimal valid ExecutionPlan for prepareExecutionFlow mock. */
function makeMockPlan(): ExecutionPlan {
  return {
    requestId: "test-req",
    taskType: "GENERAL",
    complexity: "LOW",
    primary: {
      entryId: "primary",
      modelId: "mock-model",
      providerId: "mock",
      providerName: "Mock",
      modelIdentifier: "mock-id",
      displayName: "Mock Model",
      projectedCost: 0.001,
      routingScore: 0.85,
    },
    fallbacks: [],
    estimatedInputTokens: 100,
    estimatedOutputTokens: 50,
    projectedCost: 0.001,
    routingScore: 0.85,
    routingExplanation: "Test",
    status: "NOT_EXECUTED",
    createdAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────
// 1–5. VALIDATION
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Validation", () => {
  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/chat/completions",
      {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "not json",
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await parseJson(res);
    expect(data.success).toBe(false);
  });

  it("returns 400 for empty messages array", async () => {
    const result = validateChatRequest({ messages: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => /not be empty/.test(e))).toBe(true);
    }
  });

  it("returns 400 for invalid message role", async () => {
    const result = validateChatRequest({
      messages: [{ role: "invalid", content: "hello" }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => /role/.test(e))).toBe(true);
    }
  });

  it("returns 400 for empty message content", async () => {
    const result = validateChatRequest({
      messages: [{ role: "user", content: "  " }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => /content/.test(e))).toBe(true);
    }
  });

  it("returns 400 for invalid maxTokens", async () => {
    const neg = validateChatRequest({
      messages: VALID_MESSAGES,
      maxTokens: -1,
    });
    expect(neg.valid).toBe(false);

    const float = validateChatRequest({
      messages: VALID_MESSAGES,
      maxTokens: 1.5,
    });
    expect(float.valid).toBe(false);

    const zero = validateChatRequest({
      messages: VALID_MESSAGES,
      maxTokens: 0,
    });
    expect(zero.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// 6–7. REQUEST ID
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Request ID", () => {
  it("preserves client-supplied requestId", async () => {
    mockRouteAndPersist.mockResolvedValue({
      success: false,
      error: "No models",
      errorCode: "NO_ACTIVE_MODELS",
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "client-req-123",
    });
    const res = await POST(req);
    const data = await parseJson(res);
    expect(data.requestId).toBe("client-req-123");
  });

  it("generates requestId when none provided", async () => {
    mockRouteAndPersist.mockResolvedValue({
      success: false,
      error: "No models",
      errorCode: "NO_ACTIVE_MODELS",
    });

    const req = makeRequest({ messages: VALID_MESSAGES });
    const res = await POST(req);
    const data = await parseJson(res);
    expect(data.requestId).toBeDefined();
    expect(typeof data.requestId).toBe("string");
    expect((data.requestId as string).length).toBeGreaterThan(0);
    expect((data.requestId as string).startsWith("req_")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 8. EXECUTION SUCCESS
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Execution", () => {
  it("returns normalized success response on successful execution", async () => {
    // Mock routing success
    mockRouteAndPersist.mockResolvedValue({
      success: true,
      decision: {
        taskType: "GENERAL",
        complexity: "LOW",
        tokenEstimate: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        candidates: [],
        selected: {},
        fallbacks: [],
        rejected: [],
        reason: "test",
        timestamp: new Date(),
      },
      persisted: { success: true, decisionId: "dec-1" },
    });

    // Mock execution flow preparation
    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    // Mock orchestrator success
    mockExecute.mockResolvedValue({
      success: true,
      providerId: "blueminds",
      modelId: "mock-model-1",
      content: "Hello from Attentra!",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      latencyMs: 420,
      actualCost: undefined,
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "success-test",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("success-test");
    expect(data.content).toBe("Hello from Attentra!");
    expect(data.model).toBe("mock-model-1");
    expect(data.usage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
    expect(data.latencyMs).toBe(420);
    expect(data.timestamp).toBeDefined();
    // actualCost is undefined → should be omitted or null
    expect(data.actualCost).toBeUndefined();
  });

  // ───────────────────────────────────────────────────
  // 9. EXECUTION FAILURE
  // ───────────────────────────────────────────────────

  it("returns structured error response on execution failure", async () => {
    mockRouteAndPersist.mockResolvedValue({
      success: true,
      decision: {
        taskType: "GENERAL",
        complexity: "LOW",
        tokenEstimate: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        candidates: [],
        selected: {},
        fallbacks: [],
        rejected: [],
        reason: "test",
        timestamp: new Date(),
      },
    });

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    // Mock orchestrator failure
    mockExecute.mockResolvedValue({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Provider returned 500",
        retryable: true,
      },
      latencyMs: 5000,
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [],
    });

    const req = makeRequest({ messages: VALID_MESSAGES });
    const res = await POST(req);

    // SERVER_ERROR maps to 502
    expect(res.status).toBe(502);
    const data = await parseJson(res);
    expect(data.success).toBe(false);
    expect(data.requestId).toBeDefined();
    const err = data.error as Record<string, unknown>;
    expect(err.code).toBe("SERVER_ERROR");
    expect(typeof err.message).toBe("string");
    expect(err.retryable).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 10. SECURITY
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Security", () => {
  it("never exposes credentials in error responses", async () => {
    mockRouteAndPersist.mockResolvedValue({
      success: true,
      decision: {
        taskType: "GENERAL",
        complexity: "LOW",
        tokenEstimate: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        candidates: [],
        selected: {},
        fallbacks: [],
        rejected: [],
        reason: "test",
        timestamp: new Date(),
      },
    });

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    // Simulate an error message that contains leaked credentials
    mockExecute.mockResolvedValue({
      success: false,
      error: {
        code: "AUTHENTICATION",
        message:
          "Unauthorized: Bearer sk-1234567890abcdefghijklmnopqrst",
        retryable: false,
      },
      latencyMs: 100,
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [],
    });

    const req = makeRequest({ messages: VALID_MESSAGES });
    const res = await POST(req);
    const text = await res.text();

    // The raw API key must NEVER appear in the response
    expect(text).not.toContain("sk-1234567890abcdefghijklmnopqrst");
    // Bearer tokens should be redacted
    expect(text).not.toContain("Bearer sk-");
  });
});

// ─────────────────────────────────────────────────────
// 11–12. ARCHITECTURE COMPLIANCE
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Architecture", () => {
  const routeSource = readFileSync(
    join(
      process.cwd(),
      "src",
      "app",
      "api",
      "v1",
      "chat",
      "completions",
      "route.ts"
    ),
    "utf-8"
  );

  it("does not import any provider SDK", () => {
    expect(routeSource).not.toContain("openai");
    expect(routeSource).not.toContain("@anthropic-ai");
    expect(routeSource).not.toContain("@google/generative-ai");
    expect(routeSource).not.toContain("blueminds");
  });

  it("does not call any provider API directly", () => {
    expect(routeSource).not.toContain("api.bluesminds.com");
    expect(routeSource).not.toContain("api.openai.com");
    expect(routeSource).not.toContain("api.anthropic.com");
    // No direct fetch to provider endpoints
    expect(routeSource).not.toMatch(/fetch\s*\(\s*["'`]https?:/);
  });

  it("delegates to existing routing and execution architecture", () => {
    expect(routeSource).toContain("routeAndPersist");
    expect(routeSource).toContain("prepareExecutionFlow");
    expect(routeSource).toContain("ExecutionOrchestrator");
  });

  it("does not implement its own retry/fallback loop", () => {
    // No while/for retry patterns in the route
    expect(routeSource).not.toMatch(/while\s*\(/);
    expect(routeSource).not.toMatch(/for\s*\(/);
    // No re-routing or re-scoring
    expect(routeSource).not.toContain("scoreCandidates");
    expect(routeSource).not.toContain("filterCandidates");
    expect(routeSource).not.toContain("orderFallbacks");
  });
});

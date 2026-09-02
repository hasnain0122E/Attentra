/**
 * Attentra — Chat Completions API Tests
 *
 * Consumer Execution API
 *
 * Focused test suite for POST /api/v1/chat/completions:
 *
 * - Authentication
 * - Request validation
 * - Request ID preservation / generation
 * - Consumer request ownership
 * - Successful execution → normalized response
 * - Request-level cost persistence
 * - Execution failure → structured error
 * - Credential sanitization
 * - Architecture compliance
 */

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";

import { validateChatRequest } from "@/app/api/v1/chat/completions/validation";
import type { ExecutionPlan } from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// HOISTED MOCKS
// ─────────────────────────────────────────────────────

const {
  mockResolveRequester,
  mockRouteAndPersist,
  mockPrepareExecutionFlow,
  mockExecute,
  mockRequestUpdate,
  mockPersistRequestCostIntelligence,
} = vi.hoisted(() => ({
  mockResolveRequester: vi.fn(),

  mockRouteAndPersist: vi.fn(),
  mockPrepareExecutionFlow: vi.fn(),
  mockExecute: vi.fn(),

  mockRequestUpdate: vi.fn(),

  mockPersistRequestCostIntelligence: vi.fn(),
}));

// ─────────────────────────────────────────────────────
// MODULE MOCKS
// ─────────────────────────────────────────────────────

/**
 * Mock the unified requester resolver (Phase 12.3).
 *
 * By default returns a session-authenticated requester.
 * Individual tests can override for API key or unauthenticated scenarios.
 */
vi.mock("@/lib/auth/resolve-requester", () => ({
  resolveRequester: mockResolveRequester,
}));

/**
 * Routing remains fully mocked.
 */
vi.mock("@/lib/routing", () => ({
  routeAndPersist: mockRouteAndPersist,
  prepareExecutionFlow: mockPrepareExecutionFlow,
}));

/**
 * Mock only the Prisma boundary used directly by the route.
 */
vi.mock("@/lib/prisma", () => ({
  prisma: {
    request: {
      update: mockRequestUpdate,
    },
  },
}));

/**
 * Cost intelligence is tested separately.
 *
 * The API test only verifies that the route delegates to the
 * cost-intelligence persistence boundary with the correct data.
 */
vi.mock("@/lib/cost-intelligence", () => ({
  persistRequestCostIntelligence:
    mockPersistRequestCostIntelligence,
}));

/**
 * Preserve the real execution helpers such as sanitizeErrorMessage(),
 * while replacing ExecutionOrchestrator with a deterministic mock.
 */
vi.mock("@/lib/execution", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/execution")>(
      "@/lib/execution",
    );

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
// ROUTE IMPORT
// ─────────────────────────────────────────────────────

import { POST } from "@/app/api/v1/chat/completions/route";

// ─────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  /**
   * All tests are authenticated by default (session auth).
   *
   * Individual authentication tests can override this.
   */
  mockResolveRequester.mockResolvedValue({
    authType: "session",
    userId: "test-user-id",
    businessId: null,
    apiKeyId: null,
  });

  mockRequestUpdate.mockResolvedValue({});

  mockPersistRequestCostIntelligence.mockResolvedValue({
    persisted: true,
    reason: "BASELINE_NOT_CONFIGURED",
  });
});

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

const VALID_MESSAGES = [
  {
    role: "user",
    content: "Hello",
  },
];

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "content-type": "application/json",
      },

      body: JSON.stringify(body),
    },
  );
}

async function parseJson(
  response: Response,
): Promise<Record<string, unknown>> {
  return response.json() as Promise<
    Record<string, unknown>
  >;
}

/**
 * Minimal valid ExecutionPlan for prepareExecutionFlow mock.
 */
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

    routingExplanation: "Test routing decision",

    status: "NOT_EXECUTED",

    createdAt: new Date(),
  };
}

function makeRoutingSuccess() {
  return {
    success: true,

    decision: {
      taskType: "GENERAL",
      complexity: "LOW",

      tokenEstimate: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },

      candidates: [],
      selected: {},
      fallbacks: [],
      rejected: [],

      reason: "test",
      timestamp: new Date(),
    },

    persisted: {
      success: true,
      decisionId: "dec-1",
    },
  };
}

// ─────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Authentication", () => {
  it("returns 401 when no authenticated user exists", async () => {
    mockResolveRequester.mockResolvedValue({
      authType: "none",
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
    });

    const res = await POST(req);
    const data = await parseJson(res);

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);

    const error = data.error as Record<
      string,
      unknown
    >;

    expect(error.code).toBe("AUTHENTICATION");
    expect(error.message).toBe(
      "Authentication required",
    );

    expect(
      mockRouteAndPersist,
    ).not.toHaveBeenCalled();

    expect(
      mockExecute,
    ).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Validation", () => {
  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "content-type": "text/plain",
        },

        body: "not json",
      },
    );

    const res = await POST(req);

    expect(res.status).toBe(400);

    const data = await parseJson(res);

    expect(data.success).toBe(false);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "content-type": "application/json",
        },

        body: "{ invalid json",
      },
    );

    const res = await POST(req);

    expect(res.status).toBe(400);

    const data = await parseJson(res);

    expect(data.success).toBe(false);

    const error = data.error as Record<
      string,
      unknown
    >;

    expect(error.code).toBe("INVALID_REQUEST");
  });

  it("returns invalid validation result for empty messages array", () => {
    const result = validateChatRequest({
      messages: [],
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(
        result.errors.some((error) =>
          /not be empty/.test(error),
        ),
      ).toBe(true);
    }
  });

  it("returns invalid validation result for invalid message role", () => {
    const result = validateChatRequest({
      messages: [
        {
          role: "invalid",
          content: "hello",
        },
      ],
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(
        result.errors.some((error) =>
          /role/.test(error),
        ),
      ).toBe(true);
    }
  });

  it("returns invalid validation result for empty message content", () => {
    const result = validateChatRequest({
      messages: [
        {
          role: "user",
          content: "  ",
        },
      ],
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(
        result.errors.some((error) =>
          /content/.test(error),
        ),
      ).toBe(true);
    }
  });

  it("returns invalid validation result for invalid maxTokens", () => {
    const negative = validateChatRequest({
      messages: VALID_MESSAGES,
      maxTokens: -1,
    });

    expect(negative.valid).toBe(false);

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
// REQUEST ID
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

    expect(data.requestId).toBe(
      "client-req-123",
    );
  });

  it("generates requestId when none is provided", async () => {
    mockRouteAndPersist.mockResolvedValue({
      success: false,
      error: "No models",
      errorCode: "NO_ACTIVE_MODELS",
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
    });

    const res = await POST(req);
    const data = await parseJson(res);

    expect(data.requestId).toBeDefined();

    expect(typeof data.requestId).toBe(
      "string",
    );

    expect(
      (data.requestId as string).length,
    ).toBeGreaterThan(0);

    expect(
      (data.requestId as string).startsWith(
        "req_",
      ),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// CONSUMER OWNERSHIP
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Consumer Ownership", () => {
  it("attaches authenticated userId to the persisted request", async () => {
    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),

      validation: {
        valid: true,
        errors: [],
      },
    });

    mockExecute.mockResolvedValue({
      success: false,

      error: {
        code: "SERVER_ERROR",
        message: "Provider error",
        retryable: false,
      },

      latencyMs: 100,

      timestamp:
        "2026-01-01T00:00:00.000Z",

      executionAttempts: [],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "ownership-test",
    });

    await POST(req);

    expect(
      mockRequestUpdate,
    ).toHaveBeenCalledWith({
      where: {
        id: "ownership-test",
      },

      data: {
        userId: "test-user-id",
      },
    });
  });

  it("does not attach ownership when routing fails", async () => {
    mockRouteAndPersist.mockResolvedValue({
      success: false,

      error: "No compatible models",
      errorCode: "NO_COMPATIBLE_MODELS",
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
    });

    await POST(req);

    expect(
      mockRequestUpdate,
    ).not.toHaveBeenCalled();
  });

  it("attaches businessId and apiKeyId for API-key authenticated requests", async () => {
    mockResolveRequester.mockResolvedValue({
      authType: "apiKey",
      userId: null,
      businessId: "biz-42",
      apiKeyId: "key-7",
    });

    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    mockExecute.mockResolvedValue({
      success: false,
      error: { code: "SERVER_ERROR", message: "err", retryable: false },
      latencyMs: 100,
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "apikey-ownership",
    });

    await POST(req);

    expect(
      mockRequestUpdate,
    ).toHaveBeenCalledWith({
      where: { id: "apikey-ownership" },
      data: {
        businessId: "biz-42",
        apiKeyId: "key-7",
        userId: null,
      },
    });
  });

  it("sets userId=null for API-key requests (no invented user)", async () => {
    mockResolveRequester.mockResolvedValue({
      authType: "apiKey",
      userId: null,
      businessId: "biz-1",
      apiKeyId: "key-1",
    });

    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    mockExecute.mockResolvedValue({
      success: false,
      error: { code: "SERVER_ERROR", message: "err", retryable: false },
      latencyMs: 100,
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "no-user-test",
    });

    await POST(req);

    const call = mockRequestUpdate.mock.calls[0][0];
    expect(call.data.userId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────
// API KEY AUTHENTICATION
// ─────────────────────────────────────────────────────

describe("Chat Completions API — API Key Auth", () => {
  it("allows request with valid API key (session absent)", async () => {
    mockResolveRequester.mockResolvedValue({
      authType: "apiKey",
      userId: null,
      businessId: "biz-1",
      apiKeyId: "key-1",
    });

    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    mockExecute.mockResolvedValue({
      success: true,
      providerId: "openai",
      modelId: "model-1",
      content: "API key response",
      usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8 },
      latencyMs: 200,
      actualCost: 0.0001,
      attempts: 1,
      fallback: { used: false },
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [
        { success: true, providerId: "openai", modelId: "model-1", modelIdentifier: "gpt-4" },
      ],
    });

    const req = makeRequest({ messages: VALID_MESSAGES });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data.success).toBe(true);
  });

  it("rejects request when resolver returns none", async () => {
    mockResolveRequester.mockResolvedValue({
      authType: "none",
    });

    const req = makeRequest({ messages: VALID_MESSAGES });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await parseJson(res);
    expect(data.success).toBe(false);

    const error = data.error as Record<string, unknown>;
    expect(error.code).toBe("AUTHENTICATION");

    expect(mockRouteAndPersist).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("routing and execution behavior remains intact with API key auth", async () => {
    mockResolveRequester.mockResolvedValue({
      authType: "apiKey",
      userId: null,
      businessId: "biz-1",
      apiKeyId: "key-1",
    });

    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    mockExecute.mockResolvedValue({
      success: true,
      providerId: "anthropic",
      modelId: "model-x",
      content: "Routed and executed via API key",
      usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
      latencyMs: 350,
      actualCost: 0.0005,
      attempts: 1,
      fallback: { used: false },
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [
        { success: true, providerId: "anthropic", modelId: "model-x", modelIdentifier: "claude-x" },
      ],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "full-pipeline-apikey",
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await parseJson(res);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("full-pipeline-apikey");
    expect(data.content).toBe("Routed and executed via API key");

    expect(mockRouteAndPersist).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// EXECUTION SUCCESS
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Execution", () => {
  it("returns normalized routing and execution data on success", async () => {
    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),

      validation: {
        valid: true,
        errors: [],
      },
    });

    mockExecute.mockResolvedValue({
      success: true,

      providerId: "anthropic",
      modelId: "mock-model-1",

      content: "Hello from Attentra!",

      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },

      latencyMs: 420,
      actualCost: 0.00042,

      attempts: 1,

      fallback: {
        used: false,
      },

      timestamp:
        "2026-01-01T00:00:00.000Z",

      executionAttempts: [
        {
          success: true,
          providerId: "anthropic",
          modelId: "mock-model-1",
          modelIdentifier:
            "claude-test-model",
        },
      ],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "success-test",
    });

    const res = await POST(req);

    expect(res.status).toBe(200);

    const data = await parseJson(res);

    expect(data.success).toBe(true);

    expect(data.requestId).toBe(
      "success-test",
    );

    expect(data.content).toBe(
      "Hello from Attentra!",
    );

    const routing = data.routing as Record<
      string,
      unknown
    >;

    expect(routing.selectedModelId).toBe(
      "mock-model",
    );

    expect(
      routing.selectedModelIdentifier,
    ).toBe("mock-id");

    expect(
      routing.selectedModelDisplayName,
    ).toBe("Mock Model");

    expect(routing.selectedProvider).toBe(
      "mock",
    );

    expect(routing.taskType).toBe(
      "GENERAL",
    );

    expect(routing.complexity).toBe(
      "LOW",
    );

    expect(routing.projectedCost).toBe(
      0.001,
    );

    const execution =
      data.execution as Record<
        string,
        unknown
      >;

    expect(execution.modelId).toBe(
      "mock-model-1",
    );

    expect(
      execution.modelIdentifier,
    ).toBe("claude-test-model");

    expect(execution.provider).toBe(
      "anthropic",
    );

    expect(execution.fallbackUsed).toBe(
      false,
    );

    expect(execution.usage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });

    expect(execution.latencyMs).toBe(
      420,
    );

    expect(execution.actualCost).toBe(
      0.00042,
    );

    expect(data.timestamp).toBeDefined();
  });

  it("persists cost intelligence after successful execution", async () => {
    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),

      validation: {
        valid: true,
        errors: [],
      },
    });

    mockExecute.mockResolvedValue({
      success: true,

      providerId: "anthropic",
      modelId: "executed-model",

      content: "Done",

      usage: {
        inputTokens: 100,
        outputTokens: 25,
        totalTokens: 125,
      },

      latencyMs: 300,
      actualCost: 0.0042,

      attempts: 1,

      fallback: {
        used: false,
      },

      timestamp:
        "2026-01-01T00:00:00.000Z",

      executionAttempts: [
        {
          success: true,
          providerId: "anthropic",
          modelId: "executed-model",
          modelIdentifier:
            "executed-model-id",
        },
      ],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "cost-test",
    });

    const res = await POST(req);

    expect(res.status).toBe(200);

    expect(
      mockPersistRequestCostIntelligence,
    ).toHaveBeenCalledWith(
      expect.anything(),
      {
        requestId: "cost-test",

        executedModelId:
          "executed-model",

        usage: {
          inputTokens: 100,
          outputTokens: 25,
        },

        actualCost: 0.0042,
      },
    );
  });

  it("persists real execution latencyMs to the Request record on success", async () => {
    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    mockExecute.mockResolvedValue({
      success: true,
      providerId: "anthropic",
      modelId: "latency-model",
      content: "Latency test response",
      usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
      latencyMs: 842,
      actualCost: 0.001,
      attempts: 1,
      fallback: { used: false },
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [
        {
          success: true,
          providerId: "anthropic",
          modelId: "latency-model",
          modelIdentifier: "latency-model-id",
        },
      ],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "latency-test",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify that prisma.request.update was called with latencyMs
    const updateCalls = mockRequestUpdate.mock.calls;
    const latencyUpdate = updateCalls.find(
      (call: unknown[]) =>
        call[0] &&
        typeof call[0] === "object" &&
        (call[0] as Record<string, unknown>).data &&
        typeof (call[0] as Record<string, unknown>).data === "object" &&
        "latencyMs" in ((call[0] as Record<string, unknown>).data as Record<string, unknown>),
    );

    expect(latencyUpdate).toBeDefined();
    expect((latencyUpdate![0] as { data: { latencyMs: number } }).data.latencyMs).toBe(842);
  });

  it("persists latencyMs as null when orchestrator returns no latency", async () => {
    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),
      validation: { valid: true, errors: [] },
    });

    mockExecute.mockResolvedValue({
      success: true,
      providerId: "anthropic",
      modelId: "no-latency-model",
      content: "No latency response",
      usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
      actualCost: 0.001,
      attempts: 1,
      fallback: { used: false },
      timestamp: "2026-01-01T00:00:00.000Z",
      executionAttempts: [
        {
          success: true,
          providerId: "anthropic",
          modelId: "no-latency-model",
          modelIdentifier: "no-latency-model-id",
        },
      ],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
      requestId: "no-latency-test",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify that prisma.request.update was called with latencyMs: null
    const updateCalls = mockRequestUpdate.mock.calls;
    const latencyUpdate = updateCalls.find(
      (call: unknown[]) =>
        call[0] &&
        typeof call[0] === "object" &&
        (call[0] as Record<string, unknown>).data &&
        typeof (call[0] as Record<string, unknown>).data === "object" &&
        "latencyMs" in ((call[0] as Record<string, unknown>).data as Record<string, unknown>),
    );

    expect(latencyUpdate).toBeDefined();
    expect((latencyUpdate![0] as { data: { latencyMs: null } }).data.latencyMs).toBeNull();
  });

  it("does not persist cost intelligence when execution fails", async () => {
    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),

      validation: {
        valid: true,
        errors: [],
      },
    });

    mockExecute.mockResolvedValue({
      success: false,

      error: {
        code: "SERVER_ERROR",
        message: "Provider returned 500",
        retryable: true,
      },

      latencyMs: 5000,

      timestamp:
        "2026-01-01T00:00:00.000Z",

      executionAttempts: [],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
    });

    await POST(req);

    expect(
      mockPersistRequestCostIntelligence,
    ).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────
  // EXECUTION FAILURE
  // ───────────────────────────────────────────────────

  it("returns structured error response on execution failure", async () => {
    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),

      validation: {
        valid: true,
        errors: [],
      },
    });

    mockExecute.mockResolvedValue({
      success: false,

      error: {
        code: "SERVER_ERROR",
        message: "Provider returned 500",
        retryable: true,
      },

      latencyMs: 5000,

      timestamp:
        "2026-01-01T00:00:00.000Z",

      executionAttempts: [],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
    });

    const res = await POST(req);

    expect(res.status).toBe(502);

    const data = await parseJson(res);

    expect(data.success).toBe(false);
    expect(data.requestId).toBeDefined();

    const error = data.error as Record<
      string,
      unknown
    >;

    expect(error.code).toBe(
      "SERVER_ERROR",
    );

    expect(typeof error.message).toBe(
      "string",
    );

    expect(error.retryable).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// ROUTING FAILURE
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Routing Failure", () => {
  it("returns routing errors without executing a provider", async () => {
    mockRouteAndPersist.mockResolvedValue({
      success: false,

      error: "No active models",
      errorCode: "NO_ACTIVE_MODELS",
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
    });

    const res = await POST(req);

    expect(res.status).toBe(400);

    expect(
      mockPrepareExecutionFlow,
    ).not.toHaveBeenCalled();

    expect(
      mockExecute,
    ).not.toHaveBeenCalled();

    expect(
      mockPersistRequestCostIntelligence,
    ).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────────────

describe("Chat Completions API — Security", () => {
  it("never exposes credentials in error responses", async () => {
    mockRouteAndPersist.mockResolvedValue(
      makeRoutingSuccess(),
    );

    mockPrepareExecutionFlow.mockReturnValue({
      status: "NOT_EXECUTED",
      plan: makeMockPlan(),

      validation: {
        valid: true,
        errors: [],
      },
    });

    mockExecute.mockResolvedValue({
      success: false,

      error: {
        code: "AUTHENTICATION",

        message:
          "Unauthorized: Bearer test-secret-token-value",

        retryable: false,
      },

      latencyMs: 100,

      timestamp:
        "2026-01-01T00:00:00.000Z",

      executionAttempts: [],
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
    });

    const res = await POST(req);
    const text = await res.text();

    expect(text).not.toContain(
      "test-secret-token-value",
    );

    expect(text).not.toContain(
      "Bearer test-secret-token-value",
    );
  });

  it("does not route unauthenticated requests", async () => {
    mockResolveRequester.mockResolvedValue({
      authType: "none",
    });

    const req = makeRequest({
      messages: VALID_MESSAGES,
    });

    const res = await POST(req);

    expect(res.status).toBe(401);

    expect(
      mockRouteAndPersist,
    ).not.toHaveBeenCalled();

    expect(
      mockRequestUpdate,
    ).not.toHaveBeenCalled();

    expect(
      mockExecute,
    ).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// ARCHITECTURE COMPLIANCE
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
      "route.ts",
    ),
    "utf-8",
  );

  it("does not import any provider SDK", () => {
    expect(routeSource).not.toContain(
      'from "openai"',
    );

    expect(routeSource).not.toContain(
      "@anthropic-ai/sdk",
    );

    expect(routeSource).not.toContain(
      "@google/generative-ai",
    );
  });

  it("does not call any provider API directly", () => {
    expect(routeSource).not.toContain(
      "api.bluesminds.com",
    );

    expect(routeSource).not.toContain(
      "api.openai.com",
    );

    expect(routeSource).not.toContain(
      "api.anthropic.com",
    );

    expect(routeSource).not.toMatch(
      /fetch\s*\(\s*["'`]https?:/,
    );
  });

  it("delegates to the existing routing and execution architecture", () => {
    expect(routeSource).toContain(
      "routeAndPersist",
    );

    expect(routeSource).toContain(
      "prepareExecutionFlow",
    );

    expect(routeSource).toContain(
      "ExecutionOrchestrator",
    );
  });

  it("delegates request cost persistence to cost intelligence", () => {
    expect(routeSource).toContain(
      "persistRequestCostIntelligence",
    );
  });

  it("uses the unified requester resolver for authentication", () => {
    expect(routeSource).toContain(
      "resolveRequester",
    );
  });

  it("does not implement its own retry or fallback loop", () => {
    expect(routeSource).not.toMatch(
      /while\s*\(/,
    );

    expect(routeSource).not.toMatch(
      /for\s*\(/,
    );

    expect(routeSource).not.toContain(
      "scoreCandidates",
    );

    expect(routeSource).not.toContain(
      "filterCandidates",
    );

    expect(routeSource).not.toContain(
      "orderFallbacks",
    );
  });
});
/**
 * Attentra — Routing Step 3 Unit Tests (Mocked)
 *
 * Phase 6 / Step 3 — Production Routing Validation + Decision Persistence
 *
 * Tests the persistence layer and routeAndPersist() using mocked Prisma.
 * Real database integration tests are in routing-integration.test.ts.
 *
 * Mocking strategy:
 *   - @prisma/client/runtime/library: Decimal and InputJsonValue types
 *   - @/lib/prisma: Prisma singleton with mock functions
 *   - @/lib/routing/database: loadRoutingCandidates returns test fixtures
 *
 * Tests:
 * - Persistence (success, duplicate, failure, empty requestId)
 * - routeAndPersist (routing + persistence flow)
 * - Error handling (no candidates, DB load failure, persistence failure)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────

// Use vi.hoisted() so mock functions are available to vi.mock factories
const {
  mockFindUnique,
  mockRequestUpsert,
  mockDecisionCreate,
  mockDecisionUpsert,
  mockTransaction,
  mockDecisionFindUnique,
  mockLoadCandidates,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockRequestUpsert: vi.fn(),
  mockDecisionCreate: vi.fn(),
  mockDecisionUpsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockDecisionFindUnique: vi.fn(),
  mockLoadCandidates: vi.fn(),
}));

// Mock Prisma Decimal — just stores the value
vi.mock("@prisma/client/runtime/library", () => {
  class MockDecimal {
    value: number;
    constructor(v: number | string) {
      this.value = typeof v === "string" ? parseFloat(v) : v;
    }
    toNumber() {
      return this.value;
    }
    toString() {
      return String(this.value);
    }
  }
  return { Decimal: MockDecimal };
});

vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    $transaction: mockTransaction,
    request: {
      findUnique: mockFindUnique,
      create: vi.fn(),
      upsert: mockRequestUpsert,
    },
    routingDecision: {
      upsert: mockDecisionUpsert,
      create: mockDecisionCreate,
      findUnique: mockDecisionFindUnique,
    },
  };
  return { prisma: mockPrisma };
});

// Mock database module for routeAndPersist tests
vi.mock("@/lib/routing/database", () => ({
  loadRoutingCandidates: mockLoadCandidates,
}));

// ─────────────────────────────────────────────────────
// IMPORTS (after mocks)
// ─────────────────────────────────────────────────────

import { persistRoutingDecision } from "@/lib/routing/persistence";
import { routeAndPersist } from "@/lib/routing/router";
import type { RoutingDecision, ModelCandidate, ModelScore } from "@/lib/routing/types";

// ─────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<ModelCandidate> = {}): ModelCandidate {
  return {
    modelId: "m1",
    providerId: "prov-a",
    modelIdentifier: "model-1",
    displayName: "Model One",
    capabilities: ["chat", "coding", "reasoning"],
    tier: "HEAVY",
    contextWindow: 128000,
    inputPricePer1k: 0.0025,
    outputPricePer1k: 0.01,
    expectedLatencyMs: 800,
    active: true,
    providerName: "ProviderA",
    ...overrides,
  };
}

function makeScore(candidate: ModelCandidate, score: number): ModelScore {
  return {
    candidate,
    score,
    factors: { costScore: 0.5, latencyScore: 0.5, capabilityScore: 0.5, projectedCost: 0.001 },
    explanation: `score=${score}`,
  };
}

function makeDecision(overrides: Partial<RoutingDecision> = {}): RoutingDecision {
  const candidate = makeCandidate();
  const score = makeScore(candidate, 0.85);
  return {
    taskType: "GENERAL",
    complexity: {
      complexity: "LOW",
      confidence: 0.9,
      signals: { contentScore: 0.1, messageCountScore: 0.1, taskScore: 0.1, outputScore: 0.1 },
    },
    tokenEstimate: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    candidates: [score],
    selected: score,
    fallbacks: [],
    rejected: [],
    reason: "Test decision explanation",
    timestamp: new Date("2026-01-01"),
    ...overrides,
  };
}

// Mock candidates for routeAndPersist tests
const MOCK_CANDIDATES: ModelCandidate[] = [
  makeCandidate({
    modelId: "mock-1",
    providerId: "prov-a",
    displayName: "Mock Chat Model",
    capabilities: ["chat", "coding"],
    contextWindow: 128000,
    inputPricePer1k: 0.001,
    outputPricePer1k: 0.003,
    expectedLatencyMs: 500,
  }),
  makeCandidate({
    modelId: "mock-2",
    providerId: "prov-b",
    displayName: "Mock Expensive Model",
    capabilities: ["chat", "reasoning"],
    contextWindow: 200000,
    inputPricePer1k: 0.015,
    outputPricePer1k: 0.075,
    expectedLatencyMs: 1200,
    providerName: "ProviderB",
  }),
];

/**
 * Configure the $transaction mock to execute the callback with a mock tx.
 * Returns the mock tx object for additional assertions.
 */
function setupTransactionMock() {
  const mockTx = {
    request: {
      findUnique: mockFindUnique,
      create: vi.fn().mockResolvedValue({}),
      upsert: mockRequestUpsert,
    },
    routingDecision: {
      upsert: mockDecisionUpsert,
      create: mockDecisionCreate,
      findUnique: mockDecisionFindUnique,
    },
  };
  mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
    return fn(mockTx);
  });
  return mockTx;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────
// 1. PERSISTENCE
// ─────────────────────────────────────────────────────

describe("Persistence — persistRoutingDecision (create-only)", () => {
  it("creates the Request and RoutingDecision and returns the new decisionId", async () => {
    const mockTx = setupTransactionMock();
    mockDecisionCreate.mockResolvedValue({ id: "dec-1" });

    const result = await persistRoutingDecision("req-1", makeDecision());

    expect(result.success).toBe(true);
    expect(result.decisionId).toBe("dec-1");
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.request.create).toHaveBeenCalledTimes(1);
    expect(mockDecisionCreate).toHaveBeenCalledTimes(1);
  });

  it("creates a PENDING Request with routing metadata and no owner", async () => {
    const mockTx = setupTransactionMock();
    mockDecisionCreate.mockResolvedValue({ id: "dec-2" });

    const decision = makeDecision();
    const result = await persistRoutingDecision("new-req", decision);

    expect(result.success).toBe(true);
    const data = mockTx.request.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      id: "new-req",
      status: "PENDING",
      taskType: "GENERAL",
      complexity: "LOW",
      selectedModelId: decision.selected.candidate.modelId,
      selectedProviderId: decision.selected.candidate.providerId,
    });
    expect(data.userId).toBeUndefined();
    expect(data.businessId).toBeUndefined();
    expect(data.apiKeyId).toBeUndefined();
  });

  it("never looks up, reuses, updates or upserts an existing Request/decision", async () => {
    setupTransactionMock();
    mockDecisionCreate.mockResolvedValue({ id: "dec-3" });

    await persistRoutingDecision("some-req", makeDecision());

    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockRequestUpsert).not.toHaveBeenCalled();
    expect(mockDecisionUpsert).not.toHaveBeenCalled();
    expect(mockDecisionFindUnique).not.toHaveBeenCalled();
  });

  it("fails safely (no overwrite) when the requestId already exists", async () => {
    const mockTx = setupTransactionMock();
    const duplicate = Object.assign(new Error("Unique constraint failed on the fields: (`id`)"), {
      code: "P2002",
    });
    mockTx.request.create.mockRejectedValue(duplicate);

    const result = await persistRoutingDecision("victim-req", makeDecision());

    expect(result.success).toBe(false);
    expect(result.error).toContain("Persistence failed");
    expect(mockDecisionCreate).not.toHaveBeenCalled();
    expect(mockDecisionUpsert).not.toHaveBeenCalled();
  });

  it("returns error on empty requestId", async () => {
    const result = await persistRoutingDecision("", makeDecision());
    expect(result.success).toBe(false);
    expect(result.error).toBe("requestId is required");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns error on whitespace-only requestId", async () => {
    const result = await persistRoutingDecision("   ", makeDecision());
    expect(result.success).toBe(false);
    expect(result.error).toBe("requestId is required");
  });

  it("returns structured error on transaction failure", async () => {
    mockTransaction.mockRejectedValue(new Error("Connection refused"));

    const result = await persistRoutingDecision("req-fail", makeDecision());

    expect(result.success).toBe(false);
    expect(result.error).toContain("Persistence failed");
    expect(result.error).toContain("Connection refused");
  });

  it("includes candidate data in RoutingDecision JSON", async () => {
    setupTransactionMock();
    mockDecisionCreate.mockResolvedValue({ id: "dec-json" });

    const candidate1 = makeCandidate({ modelId: "c1", displayName: "Model A" });
    const candidate2 = makeCandidate({ modelId: "c2", displayName: "Model B", providerId: "prov-b" });
    const score1 = makeScore(candidate1, 0.9);
    const score2 = makeScore(candidate2, 0.7);
    const rejected = {
      candidate: makeCandidate({ modelId: "c3", displayName: "Tiny Model", contextWindow: 100 }),
      reason: "REJECTED_CONTEXT_LIMIT" as const,
      details: "context exceeded",
    };

    const decision = makeDecision({
      candidates: [score1, score2],
      rejected: [rejected],
    });

    await persistRoutingDecision("req-json", decision);

    const createArg = mockDecisionCreate.mock.calls[0][0];
    expect(createArg.data.requestId).toBe("req-json");
    const candidateModels = createArg.data.candidateModels;

    expect(candidateModels.scored).toHaveLength(2);
    expect(candidateModels.scored[0]).toMatchObject({
      modelId: "c1",
      displayName: "Model A",
      score: 0.9,
    });
    expect(candidateModels.scored[1]).toMatchObject({
      modelId: "c2",
      providerId: "prov-b",
    });

    expect(candidateModels.rejected).toHaveLength(1);
    expect(candidateModels.rejected[0]).toMatchObject({
      modelId: "c3",
      reason: "REJECTED_CONTEXT_LIMIT",
    });
  });

  it("persists score with correct precision", async () => {
    setupTransactionMock();
    mockDecisionCreate.mockResolvedValue({ id: "dec-score" });

    const score = makeScore(makeCandidate(), 0.8543);
    const decision = makeDecision({ selected: score, candidates: [score] });

    await persistRoutingDecision("req-score", decision);

    const createArg = mockDecisionCreate.mock.calls[0][0];
    expect(createArg.data.score).toBeDefined();
  });

  it("passes taskType and complexity to RoutingDecision", async () => {
    setupTransactionMock();
    mockDecisionCreate.mockResolvedValue({ id: "dec-meta" });

    const decision = makeDecision({
      taskType: "CODING",
      complexity: { complexity: "HIGH", confidence: 0.8, signals: { contentScore: 0.5, messageCountScore: 0.5, taskScore: 0.5, outputScore: 0.5 } },
    });

    await persistRoutingDecision("req-meta", decision);

    const createArg = mockDecisionCreate.mock.calls[0][0];
    expect(createArg.data.taskType).toBe("CODING");
    expect(createArg.data.complexity).toBe("HIGH");
  });
});

// ─────────────────────────────────────────────────────
// 2. ROUTE AND PERSIST
// ─────────────────────────────────────────────────────

describe("routeAndPersist — with mocked database", () => {
  beforeEach(() => {
    mockLoadCandidates.mockResolvedValue({
      candidates: MOCK_CANDIDATES,
      totalActiveModels: 2,
      modelsWithoutPricing: 0,
    });
  });

  it("routes and persists successfully with requestId", async () => {
    setupTransactionMock();
    mockDecisionCreate.mockResolvedValue({ id: "persisted-dec-1" });

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Hello, how are you?" }],
      metadata: { requestId: "test-req-1" },
    });

    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    expect(result.persisted).toBeDefined();
    expect(result.persisted!.success).toBe(true);
    expect(result.persisted!.decisionId).toBe("persisted-dec-1");
  });

  it("routes without persistence when no requestId in metadata", async () => {
    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Hello, how are you?" }],
    });

    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    expect(result.persisted).toBeUndefined();
    expect(result.persistenceError).toBeUndefined();
    // Transaction should NOT have been called
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns persistenceError when routing succeeds but persistence fails", async () => {
    mockTransaction.mockRejectedValue(new Error("DB write failed"));

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Hello, how are you?" }],
      metadata: { requestId: "test-req-3" },
    });

    // Routing succeeded
    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    // Persistence failed
    expect(result.persistenceError).toBeDefined();
    expect(result.persistenceError).toContain("DB write failed");
    expect(result.persisted).toBeUndefined();
  });

  it("returns routing error when database loading fails", async () => {
    mockLoadCandidates.mockResolvedValue({
      candidates: [],
      totalActiveModels: 0,
      modelsWithoutPricing: 0,
      error: "Database connection timeout",
    });

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Hello" }],
      metadata: { requestId: "test-req-4" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Database error");
    expect(result.errorCode).toBe("DATABASE_ERROR");
    // Persistence should NOT have been attempted
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns routing error when no candidates available", async () => {
    mockLoadCandidates.mockResolvedValue({
      candidates: [],
      totalActiveModels: 0,
      modelsWithoutPricing: 0,
    });

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Hello" }],
      metadata: { requestId: "test-req-5" },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("NO_ACTIVE_MODELS");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("routing decision contains correct taskType for coding request", async () => {
    setupTransactionMock();
    mockFindUnique.mockResolvedValue({ id: "req-coding" });
    mockDecisionUpsert.mockResolvedValue({});
    mockDecisionFindUnique.mockResolvedValue({ id: "dec-coding" });

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Write a function to sort an array using quicksort algorithm in TypeScript" }],
      metadata: { requestId: "req-coding" },
    });

    expect(result.success).toBe(true);
    expect(result.decision!.taskType).toBe("CODING");
  });

  it("generates explanation in routing decision", async () => {
    setupTransactionMock();
    mockFindUnique.mockResolvedValue({ id: "req-explain" });
    mockDecisionUpsert.mockResolvedValue({});
    mockDecisionFindUnique.mockResolvedValue({ id: "dec-explain" });

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Hello, how are you?" }],
      metadata: { requestId: "req-explain" },
    });

    expect(result.success).toBe(true);
    expect(result.decision!.reason).toBeTruthy();
    expect(result.decision!.reason.length).toBeGreaterThan(10);
  });

  it("handles routing failure with all candidates rejected", async () => {
    // Create candidates that will all be rejected for a TRANSLATION request
    const noTranslation = makeCandidate({
      modelId: "no-trans",
      capabilities: ["chat"], // No "translation" capability
      contextWindow: 128000,
    });
    mockLoadCandidates.mockResolvedValue({
      candidates: [noTranslation],
      totalActiveModels: 1,
      modelsWithoutPricing: 0,
    });

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Translate this paragraph from English to Spanish please" }],
      metadata: { requestId: "req-reject" },
    });

    expect(result.success).toBe(false);
    expect(result.rejected).toBeDefined();
    expect(result.rejected!.length).toBeGreaterThan(0);
    // Persistence should NOT happen on routing failure
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

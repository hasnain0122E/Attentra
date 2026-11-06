/**
 * Attentra — Phase 2B: Rate limiting and spend safeguards
 *
 * 1. Limiter units (src/lib/rate-limit): database + instance layers,
 *    key isolation, same-instance concurrency, window roll-over,
 *    configuration, fail-closed on database errors.
 * 2. Route (POST /api/v1/chat/completions) with the real API-key chain:
 *    429 + Retry-After + OpenAI error shape, per-key isolation, separate
 *    Playground session limit, 503 on limiter failure, output-token caps —
 *    and rejected requests never reach routing or a provider.
 *
 * No real database (in-memory fakes) and no provider calls.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import type { ExecutionPlan } from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────

interface KeyRow {
  id: string;
  userId: string | null;
  businessId: string | null;
  name: string;
  keyHash: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

const {
  rows,
  mockAuth,
  mockAggregate,
  mockRouteAndPersist,
  mockPrepareExecutionFlow,
  mockExecute,
  mockRequestUpdate,
} = vi.hoisted(() => ({
  rows: [] as KeyRow[],
  mockAuth: vi.fn(),
  mockAggregate: vi.fn(),
  mockRouteAndPersist: vi.fn(),
  mockPrepareExecutionFlow: vi.fn(),
  mockExecute: vi.fn(),
  mockRequestUpdate: vi.fn(),
}));

const fakePrisma = vi.hoisted(() => ({
  apiKey: {
    create: vi.fn(async ({ data }: { data: Partial<KeyRow> }) => {
      const row = {
        id: `key-${rows.length + 1}`,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        ...data,
      } as KeyRow;
      rows.push(row);
      return { ...row };
    }),
    findUnique: vi.fn(async ({ where }: { where: { keyHash: string } }) => {
      const row = rows.find((r) => r.keyHash === where.keyHash);
      return row ? { ...row } : null;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<KeyRow> }) => {
      const row = rows.find((r) => r.id === where.id)!;
      Object.assign(row, data);
      return { ...row };
    }),
  },
  request: {
    update: (...args: unknown[]) => mockRequestUpdate(...args),
    aggregate: (...args: unknown[]) => mockAggregate(...args),
  },
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma }));
vi.mock("@/lib/routing", () => ({
  routeAndPersist: mockRouteAndPersist,
  prepareExecutionFlow: mockPrepareExecutionFlow,
}));
vi.mock("@/lib/cost-intelligence", () => ({
  persistRequestCostIntelligence: vi.fn(async () => ({ persisted: true })),
}));
vi.mock("@/lib/execution", async () => {
  const actual = await vi.importActual<typeof import("@/lib/execution")>("@/lib/execution");
  class MockOrchestrator {
    execute(...args: unknown[]) {
      return mockExecute(...args);
    }
  }
  return { ...actual, ExecutionOrchestrator: MockOrchestrator };
});

import { POST } from "@/app/api/v1/chat/completions/route";
import { createPersonalApiKey } from "@/lib/api-keys";
import {
  RateLimitUnavailableError,
  checkRequestRateLimit,
  resetInstanceRateLimiter,
  resolveRateLimit,
} from "@/lib/rate-limit";
import type { PrismaClient } from "@prisma/client";

const db = fakePrisma as unknown as PrismaClient;

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function dbCount(count: number, oldest: Date | null = null) {
  return { _count: { _all: count }, _min: { createdAt: oldest } };
}

const PLAN: ExecutionPlan = {
  requestId: "plan-req",
  taskType: "GENERAL",
  complexity: "LOW",
  primary: {
    entryId: "primary",
    modelId: "db-gemini",
    providerId: "google",
    providerName: "google",
    modelIdentifier: "gemini-3.1-flash-lite",
    displayName: "Gemini 3.1 Flash Lite",
    projectedCost: 0.00002,
    routingScore: 0.9,
  },
  fallbacks: [],
  estimatedInputTokens: 10,
  estimatedOutputTokens: 256,
  projectedCost: 0.00002,
  routingScore: 0.9,
  routingExplanation: "test",
  status: "NOT_EXECUTED",
  createdAt: new Date(),
};

function post(body: Record<string, unknown>, authorization?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authorization) headers.authorization = authorization;
  return POST(
    new NextRequest("http://localhost:3000/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

const HELLO = { messages: [{ role: "user", content: "Hello" }] };

beforeEach(() => {
  vi.clearAllMocks();
  rows.length = 0;
  resetInstanceRateLimiter();

  mockAuth.mockResolvedValue(null);
  mockAggregate.mockResolvedValue(dbCount(0));
  mockRouteAndPersist.mockResolvedValue({
    success: true,
    decision: { candidates: [], selected: {} },
    persisted: { success: true, decisionId: "dec-1" },
  });
  mockPrepareExecutionFlow.mockReturnValue({ plan: PLAN, status: "NOT_EXECUTED" });
  mockExecute.mockResolvedValue({
    success: true,
    content: "ok",
    finishReason: "stop",
    modelId: "db-gemini",
    providerId: "google",
    attempts: 1,
    usage: { inputTokens: 3, outputTokens: 1, totalTokens: 4 },
    latencyMs: 5,
    actualCost: 0.000001,
    executionAttempts: [
      { attemptNumber: 1, modelIdentifier: "gemini-3.1-flash-lite", success: true },
    ],
    timestamp: "2026-11-06T22:00:00.000Z",
  });
  mockRequestUpdate.mockResolvedValue({});

  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────
// 1. LIMITER UNITS
// ─────────────────────────────────────────────────────

describe("checkRequestRateLimit", () => {
  const KEY_A = { kind: "apiKey" as const, apiKeyId: "key-a" };
  const KEY_B = { kind: "apiKey" as const, apiKeyId: "key-b" };
  const NOW = Date.parse("2026-11-06T22:00:00.000Z");

  it("allows while the database count is under the limit", async () => {
    mockAggregate.mockResolvedValue(dbCount(19));

    const decision = await checkRequestRateLimit(db, KEY_A, { now: NOW });

    expect(decision).toMatchObject({ allowed: true, limit: 20, windowSeconds: 60 });
  });

  it("rejects at the database limit with Retry-After from the oldest request", async () => {
    mockAggregate.mockResolvedValue(dbCount(20, new Date(NOW - 45_000)));

    const decision = await checkRequestRateLimit(db, KEY_A, { now: NOW });

    expect(decision).toMatchObject({
      allowed: false,
      rejectedBy: "database",
      retryAfterSeconds: 15,
    });
  });

  it("queries only the subject's own rows in the rolling window", async () => {
    await checkRequestRateLimit(db, KEY_A, { now: NOW });
    await checkRequestRateLimit(db, { kind: "session", userId: "user-1" }, { now: NOW });

    const windowStart = new Date(NOW - 60_000);
    expect(mockAggregate.mock.calls[0][0].where).toEqual({
      apiKeyId: "key-a",
      createdAt: { gt: windowStart },
    });
    expect(mockAggregate.mock.calls[1][0].where).toEqual({
      userId: "user-1",
      apiKeyId: null,
      createdAt: { gt: windowStart },
    });
  });

  it("same-instance concurrency: a burst of 30 admits exactly 20 even if the DB lags", async () => {
    // DB has not seen any of the burst yet (rows are written after the check).
    mockAggregate.mockResolvedValue(dbCount(0));

    const decisions = await Promise.all(
      Array.from({ length: 30 }, () => checkRequestRateLimit(db, KEY_A, { now: NOW })),
    );

    expect(decisions.filter((d) => d.allowed)).toHaveLength(20);
    expect(decisions.filter((d) => d.rejectedBy === "instance")).toHaveLength(10);
  });

  it("isolates keys: exhausting key A does not limit key B", async () => {
    for (let i = 0; i < 20; i++) await checkRequestRateLimit(db, KEY_A, { now: NOW });

    expect((await checkRequestRateLimit(db, KEY_A, { now: NOW })).allowed).toBe(false);
    expect((await checkRequestRateLimit(db, KEY_B, { now: NOW })).allowed).toBe(true);
  });

  it("frees slots as the window rolls forward", async () => {
    for (let i = 0; i < 20; i++) await checkRequestRateLimit(db, KEY_A, { now: NOW });

    expect((await checkRequestRateLimit(db, KEY_A, { now: NOW + 59_000 })).allowed).toBe(false);
    expect((await checkRequestRateLimit(db, KEY_A, { now: NOW + 60_001 })).allowed).toBe(true);
  });

  it("does not reserve an instance slot when the database rejects", async () => {
    mockAggregate.mockResolvedValueOnce(dbCount(20, new Date(NOW - 1_000)));
    await checkRequestRateLimit(db, KEY_A, { now: NOW });

    mockAggregate.mockResolvedValue(dbCount(0));
    const decisions = await Promise.all(
      Array.from({ length: 20 }, () => checkRequestRateLimit(db, KEY_A, { now: NOW })),
    );
    expect(decisions.every((d) => d.allowed)).toBe(true);
  });

  it("fails closed on database errors", async () => {
    mockAggregate.mockRejectedValue(new Error("Can't reach database server"));

    await expect(checkRequestRateLimit(db, KEY_A, { now: NOW })).rejects.toBeInstanceOf(
      RateLimitUnavailableError,
    );
  });

  it("configuration: defaults, overrides, invalid values and 0 = disabled", async () => {
    expect(resolveRateLimit("apiKey")).toBe(20);
    expect(resolveRateLimit("session")).toBe(10);

    vi.stubEnv("API_KEY_RATE_LIMIT_PER_MINUTE", "5");
    expect(resolveRateLimit("apiKey")).toBe(5);

    vi.stubEnv("API_KEY_RATE_LIMIT_PER_MINUTE", "lots");
    expect(resolveRateLimit("apiKey")).toBe(20);

    vi.stubEnv("API_KEY_RATE_LIMIT_PER_MINUTE", "0");
    const decision = await checkRequestRateLimit(db, KEY_A, { now: NOW });
    expect(decision.allowed).toBe(true);
    expect(mockAggregate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// 2. ROUTE — RATE LIMITS
// ─────────────────────────────────────────────────────

describe("POST /api/v1/chat/completions rate limiting", () => {
  it("the 21st request in the window → 429 with Retry-After and OpenAI error shape", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });

    for (let i = 0; i < 20; i++) {
      expect((await post(HELLO, `Bearer ${key.rawKey}`)).status).toBe(200);
    }
    mockRouteAndPersist.mockClear();
    mockExecute.mockClear();

    const res = await post(HELLO, `Bearer ${key.rawKey}`);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(res.headers.get("x-ratelimit-limit")).toBe("20");
    expect(json.success).toBe(false);
    expect(json.error).toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
      type: "rate_limit_error",
      param: null,
      retryable: true,
    });
    expect(json.error.message).toMatch(/20 requests per 60 seconds per API key/);
    expect(mockRouteAndPersist).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("a key at its database limit is rejected before routing (cross-instance layer)", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });
    mockAggregate.mockResolvedValue(dbCount(20, new Date(Date.now() - 30_000)));

    const res = await post(HELLO, `Bearer ${key.rawKey}`);

    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeLessThanOrEqual(31);
    expect(mockRouteAndPersist).not.toHaveBeenCalled();
    expect(mockAggregate.mock.calls[0][0].where.apiKeyId).toBe(key.id);
  });

  it("one key's usage does not count against another key", async () => {
    const a = await createPersonalApiKey(db, { userId: "user-a", name: "a" });
    const b = await createPersonalApiKey(db, { userId: "user-a", name: "b" });

    for (let i = 0; i < 20; i++) await post(HELLO, `Bearer ${a.rawKey}`);

    expect((await post(HELLO, `Bearer ${a.rawKey}`)).status).toBe(429);
    expect((await post(HELLO, `Bearer ${b.rawKey}`)).status).toBe(200);
  });

  it("Playground sessions have their own per-user limit (default 10)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-a" } });

    for (let i = 0; i < 10; i++) expect((await post(HELLO)).status).toBe(200);
    const limited = await post(HELLO);
    const json = await limited.json();

    expect(limited.status).toBe(429);
    expect(json.error.message).toMatch(/10 requests per 60 seconds per user session/);
    expect(mockAggregate.mock.calls[0][0].where).toMatchObject({ userId: "user-a", apiKeyId: null });

    // The same user's API key is a different subject.
    mockAuth.mockResolvedValue(null);
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });
    expect((await post(HELLO, `Bearer ${key.rawKey}`)).status).toBe(200);
  });

  it("limiter database failure → 503, no routing, no provider call", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });
    mockAggregate.mockRejectedValue(new Error("Can't reach database server at host:5432"));

    const res = await post(HELLO, `Bearer ${key.rawKey}`);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      type: "server_error",
      retryable: true,
    });
    expect(JSON.stringify(json)).not.toContain("host:5432");
    expect(mockRouteAndPersist).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("unauthenticated requests are rejected before the limiter runs", async () => {
    const res = await post(HELLO);

    expect(res.status).toBe(401);
    expect(mockAggregate).not.toHaveBeenCalled();
  });

  it("allowed requests keep the OpenAI response and History attribution", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });

    const res = await post(HELLO, `Bearer ${key.rawKey}`);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.choices[0].message.content).toBe("ok");
    expect(json.model).toBe("gemini-3.1-flash-lite");
    expect(mockRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: "user-a", businessId: null, apiKeyId: key.id },
      }),
    );
  });

  it("logs the rejection without key material or prompt text", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });
    mockAggregate.mockResolvedValue(dbCount(20, new Date()));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await post(
      { messages: [{ role: "user", content: "secret plan for Project Nightingale" }] },
      `Bearer ${key.rawKey}`,
    );

    const logged = warn.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toContain("Rate limit exceeded");
    expect(logged).not.toContain(key.rawKey);
    expect(logged).not.toContain("Nightingale");
  });
});

// ─────────────────────────────────────────────────────
// 3. ROUTE — OUTPUT TOKEN CAPS
// ─────────────────────────────────────────────────────

describe("output token caps (4,096)", () => {
  it.each([["max_tokens"], ["max_completion_tokens"], ["maxTokens"]])(
    "%s = 4096 is accepted",
    async (field) => {
      const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });

      const res = await post({ ...HELLO, [field]: 4096 }, `Bearer ${key.rawKey}`);

      expect(res.status).toBe(200);
      expect(mockRouteAndPersist.mock.calls[0][0].maxTokens).toBe(4096);
    },
  );

  it.each([["max_tokens"], ["max_completion_tokens"], ["maxTokens"]])(
    "%s = 4097 → 400 naming the parameter, no routing or provider call",
    async (field) => {
      const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });

      const res = await post({ ...HELLO, [field]: 4097 }, `Bearer ${key.rawKey}`);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatchObject({
        code: "INVALID_REQUEST",
        type: "invalid_request_error",
        param: field,
      });
      expect(json.error.message).toMatch(new RegExp(`'${field}' must be a positive integer \\(max 4096\\)`));
      expect(mockRouteAndPersist).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    },
  );

  it("invalid requests do not consume rate-limit slots", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "k" });

    for (let i = 0; i < 25; i++) await post({ ...HELLO, max_tokens: 999_999 }, `Bearer ${key.rawKey}`);

    expect((await post(HELLO, `Bearer ${key.rawKey}`)).status).toBe(200);
  });
});

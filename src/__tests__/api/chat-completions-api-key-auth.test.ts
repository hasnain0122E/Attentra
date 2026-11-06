/**
 * Attentra — Chat Completions API-Key Authentication (end-to-end in process)
 *
 * Authentication audit (2026-11-06):
 *
 * Unlike chat-completions.test.ts (which mocks resolveRequester), this suite
 * runs the REAL chain against an in-memory ApiKey table:
 *
 *   createPersonalApiKey / createBusinessApiKey  (dashboard generation)
 *     → Authorization header → extractBearerToken
 *     → validateApiKey (hash + lookup + status)
 *     → resolveRequester → POST /api/v1/chat/completions
 *
 * Routing and provider execution stay mocked so a 200 proves only that
 * authentication passed, not that a real provider answered.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import type { ExecutionPlan } from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// IN-MEMORY API KEY TABLE
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
  mockRouteAndPersist,
  mockPrepareExecutionFlow,
  mockExecute,
  mockRequestUpdate,
} = vi.hoisted(() => ({
  rows: [] as KeyRow[],
  mockAuth: vi.fn(),
  mockRouteAndPersist: vi.fn(),
  mockPrepareExecutionFlow: vi.fn(),
  mockExecute: vi.fn(),
  mockRequestUpdate: vi.fn(),
}));

function matches(row: KeyRow, where: Record<string, unknown>) {
  return Object.entries(where).every(
    ([field, value]) => row[field as keyof KeyRow] === value,
  );
}

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
    update: vi.fn(
      async ({ where, data }: { where: { id: string }; data: Partial<KeyRow> }) => {
        const row = rows.find((r) => r.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return { ...row };
      },
    ),
    updateMany: vi.fn(
      async ({ where, data }: { where: Record<string, unknown>; data: Partial<KeyRow> }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    ),
  },
  request: {
    update: (...args: unknown[]) => mockRequestUpdate(...args),
    // Phase 2B rate limiter: no recent requests in the window.
    aggregate: async () => ({ _count: { _all: 0 }, _min: { createdAt: null } }),
  },
}));

// ─────────────────────────────────────────────────────
// MODULE MOCKS (auth session, DB boundary, routing, execution)
// ─────────────────────────────────────────────────────

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
  const actual =
    await vi.importActual<typeof import("@/lib/execution")>("@/lib/execution");

  class MockOrchestrator {
    execute(...args: unknown[]) {
      return mockExecute(...args);
    }
  }

  return { ...actual, ExecutionOrchestrator: MockOrchestrator };
});

import { POST } from "@/app/api/v1/chat/completions/route";
import { resetInstanceRateLimiter } from "@/lib/rate-limit";
import {
  createBusinessApiKey,
  createPersonalApiKey,
  revokePersonalApiKey,
} from "@/lib/api-keys";
import type { PrismaClient } from "@prisma/client";

const db = fakePrisma as unknown as PrismaClient;

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function makePlan(): ExecutionPlan {
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

function request(authorization?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authorization !== undefined) headers.authorization = authorization;

  return new NextRequest("http://localhost:3000/api/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "auto",
      messages: [{ role: "user", content: "Hello, are you working?" }],
    }),
  });
}

let warnSpy: { mock: { calls: unknown[][] } };

function loggedText() {
  return warnSpy.mock.calls.map((call) => call.join(" ")).join("\n");
}

beforeEach(() => {
  vi.clearAllMocks();
  resetInstanceRateLimiter();
  rows.length = 0;

  // Programmatic client: no Auth.js browser session.
  mockAuth.mockResolvedValue(null);

  mockRouteAndPersist.mockResolvedValue({
    success: true,
    decision: { candidates: [], selected: {} },
    persisted: { success: true, decisionId: "dec-1" },
  });
  mockPrepareExecutionFlow.mockReturnValue({
    plan: makePlan(),
    status: "NOT_EXECUTED",
  });
  mockExecute.mockResolvedValue({
    success: true,
    content: "Yes, I am working.",
    modelId: "mock-model",
    providerId: "mock",
    attempts: 1,
    usage: { inputTokens: 5, outputTokens: 5 },
    latencyMs: 10,
    actualCost: 0.0001,
    executionAttempts: [],
    timestamp: "2026-11-06T00:00:00.000Z",
  });
  mockRequestUpdate.mockResolvedValue({});

  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

// ─────────────────────────────────────────────────────
// VALID KEYS WITHOUT A BROWSER SESSION
// ─────────────────────────────────────────────────────

describe("Dashboard-generated keys authenticate without a session", () => {
  it("accepts a personal key and attributes the request to its owner", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });

    const res = await POST(request(`Bearer ${key.rawKey}`));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.content).toBe("Yes, I am working.");
    expect(mockRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: "user-a", businessId: null, apiKeyId: key.id },
      }),
    );
    expect(rows[0].lastUsedAt).toBeInstanceOf(Date);
  });

  it("accepts a business key and attributes the request to the business", async () => {
    const key = await createBusinessApiKey(db, { businessId: "biz-1", name: "svc" });

    const res = await POST(request(`Bearer ${key.rawKey}`));

    expect(res.status).toBe(200);
    expect(mockRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { businessId: "biz-1", apiKeyId: key.id, userId: null },
      }),
    );
  });

  it("accepts a lowercase scheme and extra whitespace", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });

    const res = await POST(request(`bearer    ${key.rawKey}  `));

    expect(res.status).toBe(200);
  });

  it("accepts the OpenAI-style 'model: auto' field (ignored, routing decides)", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });

    const res = await POST(request(`Bearer ${key.rawKey}`));

    expect(res.status).toBe(200);
    expect(mockRouteAndPersist).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────
// REJECTIONS → 401, NO ROUTING, DIAGNOSABLE LOG
// ─────────────────────────────────────────────────────

describe("Rejected credentials return 401 and are logged by reason", () => {
  async function expectRejected(
    authorization: string | undefined,
    reason: string,
    message: RegExp,
  ) {
    const res = await POST(request(authorization));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe("Bearer");
    expect(json.error.code).toBe("AUTHENTICATION");
    expect(json.error.message).toMatch(message);
    expect(mockRouteAndPersist).not.toHaveBeenCalled();
    expect(loggedText()).toContain(`reason: ${reason}`);
  }

  it("no Authorization header", async () => {
    await expectRejected(undefined, "NO_CREDENTIALS", /Authentication required/);
  });

  it("empty Bearer token", async () => {
    await expectRejected("Bearer ", "MALFORMED_HEADER", /Invalid API key/);
  });

  it("non-Bearer scheme", async () => {
    await expectRejected("Basic dXNlcjpwYXNz", "MALFORMED_HEADER", /Invalid API key/);
  });

  it("non-Attentra key format", async () => {
    await expectRejected("Bearer sk-not-an-attentra-key", "MALFORMED", /Invalid API key/);
  });

  it("random well-formed key", async () => {
    await expectRejected(`Bearer atr_${"0".repeat(64)}`, "NOT_FOUND", /Invalid API key/);
  });

  it("display prefix copied instead of the full key", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });

    await expectRejected(`Bearer ${key.keyPrefix}`, "NOT_FOUND", /Invalid API key/);
  });

  it("revoked key", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });
    await revokePersonalApiKey(db, key.id, "user-a");

    await expectRejected(`Bearer ${key.rawKey}`, "REVOKED", /Invalid API key/);
  });

  it("expired key", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });
    rows[0].expiresAt = new Date(Date.now() - 1000);

    await expectRejected(`Bearer ${key.rawKey}`, "EXPIRED", /Invalid API key/);
  });

  it("never logs or returns the full key", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });
    await revokePersonalApiKey(db, key.id, "user-a");

    const res = await POST(request(`Bearer ${key.rawKey}`));
    const body = await res.text();

    expect(body).not.toContain(key.rawKey);
    expect(loggedText()).not.toContain(key.rawKey);
    expect(loggedText()).toContain(key.keyPrefix);
    expect(loggedText()).toContain("tokenLength: 68");
  });

  it("logs the database hostname but never the connection string", async () => {
    await POST(request(`Bearer atr_${"0".repeat(64)}`));

    const log = loggedText();
    expect(log).toMatch(/dbHost: \S+/);

    const url = process.env.DATABASE_URL;
    if (url) {
      expect(log).not.toContain(url);
      const password = new URL(url).password;
      if (password) expect(log).not.toContain(password);
    }
  });

  it("reports the length of a quoted key copied from a .env file", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });

    await expectRejected(`Bearer "${key.rawKey}"`, "MALFORMED", /Invalid API key/);
    expect(loggedText()).toContain("tokenLength: 70");
  });

  it("incorrect key length (one hex char short)", async () => {
    await expectRejected(`Bearer atr_${"a".repeat(63)}`, "NOT_FOUND", /Invalid API key/);
    expect(loggedText()).toContain("tokenLength: 67");
  });

  it("incorrect key prefix (uppercase ATR_)", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });

    await expectRejected(
      `Bearer ${key.rawKey.replace("atr_", "ATR_")}`,
      "MALFORMED",
      /Invalid API key/,
    );
  });

  it("key with both owners set (invalid ownership)", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });
    rows[0].businessId = "biz-1";

    await expectRejected(`Bearer ${key.rawKey}`, "INVALID_OWNERSHIP", /Invalid API key/);
  });

  it("logs the environment and never the key hash", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });
    await revokePersonalApiKey(db, key.id, "user-a");

    await POST(request(`Bearer ${key.rawKey}`));

    expect(loggedText()).toMatch(/env: \S+/);
    expect(loggedText()).not.toContain(rows[0].keyHash);
  });
});

// ─────────────────────────────────────────────────────
// CREDENTIAL CHECK FAILURES ARE NOT 401s
// ─────────────────────────────────────────────────────

describe("Database failure during key lookup", () => {
  it("returns retryable 503 and logs DATABASE_ERROR, not 401", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });
    const dbError = Object.assign(
      new Error("Can't reach database server at secret-host:5432"),
      { name: "PrismaClientInitializationError", errorCode: "P1001", code: "P1001" },
    );
    fakePrisma.apiKey.findUnique.mockRejectedValueOnce(dbError);

    const res = await POST(request(`Bearer ${key.rawKey}`));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(json.error.retryable).toBe(true);
    expect(JSON.stringify(json)).not.toContain("secret-host");
    expect(mockRouteAndPersist).not.toHaveBeenCalled();
    expect(loggedText()).toContain("reason: DATABASE_ERROR");
    expect(loggedText()).toContain("errorCode: P1001");
    expect(loggedText()).not.toContain(key.rawKey);
  });

  it("non-database auth backend failure is also 503", async () => {
    mockAuth.mockRejectedValueOnce(new Error("MissingSecret"));

    const res = await POST(request(undefined));

    expect(res.status).toBe(503);
    expect(loggedText()).toContain("reason: AUTH_BACKEND_ERROR");
  });
});

// ─────────────────────────────────────────────────────
// SESSION PRECEDENCE (intended, see resolve-requester.ts)
// ─────────────────────────────────────────────────────

describe("Authentication precedence", () => {
  it("a valid browser session is used before any Bearer key", async () => {
    mockAuth.mockResolvedValue({ user: { id: "session-user" } });

    const res = await POST(request(`Bearer atr_${"0".repeat(64)}`));

    expect(res.status).toBe(200);
    expect(fakePrisma.apiKey.findUnique).not.toHaveBeenCalled();
    expect(mockRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "session-user" } }),
    );
  });
});

// ─────────────────────────────────────────────────────
// OWNERSHIP ISOLATION
// ─────────────────────────────────────────────────────

describe("Cross-user isolation", () => {
  it("another user cannot revoke a key, and it keeps working", async () => {
    const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });

    expect(await revokePersonalApiKey(db, key.id, "user-b")).toBe(false);

    const res = await POST(request(`Bearer ${key.rawKey}`));
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// PROVIDER CREDENTIAL FAILURES ARE NOT CALLER 401s
// ─────────────────────────────────────────────────────

describe("Upstream provider credential failures", () => {
  it.each(["AUTHENTICATION", "MISSING_API_KEY"])(
    "%s from the provider returns 502, not 401",
    async (code) => {
      const key = await createPersonalApiKey(db, { userId: "user-a", name: "bot" });
      mockExecute.mockResolvedValue({
        success: false,
        error: { code, message: "provider rejected credentials", retryable: false },
        latencyMs: 10,
        timestamp: "2026-11-06T00:00:00.000Z",
        executionAttempts: [],
      });

      const res = await POST(request(`Bearer ${key.rawKey}`));
      const json = await res.json();

      expect(res.status).toBe(502);
      expect(json.error.code).toBe(code);
    },
  );
});

/**
 * P0 security regression — Request ID ownership isolation.
 *
 * Runs the REAL chat-completions route, router and persistRoutingDecision
 * against an in-memory Prisma fake that enforces the real constraints:
 *   - create on an existing primary key / unique requestId → P2002
 *   - update whose `where` filters don't match            → P2025
 *   - $transaction rolls back on error
 *
 * Mocked only: model catalog, auth resolver, provider execution (no paid
 * calls) and the cost-intelligence service. No real database is touched.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─────────────────────────────────────────────────────
// In-memory Prisma fake
// ─────────────────────────────────────────────────────

type Row = Record<string, unknown>;

const { db, mockResolveRequester, mockExecute, mockLoadCandidates } = vi.hoisted(() => {
  class PrismaError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = "PrismaClientKnownRequestError";
    }
  }

  const state = {
    requests: new Map<string, Record<string, unknown>>(),
    decisions: new Map<string, Record<string, unknown>>(), // keyed by requestId
    decisionSeq: 0,
  };

  /** Deep copy of plain objects/arrays; class instances (Date, Decimal) kept as-is. */
  const clone = <T>(v: T): T => {
    if (Array.isArray(v)) return v.map((x) => clone(x)) as T;
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) as T;
    }
    return v;
  };

  function matches(row: Record<string, unknown>, where: Record<string, unknown>) {
    return Object.entries(where).every(([k, v]) => (row[k] ?? null) === v);
  }

  const REQUEST_DEFAULTS = {
    userId: null,
    businessId: null,
    apiKeyId: null,
    prompt: null,
    response: null,
    actualCost: null,
    latencyMs: null,
  };

  const request = {
    async create({ data }: { data: Record<string, unknown> }) {
      const id = data.id as string;
      if (state.requests.has(id)) {
        throw new PrismaError("P2002", "Unique constraint failed on the fields: (`id`)");
      }
      const row = { ...REQUEST_DEFAULTS, createdAt: new Date(), ...clone(data) };
      state.requests.set(id, row);
      return clone(row);
    },
    async update({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const row = state.requests.get(where.id as string);
      if (!row || !matches(row, where)) {
        throw new PrismaError("P2025", "Record to update not found.");
      }
      Object.assign(row, clone(data));
      return clone(row);
    },
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const row = [...state.requests.values()].find((r) => matches(r, where));
      if (!row) return null;
      const decision = state.decisions.get(row.id as string) ?? null;
      return {
        ...clone(row),
        routingDecision: decision ? clone(decision) : null,
        selectedModel: row.selectedModelId
          ? {
              id: row.selectedModelId,
              displayName: `Model ${row.selectedModelId}`,
              modelIdentifier: `ident-${row.selectedModelId}`,
              provider: { id: "p", name: "provider" },
            }
          : null,
      };
    },
    async findUnique({ where }: { where: { id: string } }) {
      const row = state.requests.get(where.id);
      return row ? clone(row) : null;
    },
    async aggregate() {
      return { _count: { _all: 0 }, _min: { createdAt: null } };
    },
  };

  const routingDecision = {
    async create({ data }: { data: Record<string, unknown> }) {
      const requestId = data.requestId as string;
      if (state.decisions.has(requestId)) {
        throw new PrismaError("P2002", "Unique constraint failed on the fields: (`requestId`)");
      }
      state.decisionSeq += 1;
      const row = { id: `dec_${state.decisionSeq}`, ...clone(data) };
      state.decisions.set(requestId, row);
      return { id: row.id };
    },
    // Real upsert semantics, so the pre-fix code path can be exercised too.
    async upsert({ where, create, update }: { where: { requestId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) {
      const existing = state.decisions.get(where.requestId);
      if (existing) {
        Object.assign(existing, clone(update));
        return { id: existing.id };
      }
      state.decisionSeq += 1;
      const row = { id: `dec_${state.decisionSeq}`, ...clone(create) };
      state.decisions.set(where.requestId, row);
      return { id: row.id };
    },
    async findUnique({ where }: { where: { requestId: string } }) {
      const row = state.decisions.get(where.requestId);
      return row ? clone(row) : null;
    },
  };

  const db = {
    state,
    clone,
    request,
    routingDecision,
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      const snapshot = {
        requests: new Map([...state.requests].map(([k, v]) => [k, clone(v)])),
        decisions: new Map([...state.decisions].map(([k, v]) => [k, clone(v)])),
      };
      try {
        return await fn({ request, routingDecision });
      } catch (error) {
        state.requests = snapshot.requests;
        state.decisions = snapshot.decisions;
        throw error;
      }
    },
    reset() {
      state.requests = new Map();
      state.decisions = new Map();
      state.decisionSeq = 0;
    },
  };

  return {
    db,
    mockResolveRequester: vi.fn(),
    mockExecute: vi.fn(),
    mockLoadCandidates: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: db }));

vi.mock("@/lib/auth/resolve-requester", () => ({
  resolveRequester: mockResolveRequester,
}));

vi.mock("@/lib/routing/database", () => ({
  loadRoutingCandidates: mockLoadCandidates,
}));

// Cost persistence: write provider-reported usage like the real service.
vi.mock("@/lib/cost-intelligence", () => ({
  persistRequestCostIntelligence: async (
    _prisma: unknown,
    input: { requestId: string; executedModelId: string; usage: { inputTokens: number; outputTokens: number }; actualCost?: number },
  ) => {
    await db.request.update({
      where: { id: input.requestId },
      data: {
        status: "SUCCESS",
        selectedModelId: input.executedModelId,
        inputTokens: input.usage.inputTokens,
        outputTokens: input.usage.outputTokens,
        actualCost: input.actualCost ?? null,
      },
    });
    return { persisted: true };
  },
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

import { NextRequest } from "next/server";

import { POST } from "@/app/api/v1/chat/completions/route";
import { fetchUserRequest } from "@/lib/dashboard/request-queries";
import { resetInstanceRateLimiter } from "@/lib/rate-limit";

// ─────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────

const SERVER_ID = /^req_\d+_[a-z0-9]{8}$/;

const CANDIDATES = [
  { modelId: "m-openai", providerId: "openai", providerName: "openai", modelIdentifier: "gpt-x", displayName: "GPT X" },
  { modelId: "m-anthropic", providerId: "anthropic", providerName: "anthropic", modelIdentifier: "claude-x", displayName: "Claude X" },
].map((c) => ({
  ...c,
  capabilities: ["chat", "coding", "reasoning", "writing", "summarization", "translation", "analysis", "extraction"],
  tier: "MID",
  contextWindow: 128_000,
  inputPricePer1k: 0.001,
  outputPricePer1k: 0.002,
  expectedLatencyMs: 500,
  active: true,
}));

const USER_A = { authType: "session", userId: "user-a", businessId: null, apiKeyId: null };
const USER_B = { authType: "session", userId: "user-b", businessId: null, apiKeyId: null };
const PERSONAL_KEY_B = { authType: "personalApiKey", userId: "user-b", apiKeyId: "key-b" };
const BUSINESS_KEY_C = { authType: "apiKey", businessId: "biz-c", apiKeyId: "key-c" };

function succeed(content: string) {
  mockExecute.mockImplementation(async (plan: { primary: { modelId: string; providerId: string; modelIdentifier: string } }) => ({
    success: true,
    providerId: plan.primary.providerId,
    modelId: plan.primary.modelId,
    content,
    usage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
    latencyMs: 120,
    actualCost: 0.00042,
    attempts: 1,
    fallback: { used: false },
    finishReason: "stop",
    timestamp: "2026-11-07T10:00:00.000Z",
    executionAttempts: [
      { attemptNumber: 1, success: true, providerId: plan.primary.providerId, modelId: plan.primary.modelId, modelIdentifier: plan.primary.modelIdentifier, latencyMs: 120 },
    ],
  }));
}

function fail() {
  mockExecute.mockResolvedValue({
    success: false,
    error: { code: "SERVER_ERROR", message: "Provider error", retryable: false },
    latencyMs: 90,
    timestamp: "2026-11-07T10:00:00.000Z",
    executionAttempts: [],
  });
}

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
      body: JSON.stringify(body),
    }),
  );
}

async function createVictimRequestAsUserA(): Promise<string> {
  mockResolveRequester.mockResolvedValueOnce(USER_A);
  succeed("A's private answer");
  const res = await post({ model: "auto", messages: [{ role: "user", content: "A's private question" }] });
  const body = (await res.json()) as { id: string };
  expect(res.status).toBe(200);
  return body.id;
}

function snapshot(id: string) {
  return {
    request: db.clone(db.state.requests.get(id)),
    decision: db.clone(db.state.decisions.get(id)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.reset();
  resetInstanceRateLimiter();
  mockLoadCandidates.mockResolvedValue({ candidates: CANDIDATES, totalActiveModels: 2, modelsWithoutPricing: 0 });
});

// ─────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────

describe("P0: client-supplied requestId cannot touch another user's request", () => {
  it("baseline: a normal request is created, owned and returns a server-generated id", async () => {
    const id = await createVictimRequestAsUserA();
    expect(id).toMatch(SERVER_ID);
    const row = db.state.requests.get(id)!;
    expect(row).toMatchObject({ userId: "user-a", prompt: "A's private question", response: "A's private answer", status: "SUCCESS" });
    expect(db.state.decisions.get(id)).toBeDefined();
  });

  it.each([
    ["successful", () => succeed("B's answer")],
    ["failed", fail],
  ] as const)("User B sending User A's id (%s execution) leaves A's record untouched", async (_label, setup) => {
    const victimId = await createVictimRequestAsUserA();
    const before = snapshot(victimId);

    mockResolveRequester.mockResolvedValueOnce(USER_B);
    setup();

    const res = await post({
      model: "auto",
      requestId: victimId,
      messages: [{ role: "user", content: "B's question" }],
    });
    const body = (await res.json()) as { id?: string; requestId?: string };

    // A's ownership, prompt, response, usage, cost and routing decision are unchanged.
    expect(snapshot(victimId)).toEqual(before);

    // B's request got its own server-generated id and its own row.
    expect(body.requestId).toMatch(SERVER_ID);
    expect(body.requestId).not.toBe(victimId);
    const bRow = db.state.requests.get(body.requestId!)!;
    expect(bRow.userId).toBe("user-b");
    expect(bRow.prompt === null || bRow.prompt === "B's question").toBe(true);
    expect(db.state.requests.size).toBe(2);
  });

  it("User B cannot read User A's request through History detail", async () => {
    const victimId = await createVictimRequestAsUserA();

    mockResolveRequester.mockResolvedValueOnce(USER_B);
    succeed("B's answer");
    await post({ model: "auto", requestId: victimId, messages: [{ role: "user", content: "B" }] });

    expect(await fetchUserRequest("user-b", victimId)).toBeNull();
    const asOwner = await fetchUserRequest("user-a", victimId);
    expect(asOwner?.prompt).toBe("A's private question");
  });

  it.each([
    ["personal API key", PERSONAL_KEY_B, { userId: "user-b", apiKeyId: "key-b", businessId: null }],
    ["business API key", BUSINESS_KEY_C, { businessId: "biz-c", apiKeyId: "key-c", userId: null }],
  ])("%s requests stay isolated and correctly attributed", async (_label, requester, owner) => {
    const victimId = await createVictimRequestAsUserA();
    const before = snapshot(victimId);

    mockResolveRequester.mockResolvedValueOnce(requester);
    succeed("key answer");
    const res = await post({ model: "auto", requestId: victimId, messages: [{ role: "user", content: "key question" }] });
    const body = (await res.json()) as { requestId: string };

    expect(res.status).toBe(200);
    expect(snapshot(victimId)).toEqual(before);
    expect(db.state.requests.get(body.requestId)).toMatchObject(owner);
  });

  it.each([
    "../../etc/passwd",
    "x".repeat(10_000),
    "'; DROP TABLE \"Request\"; --",
    "req_0_aaaaaaaa",
    "",
  ])("malicious/malformed requestId %#  never becomes the persistence id", async (malicious) => {
    mockResolveRequester.mockResolvedValueOnce(USER_B);
    succeed("ok");
    const res = await post({ model: "auto", requestId: malicious, messages: [{ role: "user", content: "hi" }] });
    const body = (await res.json()) as { requestId: string };

    expect(res.status).toBe(200);
    expect(body.requestId).toMatch(SERVER_ID);
    expect(db.state.requests.has(malicious)).toBe(false);
  });

  it("requests without a client id work normally and each gets a distinct id", async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      mockResolveRequester.mockResolvedValueOnce(USER_B);
      succeed(`answer ${i}`);
      const res = await post({ model: "auto", messages: [{ role: "user", content: `q${i}` }] });
      const body = (await res.json()) as { id: string; requestId: string; model: string; object: string };
      expect(res.status).toBe(200);
      expect(body.object).toBe("chat.completion");
      expect(body.id).toBe(body.requestId);
      ids.add(body.id);
    }
    expect(ids.size).toBe(5);
  });

  it("simultaneous requests carrying the victim's id never reuse its row", async () => {
    const victimId = await createVictimRequestAsUserA();
    const before = snapshot(victimId);

    const requesters = [USER_B, PERSONAL_KEY_B, BUSINESS_KEY_C, USER_B];
    mockResolveRequester.mockImplementation(async () => requesters.shift());
    succeed("concurrent");

    const responses = await Promise.all(
      [0, 1, 2, 3].map((i) =>
        post({ model: "auto", requestId: victimId, messages: [{ role: "user", content: `c${i}` }] }),
      ),
    );
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as Array<{ requestId: string }>;

    expect(snapshot(victimId)).toEqual(before);
    expect(new Set(bodies.map((b) => b.requestId)).size).toBe(4);
    expect(bodies.every((b) => b.requestId !== victimId)).toBe(true);
  });
});

describe("P0: defense in depth (persistence and ownership layers)", () => {
  it("routing persistence fails safely on an id collision instead of reusing the row", async () => {
    const victimId = await createVictimRequestAsUserA();
    const before = snapshot(victimId);

    const { persistRoutingDecision } = await import("@/lib/routing/persistence");
    const decision = db.state.decisions.get(victimId)!;
    const result = await persistRoutingDecision(victimId, {
      taskType: "GENERAL",
      complexity: { complexity: "LOW", confidence: 1, signals: { contentScore: 0, messageCountScore: 0, taskScore: 0, outputScore: 0 } },
      tokenEstimate: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      candidates: [],
      selected: {
        candidate: { ...CANDIDATES[1] },
        score: 0.5,
        factors: { costScore: 0, latencyScore: 0, capabilityScore: 0, projectedCost: 0 },
        explanation: "",
      },
      fallbacks: [],
      rejected: [],
      reason: "attacker",
      timestamp: new Date(),
    } as never);

    expect(result.success).toBe(false);
    expect(snapshot(victimId)).toEqual(before);
    expect(decision.reason).not.toBe("attacker");
  });

  it("ownership attach only matches an unowned row (already-owned → P2025)", async () => {
    const victimId = await createVictimRequestAsUserA();
    await expect(
      db.request.update({
        where: { id: victimId, userId: null, businessId: null, apiKeyId: null },
        data: { userId: "user-b" },
      }),
    ).rejects.toMatchObject({ code: "P2025" });
    expect(db.state.requests.get(victimId)!.userId).toBe("user-a");
  });

  it("route source never derives the persistence id from the client body", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/app/api/v1/chat/completions/route.ts", "utf8");
    expect(src).not.toMatch(/clientRequestId/);
    expect(src).toMatch(/const effectiveRequestId = requestId;/);
    expect(src).toMatch(/userId: null,\s*businessId: null,\s*apiKeyId: null,/);
    expect(src).not.toMatch(/Math\.random/);
    const persistence = readFileSync("src/lib/routing/persistence.ts", "utf8");
    expect(persistence).not.toMatch(/\.upsert\(|findUnique\(/);
  });
});

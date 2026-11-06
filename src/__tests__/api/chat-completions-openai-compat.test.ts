/**
 * Attentra — OpenAI Chat Completions Compatibility
 *
 * Runs the real POST /api/v1/chat/completions route with the real
 * API-key chain (generation → Bearer → SHA-256 lookup → requester) over an
 * in-memory ApiKey table. Routing, provider execution and cost persistence
 * are mocked — a passing test proves the HTTP contract, not that a real
 * provider answered.
 *
 * The final block drives the route with the OFFICIAL OpenAI Python SDK over
 * a local HTTP server. It runs only when ATTENTRA_OPENAI_SDK_PYTHON points to
 * a Python interpreter with the `openai` package installed; otherwise skipped.
 */

import { execFile } from "child_process";
import { existsSync } from "fs";
import http from "http";
import type { AddressInfo } from "net";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import type { ExecutionPlan } from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// IN-MEMORY API KEY TABLE + MOCKS
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
  mockPersistCost,
} = vi.hoisted(() => ({
  rows: [] as KeyRow[],
  mockAuth: vi.fn(),
  mockRouteAndPersist: vi.fn(),
  mockPrepareExecutionFlow: vi.fn(),
  mockExecute: vi.fn(),
  mockRequestUpdate: vi.fn(),
  mockPersistCost: vi.fn(),
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
        const hit = rows.filter((r) =>
          Object.entries(where).every(([k, v]) => r[k as keyof KeyRow] === v),
        );
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    ),
  },
  request: {
    update: (...args: unknown[]) => mockRequestUpdate(...args),
  },
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma }));
vi.mock("@/lib/routing", () => ({
  routeAndPersist: mockRouteAndPersist,
  prepareExecutionFlow: mockPrepareExecutionFlow,
}));
vi.mock("@/lib/cost-intelligence", () => ({
  persistRequestCostIntelligence: mockPersistCost,
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
import {
  createBusinessApiKey,
  createPersonalApiKey,
  revokePersonalApiKey,
} from "@/lib/api-keys";
import type { PrismaClient } from "@prisma/client";

const db = fakePrisma as unknown as PrismaClient;

// ─────────────────────────────────────────────────────
// REGISTRY FIXTURE (what the mocked router "routes" to)
// ─────────────────────────────────────────────────────

const REGISTRY: Record<string, { providerId: string; displayName: string }> = {
  "gemini-3.1-flash-lite": { providerId: "google", displayName: "Gemini 3.1 Flash Lite" },
  "gpt-4o-mini": { providerId: "openai", displayName: "GPT-4o mini" },
};
const AUTO_DEFAULT = "gemini-3.1-flash-lite";

function makePlan(modelIdentifier: string): ExecutionPlan {
  const entry = REGISTRY[modelIdentifier];
  return {
    requestId: "plan-req",
    taskType: "GENERAL",
    complexity: "LOW",
    primary: {
      entryId: "primary",
      modelId: `db-${modelIdentifier}`,
      providerId: entry.providerId,
      providerName: entry.providerId,
      modelIdentifier,
      displayName: entry.displayName,
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
}

function success(plan: ExecutionPlan, overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    content: "Yes, I am working.",
    finishReason: "STOP",
    modelId: plan.primary.modelId,
    providerId: plan.primary.providerId,
    attempts: 1,
    usage: { inputTokens: 9, outputTokens: 6, totalTokens: 15 },
    latencyMs: 420,
    actualCost: 0.0000175,
    executionAttempts: [
      {
        attemptNumber: 1,
        providerId: plan.primary.providerId,
        modelId: plan.primary.modelId,
        modelIdentifier: plan.primary.modelIdentifier,
        latencyMs: 420,
        success: true,
      },
    ],
    timestamp: "2026-11-06T20:00:00.000Z",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function post(body: unknown, authorization?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authorization !== undefined) headers.authorization = authorization;
  return POST(
    new NextRequest("http://localhost:3000/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

const HELLO = [{ role: "user", content: "Hello, are you working?" }];

let personalKey: string;
let personalKeyId: string;

beforeEach(async () => {
  vi.clearAllMocks();
  rows.length = 0;

  // Programmatic clients: no Auth.js browser session.
  mockAuth.mockResolvedValue(null);

  mockRouteAndPersist.mockImplementation(
    async (_request: unknown, options?: { model?: string }) => {
      const model = options?.model;
      if (model && !REGISTRY[model]) {
        return {
          success: false,
          errorCode: "MODEL_NOT_FOUND",
          error: `Model '${model}' is not available for routing.`,
        };
      }
      return {
        success: true,
        decision: { candidates: [], selected: {}, model: model ?? AUTO_DEFAULT },
        persisted: { success: true, decisionId: "dec-1" },
      };
    },
  );
  mockPrepareExecutionFlow.mockImplementation((routing: { decision: { model: string } }) => ({
    plan: makePlan(routing.decision.model),
    status: "NOT_EXECUTED",
  }));
  mockExecute.mockImplementation(async (plan: ExecutionPlan) => success(plan));
  mockRequestUpdate.mockResolvedValue({});
  mockPersistCost.mockResolvedValue({ persisted: true });

  vi.spyOn(console, "warn").mockImplementation(() => {});

  const key = await createPersonalApiKey(db, { userId: "user-a", name: "sdk" });
  personalKey = key.rawKey;
  personalKeyId = key.id;
});

// ─────────────────────────────────────────────────────
// 1. RESPONSE ENVELOPE
// ─────────────────────────────────────────────────────

describe("OpenAI chat.completion envelope", () => {
  it("returns the standard fields with real values", async () => {
    const res = await post({ model: "auto", messages: HELLO }, `Bearer ${personalKey}`);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.object).toBe("chat.completion");
    expect(typeof json.id).toBe("string");
    expect(json.id).toBe(json.requestId);
    expect(json.created).toBe(Math.floor(Date.parse("2026-11-06T20:00:00.000Z") / 1000));
    expect(Number.isInteger(json.created)).toBe(true);
    expect(json.model).toBe("gemini-3.1-flash-lite");
    expect(json.choices).toEqual([
      {
        index: 0,
        message: { role: "assistant", content: "Yes, I am working.", refusal: null },
        logprobs: null,
        finish_reason: "stop",
      },
    ]);
    expect(json.usage).toEqual({ prompt_tokens: 9, completion_tokens: 6, total_tokens: 15 });
  });

  it("omits usage when the provider reported none (never fabricated)", async () => {
    mockExecute.mockImplementation(async (plan: ExecutionPlan) =>
      success(plan, { usage: undefined }),
    );

    const json = await (await post({ messages: HELLO }, `Bearer ${personalKey}`)).json();

    expect(json).not.toHaveProperty("usage");
    expect(json.choices[0].message.content).toBe("Yes, I am working.");
  });

  it.each([
    ["stop", "stop"],
    ["end_turn", "stop"],
    ["STOP", "stop"],
    ["length", "length"],
    ["max_tokens", "length"],
    ["MAX_TOKENS", "length"],
    ["SAFETY", "content_filter"],
    ["refusal", "content_filter"],
    [undefined, "stop"],
  ])("maps provider finish reason %s → %s", async (raw, expected) => {
    mockExecute.mockImplementation(async (plan: ExecutionPlan) =>
      success(plan, { finishReason: raw }),
    );

    const json = await (await post({ messages: HELLO }, `Bearer ${personalKey}`)).json();

    expect(json.choices[0].finish_reason).toBe(expected);
    expect(json.execution.finishReason).toBe(raw ?? null);
  });

  it("`model` is the model that actually answered after fallback", async () => {
    mockExecute.mockImplementation(async (plan: ExecutionPlan) =>
      success(plan, {
        modelId: "db-gpt-4o-mini",
        providerId: "openai",
        attempts: 2,
        fallback: { used: true },
        executionAttempts: [
          { attemptNumber: 1, modelIdentifier: plan.primary.modelIdentifier, success: false },
          { attemptNumber: 2, modelIdentifier: "gpt-4o-mini", success: true },
        ],
      }),
    );

    const json = await (await post({ messages: HELLO }, `Bearer ${personalKey}`)).json();

    expect(json.model).toBe("gpt-4o-mini");
    expect(json.routing.selectedModelIdentifier).toBe("gemini-3.1-flash-lite");
    expect(json.execution.fallbackUsed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 2. LEGACY CONSUMERS (Playground, scripts)
// ─────────────────────────────────────────────────────

describe("Legacy Attentra fields are preserved", () => {
  it("keeps success/requestId/content/routing/execution/timestamp", async () => {
    const json = await (await post({ messages: HELLO }, `Bearer ${personalKey}`)).json();

    expect(json.success).toBe(true);
    expect(json.content).toBe("Yes, I am working.");
    expect(json.timestamp).toBe("2026-11-06T20:00:00.000Z");
    expect(json.routing).toMatchObject({
      selectedModelIdentifier: "gemini-3.1-flash-lite",
      selectedProvider: "google",
      explicitModel: false,
      taskType: "GENERAL",
      complexity: "LOW",
    });
    expect(json.execution).toMatchObject({
      modelIdentifier: "gemini-3.1-flash-lite",
      provider: "google",
      usage: { inputTokens: 9, outputTokens: 6, totalTokens: 15 },
      actualCost: 0.0000175,
    });
    expect(json.execution.executionAttempts[0]).toMatchObject({
      attempt: 1,
      success: true,
    });
  });

  it("legacy Attentra request fields still work (maxTokens, policy, taskTypeHint)", async () => {
    const res = await post(
      { messages: HELLO, maxTokens: 64, policy: "cost_optimized", taskTypeHint: "GENERAL" },
      `Bearer ${personalKey}`,
    );

    expect(res.status).toBe(200);
    expect(mockRouteAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({ maxTokens: 64, taskTypeHint: "GENERAL" }),
      { policy: "cost_optimized" },
    );
  });
});

// ─────────────────────────────────────────────────────
// 3. MODEL SELECTION
// ─────────────────────────────────────────────────────

describe("model parameter", () => {
  it.each([["auto"], ["AUTO"], [undefined]])(
    "model=%s uses automatic routing",
    async (model) => {
      const res = await post(
        { ...(model !== undefined && { model }), messages: HELLO },
        `Bearer ${personalKey}`,
      );

      expect(res.status).toBe(200);
      expect(mockRouteAndPersist.mock.calls[0][1]).toBeUndefined();
    },
  );

  it("explicit registry model is routed and reported", async () => {
    const res = await post({ model: "gpt-4o-mini", messages: HELLO }, `Bearer ${personalKey}`);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockRouteAndPersist.mock.calls[0][1]).toEqual({ model: "gpt-4o-mini" });
    expect(json.model).toBe("gpt-4o-mini");
    expect(json.routing.explicitModel).toBe(true);
    expect(json.routing.reason).toMatch(/explicitly requested/);
  });

  it("explicit model + policy are both forwarded", async () => {
    await post(
      { model: "gpt-4o-mini", policy: "speed_first", messages: HELLO },
      `Bearer ${personalKey}`,
    );

    expect(mockRouteAndPersist.mock.calls[0][1]).toEqual({
      policy: "speed_first",
      model: "gpt-4o-mini",
    });
  });

  it("unknown model → 404 with OpenAI error shape, no provider call", async () => {
    const res = await post({ model: "gpt-unknown", messages: HELLO }, `Bearer ${personalKey}`);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatchObject({
      code: "MODEL_NOT_FOUND",
      type: "invalid_request_error",
      param: null,
    });
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// 4. REQUEST PARAMETERS
// ─────────────────────────────────────────────────────

describe("request parameters", () => {
  it.each([["max_tokens"], ["max_completion_tokens"], ["maxTokens"]])(
    "%s sets the output token limit",
    async (field) => {
      await post({ messages: HELLO, [field]: 128 }, `Bearer ${personalKey}`);

      expect(mockRouteAndPersist.mock.calls[0][0].maxTokens).toBe(128);
    },
  );

  it("temperature is forwarded to execution", async () => {
    await post({ messages: HELLO, temperature: 0.2 }, `Bearer ${personalKey}`);

    expect(mockExecute.mock.calls[0][2]).toMatchObject({ temperature: 0.2 });
  });

  it("accepts OpenAI defaults and no-effect fields", async () => {
    const res = await post(
      {
        model: "auto",
        messages: HELLO,
        stream: false,
        n: 1,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
        user: "end-user-42",
        metadata: { app: "cli" },
        tools: [],
      },
      `Bearer ${personalKey}`,
    );

    expect(res.status).toBe(200);
  });

  it("accepts text content parts and the developer role", async () => {
    await post(
      {
        messages: [
          { role: "developer", content: "Be brief." },
          { role: "user", content: [{ type: "text", text: "Hello" }, { type: "text", text: "there" }] },
        ],
      },
      `Bearer ${personalKey}`,
    );

    expect(mockRouteAndPersist.mock.calls[0][0].messages).toEqual([
      { role: "system", content: "Be brief." },
      { role: "user", content: "Hello\nthere" },
    ]);
  });

  it.each([
    [{ stream: true }, "stream", /Streaming is not supported/],
    [{ n: 2 }, "n", /default value/],
    [{ top_p: 0.5 }, "top_p", /default value/],
    [{ tools: [{ type: "function", function: { name: "x" } }] }, "tools", /not supported/],
    [{ stop: ["\n"] }, "stop", /not supported/],
    [{ seed: 7 }, "seed", /not supported/],
    [{ response_format: { type: "json_object" } }, "response_format", /default value/],
    [{ temperature: 3 }, "temperature", /between 0 and 2/],
    [{ max_tokens: 0 }, "max_tokens", /positive integer/],
    [{ max_tokens: 10, max_completion_tokens: 20 }, "max_completion_tokens", /Conflicting/],
    [{ model: 42 }, "model", /non-empty string/],
    [{ foo: "bar" }, "foo", /Unrecognized request argument supplied: foo/],
  ])("rejects %o explicitly (param %s)", async (extra, param, message) => {
    const res = await post({ messages: HELLO, ...extra }, `Bearer ${personalKey}`);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatchObject({
      code: "INVALID_REQUEST",
      type: "invalid_request_error",
      param,
    });
    expect(json.error.message).toMatch(message);
    expect(mockRouteAndPersist).not.toHaveBeenCalled();
  });

  it("rejects image content parts and tool messages", async () => {
    const image = await post(
      {
        messages: [
          { role: "user", content: [{ type: "image_url", image_url: { url: "https://x" } }] },
        ],
      },
      `Bearer ${personalKey}`,
    );
    const tool = await post(
      { messages: [{ role: "tool", content: "42", tool_call_id: "t1" }] },
      `Bearer ${personalKey}`,
    );

    expect(image.status).toBe(400);
    expect(tool.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────
// 5. AUTHENTICATION, OWNERSHIP, HISTORY & COST
// ─────────────────────────────────────────────────────

describe("authentication and attribution", () => {
  it("personal key without a session: owner, history and executed-model cost", async () => {
    const res = await post({ messages: HELLO }, `Bearer ${personalKey}`);

    expect(res.status).toBe(200);
    expect(mockRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: "user-a", businessId: null, apiKeyId: personalKeyId },
      }),
    );
    expect(mockPersistCost).toHaveBeenCalledWith(
      fakePrisma,
      expect.objectContaining({
        executedModelId: "db-gemini-3.1-flash-lite",
        usage: { inputTokens: 9, outputTokens: 6 },
        actualCost: 0.0000175,
      }),
    );
    expect(mockRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS", response: "Yes, I am working." }),
      }),
    );
  });

  it("business key is attributed to the business", async () => {
    const key = await createBusinessApiKey(db, { businessId: "biz-1", name: "svc" });

    const res = await post({ model: "auto", messages: HELLO }, `Bearer ${key.rawKey}`);

    expect(res.status).toBe(200);
    expect(mockRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { businessId: "biz-1", apiKeyId: key.id, userId: null },
      }),
    );
  });

  it.each([
    ["missing", undefined],
    ["invalid", `Bearer atr_${"0".repeat(64)}`],
    ["malformed", "Bearer sk-not-attentra"],
  ])("%s key → 401 with OpenAI error shape", async (_label, authorization) => {
    const res = await post({ messages: HELLO }, authorization);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe("Bearer");
    expect(json.error).toMatchObject({
      code: "AUTHENTICATION",
      type: "authentication_error",
      param: null,
    });
    expect(mockRouteAndPersist).not.toHaveBeenCalled();
  });

  it("revoked and expired keys → 401", async () => {
    await revokePersonalApiKey(db, personalKeyId, "user-a");
    const revoked = await post({ messages: HELLO }, `Bearer ${personalKey}`);

    const fresh = await createPersonalApiKey(db, { userId: "user-a", name: "exp" });
    rows[rows.length - 1].expiresAt = new Date(Date.now() - 1000);
    const expired = await post({ messages: HELLO }, `Bearer ${fresh.rawKey}`);

    expect(revoked.status).toBe(401);
    expect(expired.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────
// 6. PROVIDER ERRORS
// ─────────────────────────────────────────────────────

describe("provider errors", () => {
  it.each([
    ["RATE_LIMIT", 429, "rate_limit_error"],
    ["TIMEOUT", 504, "server_error"],
    ["SERVER_ERROR", 502, "server_error"],
    ["AUTHENTICATION", 502, "server_error"],
    ["CONTEXT_LENGTH", 400, "invalid_request_error"],
  ])("%s → %d (%s)", async (code, status, type) => {
    mockExecute.mockResolvedValue({
      success: false,
      error: { code, message: `provider said ${code}`, retryable: false },
      latencyMs: 5,
      timestamp: "2026-11-06T20:00:00.000Z",
      executionAttempts: [],
    });

    const res = await post({ messages: HELLO }, `Bearer ${personalKey}`);
    const json = await res.json();

    expect(res.status).toBe(status);
    expect(json.success).toBe(false);
    expect(json.error).toMatchObject({ code, type, param: null, retryable: false });
  });
});

// ─────────────────────────────────────────────────────
// 7. OFFICIAL OPENAI PYTHON SDK (local HTTP, opt-in)
// ─────────────────────────────────────────────────────

const SDK_PYTHON = process.env.ATTENTRA_OPENAI_SDK_PYTHON;
const canRunSdk = !!SDK_PYTHON && existsSync(SDK_PYTHON);

const SDK_SCRIPT = String.raw`
import json, os, openai
from openai import OpenAI

base = os.environ["ATTENTRA_BASE_URL"]
key = os.environ["ATTENTRA_TEST_KEY"]
client = OpenAI(base_url=base, api_key=key, max_retries=0)
out = {}

r = client.chat.completions.create(model="auto", messages=[{"role": "user", "content": "Hello, are you working?"}])
out["auto"] = {"type": type(r).__name__, "id": r.id, "object": r.object, "created": r.created,
               "model": r.model, "content": r.choices[0].message.content,
               "role": r.choices[0].message.role, "finish_reason": r.choices[0].finish_reason,
               "usage": [r.usage.prompt_tokens, r.usage.completion_tokens, r.usage.total_tokens],
               "attentra_routing_present": "routing" in (r.model_extra or {})}

r = client.chat.completions.create(model="gpt-4o-mini", max_tokens=50, temperature=0.2,
                                   messages=[{"role": "system", "content": "Be brief."}, {"role": "user", "content": "Hi"}])
out["explicit"] = {"model": r.model, "content": r.choices[0].message.content}

def err(fn):
    try:
        fn()
        return None
    except openai.APIStatusError as e:
        body = e.body if isinstance(e.body, dict) else {}
        return {"class": type(e).__name__, "status": e.status_code, "message": e.message,
                "type": body.get("type"), "param": body.get("param"), "code": body.get("code")}

out["bad_key"] = err(lambda: OpenAI(base_url=base, api_key="atr_" + "0" * 64, max_retries=0)
                     .chat.completions.create(model="auto", messages=[{"role": "user", "content": "x"}]))
out["stream"] = err(lambda: client.chat.completions.create(model="auto", stream=True,
                    messages=[{"role": "user", "content": "x"}]))
out["unknown_model"] = err(lambda: client.chat.completions.create(model="gpt-unknown",
                           messages=[{"role": "user", "content": "x"}]))
print(json.dumps(out))
`;

describe.skipIf(!canRunSdk)("official OpenAI Python SDK against the real route", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer(async (req, res) => {
      const chunks: Uint8Array[] = [];
      for await (const chunk of req) chunks.push(new Uint8Array(chunk as Buffer));

      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === "string") headers.set(name, value);
      }

      const response =
        req.method === "POST" && req.url === "/api/v1/chat/completions"
          ? await POST(
              new NextRequest(`http://127.0.0.1${req.url}`, {
                method: "POST",
                headers,
                body: new Uint8Array(Buffer.concat(chunks)),
              }),
            )
          : new Response("not found", { status: 404 });

      const outHeaders: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        outHeaders[name] = value;
      });
      res.writeHead(response.status, outHeaders);
      res.end(Buffer.from(await response.arrayBuffer()));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("chat.completions.create parses Attentra responses and errors", async () => {
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        SDK_PYTHON!,
        ["-I", "-c", SDK_SCRIPT],
        {
          env: {
            ...process.env,
            ATTENTRA_BASE_URL: baseUrl,
            ATTENTRA_TEST_KEY: personalKey,
          },
          timeout: 60_000,
        },
        (error, out, err) => (error ? reject(new Error(`${error.message}\n${err}`)) : resolve(out)),
      );
    });

    const result = JSON.parse(stdout.trim().split("\n").pop()!);

    expect(result.auto).toMatchObject({
      type: "ChatCompletion",
      object: "chat.completion",
      model: "gemini-3.1-flash-lite",
      content: "Yes, I am working.",
      role: "assistant",
      finish_reason: "stop",
      usage: [9, 6, 15],
      attentra_routing_present: true,
    });
    expect(result.auto.id).toMatch(/^req_/);
    expect(Number.isInteger(result.auto.created)).toBe(true);

    expect(result.explicit).toEqual({ model: "gpt-4o-mini", content: "Yes, I am working." });

    expect(result.bad_key).toMatchObject({
      class: "AuthenticationError",
      status: 401,
      type: "authentication_error",
    });
    expect(result.stream).toMatchObject({
      class: "BadRequestError",
      status: 400,
      param: "stream",
    });
    expect(result.unknown_model).toMatchObject({
      class: "NotFoundError",
      status: 404,
      code: "MODEL_NOT_FOUND",
    });
  }, 90_000);
});

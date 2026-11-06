/**
 * Attentra — Phase 2A: Provider-aware routing and fallback reliability
 *
 * 1. Operator exclusions (ROUTING_EXCLUDED_MODELS) keep models confirmed
 *    inaccessible to the provider account out of automatic and explicit
 *    routing — without touching the database.
 * 2. Structured attempt-failure logging: categories distinguish a model
 *    closed to the account from quota, rate limits, timeouts and auth
 *    failures; logs carry no secrets or prompt text.
 * 3. Cross-provider fallback and non-retryable stops are preserved.
 *
 * No database, no provider network calls: candidate loading is mocked and
 * the orchestrator runs real logic against in-test adapters.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ModelCandidate } from "@/lib/routing/types";
import type { ExecutionPlan, ExecutionResult, ExecutionTarget } from "@/lib/routing/execution-plan";
import type { ExecutionProvider, ExecutionRequest } from "@/lib/execution/types";

const { mockLoad } = vi.hoisted(() => ({ mockLoad: vi.fn() }));

vi.mock("@/lib/routing/database", () => ({
  loadRoutingCandidates: mockLoad,
}));

import {
  applyRoutingExclusions,
  parseRoutingExclusions,
  routeWithDatabase,
} from "@/lib/routing/router";
import { ExecutionOrchestrator } from "@/lib/execution/orchestrator";
import { ProviderRegistry } from "@/lib/execution/provider-registry";
import { ExecutionAdapterRegistry } from "@/lib/execution/registry";
import {
  NormalizedExecutionError,
  classifyAttemptFailure,
  sanitizeErrorMessage,
} from "@/lib/execution/errors";

// ─────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────

function candidate(
  providerId: string,
  modelIdentifier: string,
  overrides: Partial<ModelCandidate> = {},
): ModelCandidate {
  return {
    modelId: `${providerId}-${modelIdentifier}`,
    providerId,
    providerName: providerId,
    modelIdentifier,
    displayName: modelIdentifier,
    capabilities: ["chat"],
    tier: "LIGHT",
    contextWindow: 1_000_000,
    inputPricePer1k: 0.0001,
    outputPricePer1k: 0.0004,
    expectedLatencyMs: 500,
    active: true,
    ...overrides,
  };
}

// The retired model is deliberately the most attractive candidate
// (cheapest, fastest) so automatic routing would pick it if allowed.
const RETIRED = candidate("google", "gemini-2.5-flash", {
  inputPricePer1k: 0.00001,
  outputPricePer1k: 0.00002,
  expectedLatencyMs: 300,
});

const POOL = [
  RETIRED,
  candidate("google", "gemini-3.1-flash-lite"),
  candidate("openai", "gpt-4.1-nano", { expectedLatencyMs: 800 }),
  candidate("anthropic", "claude-haiku-4-5", { expectedLatencyMs: 900 }),
];

const MESSAGES = [{ role: "user", content: "Hello there, please answer briefly" }];

function allRoutedIdentifiers(decision: {
  selected: { candidate: ModelCandidate };
  fallbacks: Array<{ candidate: ModelCandidate }>;
}) {
  return [decision.selected, ...decision.fallbacks].map((s) => s.candidate.modelIdentifier);
}

beforeEach(() => {
  mockLoad.mockReset();
  mockLoad.mockResolvedValue({
    candidates: POOL,
    totalActiveModels: POOL.length,
    modelsWithoutPricing: 0,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────
// 1. OPERATOR EXCLUSIONS
// ─────────────────────────────────────────────────────

describe("ROUTING_EXCLUDED_MODELS", () => {
  it("parses comma-separated entries, ignoring blanks and whitespace", () => {
    expect(parseRoutingExclusions(undefined)).toEqual([]);
    expect(parseRoutingExclusions(" google/gemini-2.5-flash , ,gemini-2.5-pro ")).toEqual([
      "google/gemini-2.5-flash",
      "gemini-2.5-pro",
    ]);
  });

  it("matches provider/model (provider case-insensitive) and bare identifiers", () => {
    const pool = [...POOL, candidate("openai", "gemini-2.5-flash")];

    const byProvider = applyRoutingExclusions(pool, ["Google/gemini-2.5-flash"]);
    expect(byProvider.map((c) => `${c.providerId}/${c.modelIdentifier}`)).toContain(
      "openai/gemini-2.5-flash",
    );
    expect(byProvider).not.toContain(RETIRED);

    const bare = applyRoutingExclusions(pool, ["gemini-2.5-flash"]);
    expect(bare.some((c) => c.modelIdentifier === "gemini-2.5-flash")).toBe(false);
  });

  it("eligible model selection: without exclusions the attractive model wins (baseline)", async () => {
    const result = await routeWithDatabase({ messages: MESSAGES });

    expect(result.decision?.selected.candidate.modelIdentifier).toBe("gemini-2.5-flash");
  });

  it("an excluded model is never selected nor used as a fallback", async () => {
    vi.stubEnv("ROUTING_EXCLUDED_MODELS", "google/gemini-2.5-flash");

    const result = await routeWithDatabase({ messages: MESSAGES });

    expect(result.success).toBe(true);
    expect(allRoutedIdentifiers(result.decision!)).not.toContain("gemini-2.5-flash");
    expect(result.decision!.candidates).toHaveLength(POOL.length - 1);
  });

  it("cross-provider fallback ordering is preserved after exclusion", async () => {
    vi.stubEnv("ROUTING_EXCLUDED_MODELS", "google/gemini-2.5-flash");

    const { decision } = await routeWithDatabase({ messages: MESSAGES });
    const selectedProvider = decision!.selected.candidate.providerId;

    expect(decision!.fallbacks.length).toBeGreaterThan(0);
    expect(decision!.fallbacks[0].candidate.providerId).not.toBe(selectedProvider);
  });

  it("an explicit request for an excluded model is MODEL_NOT_FOUND", async () => {
    vi.stubEnv("ROUTING_EXCLUDED_MODELS", "google/gemini-2.5-flash");

    const result = await routeWithDatabase({ messages: MESSAGES }, { model: "gemini-2.5-flash" });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("MODEL_NOT_FOUND");
  });

  it("excluding every model reports NO_ACTIVE_MODELS", async () => {
    vi.stubEnv(
      "ROUTING_EXCLUDED_MODELS",
      POOL.map((c) => `${c.providerId}/${c.modelIdentifier}`).join(","),
    );

    const result = await routeWithDatabase({ messages: MESSAGES });

    expect(result.errorCode).toBe("NO_ACTIVE_MODELS");
  });
});

// ─────────────────────────────────────────────────────
// 2. ORCHESTRATOR — FALLBACK + STRUCTURED FAILURE LOGS
// ─────────────────────────────────────────────────────

type Outcome =
  | { ok: true; content?: string }
  | { ok: false; code: string; message: string; retryable: boolean };

class ScriptedAdapter implements ExecutionProvider {
  readonly providerName: string;
  readonly calls: ExecutionRequest[] = [];

  constructor(
    readonly providerId: string,
    private readonly outcomes: Record<string, Outcome>,
  ) {
    this.providerName = providerId;
  }

  supports(): boolean {
    return true;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    this.calls.push(request);
    const outcome = this.outcomes[request.modelIdentifier];

    if (!outcome || outcome.ok) {
      return {
        success: true,
        providerId: this.providerId,
        modelId: request.modelId,
        content: (outcome as { content?: string } | undefined)?.content ?? "ok",
        usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8 },
        latencyMs: 10,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: false,
      providerId: this.providerId,
      modelId: request.modelId,
      error: { code: outcome.code, message: outcome.message, retryable: outcome.retryable },
      latencyMs: 10,
      timestamp: new Date().toISOString(),
    };
  }

  normalizeError(error: unknown): NormalizedExecutionError {
    return new NormalizedExecutionError("UNKNOWN", String(error), { retryable: false });
  }
}

function target(providerId: string, modelIdentifier: string, entryId: string): ExecutionTarget {
  return {
    entryId,
    modelId: `db-${modelIdentifier}`,
    providerId,
    providerName: providerId,
    modelIdentifier,
    displayName: modelIdentifier,
    projectedCost: 0.0001,
    routingScore: 0.9,
  };
}

function plan(): ExecutionPlan {
  return {
    requestId: "req_phase2a_test",
    taskType: "GENERAL",
    complexity: "LOW",
    primary: target("google", "gemini-2.5-flash", "primary"),
    fallbacks: [
      target("openai", "gpt-4.1-nano", "fallback-1"),
      target("anthropic", "claude-haiku-4-5", "fallback-2"),
    ],
    estimatedInputTokens: 10,
    estimatedOutputTokens: 64,
    projectedCost: 0.0001,
    routingScore: 0.9,
    routingExplanation: "test",
    status: "NOT_EXECUTED",
    createdAt: new Date(),
  };
}

function orchestratorWith(primary: Outcome, fallback1: Outcome = { ok: true }) {
  const registry = new ProviderRegistry(new ExecutionAdapterRegistry());
  const google = new ScriptedAdapter("google", { "gemini-2.5-flash": primary });
  const openai = new ScriptedAdapter("openai", { "gpt-4.1-nano": fallback1 });
  const anthropic = new ScriptedAdapter("anthropic", {});
  registry.register(google);
  registry.register(openai);
  registry.register(anthropic);
  return { orchestrator: new ExecutionOrchestrator(registry), google, openai, anthropic };
}

function attemptLogs(
  spy: ReturnType<typeof vi.spyOn>,
): Array<Record<string, unknown> & { message: string; willFallback: boolean }> {
  return spy.mock.calls
    .filter((call: unknown[]) => call[0] === "[orchestrator] attempt failed")
    .map((call: unknown[]) => JSON.parse(call[1] as string));
}

const RETIRED_MESSAGE =
  "[404 Not Found] This model models/gemini-2.5-flash is no longer available to new users. " +
  "Please update your code to use models/gemini-3.8-flash";

describe("orchestrator fallback with structured failure logs", () => {
  it("model closed to the account → cross-provider fallback, executed model reported", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { orchestrator, anthropic } = orchestratorWith({
      ok: false,
      code: "MODEL_UNAVAILABLE",
      message: RETIRED_MESSAGE,
      retryable: false,
    });

    const result = await orchestrator.execute(plan(), MESSAGES);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("openai");
    expect(result.modelId).toBe("db-gpt-4.1-nano");
    expect(result.fallback?.used).toBe(true);
    expect(result.executionAttempts.map((a) => a.success)).toEqual([false, true]);
    expect(anthropic.calls).toHaveLength(0);

    const logs = attemptLogs(warn);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      requestId: "req_phase2a_test",
      attempt: 1,
      maxAttempts: 3,
      provider: "google",
      model: "gemini-2.5-flash",
      code: "MODEL_UNAVAILABLE",
      category: "model_unavailable_for_account",
      retryable: false,
      willFallback: true,
    });
  });

  it.each([
    ["RATE_LIMIT", "You exceeded your current quota, please check your plan and billing details", "quota_exhausted"],
    ["RATE_LIMIT", "Too many requests, slow down", "rate_limited"],
    ["TIMEOUT", "Execution timed out after 30000ms", "timeout"],
    ["SERVER_ERROR", "503 The model is overloaded", "provider_unavailable"],
    ["NETWORK_ERROR", "fetch failed", "network"],
  ])("temporary failure %s (%s) → fallback, category %s", async (code, message, category) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { orchestrator } = orchestratorWith({ ok: false, code, message, retryable: true });

    const result = await orchestrator.execute(plan(), MESSAGES);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe("openai");
    expect(attemptLogs(warn)[0]).toMatchObject({ code, category, willFallback: true });
  });

  it.each([
    ["AUTHENTICATION", "403 Permission denied for this project", "permission_denied"],
    ["AUTHENTICATION", "API key not valid", "auth_failed"],
    ["INVALID_REQUEST", "Invalid argument: temperature", "invalid_request"],
    ["CONTEXT_LENGTH", "Input exceeds context window", "context_length"],
  ])("non-retryable %s stops without fallback (category %s)", async (code, message, category) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { orchestrator, openai } = orchestratorWith({ ok: false, code, message, retryable: false });

    const result = await orchestrator.execute(plan(), MESSAGES);

    expect(result.success).toBe(false);
    expect(result.executionAttempts).toHaveLength(1);
    expect(openai.calls).toHaveLength(0);
    expect(attemptLogs(warn)[0]).toMatchObject({ code, category, willFallback: false });
  });

  it("the last failing attempt reports willFallback=false", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { orchestrator } = orchestratorWith(
      { ok: false, code: "SERVER_ERROR", message: "500", retryable: true },
      { ok: false, code: "SERVER_ERROR", message: "500", retryable: true },
    );

    const result = await orchestrator.execute(plan(), MESSAGES, { maxAttempts: 2 });

    expect(result.success).toBe(false);
    expect(attemptLogs(warn).map((l) => l.willFallback)).toEqual([true, false]);
  });

  it("successful attempts are not logged", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { orchestrator } = orchestratorWith({ ok: true });

    await orchestrator.execute(plan(), MESSAGES);

    expect(attemptLogs(warn)).toHaveLength(0);
  });

  it("logs contain no secrets and no prompt text", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const secrets = [
      "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz012345678",
      "atr_" + "a1".repeat(32),
    ];
    const prompt = "My confidential launch plan for Project Nightingale is attached";
    const { orchestrator } = orchestratorWith({
      ok: false,
      code: "SERVER_ERROR",
      message:
        `upstream echoed: "${prompt}" while using ${secrets.join(" ")} ` +
        "Authorization: Bearer xyz.secret.token",
      retryable: true,
    });

    await orchestrator.execute(plan(), [{ role: "user", content: prompt }]);

    const raw = warn.mock.calls.map((call: unknown[]) => call.join(" ")).join("\n");
    for (const secret of secrets) expect(raw).not.toContain(secret);
    expect(raw).not.toContain("xyz.secret.token");
    expect(raw).not.toContain("Project Nightingale");
    expect(raw).toContain("[PROMPT]");
    expect(attemptLogs(warn)[0].message.length).toBeLessThanOrEqual(200);
  });
});

// ─────────────────────────────────────────────────────
// 3. CLASSIFIER + SANITIZER UNITS
// ─────────────────────────────────────────────────────

describe("classifyAttemptFailure", () => {
  it.each([
    ["MODEL_UNAVAILABLE", RETIRED_MESSAGE, "model_unavailable_for_account"],
    ["MODEL_UNAVAILABLE", "Model gpt-x not found", "model_not_found"],
    ["RATE_LIMIT", "RESOURCE_EXHAUSTED: quota limit: 0", "quota_exhausted"],
    ["RATE_LIMIT", "429 rate limit", "rate_limited"],
    ["UNKNOWN", "something odd", "other"],
  ])("%s / %s → %s", (code, message, expected) => {
    expect(classifyAttemptFailure(code, message)).toBe(expected);
  });
});

describe("sanitizeErrorMessage covers current key formats", () => {
  it.each([
    ["sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"],
    ["sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"],
    ["AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz012345678"],
    ["atr_" + "0f".repeat(32)],
  ])("redacts %s", (secret) => {
    expect(sanitizeErrorMessage(`failed with ${secret} here`)).not.toContain(secret);
  });
});

/**
 * Attentra — Explicit Model Selection (routing)
 *
 * OpenAI compatibility: `model` in a chat completion request selects a
 * single registry model instead of automatic routing.
 *
 * Candidate loading is mocked (no database). The real routing pipeline
 * (analyze → filter → score → select → fallback → explain) runs.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ModelCandidate } from "@/lib/routing/types";

const { mockLoad } = vi.hoisted(() => ({ mockLoad: vi.fn() }));

vi.mock("@/lib/routing/database", () => ({
  loadRoutingCandidates: mockLoad,
}));

import { resolveExplicitModel, routeWithDatabase } from "@/lib/routing/router";
import { filterCandidates } from "@/lib/routing/candidates";

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
    tier: "MID",
    contextWindow: 128_000,
    inputPricePer1k: 0.001,
    outputPricePer1k: 0.002,
    expectedLatencyMs: 1_000,
    active: true,
    ...overrides,
  };
}

const POOL = [
  candidate("openai", "gpt-4o-mini"),
  candidate("google", "gemini-2.5-flash"),
  candidate("anthropic", "claude-haiku-4-5", { capabilities: ["chat", "coding"] }),
  // Same identifier offered by two providers → ambiguous without a prefix
  candidate("openai", "shared-model"),
  candidate("google", "shared-model"),
];

const MESSAGES = [{ role: "user", content: "Hello there" }];

beforeEach(() => {
  mockLoad.mockReset();
  mockLoad.mockResolvedValue({
    candidates: POOL,
    totalActiveModels: POOL.length,
    modelsWithoutPricing: 0,
  });
});

describe("resolveExplicitModel", () => {
  it("matches a bare model identifier", () => {
    const r = resolveExplicitModel(POOL, "gpt-4o-mini");
    expect(r.candidate?.modelIdentifier).toBe("gpt-4o-mini");
  });

  it("matches provider/identifier (case-insensitive provider)", () => {
    const r = resolveExplicitModel(POOL, "Google/gemini-2.5-flash");
    expect(r.candidate?.providerId).toBe("google");
  });

  it("disambiguates with a provider prefix", () => {
    expect(resolveExplicitModel(POOL, "shared-model").candidate).toBeUndefined();
    expect(resolveExplicitModel(POOL, "google/shared-model").candidate?.providerId).toBe(
      "google",
    );
  });

  it("reports AMBIGUOUS_MODEL and MODEL_NOT_FOUND", () => {
    const ambiguous = resolveExplicitModel(POOL, "shared-model");
    const missing = resolveExplicitModel(POOL, "gpt-unknown");

    expect("errorCode" in ambiguous && ambiguous.errorCode).toBe("AMBIGUOUS_MODEL");
    expect("errorCode" in missing && missing.errorCode).toBe("MODEL_NOT_FOUND");
  });

  it("does not match the wrong provider prefix", () => {
    const r = resolveExplicitModel(POOL, "anthropic/gpt-4o-mini");
    expect("errorCode" in r && r.errorCode).toBe("MODEL_NOT_FOUND");
  });
});

describe("routeWithDatabase with an explicit model", () => {
  it("routes only to the requested model with no fallbacks", async () => {
    const result = await routeWithDatabase(
      { messages: MESSAGES },
      { model: "gemini-2.5-flash" },
    );

    expect(result.success).toBe(true);
    expect(result.decision?.selected.candidate.modelIdentifier).toBe("gemini-2.5-flash");
    expect(result.decision?.candidates).toHaveLength(1);
    expect(result.decision?.fallbacks).toEqual([]);
    expect(result.decision?.reason).toMatch(/explicitly requested/);
  });

  it("honors the explicit model even when task detection wants another capability", async () => {
    // Coding prompt → task CODING requires "coding"; gpt-4o-mini fixture lacks it.
    const coding = [
      { role: "user", content: "Write a TypeScript function that debounces calls and fix this bug" },
    ];

    const auto = await routeWithDatabase({ messages: coding, taskTypeHint: "CODING" });
    expect(auto.decision?.selected.candidate.modelIdentifier).toBe("claude-haiku-4-5");

    const explicit = await routeWithDatabase(
      { messages: coding, taskTypeHint: "CODING" },
      { model: "gpt-4o-mini" },
    );
    expect(explicit.success).toBe(true);
    expect(explicit.decision?.selected.candidate.modelIdentifier).toBe("gpt-4o-mini");
  });

  it("still enforces the context window for explicit models", async () => {
    mockLoad.mockResolvedValue({
      candidates: [candidate("openai", "tiny", { contextWindow: 10 })],
      totalActiveModels: 1,
      modelsWithoutPricing: 0,
    });

    const result = await routeWithDatabase({ messages: MESSAGES }, { model: "tiny" });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("ALL_EXCEED_CONTEXT");
  });

  it("returns MODEL_NOT_FOUND for unknown or unrouted models", async () => {
    const result = await routeWithDatabase({ messages: MESSAGES }, { model: "gpt-unknown" });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("MODEL_NOT_FOUND");
  });

  it("without a model, automatic routing is unchanged (multiple candidates, fallbacks)", async () => {
    const result = await routeWithDatabase({ messages: MESSAGES });

    expect(result.success).toBe(true);
    expect(result.decision!.candidates.length).toBeGreaterThan(1);
    expect(result.decision!.fallbacks.length).toBeGreaterThan(0);
    expect(result.decision!.reason).not.toMatch(/explicitly requested/);
  });
});

describe("filterCandidates ignoreCapabilities", () => {
  it("skips only the capability filter", () => {
    const models = [
      candidate("openai", "no-coding"),
      candidate("openai", "inactive", { active: false }),
    ];

    const strict = filterCandidates(models, { taskType: "CODING" });
    const relaxed = filterCandidates(models, { taskType: "CODING", ignoreCapabilities: true });

    expect(strict.eligible).toHaveLength(0);
    expect(relaxed.eligible.map((m) => m.modelIdentifier)).toEqual(["no-coding"]);
    expect(relaxed.rejected[0].reason).toBe("INACTIVE_MODEL");
  });
});

/**
 * Attentra — Phase 2C: Cost-aware fallback protection
 *
 * ROUTING_MAX_FALLBACK_COST_MULTIPLIER removes fallbacks PROJECTED to cost
 * more than N × the selected primary. Soft mode (default) keeps the cheapest
 * cross-provider fallback when every cross-provider alternative is over the
 * ceiling; strict mode does not.
 *
 * Candidate loading is mocked (no database); the real routing pipeline,
 * execution-plan builder and orchestrator run against in-test adapters.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ModelCandidate, ModelScore } from "@/lib/routing/types";
import type { ExecutionResult } from "@/lib/routing/execution-plan";
import type { ExecutionProvider, ExecutionRequest } from "@/lib/execution/types";

const { mockLoad } = vi.hoisted(() => ({ mockLoad: vi.fn() }));

vi.mock("@/lib/routing/database", () => ({
  loadRoutingCandidates: mockLoad,
}));

import { routeWithDatabase } from "@/lib/routing/router";
import {
  applyFallbackCostCeiling,
  parseFallbackCostCeiling,
  resolveFallbackCostCeiling,
  type FallbackCostCeiling,
} from "@/lib/routing/fallback";
import { prepareExecutionFlow } from "@/lib/routing/execution-plan";
import { ExecutionOrchestrator } from "@/lib/execution/orchestrator";
import { ProviderRegistry } from "@/lib/execution/provider-registry";
import { ExecutionAdapterRegistry } from "@/lib/execution/registry";
import { NormalizedExecutionError } from "@/lib/execution/errors";
import type { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────

/** Prices keep a 1:4 input:output ratio, so projected-cost ratios = price ratios. */
function candidate(
  providerId: string,
  modelIdentifier: string,
  inputPricePer1k: number,
  expectedLatencyMs: number,
): ModelCandidate {
  return {
    modelId: `db-${modelIdentifier}`,
    providerId,
    providerName: providerId,
    modelIdentifier,
    displayName: modelIdentifier,
    capabilities: ["chat"],
    tier: "LIGHT",
    contextWindow: 1_000_000,
    inputPricePer1k,
    outputPricePer1k: inputPricePer1k * 4,
    expectedLatencyMs,
    active: true,
  };
}

// Primary: cheapest + fastest. Ratios vs primary: B 100×, C 2×, D 200×, E 50×.
const A = candidate("google", "g-cheap", 0.0001, 300);
const B = candidate("google", "g-pricey", 0.01, 900);
const C = candidate("openai", "o-moderate", 0.0002, 800);
const D = candidate("openai", "o-pricey", 0.02, 1_000);
const E = candidate("anthropic", "a-pricey", 0.005, 1_100);
const POOL = [A, B, C, D, E];

const MESSAGES = [{ role: "user", content: "Hello there, please answer briefly" }];

function score(c: ModelCandidate, projectedCost: number): ModelScore {
  return {
    candidate: c,
    score: 0.5,
    factors: { costScore: 0.5, latencyScore: 0.5, capabilityScore: 0.5, projectedCost },
    explanation: "",
  };
}

const ids = (scores: ModelScore[]) => scores.map((s) => s.candidate.modelIdentifier);

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
// 1. CONFIGURATION
// ─────────────────────────────────────────────────────

describe("parseFallbackCostCeiling", () => {
  it("unset or blank → disabled, not malformed", () => {
    expect(parseFallbackCostCeiling(undefined, undefined)).toEqual({ ceiling: null, malformed: false });
    expect(parseFallbackCostCeiling("  ", "strict")).toEqual({ ceiling: null, malformed: false });
  });

  it("valid multiplier, soft by default, strict on request", () => {
    expect(parseFallbackCostCeiling(" 20 ", undefined).ceiling).toEqual({ multiplier: 20, mode: "soft" });
    expect(parseFallbackCostCeiling("1.5", "STRICT").ceiling).toEqual({ multiplier: 1.5, mode: "strict" });
    expect(parseFallbackCostCeiling("3", "anything").ceiling?.mode).toBe("soft");
  });

  it.each([["abc"], ["0.5"], ["0"], ["-3"], ["Infinity"], ["NaN"]])(
    "malformed %s → disabled and flagged",
    (raw) => {
      expect(parseFallbackCostCeiling(raw, undefined)).toEqual({ ceiling: null, malformed: true });
    },
  );

  it("malformed environment value warns at most once and disables the ceiling", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "twenty");

    expect(resolveFallbackCostCeiling()).toBeNull();
    expect(resolveFallbackCostCeiling()).toBeNull();
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────
// 2. FILTER (pure)
// ─────────────────────────────────────────────────────

describe("applyFallbackCostCeiling", () => {
  const primary = score(A, 0.001);
  // Provider-diverse order as produced by orderFallbacks
  const ordered = [score(E, 0.05), score(C, 0.002), score(B, 0.1), score(D, 0.2)];
  const soft = (multiplier: number): FallbackCostCeiling => ({ multiplier, mode: "soft" });
  const strict = (multiplier: number): FallbackCostCeiling => ({ multiplier, mode: "strict" });

  it("multiplier unset → fallbacks unchanged", () => {
    const result = applyFallbackCostCeiling(primary, ordered, null);

    expect(result.fallbacks).toBe(ordered);
    expect(result.applied).toBe(false);
  });

  it("all fallbacks within the multiplier are kept", () => {
    const result = applyFallbackCostCeiling(primary, ordered, soft(1_000));

    expect(ids(result.fallbacks)).toEqual(["a-pricey", "o-moderate", "g-pricey", "o-pricey"]);
    expect(result.excluded).toEqual([]);
  });

  it("expensive fallbacks are filtered; provider-diverse order is preserved", () => {
    const result = applyFallbackCostCeiling(primary, ordered, soft(60));

    expect(ids(result.fallbacks)).toEqual(["a-pricey", "o-moderate"]);
    expect(ids(result.excluded)).toEqual(["g-pricey", "o-pricey"]);
    expect(result.thresholdCost).toBeCloseTo(0.06);
    expect(result.retainedOverCeiling).toBeUndefined();
  });

  it("soft limit keeps the CHEAPEST cross-provider fallback when all cross-provider options exceed", () => {
    const result = applyFallbackCostCeiling(primary, ordered, soft(1.5));

    expect(ids(result.fallbacks)).toEqual(["o-moderate"]);
    expect(result.retainedOverCeiling?.candidate.modelIdentifier).toBe("o-moderate");
    expect(ids(result.excluded)).toEqual(["a-pricey", "g-pricey", "o-pricey"]);
  });

  it("strict mode keeps nothing over the ceiling", () => {
    const result = applyFallbackCostCeiling(primary, ordered, strict(1.5));

    expect(result.fallbacks).toEqual([]);
    expect(result.retainedOverCeiling).toBeUndefined();
  });

  it("no eligible fallback: same-provider-only pool over the ceiling → empty", () => {
    const result = applyFallbackCostCeiling(primary, [score(B, 0.1)], soft(2));

    expect(result.fallbacks).toEqual([]);
    expect(result.retainedOverCeiling).toBeUndefined();
  });

  it("no fallbacks at all → unchanged", () => {
    expect(applyFallbackCostCeiling(primary, [], soft(2)).fallbacks).toEqual([]);
  });

  it.each([[0], [Number.NaN], [-1]])(
    "primary projected cost %s → ceiling skipped, fallbacks unchanged",
    (cost) => {
      const result = applyFallbackCostCeiling(score(A, cost), ordered, soft(2));

      expect(result.fallbacks).toBe(ordered);
      expect(result.skippedReason).toBe("PRIMARY_COST_UNAVAILABLE");
    },
  );

  it("fallbacks with an unusable projected cost are never kept", () => {
    const result = applyFallbackCostCeiling(primary, [score(C, Number.NaN)], soft(1_000));

    expect(result.fallbacks).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 3. ROUTING PIPELINE
// ─────────────────────────────────────────────────────

describe("routing pipeline with the ceiling", () => {
  it("unset → identical decision to today's behavior", async () => {
    const baseline = await routeWithDatabase({ messages: MESSAGES });

    vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "");
    const unset = await routeWithDatabase({ messages: MESSAGES });

    expect(ids(unset.decision!.fallbacks)).toEqual(ids(baseline.decision!.fallbacks));
    expect(unset.decision!.reason).toBe(baseline.decision!.reason);
    expect(baseline.decision!.fallbacks).toHaveLength(4);
  });

  it("enabled → expensive fallbacks removed, primary unchanged, explanation states projections", async () => {
    const baseline = await routeWithDatabase({ messages: MESSAGES });

    vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "3");
    const result = await routeWithDatabase({ messages: MESSAGES });

    expect(result.decision!.selected.candidate.modelIdentifier).toBe(
      baseline.decision!.selected.candidate.modelIdentifier,
    );
    expect(ids(result.decision!.fallbacks)).toEqual(["o-moderate"]);
    expect(result.decision!.candidates).toHaveLength(POOL.length);
    expect(result.decision!.reason).toMatch(
      /Fallback cost ceiling 3x primary projected cost \(\$\d+\.\d{6}\): excluded 3 fallback\(s\)/,
    );
  });

  it("soft limit retention is explained", async () => {
    vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "1.5");
    const result = await routeWithDatabase({ messages: MESSAGES });

    expect(ids(result.decision!.fallbacks)).toEqual(["o-moderate"]);
    expect(result.decision!.reason).toMatch(/kept o-moderate \(openai, projected \$\d+\.\d{6}\) above the ceiling/);
    expect(result.decision!.reason).toMatch(/soft limit/);
  });

  it("strict mode can leave the primary without fallbacks", async () => {
    vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "1.5");
    vi.stubEnv("ROUTING_FALLBACK_COST_MODE", "strict");
    const result = await routeWithDatabase({ messages: MESSAGES });

    expect(result.success).toBe(true);
    expect(result.decision!.fallbacks).toEqual([]);
  });

  it("malformed configuration behaves exactly like unset", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const baseline = await routeWithDatabase({ messages: MESSAGES });

    vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "cheap");
    const result = await routeWithDatabase({ messages: MESSAGES });

    expect(ids(result.decision!.fallbacks)).toEqual(ids(baseline.decision!.fallbacks));
    expect(result.decision!.reason).toBe(baseline.decision!.reason);
  });

  it("explicit model: only the requested model, no fallbacks, no cost note", async () => {
    vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "3");
    const result = await routeWithDatabase({ messages: MESSAGES }, { model: "o-pricey" });

    expect(result.decision!.selected.candidate.modelIdentifier).toBe("o-pricey");
    expect(result.decision!.fallbacks).toEqual([]);
    expect(result.decision!.reason).toMatch(/explicitly requested/);
    expect(result.decision!.reason).not.toMatch(/Fallback cost ceiling/);
  });

  it.each([["balanced"], ["cost_optimized"], ["quality_first"], ["speed_first"]])(
    "policy %s: selection unchanged; a non-binding ceiling changes nothing",
    async (policy) => {
      const baseline = await routeWithDatabase({ messages: MESSAGES }, { policy });

      vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "1000000");
      const loose = await routeWithDatabase({ messages: MESSAGES }, { policy });

      vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "3");
      const tight = await routeWithDatabase({ messages: MESSAGES }, { policy });

      expect(loose.decision!.reason).toBe(baseline.decision!.reason);
      expect(ids(loose.decision!.fallbacks)).toEqual(ids(baseline.decision!.fallbacks));
      expect(tight.decision!.selected.candidate.modelId).toBe(
        baseline.decision!.selected.candidate.modelId,
      );
      expect(tight.decision!.fallbacks.length).toBeLessThanOrEqual(baseline.decision!.fallbacks.length);
    },
  );
});

// ─────────────────────────────────────────────────────
// 4. EXECUTION + COST ATTRIBUTION
// ─────────────────────────────────────────────────────

class ScriptedAdapter implements ExecutionProvider {
  readonly providerName: string;
  readonly calls: string[] = [];

  constructor(
    readonly providerId: string,
    private readonly failing: Set<string>,
  ) {
    this.providerName = providerId;
  }

  supports(): boolean {
    return true;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    this.calls.push(request.modelIdentifier);
    const base = {
      providerId: this.providerId,
      modelId: request.modelId,
      latencyMs: 5,
      timestamp: new Date().toISOString(),
    };

    if (this.failing.has(request.modelIdentifier)) {
      return {
        ...base,
        success: false,
        error: { code: "SERVER_ERROR", message: "503 overloaded", retryable: true },
      };
    }

    return {
      ...base,
      success: true,
      content: "ok",
      usage: { inputTokens: 1_000, outputTokens: 500, totalTokens: 1_500 },
    };
  }

  normalizeError(error: unknown): NormalizedExecutionError {
    return new NormalizedExecutionError("UNKNOWN", String(error), { retryable: false });
  }
}

describe("execution after filtering", () => {
  it("falls back to the retained model; executed model and actual cost use its own pricing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "3");

    const routing = await routeWithDatabase({ messages: MESSAGES });
    const flow = prepareExecutionFlow(routing, "req_phase2c");

    expect(flow.plan!.primary.modelIdentifier).toBe("g-cheap");
    expect(flow.plan!.fallbacks.map((f) => f.modelIdentifier)).toEqual(["o-moderate"]);

    const google = new ScriptedAdapter("google", new Set(["g-cheap"]));
    const openai = new ScriptedAdapter("openai", new Set());
    const anthropic = new ScriptedAdapter("anthropic", new Set());
    const registry = new ProviderRegistry(new ExecutionAdapterRegistry());
    [google, openai, anthropic].forEach((a) => registry.register(a));

    const prices: Record<string, ModelCandidate> = Object.fromEntries(POOL.map((c) => [c.modelId, c]));
    const fakePrisma = {
      model: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
          inputPricePer1k: prices[where.id].inputPricePer1k,
          outputPricePer1k: prices[where.id].outputPricePer1k,
        })),
      },
    } as unknown as PrismaClient;

    const result = await new ExecutionOrchestrator(registry).execute(flow.plan!, MESSAGES, {
      prisma: fakePrisma,
    });

    expect(result.success).toBe(true);
    expect(result.modelId).toBe(C.modelId);
    expect(result.providerId).toBe("openai");
    expect(openai.calls).toEqual(["o-moderate"]);
    expect(anthropic.calls).toEqual([]);
    // 1,000 in × 0.0002/1k + 500 out × 0.0008/1k = 0.0006 (executed model's price)
    expect(result.actualCost).toBeCloseTo(0.0006, 10);
  });
});

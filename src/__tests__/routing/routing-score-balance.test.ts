/**
 * Attentra — Routing Score Balance Tests
 *
 * Phase 12.10 — Routing Score Balance
 *
 * Proves that the complexity-aware scoring adjustments work correctly:
 *
 * 1. LOW complexity: cost/latency can dominate — cheaper capable model wins
 * 2. MEDIUM complexity: capability/quality has materially more weight —
 *    cheapest model does NOT automatically win
 * 3. HIGH complexity: capability/quality dominates — stronger models (higher
 *    tier) get a meaningful scoring advantage
 * 4. Cost still affects ranking within comparable capability tiers
 *
 * All tests are fully deterministic. No provider calls. No randomness.
 */

import { describe, it, expect } from "vitest";

import { scoreCandidates } from "@/lib/routing/scorer";
import { route } from "@/lib/routing/router";
import { ROUTING_POLICIES } from "@/lib/routing/policies";
import type { ModelCandidate, TokenEstimate } from "@/lib/routing/types";

// ─────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<ModelCandidate> = {}): ModelCandidate {
  return {
    modelId: "m1",
    providerId: "prov-a",
    modelIdentifier: "model-1",
    displayName: "Model One",
    capabilities: ["chat"],
    tier: "LIGHT",
    contextWindow: 128000,
    inputPricePer1k: 0.001,
    outputPricePer1k: 0.004,
    expectedLatencyMs: 800,
    active: true,
    ...overrides,
  };
}

const tokenEstimate: TokenEstimate = {
  inputTokens: 500,
  outputTokens: 200,
  totalTokens: 700,
};

// Three candidates with different tiers and costs:
//   - Cheap Light:  lowest cost, LIGHT tier, has "reasoning" capability
//   - Mid:          moderate cost, MID tier, has "reasoning" capability
//   - Expensive Heavy: highest cost, HEAVY tier, has "reasoning" capability
function buildReasoningPool(): ModelCandidate[] {
  return [
    makeCandidate({
      modelId: "cheap-light",
      providerId: "prov-a",
      modelIdentifier: "cheap-light-model",
      displayName: "Cheap Light",
      capabilities: ["chat", "reasoning"],
      tier: "LIGHT",
      inputPricePer1k: 0.0001,
      outputPricePer1k: 0.0004,
      expectedLatencyMs: 400,
    }),
    makeCandidate({
      modelId: "mid-model",
      providerId: "prov-b",
      modelIdentifier: "mid-model",
      displayName: "Mid Model",
      capabilities: ["chat", "reasoning"],
      tier: "MID",
      inputPricePer1k: 0.001,
      outputPricePer1k: 0.004,
      expectedLatencyMs: 700,
    }),
    makeCandidate({
      modelId: "heavy-model",
      providerId: "prov-c",
      modelIdentifier: "heavy-model",
      displayName: "Heavy Model",
      capabilities: ["chat", "reasoning"],
      tier: "HEAVY",
      inputPricePer1k: 0.005,
      outputPricePer1k: 0.02,
      expectedLatencyMs: 1200,
    }),
  ];
}

// ─────────────────────────────────────────────────────
// TEST 1: LOW complexity — cheap model can win
// ─────────────────────────────────────────────────────

describe("Phase 12.10 — LOW complexity: cost dominates", () => {
  it("cheapest capable model ranks first at LOW complexity", () => {
    const pool = buildReasoningPool();
    const policy = ROUTING_POLICIES.balanced;

    const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "LOW");

    // At LOW complexity, cost dominates — the cheapest model should win
    expect(scored[0].candidate.modelId).toBe("cheap-light");
  });

  it("heavy model ranks last at LOW complexity despite higher tier", () => {
    const pool = buildReasoningPool();
    const policy = ROUTING_POLICIES.balanced;

    const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "LOW");

    // The most expensive model should rank lowest at LOW complexity
    const heavyIdx = scored.findIndex((s) => s.candidate.modelId === "heavy-model");
    expect(heavyIdx).toBe(scored.length - 1);
  });

  it("cost score has more influence than capability at LOW", () => {
    const pool = buildReasoningPool();
    const policy = ROUTING_POLICIES.balanced;

    const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "LOW");

    // All have the same capabilities, so the differentiator is cost
    // The cheapest should have the highest cost score
    const cheap = scored.find((s) => s.candidate.modelId === "cheap-light")!;
    expect(cheap.factors.costScore).toBeGreaterThan(0.8);
  });
});

// ─────────────────────────────────────────────────────
// TEST 2: MEDIUM complexity — cheapest does NOT auto-win
// ─────────────────────────────────────────────────────

describe("Phase 12.10 — MEDIUM complexity: capability matters more", () => {
  it("MID tier model can outscore cheapest at MEDIUM complexity", () => {
    // Create a scenario where MID has a capability edge + is faster
    // (realistic: a more capable model may respond more efficiently)
    const pool: ModelCandidate[] = [
      makeCandidate({
        modelId: "cheap-basic",
        providerId: "prov-a",
        modelIdentifier: "cheap-basic",
        displayName: "Cheap Basic",
        capabilities: ["chat", "reasoning"],
        tier: "LIGHT",
        inputPricePer1k: 0.0002,
        outputPricePer1k: 0.0008,
        expectedLatencyMs: 900,
      }),
      makeCandidate({
        modelId: "mid-rich",
        providerId: "prov-b",
        modelIdentifier: "mid-rich",
        displayName: "Mid Rich",
        capabilities: ["chat", "reasoning", "coding", "creative_writing"],
        tier: "MID",
        inputPricePer1k: 0.001,
        outputPricePer1k: 0.004,
        expectedLatencyMs: 400,
      }),
    ];

    const policy = ROUTING_POLICIES.balanced;
    const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "MEDIUM");

    // At MEDIUM, the MID tier model with broader capabilities should win
    // because capability weight is boosted and tier bonus applies
    expect(scored[0].candidate.modelId).toBe("mid-rich");
  });

  it("scoring gap between tiers is larger at MEDIUM than LOW", () => {
    const pool = buildReasoningPool();
    const policy = ROUTING_POLICIES.balanced;

    const scoredLow = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "LOW");
    const scoredMed = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "MEDIUM");

    // Compare the gap between heavy and cheap at LOW vs MEDIUM
    const heavyLow = scoredLow.find((s) => s.candidate.modelId === "heavy-model")!;
    const cheapLow = scoredLow.find((s) => s.candidate.modelId === "cheap-light")!;
    const gapLow = cheapLow.score - heavyLow.score;

    const heavyMed = scoredMed.find((s) => s.candidate.modelId === "heavy-model")!;
    const cheapMed = scoredMed.find((s) => s.candidate.modelId === "cheap-light")!;
    const gapMed = cheapMed.score - heavyMed.score;

    // The gap should shrink at MEDIUM (heavy catches up)
    expect(gapMed).toBeLessThan(gapLow);
  });
});

// ─────────────────────────────────────────────────────
// TEST 3: HIGH complexity — stronger models dominate
// ─────────────────────────────────────────────────────

describe("Phase 12.10 — HIGH complexity: capability dominates", () => {
  it("HEAVY tier model outranks cheapest at HIGH complexity", () => {
    const pool = buildReasoningPool();
    const policy = ROUTING_POLICIES.balanced;

    const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "HIGH");

    // At HIGH complexity, the HEAVY tier model should win
    expect(scored[0].candidate.modelId).toBe("heavy-model");
  });

  it("HEAVY model capability score is higher than cheap at HIGH", () => {
    const pool = buildReasoningPool();
    const policy = ROUTING_POLICIES.balanced;

    const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "HIGH");

    const heavy = scored.find((s) => s.candidate.modelId === "heavy-model")!;
    const cheap = scored.find((s) => s.candidate.modelId === "cheap-light")!;

    // Heavy should have a higher capability score due to tier bonus
    expect(heavy.factors.capabilityScore).toBeGreaterThan(cheap.factors.capabilityScore);
  });

  it("cheap model does NOT win at HIGH complexity despite lowest cost", () => {
    const pool = buildReasoningPool();
    const policy = ROUTING_POLICIES.balanced;

    const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "HIGH");

    // The cheapest model should NOT be first at HIGH complexity
    expect(scored[0].candidate.modelId).not.toBe("cheap-light");
  });

  it("ordering is HEAVY > MID > LIGHT at HIGH complexity", () => {
    const pool = buildReasoningPool();
    const policy = ROUTING_POLICIES.balanced;

    const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "HIGH");

    const ids = scored.map((s) => s.candidate.modelId);
    expect(ids.indexOf("heavy-model")).toBeLessThan(ids.indexOf("mid-model"));
    expect(ids.indexOf("mid-model")).toBeLessThan(ids.indexOf("cheap-light"));
  });
});

// ─────────────────────────────────────────────────────
// TEST 4: Cost still matters within comparable capability
// ─────────────────────────────────────────────────────

describe("Phase 12.10 — Cost affects ranking within comparable capability", () => {
  it("cheaper model wins when capability and tier are equal", () => {
    const pool: ModelCandidate[] = [
      makeCandidate({
        modelId: "expensive-mid",
        providerId: "prov-a",
        modelIdentifier: "expensive-mid",
        displayName: "Expensive Mid",
        capabilities: ["chat", "reasoning"],
        tier: "MID",
        inputPricePer1k: 0.003,
        outputPricePer1k: 0.012,
        expectedLatencyMs: 700,
      }),
      makeCandidate({
        modelId: "cheap-mid",
        providerId: "prov-b",
        modelIdentifier: "cheap-mid",
        displayName: "Cheap Mid",
        capabilities: ["chat", "reasoning"],
        tier: "MID",
        inputPricePer1k: 0.0005,
        outputPricePer1k: 0.002,
        expectedLatencyMs: 700,
      }),
    ];

    const policy = ROUTING_POLICIES.balanced;

    // At any complexity, when tier and capabilities are equal,
    // the cheaper model should rank higher
    for (const complexity of ["LOW", "MEDIUM", "HIGH"] as const) {
      const scored = scoreCandidates(pool, policy, "REASONING", tokenEstimate, complexity);
      expect(scored[0].candidate.modelId).toBe("cheap-mid");
    }
  });

  it("cost differentiation is strongest at LOW and weakest at HIGH", () => {
    const pool: ModelCandidate[] = [
      makeCandidate({
        modelId: "costly",
        providerId: "prov-a",
        modelIdentifier: "costly",
        displayName: "Costly",
        capabilities: ["chat", "reasoning"],
        tier: "MID",
        inputPricePer1k: 0.004,
        outputPricePer1k: 0.016,
        expectedLatencyMs: 700,
      }),
      makeCandidate({
        modelId: "frugal",
        providerId: "prov-b",
        modelIdentifier: "frugal",
        displayName: "Frugal",
        capabilities: ["chat", "reasoning"],
        tier: "MID",
        inputPricePer1k: 0.0005,
        outputPricePer1k: 0.002,
        expectedLatencyMs: 700,
      }),
    ];

    const policy = ROUTING_POLICIES.balanced;

    const scoredLow = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "LOW");
    const scoredHigh = scoreCandidates(pool, policy, "REASONING", tokenEstimate, "HIGH");

    // Score gap between frugal and costly
    const frugalLow = scoredLow.find((s) => s.candidate.modelId === "frugal")!;
    const costlyLow = scoredLow.find((s) => s.candidate.modelId === "costly")!;
    const gapLow = frugalLow.score - costlyLow.score;

    const frugalHigh = scoredHigh.find((s) => s.candidate.modelId === "frugal")!;
    const costlyHigh = scoredHigh.find((s) => s.candidate.modelId === "costly")!;
    const gapHigh = frugalHigh.score - costlyHigh.score;

    // Cost gap should be larger at LOW than HIGH
    expect(gapLow).toBeGreaterThan(gapHigh);
  });
});

// ─────────────────────────────────────────────────────
// TEST 5: Full pipeline integration (route())
// ─────────────────────────────────────────────────────

describe("Phase 12.10 — Full pipeline complexity routing", () => {
  const models = buildReasoningPool();

  it("short GENERAL request (LOW) prefers cheapest", () => {
    const result = route(
      {
        messages: [{ role: "user", content: "Hi" }],
        taskTypeHint: "GENERAL",
      },
      { models, policy: "balanced" }
    );

    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    // GENERAL with very short content → LOW complexity
    expect(result.decision!.complexity.complexity).toBe("LOW");
    // At LOW, the cheapest model should be selected
    expect(result.decision!.selected.candidate.modelId).toBe("cheap-light");
  });

  it("long REASONING request (HIGH) prefers strongest model", () => {
    const longContent = "Analyze the following logical argument in detail. ".repeat(100);

    const result = route(
      {
        messages: [
          { role: "system", content: "You are a reasoning assistant." },
          { role: "user", content: longContent },
          { role: "assistant", content: "Let me analyze this step by step." },
          { role: "user", content: "Please provide a detailed logical analysis with proofs." },
        ],
        taskTypeHint: "REASONING",
        maxTokens: 4096,
      },
      { models, policy: "balanced" }
    );

    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    // REASONING with long content + high maxTokens → HIGH complexity
    expect(result.decision!.complexity.complexity).toBe("HIGH");
    // At HIGH, the HEAVY model should be selected
    expect(result.decision!.selected.candidate.modelId).toBe("heavy-model");
  });

  it("routing is deterministic for identical inputs", () => {
    const request = {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Analyze this complex argument in detail. ".repeat(80) },
        { role: "user", content: "Provide detailed reasoning with proofs." },
      ],
      taskTypeHint: "REASONING" as const,
      maxTokens: 4096,
    };

    const result1 = route(request, { models, policy: "balanced" });
    const result2 = route(request, { models, policy: "balanced" });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.decision!.selected.candidate.modelId).toBe(
      result2.decision!.selected.candidate.modelId
    );
    expect(result1.decision!.selected.score).toBe(
      result2.decision!.selected.score
    );
  });
});

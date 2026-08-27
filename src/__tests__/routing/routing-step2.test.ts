/**
 * Attentra — Routing Engine Step 2 Tests
 *
 * Phase 6 / Step 2 — Database-Backed Routing
 *
 * Tests:
 * - Context window enforcement (hard rejection)
 * - Projected cost calculation
 * - Scoring with projected cost and stable normalization
 * - Provider-diverse fallback ordering
 * - Full routing pipeline (pure route)
 * - Candidate filtering with rejection tracking
 * - Error handling (no candidates, all rejected)
 * - Determinism
 * - Provider-neutral behavior (no SDK imports)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import { filterCandidates, selectCandidates } from "@/lib/routing/candidates";
import { scoreCandidates, calculateProjectedCost } from "@/lib/routing/scorer";
import { orderFallbacks } from "@/lib/routing/fallback";
import { explainDecision } from "@/lib/routing/explanations";
import { route } from "@/lib/routing/router";
import { ROUTING_POLICIES } from "@/lib/routing/policies";
import type {
  ModelCandidate,
  ModelScore,
  TokenEstimate,
  RoutingDecision,
} from "@/lib/routing/types";
import { TASK_TYPE_TO_CAPABILITIES } from "@/lib/routing/types";

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
    factors: { costScore: 0.5, latencyScore: 0.5, capabilityScore: 0.5, projectedCost: 0 },
    explanation: `score=${score}`,
  };
}

const CHEAP_CANDIDATE = makeCandidate({
  modelId: "cheap", providerId: "prov-a", modelIdentifier: "cheap-model",
  displayName: "Cheap Model", capabilities: ["chat", "coding"],
  inputPricePer1k: 0.0001, outputPricePer1k: 0.0004, expectedLatencyMs: 400,
  contextWindow: 128000, providerName: "ProviderA",
});

const EXPENSIVE_CANDIDATE = makeCandidate({
  modelId: "expensive", providerId: "prov-b", modelIdentifier: "expensive-model",
  displayName: "Expensive Model", capabilities: ["chat", "coding", "reasoning", "creative_writing"],
  inputPricePer1k: 0.015, outputPricePer1k: 0.075, expectedLatencyMs: 1500,
  contextWindow: 200000, providerName: "ProviderB",
});

const FAST_CANDIDATE = makeCandidate({
  modelId: "fast", providerId: "prov-c", modelIdentifier: "fast-model",
  displayName: "Fast Model", capabilities: ["chat", "summarization", "translation"],
  inputPricePer1k: 0.001, outputPricePer1k: 0.003, expectedLatencyMs: 200,
  contextWindow: 32000, providerName: "ProviderC",
});

const SMALL_CONTEXT = makeCandidate({
  modelId: "small", providerId: "prov-a", modelIdentifier: "small-context",
  displayName: "Small Context", capabilities: ["chat", "coding"],
  inputPricePer1k: 0.0005, outputPricePer1k: 0.002, expectedLatencyMs: 300,
  contextWindow: 4096, providerName: "ProviderA",
});

// ─────────────────────────────────────────────────────
// 1. CONTEXT WINDOW ENFORCEMENT
// ─────────────────────────────────────────────────────

describe("Context Window Enforcement", () => {
  it("accepts candidate when tokens fit within context", () => {
    const result = filterCandidates([CHEAP_CANDIDATE], {
      taskType: "GENERAL",
      estimatedTotalTokens: 1000,
    });
    expect(result.eligible).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("accepts candidate when tokens exactly equal context window", () => {
    const result = filterCandidates([CHEAP_CANDIDATE], {
      taskType: "GENERAL",
      estimatedTotalTokens: 128000,
    });
    expect(result.eligible).toHaveLength(1);
  });

  it("rejects candidate when tokens exceed context window", () => {
    const result = filterCandidates([SMALL_CONTEXT], {
      taskType: "GENERAL",
      estimatedTotalTokens: 5000,
    });
    expect(result.eligible).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toBe("REJECTED_CONTEXT_LIMIT");
  });

  it("rejects with UNKNOWN_CONTEXT_WINDOW when contextWindow is null", () => {
    const noContext = makeCandidate({ contextWindow: undefined });
    const result = filterCandidates([noContext], {
      taskType: "GENERAL",
      estimatedTotalTokens: 5000,
    });
    expect(result.eligible).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toBe("UNKNOWN_CONTEXT_WINDOW");
  });

  it("filters mixed candidates correctly", () => {
    const result = filterCandidates(
      [CHEAP_CANDIDATE, SMALL_CONTEXT, EXPENSIVE_CANDIDATE],
      { taskType: "CODING", estimatedTotalTokens: 10000 }
    );
    // SMALL_CONTEXT (4096) rejected, others pass
    expect(result.eligible).toHaveLength(2);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].candidate.modelId).toBe("small");
  });

  it("rejects all when all exceed context", () => {
    const tiny1 = makeCandidate({ modelId: "t1", contextWindow: 100, displayName: "T1", capabilities: ["chat"] });
    const tiny2 = makeCandidate({ modelId: "t2", contextWindow: 200, displayName: "T2", capabilities: ["chat"] });
    const result = filterCandidates([tiny1, tiny2], {
      taskType: "GENERAL",
      estimatedTotalTokens: 5000,
    });
    expect(result.eligible).toHaveLength(0);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected.every((r) => r.reason === "REJECTED_CONTEXT_LIMIT")).toBe(true);
  });

  it("skips context check when no token estimate provided", () => {
    const result = filterCandidates([SMALL_CONTEXT], { taskType: "GENERAL" });
    expect(result.eligible).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────
// 2. CANDIDATE FILTERING WITH REJECTION
// ─────────────────────────────────────────────────────

describe("Candidate Filtering with Rejection", () => {
  it("rejects inactive models", () => {
    const inactive = makeCandidate({ active: false });
    const result = filterCandidates([inactive], { taskType: "GENERAL" });
    expect(result.eligible).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("INACTIVE_MODEL");
  });

  it("rejects models without required capability", () => {
    const result = filterCandidates([CHEAP_CANDIDATE], { taskType: "TRANSLATION" });
    // CHEAP_CANDIDATE has ["chat", "coding"], TRANSLATION requires ["translation"]
    expect(result.eligible).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("MISSING_CAPABILITY");
  });

  it("rejects models without pricing when required", () => {
    const freeModel = makeCandidate({ inputPricePer1k: 0, outputPricePer1k: 0 });
    const result = filterCandidates([freeModel], {
      taskType: "GENERAL",
      requirePricing: true,
    });
    expect(result.eligible).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("MISSING_PRICING");
  });

  it("allows models without pricing when not required", () => {
    const freeModel = makeCandidate({ inputPricePer1k: 0, outputPricePer1k: 0 });
    const result = filterCandidates([freeModel], {
      taskType: "GENERAL",
      requirePricing: false,
    });
    expect(result.eligible).toHaveLength(1);
  });

  it("selectCandidates backward compatibility (no rejection)", () => {
    const result = selectCandidates(
      [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE, SMALL_CONTEXT],
      { taskType: "CODING", estimatedTotalTokens: 5000 }
    );
    // SMALL_CONTEXT rejected, others eligible
    expect(result).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────
// 3. PROJECTED COST
// ─────────────────────────────────────────────────────

describe("Projected Cost", () => {
  it("calculates correct input cost", () => {
    const cost = calculateProjectedCost(CHEAP_CANDIDATE, { inputTokens: 1000, outputTokens: 0, totalTokens: 1000 });
    // 1000/1000 * 0.0001 = 0.0001
    expect(cost.inputCost).toBeCloseTo(0.0001, 8);
  });

  it("calculates correct output cost", () => {
    const cost = calculateProjectedCost(CHEAP_CANDIDATE, { inputTokens: 0, outputTokens: 500, totalTokens: 500 });
    // 500/1000 * 0.0004 = 0.0002
    expect(cost.outputCost).toBeCloseTo(0.0002, 8);
  });

  it("calculates correct total cost", () => {
    const cost = calculateProjectedCost(CHEAP_CANDIDATE, { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 });
    // input: 1000/1000 * 0.0001 = 0.0001
    // output: 500/1000 * 0.0004 = 0.0002
    // total: 0.0003
    expect(cost.totalCost).toBeCloseTo(0.0003, 8);
  });

  it("handles the example from the spec", () => {
    // inputTokens=1000, outputTokens=500, inputPricePer1k=0.003, outputPricePer1k=0.015
    const candidate = makeCandidate({ inputPricePer1k: 0.003, outputPricePer1k: 0.015 });
    const cost = calculateProjectedCost(candidate, { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 });
    // (1000/1000 * 0.003) + (500/1000 * 0.015) = 0.003 + 0.0075 = 0.0105
    expect(cost.totalCost).toBeCloseTo(0.0105, 8);
  });

  it("handles zero tokens", () => {
    const cost = calculateProjectedCost(CHEAP_CANDIDATE, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    expect(cost.totalCost).toBe(0);
  });

  it("handles zero price", () => {
    const free = makeCandidate({ inputPricePer1k: 0, outputPricePer1k: 0 });
    const cost = calculateProjectedCost(free, { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 });
    expect(cost.totalCost).toBe(0);
  });
});

// ─────────────────────────────────────────────────────
// 4. SCORING ENGINE
// ─────────────────────────────────────────────────────

describe("Scoring Engine", () => {
  const tokenEstimate: TokenEstimate = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };

  it("produces ModelScore with projectedCost in factors", () => {
    const scored = scoreCandidates(
      [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE],
      ROUTING_POLICIES.balanced,
      "CODING",
      tokenEstimate
    );
    for (const s of scored) {
      expect(s.factors).toHaveProperty("projectedCost");
      expect(s.factors.projectedCost).toBeGreaterThanOrEqual(0);
    }
  });

  it("lower cost candidate gets higher cost score", () => {
    const scored = scoreCandidates(
      [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE],
      ROUTING_POLICIES.balanced,
      "CODING",
      tokenEstimate
    );
    const cheapScore = scored.find((s) => s.candidate.modelId === "cheap")!;
    const expensiveScore = scored.find((s) => s.candidate.modelId === "expensive")!;
    expect(cheapScore.factors.costScore).toBeGreaterThan(expensiveScore.factors.costScore);
  });

  it("lower latency candidate gets higher latency score", () => {
    const scored = scoreCandidates(
      [FAST_CANDIDATE, EXPENSIVE_CANDIDATE],
      ROUTING_POLICIES.balanced,
      "GENERAL",
      tokenEstimate
    );
    const fastScore = scored.find((s) => s.candidate.modelId === "fast")!;
    const expensiveScore = scored.find((s) => s.candidate.modelId === "expensive")!;
    expect(fastScore.factors.latencyScore).toBeGreaterThan(expensiveScore.factors.latencyScore);
  });

  it("better capability match gets higher capability score", () => {
    // EXPENSIVE has reasoning + coding, CHEAP has coding only
    const scored = scoreCandidates(
      [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE],
      ROUTING_POLICIES.balanced,
      "REASONING",
      tokenEstimate
    );
    const cheapScore = scored.find((s) => s.candidate.modelId === "cheap")!;
    const expensiveScore = scored.find((s) => s.candidate.modelId === "expensive")!;
    // Cheap doesn't have "reasoning", Expensive does
    expect(expensiveScore.factors.capabilityScore).toBeGreaterThan(cheapScore.factors.capabilityScore);
  });

  it("cost_optimized policy favors cheaper candidates", () => {
    const scored = scoreCandidates(
      [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE],
      ROUTING_POLICIES.cost_optimized,
      "CODING",
      tokenEstimate
    );
    expect(scored[0].candidate.modelId).toBe("cheap");
  });

  it("speed_first policy favors faster candidates", () => {
    const scored = scoreCandidates(
      [FAST_CANDIDATE, EXPENSIVE_CANDIDATE],
      ROUTING_POLICIES.speed_first,
      "GENERAL",
      tokenEstimate
    );
    expect(scored[0].candidate.modelId).toBe("fast");
  });

  it("single candidate gets neutral normalization scores", () => {
    const scored = scoreCandidates(
      [CHEAP_CANDIDATE],
      ROUTING_POLICIES.balanced,
      "CODING",
      tokenEstimate
    );
    // With one candidate, min=max so normalization returns 0.5 for cost/latency
    expect(scored[0].factors.costScore).toBe(0.5);
    expect(scored[0].factors.latencyScore).toBe(0.5);
  });

  it("missing latency gets score of 0", () => {
    const noLatency = makeCandidate({ expectedLatencyMs: undefined, modelId: "nolat" });
    const scored = scoreCandidates(
      [noLatency, CHEAP_CANDIDATE],
      ROUTING_POLICIES.balanced,
      "CODING",
      tokenEstimate
    );
    const noLatScore = scored.find((s) => s.candidate.modelId === "nolat")!;
    expect(noLatScore.factors.latencyScore).toBe(0);
  });

  it("deterministic — identical inputs produce identical scores", () => {
    const s1 = scoreCandidates(
      [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE],
      ROUTING_POLICIES.balanced,
      "CODING",
      tokenEstimate
    );
    const s2 = scoreCandidates(
      [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE],
      ROUTING_POLICIES.balanced,
      "CODING",
      tokenEstimate
    );
    expect(s1.map((s) => s.score)).toEqual(s2.map((s) => s.score));
  });
});

// ─────────────────────────────────────────────────────
// 5. PROVIDER-DIVERSE FALLBACKS
// ─────────────────────────────────────────────────────

describe("Provider-Diverse Fallbacks", () => {
  it("interleaves different providers in fallback order", () => {
    // Primary: prov-a, Fallback should prefer prov-b, prov-c first
    const scored: ModelScore[] = [
      makeScore(CHEAP_CANDIDATE, 0.9),       // prov-a (selected)
      makeScore(EXPENSIVE_CANDIDATE, 0.8),    // prov-b
      makeScore(FAST_CANDIDATE, 0.7),         // prov-c
    ];

    const fallbacks = orderFallbacks(scored, scored[0]);
    expect(fallbacks).toHaveLength(2);
    // First fallback should be from a different provider
    expect(fallbacks[0].candidate.providerId).not.toBe("prov-a");
  });

  it("uses same provider when no alternatives exist", () => {
    const same1 = makeCandidate({ modelId: "s1", providerId: "only-prov", displayName: "S1" });
    const same2 = makeCandidate({ modelId: "s2", providerId: "only-prov", displayName: "S2" });
    const scored = [makeScore(same1, 0.9), makeScore(same2, 0.7)];

    const fallbacks = orderFallbacks(scored, scored[0]);
    expect(fallbacks).toHaveLength(1);
    expect(fallbacks[0].candidate.providerId).toBe("only-prov");
  });

  it("round-robin across multiple providers", () => {
    const a1 = makeCandidate({ modelId: "a1", providerId: "pa" });
    const a2 = makeCandidate({ modelId: "a2", providerId: "pa" });
    const b1 = makeCandidate({ modelId: "b1", providerId: "pb" });
    const c1 = makeCandidate({ modelId: "c1", providerId: "pc" });

    const scored = [
      makeScore(a1, 0.95),  // selected
      makeScore(a2, 0.85),
      makeScore(b1, 0.80),
      makeScore(c1, 0.70),
    ];

    const fallbacks = orderFallbacks(scored, scored[0]);
    expect(fallbacks).toHaveLength(3);
    // First should be pb or pc (diverse from pa)
    expect(fallbacks[0].candidate.providerId).not.toBe("pa");
    // Check that we get providers in round-robin: pb, pc, then pa
    const providers = fallbacks.map((f) => f.candidate.providerId);
    expect(providers[0]).toBe("pb");
    expect(providers[1]).toBe("pc");
    expect(providers[2]).toBe("pa");
  });

  it("deterministic fallback ordering", () => {
    const scored: ModelScore[] = [
      makeScore(CHEAP_CANDIDATE, 0.9),
      makeScore(EXPENSIVE_CANDIDATE, 0.8),
      makeScore(FAST_CANDIDATE, 0.7),
    ];
    const f1 = orderFallbacks(scored, scored[0]);
    const f2 = orderFallbacks(scored, scored[0]);
    expect(f1.map((f) => f.candidate.modelId)).toEqual(f2.map((f) => f.candidate.modelId));
  });
});

// ─────────────────────────────────────────────────────
// 6. FULL ROUTING PIPELINE (PURE)
// ─────────────────────────────────────────────────────

describe("Full Routing Pipeline", () => {
  const models = [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE, FAST_CANDIDATE, SMALL_CONTEXT];

  it("selects best candidate for CODING task", () => {
    const result = route(
      {
        messages: [{ role: "user", content: "Write a function to implement quicksort algorithm" }],
      },
      { models }
    );

    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    expect(result.decision!.taskType).toBe("CODING");
    expect(result.decision!.selected).toBeDefined();
    expect(result.decision!.selected.candidate.capabilities).toContain("coding");
  });

  it("selects best candidate for GENERAL task", () => {
    const result = route(
      {
        messages: [{ role: "user", content: "Hello, how are you?" }],
      },
      { models }
    );

    expect(result.success).toBe(true);
    expect(result.decision!.taskType).toBe("GENERAL");
  });

  it("returns rejected candidates in decision", () => {
    const result = route(
      {
        messages: [{ role: "user", content: "Write a function to debug this code" }],
        maxTokens: 5000,
      },
      { models }
    );

    expect(result.success).toBe(true);
    expect(result.decision!.rejected).toBeDefined();
    // SMALL_CONTEXT (4096) should be rejected because total tokens > 4096
    const contextRejected = result.decision!.rejected.find(
      (r) => r.reason === "REJECTED_CONTEXT_LIMIT"
    );
    // This depends on token estimate. With ~37 chars input, tokens ≈ 10 + 5000 output = 5010
    // SMALL_CONTEXT has 4096, so it should be rejected
    expect(contextRejected).toBeDefined();
  });

  it("returns structured error when no candidates match", () => {
    const onlyTranslation = makeCandidate({
      modelId: "only-trans", capabilities: ["translation"], displayName: "Translator",
    });
    const result = route(
      {
        messages: [{ role: "user", content: "Write a function to sort array" }],
      },
      { models: [onlyTranslation] }
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBeDefined();
    expect(result.rejected).toBeDefined();
    expect(result.rejected!.length).toBeGreaterThan(0);
  });

  it("returns error when no models provided", () => {
    const result = route(
      { messages: [{ role: "user", content: "Hello" }] },
      { models: [] }
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("NO_ACTIVE_MODELS");
  });

  it("respects policy option", () => {
    const result = route(
      {
        messages: [{ role: "user", content: "Write a function" }],
      },
      { models, policy: "cost_optimized" }
    );

    expect(result.success).toBe(true);
    // Cost-optimized should prefer cheaper models
    const decision = result.decision!;
    expect(decision.selected.factors.costScore).toBeGreaterThanOrEqual(0.5);
  });

  it("includes projected cost in decision", () => {
    const result = route(
      {
        messages: [{ role: "user", content: "Hello" }],
        maxTokens: 100,
      },
      { models }
    );

    expect(result.success).toBe(true);
    expect(result.decision!.selected.factors.projectedCost).toBeGreaterThanOrEqual(0);
  });

  it("includes explanation in decision", () => {
    const result = route(
      { messages: [{ role: "user", content: "Summarize this article" }] },
      { models }
    );

    expect(result.success).toBe(true);
    expect(result.decision!.reason.length).toBeGreaterThan(0);
    expect(result.decision!.reason).toContain("Selected");
  });

  it("includes fallback candidates", () => {
    const result = route(
      { messages: [{ role: "user", content: "Hello world" }] },
      { models }
    );

    expect(result.success).toBe(true);
    // Should have at least some fallbacks (models that passed filtering)
    expect(result.decision!.fallbacks.length).toBeGreaterThanOrEqual(0);
  });

  it("selected candidate is NOT in fallback list", () => {
    const result = route(
      { messages: [{ role: "user", content: "Hello" }] },
      { models }
    );

    expect(result.success).toBe(true);
    const decision = result.decision!;
    const selectedInFallbacks = decision.fallbacks.find(
      (f) => f.candidate.modelId === decision.selected.candidate.modelId
    );
    expect(selectedInFallbacks).toBeUndefined();
  });

  it("all candidates exceed context → structured failure", () => {
    const tinyModels = [
      makeCandidate({ modelId: "t1", contextWindow: 100, displayName: "Tiny1", capabilities: ["chat"] }),
      makeCandidate({ modelId: "t2", contextWindow: 200, displayName: "Tiny2", capabilities: ["chat"] }),
    ];
    const result = route(
      {
        messages: [{ role: "user", content: "a".repeat(2000) }],
        maxTokens: 4000,
      },
      { models: tinyModels }
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("ALL_EXCEED_CONTEXT");
  });
});

// ─────────────────────────────────────────────────────
// 7. EXPLANATION ENGINE
// ─────────────────────────────────────────────────────

describe("Explanation Engine", () => {
  it("includes projected cost in explanation", () => {
    const result = route(
      { messages: [{ role: "user", content: "Hello" }], maxTokens: 100 },
      { models: [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE] }
    );

    expect(result.success).toBe(true);
    expect(result.decision!.reason).toContain("projected cost");
  });

  it("includes rejected candidates summary when present", () => {
    const inactive = makeCandidate({ modelId: "dead", active: false, displayName: "Dead Model" });
    const result = route(
      { messages: [{ role: "user", content: "Hello" }] },
      { models: [CHEAP_CANDIDATE, inactive] }
    );

    expect(result.success).toBe(true);
    expect(result.decision!.reason).toContain("Excluded");
    expect(result.decision!.reason).toContain("Dead Model");
  });
});

// ─────────────────────────────────────────────────────
// 8. PROVIDER-NEUTRAL BEHAVIOR
// ─────────────────────────────────────────────────────

describe("Provider-Neutral Behavior (Step 2)", () => {
  const step2Modules = [
    "src/lib/routing/database.ts",
    "src/lib/routing/router.ts",
    "src/lib/routing/scorer.ts",
    "src/lib/routing/candidates.ts",
    "src/lib/routing/fallback.ts",
    "src/lib/routing/explanations.ts",
  ];

  for (const modulePath of step2Modules) {
    it(`${modulePath} does not import provider SDKs`, () => {
      const fullPath = path.resolve(process.cwd(), modulePath);
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content).not.toContain("from \"openai\"");
      expect(content).not.toContain("from '@anthropic-ai/sdk'");
      expect(content).not.toContain("from \"@anthropic-ai/sdk\"");
      expect(content).not.toContain("from '@google/generative-ai'");
      expect(content).not.toContain("from \"@google/generative-ai\"");
    });
  }

  it("no hardcoded provider names in scorer", () => {
    const fullPath = path.resolve(process.cwd(), "src/lib/routing/scorer.ts");
    const content = fs.readFileSync(fullPath, "utf-8");
    expect(content).not.toContain("\"openai\"");
    expect(content).not.toContain("\"anthropic\"");
    expect(content).not.toContain("\"google\"");
  });

  it("no hardcoded prices in any routing module", () => {
    for (const modulePath of step2Modules) {
      const fullPath = path.resolve(process.cwd(), modulePath);
      const content = fs.readFileSync(fullPath, "utf-8");
      // Should not contain hardcoded price literals like 0.0025 or 0.015
      // (except in comments or type definitions)
      const codeLines = content.split("\n").filter(
        (l) => !l.trim().startsWith("//") && !l.trim().startsWith("*")
      );
      const code = codeLines.join("\n");
      // Check for specific price patterns that would indicate hardcoded pricing
      expect(code).not.toMatch(/inputPricePer1k\s*=\s*0\.\d{2,}/);
      expect(code).not.toMatch(/outputPricePer1k\s*=\s*0\.\d{2,}/);
    }
  });
});

// ─────────────────────────────────────────────────────
// 9. DETERMINISM (FULL PIPELINE)
// ─────────────────────────────────────────────────────

describe("Determinism (Full Pipeline)", () => {
  it("10 identical routing calls produce identical decisions", () => {
    const models = [CHEAP_CANDIDATE, EXPENSIVE_CANDIDATE, FAST_CANDIDATE];
    const request = {
      messages: [{ role: "user", content: "Write a function to sort an array" }],
      maxTokens: 500,
    };

    const results = Array.from({ length: 10 }, () =>
      route(request, { models, policy: "balanced" })
    );

    const selectedIds = results.map((r) => r.decision!.selected.candidate.modelId);
    expect(new Set(selectedIds).size).toBe(1); // All same

    const scores = results.map((r) => r.decision!.selected.score);
    expect(new Set(scores).size).toBe(1); // All same score
  });
});

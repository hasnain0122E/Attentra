/**
 * Attentra — Execution Boundary Unit Tests
 *
 * Phase 6 / Step 4 — Production Routing Execution Boundary
 *
 * Tests the execution plan builder, validator, execution result contract,
 * and execution flow preparation using in-memory routing decisions.
 *
 * Test categories:
 * A. Execution plan creation
 * B. Fallback plan
 * C. Validation
 * D. Provider neutrality
 * E. Determinism
 * F. Phase boundary
 * G. Execution flow (prepareExecutionFlow)
 */

import { describe, it, expect, vi } from "vitest";
import {
  buildExecutionPlan,
  validateExecutionPlan,
  prepareExecutionFlow,
  type ExecutionPlan,
  type ExecutionTarget,
} from "@/lib/routing/execution-plan";
import type {
  RoutingDecision,
  RoutingResult,
  ModelCandidate,
  ModelScore,
  RejectedCandidate,
} from "@/lib/routing/types";

// ─────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<ModelCandidate> = {}): ModelCandidate {
  return {
    modelId: "model-1",
    providerId: "provider-a",
    providerName: "Provider A",
    modelIdentifier: "provider-a/model-1",
    displayName: "Model One",
    capabilities: ["chat", "coding"],
    tier: "MID",
    contextWindow: 128000,
    inputPricePer1k: 0.0025,
    outputPricePer1k: 0.01,
    expectedLatencyMs: 500,
    active: true,
    ...overrides,
  };
}

function makeScore(
  candidate: ModelCandidate,
  score: number,
  projectedCost: number = 0.001
): ModelScore {
  return {
    candidate,
    score,
    factors: {
      costScore: 0.7,
      latencyScore: 0.6,
      capabilityScore: 0.8,
      projectedCost,
    },
    explanation: `${candidate.displayName}: score=${score.toFixed(4)}`,
  };
}

function makeDecision(overrides: Partial<RoutingDecision> = {}): RoutingDecision {
  const c1 = makeCandidate();
  const c2 = makeCandidate({
    modelId: "model-2",
    providerId: "provider-b",
    providerName: "Provider B",
    modelIdentifier: "provider-b/model-2",
    displayName: "Model Two",
  });
  const c3 = makeCandidate({
    modelId: "model-3",
    providerId: "provider-c",
    providerName: "Provider C",
    modelIdentifier: "provider-c/model-3",
    displayName: "Model Three",
  });

  const s1 = makeScore(c1, 0.9, 0.001);
  const s2 = makeScore(c2, 0.75, 0.002);
  const s3 = makeScore(c3, 0.6, 0.003);

  return {
    taskType: "GENERAL",
    complexity: {
      complexity: "MEDIUM",
      confidence: 0.85,
      signals: { contentScore: 0.5, messageCountScore: 0.3, taskScore: 0.5, outputScore: 0.4 },
    },
    tokenEstimate: { inputTokens: 500, outputTokens: 200, totalTokens: 700 },
    candidates: [s1, s2, s3],
    selected: s1,
    fallbacks: [s2, s3],
    rejected: [],
    reason: "Selected Model One because it provides the best score.",
    timestamp: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────
// A. EXECUTION PLAN CREATION
// ─────────────────────────────────────────────────────

describe("Execution Plan Creation", () => {
  it("builds valid plan from routing decision", () => {
    const decision = makeDecision();
    const plan = buildExecutionPlan(decision);

    expect(plan.taskType).toBe("GENERAL");
    expect(plan.complexity).toBe("MEDIUM");
    expect(plan.estimatedInputTokens).toBe(500);
    expect(plan.estimatedOutputTokens).toBe(200);
    expect(plan.projectedCost).toBe(0.001);
    expect(plan.routingScore).toBe(0.9);
    expect(plan.routingExplanation).toContain("Model One");
    expect(plan.status).toBe("NOT_EXECUTED");
    expect(plan.createdAt).toBeInstanceOf(Date);
  });

  it("preserves requestId and decisionId", () => {
    const plan = buildExecutionPlan(makeDecision(), "req-123", "dec-456");

    expect(plan.requestId).toBe("req-123");
    expect(plan.routingDecisionId).toBe("dec-456");
  });

  it("omits requestId and decisionId when not provided", () => {
    const plan = buildExecutionPlan(makeDecision());

    expect(plan.requestId).toBeUndefined();
    expect(plan.routingDecisionId).toBeUndefined();
  });

  it("primary target contains correct model information", () => {
    const plan = buildExecutionPlan(makeDecision());
    const p = plan.primary;

    expect(p.entryId).toBe("primary");
    expect(p.modelId).toBe("model-1");
    expect(p.providerId).toBe("provider-a");
    expect(p.providerName).toBe("Provider A");
    expect(p.modelIdentifier).toBe("provider-a/model-1");
    expect(p.displayName).toBe("Model One");
    expect(p.projectedCost).toBe(0.001);
    expect(p.routingScore).toBe(0.9);
  });

  it("throws when decision has no selected model", () => {
    expect(() =>
      buildExecutionPlan({ selected: null } as unknown as RoutingDecision)
    ).toThrow("no selected model");
  });

  it("throws when decision is null/undefined", () => {
    expect(() => buildExecutionPlan(null as unknown as RoutingDecision)).toThrow();
  });

  it("status is always NOT_EXECUTED", () => {
    const plan = buildExecutionPlan(makeDecision());
    expect(plan.status).toBe("NOT_EXECUTED");
  });
});

// ─────────────────────────────────────────────────────
// B. FALLBACK PLAN
// ─────────────────────────────────────────────────────

describe("Fallback Plan", () => {
  it("preserves provider-diverse fallback ordering from routing decision", () => {
    const plan = buildExecutionPlan(makeDecision());

    expect(plan.fallbacks).toHaveLength(2);
    expect(plan.fallbacks[0].modelId).toBe("model-2");
    expect(plan.fallbacks[0].providerId).toBe("provider-b");
    expect(plan.fallbacks[1].modelId).toBe("model-3");
    expect(plan.fallbacks[1].providerId).toBe("provider-c");
  });

  it("fallback entry IDs are sequential", () => {
    const plan = buildExecutionPlan(makeDecision());

    expect(plan.fallbacks[0].entryId).toBe("fallback-1");
    expect(plan.fallbacks[1].entryId).toBe("fallback-2");
  });

  it("handles zero fallbacks gracefully", () => {
    const decision = makeDecision({ fallbacks: [] });
    const plan = buildExecutionPlan(decision);

    expect(plan.fallbacks).toEqual([]);
  });

  it("handles single fallback", () => {
    const c2 = makeCandidate({
      modelId: "model-2",
      providerId: "provider-b",
      displayName: "Model Two",
    });
    const s2 = makeScore(c2, 0.75);
    const decision = makeDecision({ fallbacks: [s2] });

    const plan = buildExecutionPlan(decision);
    expect(plan.fallbacks).toHaveLength(1);
    expect(plan.fallbacks[0].entryId).toBe("fallback-1");
  });

  it("no duplicate modelIds between primary and fallbacks", () => {
    const plan = buildExecutionPlan(makeDecision());

    const allIds = [plan.primary.modelId, ...plan.fallbacks.map((f) => f.modelId)];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("fallback ordering is deterministic across multiple calls", () => {
    const decision = makeDecision();
    const plan1 = buildExecutionPlan(decision);
    const plan2 = buildExecutionPlan(decision);

    for (let i = 0; i < plan1.fallbacks.length; i++) {
      expect(plan2.fallbacks[i].modelId).toBe(plan1.fallbacks[i].modelId);
      expect(plan2.fallbacks[i].entryId).toBe(plan1.fallbacks[i].entryId);
    }
  });

  it("projected cost is preserved from scoring (not recalculated)", () => {
    const c2 = makeCandidate({ modelId: "model-2", providerId: "provider-b", displayName: "Model Two" });
    const s2 = makeScore(c2, 0.75, 0.0042);
    const decision = makeDecision({ fallbacks: [s2] });

    const plan = buildExecutionPlan(decision);
    expect(plan.fallbacks[0].projectedCost).toBe(0.0042);
  });

  it("multiple fallbacks from different providers maintain ordering", () => {
    const c4 = makeCandidate({
      modelId: "model-4",
      providerId: "provider-d",
      displayName: "Model Four",
      modelIdentifier: "provider-d/model-4",
    });
    const s4 = makeScore(c4, 0.5, 0.004);
    const decision = makeDecision();
    decision.fallbacks.push(s4);

    const plan = buildExecutionPlan(decision);
    expect(plan.fallbacks).toHaveLength(3);
    expect(plan.fallbacks[2].modelId).toBe("model-4");
    expect(plan.fallbacks[2].entryId).toBe("fallback-3");
  });
});

// ─────────────────────────────────────────────────────
// C. VALIDATION
// ─────────────────────────────────────────────────────

describe("Validation", () => {
  it("valid plan passes all checks", () => {
    const plan = buildExecutionPlan(makeDecision());
    const result = validateExecutionPlan(plan);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("missing primary modelId fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.primary.modelId = "";

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "primary.modelId")).toBe(true);
  });

  it("missing primary providerId fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.primary.providerId = "";

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "primary.providerId")).toBe(true);
  });

  it("missing primary displayName fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.primary.displayName = "";

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "primary.displayName")).toBe(true);
  });

  it("negative projected cost fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.projectedCost = -0.001;

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_COST")).toBe(true);
  });

  it("NaN projected cost fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.projectedCost = NaN;

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "projectedCost")).toBe(true);
  });

  it("routing score below 0 fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.routingScore = -0.1;

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_SCORE")).toBe(true);
  });

  it("routing score above 1 fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.routingScore = 1.5;

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "routingScore")).toBe(true);
  });

  it("routing score of 0 is valid (worst but valid score)", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.routingScore = 0;
    plan.primary.routingScore = 0;

    const result = validateExecutionPlan(plan);
    expect(result.errors.filter((e) => e.field === "routingScore")).toHaveLength(0);
  });

  it("projected cost of 0 is valid (free tier)", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.projectedCost = 0;
    plan.primary.projectedCost = 0;

    const result = validateExecutionPlan(plan);
    expect(result.errors.filter((e) => e.code === "INVALID_COST")).toHaveLength(0);
  });

  it("missing complexity fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    (plan as { complexity: string | undefined }).complexity = undefined;

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "complexity")).toBe(true);
  });

  it("missing taskType fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    (plan as { taskType: string | undefined }).taskType = undefined;

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "taskType")).toBe(true);
  });

  it("invalid createdAt date fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.createdAt = new Date("invalid");

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_DATE")).toBe(true);
  });

  it("duplicate modelId in fallbacks fails", () => {
    const decision = makeDecision();
    // Add a fallback with same modelId as primary
    const dupCandidate = makeCandidate({ modelId: "model-1" });
    decision.fallbacks.push(makeScore(dupCandidate, 0.5));

    const plan = buildExecutionPlan(decision);
    const result = validateExecutionPlan(plan);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_FALLBACK")).toBe(true);
  });

  it("duplicate modelId between fallbacks fails", () => {
    const decision = makeDecision();
    const dupCandidate = makeCandidate({
      modelId: "model-2",
      providerId: "provider-x",
      displayName: "Duplicate",
    });
    decision.fallbacks.push(makeScore(dupCandidate, 0.4));

    const plan = buildExecutionPlan(decision);
    const result = validateExecutionPlan(plan);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_FALLBACK")).toBe(true);
  });

  it("fallback with missing fields fails", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.fallbacks.push({
      entryId: "",
      modelId: "",
      providerId: "",
      providerName: "test",
      modelIdentifier: "test",
      displayName: "",
      projectedCost: NaN,
      routingScore: 0.5,
    });

    const result = validateExecutionPlan(plan);
    expect(result.valid).toBe(false);
    // Should have multiple errors for the bad fallback
    expect(result.errors.filter((e) => e.field.startsWith("fallbacks[2]")).length).toBeGreaterThan(0);
  });

  it("validation errors have correct structure", () => {
    const plan = buildExecutionPlan(makeDecision());
    plan.primary.modelId = "";

    const result = validateExecutionPlan(plan);
    const error = result.errors.find((e) => e.field === "primary.modelId");

    expect(error).toBeDefined();
    expect(error!.message).toBeTruthy();
    expect(error!.code).toBe("MISSING_FIELD");
  });
});

// ─────────────────────────────────────────────────────
// D. PROVIDER NEUTRALITY
// ─────────────────────────────────────────────────────

describe("Provider Neutrality", () => {
  it("execution-plan module does not import provider SDKs", async () => {
    const mod = await import("@/lib/routing/execution-plan");
    const moduleKeys = Object.keys(mod);

    expect(moduleKeys).not.toContain("openai");
    expect(moduleKeys).not.toContain("anthropic");
    expect(moduleKeys).not.toContain("google");
  });

  it("plan contains no hardcoded provider names", () => {
    const plan = buildExecutionPlan(makeDecision());

    // Provider info comes entirely from the routing decision
    expect(plan.primary.providerName).toBe("Provider A");
    expect(plan.fallbacks[0].providerName).toBe("Provider B");

    // No hardcoded "OpenAI", "Anthropic", "Google" strings
    const planJson = JSON.stringify(plan);
    expect(planJson).not.toContain("OpenAI");
    expect(planJson).not.toContain("Anthropic");
    expect(planJson).not.toContain("Google");
  });

  it("plan contains no hardcoded prices", () => {
    const plan = buildExecutionPlan(makeDecision());

    // Prices come from scoring factors — not hardcoded
    expect(plan.projectedCost).toBe(0.001); // from makeScore fixture
    expect(plan.primary.projectedCost).toBe(0.001);
  });

  it("works with arbitrary provider identifiers", () => {
    const decision = makeDecision();
    decision.selected.candidate.providerId = "custom-llm-provider";
    decision.selected.candidate.providerName = "Custom LLM";

    const plan = buildExecutionPlan(decision);
    expect(plan.primary.providerId).toBe("custom-llm-provider");
    expect(plan.primary.providerName).toBe("Custom LLM");
  });
});

// ─────────────────────────────────────────────────────
// E. DETERMINISM
// ─────────────────────────────────────────────────────

describe("Determinism", () => {
  it("same RoutingDecision produces identical ExecutionPlan", () => {
    const decision = makeDecision();
    const plan1 = buildExecutionPlan(decision, "req-1", "dec-1");
    const plan2 = buildExecutionPlan(decision, "req-1", "dec-1");

    // Compare all structural fields (skip createdAt which is new Date())
    expect(plan2.taskType).toBe(plan1.taskType);
    expect(plan2.complexity).toBe(plan1.complexity);
    expect(plan2.requestId).toBe(plan1.requestId);
    expect(plan2.routingDecisionId).toBe(plan1.routingDecisionId);
    expect(plan2.primary.modelId).toBe(plan1.primary.modelId);
    expect(plan2.primary.providerId).toBe(plan1.primary.providerId);
    expect(plan2.primary.projectedCost).toBe(plan1.primary.projectedCost);
    expect(plan2.primary.routingScore).toBe(plan1.primary.routingScore);
    expect(plan2.projectedCost).toBe(plan1.projectedCost);
    expect(plan2.routingScore).toBe(plan1.routingScore);
    expect(plan2.routingExplanation).toBe(plan1.routingExplanation);
    expect(plan2.estimatedInputTokens).toBe(plan1.estimatedInputTokens);
    expect(plan2.estimatedOutputTokens).toBe(plan1.estimatedOutputTokens);
    expect(plan2.status).toBe(plan1.status);
  });

  it("fallback ordering is identical across builds", () => {
    const decision = makeDecision();
    const plan1 = buildExecutionPlan(decision);
    const plan2 = buildExecutionPlan(decision);

    expect(plan2.fallbacks).toHaveLength(plan1.fallbacks.length);
    for (let i = 0; i < plan1.fallbacks.length; i++) {
      expect(plan2.fallbacks[i].modelId).toBe(plan1.fallbacks[i].modelId);
      expect(plan2.fallbacks[i].providerId).toBe(plan1.fallbacks[i].providerId);
      expect(plan2.fallbacks[i].entryId).toBe(plan1.fallbacks[i].entryId);
      expect(plan2.fallbacks[i].projectedCost).toBe(plan1.fallbacks[i].projectedCost);
      expect(plan2.fallbacks[i].routingScore).toBe(plan1.fallbacks[i].routingScore);
    }
  });

  it("validation result is identical for same plan", () => {
    const plan = buildExecutionPlan(makeDecision());
    const v1 = validateExecutionPlan(plan);
    const v2 = validateExecutionPlan(plan);

    expect(v2.valid).toBe(v1.valid);
    expect(v2.errors).toHaveLength(v1.errors.length);
  });
});

// ─────────────────────────────────────────────────────
// F. PHASE BOUNDARY
// ─────────────────────────────────────────────────────

describe("Phase Boundary", () => {
  it("status is always NOT_EXECUTED (provider execution never occurs)", () => {
    const plan = buildExecutionPlan(makeDecision());
    expect(plan.status).toBe("NOT_EXECUTED");

    // Even after validation, status doesn't change
    validateExecutionPlan(plan);
    expect(plan.status).toBe("NOT_EXECUTED");
  });

  it("ExecutionResult type contract exists for Phase 7", async () => {
    // Verify the module exports the expected functions
    const mod = await import("@/lib/routing/execution-plan");
    expect(typeof mod.buildExecutionPlan).toBe("function");
    expect(typeof mod.validateExecutionPlan).toBe("function");
    expect(typeof mod.prepareExecutionFlow).toBe("function");
    // ExecutionResult is a type-only export (compile-time only)
    // Its existence is verified by TypeScript compilation
  });

  it("buildExecutionPlan makes no network calls", () => {
    // Spy on globalThis.fetch to ensure no network calls
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    try {
      buildExecutionPlan(makeDecision());
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ─────────────────────────────────────────────────────
// G. EXECUTION FLOW (prepareExecutionFlow)
// ─────────────────────────────────────────────────────

describe("Execution Flow — prepareExecutionFlow", () => {
  it("produces NOT_EXECUTED status for valid routing result", () => {
    const decision = makeDecision();
    const routingResult: RoutingResult = { success: true, decision };

    const flow = prepareExecutionFlow(routingResult);

    expect(flow.status).toBe("NOT_EXECUTED");
    expect(flow.plan).toBeDefined();
    expect(flow.validation.valid).toBe(true);
    expect(flow.error).toBeUndefined();
  });

  it("produces FAILED status when routing failed", () => {
    const routingResult: RoutingResult = {
      success: false,
      error: "No compatible models",
      errorCode: "NO_COMPATIBLE_MODELS",
    };

    const flow = prepareExecutionFlow(routingResult);

    expect(flow.status).toBe("FAILED");
    expect(flow.plan).toBeUndefined();
    expect(flow.validation.valid).toBe(false);
    expect(flow.error).toContain("No compatible models");
  });

  it("produces FAILED status when routing result has no decision", () => {
    const routingResult: RoutingResult = { success: true };

    const flow = prepareExecutionFlow(routingResult);

    expect(flow.status).toBe("FAILED");
    expect(flow.plan).toBeUndefined();
    expect(flow.validation.valid).toBe(false);
  });

  it("passes requestId and decisionId through", () => {
    const routingResult: RoutingResult = {
      success: true,
      decision: makeDecision(),
    };

    const flow = prepareExecutionFlow(routingResult, "req-abc", "dec-xyz");

    expect(flow.plan!.requestId).toBe("req-abc");
    expect(flow.plan!.routingDecisionId).toBe("dec-xyz");
  });

  it("extracts decisionId from persisted result", () => {
    const routingResult: RoutingResult = {
      success: true,
      decision: makeDecision(),
      persisted: { success: true, decisionId: "persisted-dec-1" },
    };

    const flow = prepareExecutionFlow(routingResult);
    expect(flow.plan!.routingDecisionId).toBe("persisted-dec-1");
  });

  it("explicit decisionId overrides persisted decisionId", () => {
    const routingResult: RoutingResult = {
      success: true,
      decision: makeDecision(),
      persisted: { success: true, decisionId: "persisted-dec-1" },
    };

    const flow = prepareExecutionFlow(routingResult, undefined, "explicit-dec");
    expect(flow.plan!.routingDecisionId).toBe("explicit-dec");
  });

  it("returns FAILED with validation errors when plan is invalid", () => {
    const decision = makeDecision();
    const routingResult: RoutingResult = { success: true, decision };

    // Corrupt the decision to produce an invalid plan
    decision.selected.factors.projectedCost = -1;

    const flow = prepareExecutionFlow(routingResult);

    expect(flow.status).toBe("FAILED");
    expect(flow.plan).toBeDefined(); // Plan was built but failed validation
    expect(flow.validation.valid).toBe(false);
    expect(flow.validation.errors.some((e) => e.code === "INVALID_COST")).toBe(true);
    expect(flow.error).toContain("validation failed");
  });

  it("handles routing error gracefully", () => {
    const routingResult: RoutingResult = {
      success: false,
      error: "Database connection timeout",
      errorCode: "DATABASE_ERROR",
    };

    const flow = prepareExecutionFlow(routingResult);

    expect(flow.status).toBe("FAILED");
    expect(flow.error).toContain("Database connection timeout");
  });

  it("flow preserves routing explanation", () => {
    const decision = makeDecision({
      reason: "Selected Model One for optimal cost-quality balance.",
    });
    const routingResult: RoutingResult = { success: true, decision };

    const flow = prepareExecutionFlow(routingResult);

    expect(flow.plan!.routingExplanation).toBe(
      "Selected Model One for optimal cost-quality balance."
    );
  });

  it("flow preserves token estimates", () => {
    const decision = makeDecision();
    const routingResult: RoutingResult = { success: true, decision };

    const flow = prepareExecutionFlow(routingResult);

    expect(flow.plan!.estimatedInputTokens).toBe(500);
    expect(flow.plan!.estimatedOutputTokens).toBe(200);
  });

  it("flow preserves all fallback targets", () => {
    const decision = makeDecision();
    const routingResult: RoutingResult = { success: true, decision };

    const flow = prepareExecutionFlow(routingResult);

    expect(flow.plan!.fallbacks).toHaveLength(2);
    expect(flow.plan!.fallbacks[0].providerId).toBe("provider-b");
    expect(flow.plan!.fallbacks[1].providerId).toBe("provider-c");
  });

  it("provider uses providerName fallback when providerName is undefined", () => {
    const decision = makeDecision();
    decision.selected.candidate.providerName = undefined;

    const routingResult: RoutingResult = { success: true, decision };
    const flow = prepareExecutionFlow(routingResult);

    // Falls back to providerId when providerName is not set
    expect(flow.plan!.primary.providerName).toBe("provider-a");
  });
});

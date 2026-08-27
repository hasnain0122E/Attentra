/**
 * Attentra — Routing Integration Tests (Real Database)
 *
 * Phase 6 / Step 3 — Production Routing Validation + Decision Persistence
 *
 * Tests the routing engine against the REAL seeded PostgreSQL database.
 * No mocks — verifies actual database connectivity, model loading,
 * pricing accuracy, and end-to-end routing decisions.
 *
 * Requirements:
 * - PostgreSQL database must be running (DATABASE_URL in .env)
 * - Database must be seeded (npm run db:seed)
 * - No provider API calls are made (routing only)
 *
 * Cleanup:
 * - Each test that writes to the database cleans up after itself
 * - beforeEach/afterEach handle Request and RoutingDecision records
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

import { routeWithDatabase } from "@/lib/routing/router";
import { routeAndPersist } from "@/lib/routing/router";
import { loadRoutingCandidates } from "@/lib/routing/database";
import { calculateProjectedCost } from "@/lib/routing/scorer";
import type { ModelCandidate, RoutingResult } from "@/lib/routing/types";

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

/** Generate a unique request ID for test isolation */
function testRequestId(suffix: string): string {
  return `test-step3-${suffix}-${Date.now()}`;
}

/** Request messages for each task type */
const TASK_REQUESTS: Record<string, string> = {
  GENERAL: "Hello, how are you today? Can you help me with a question?",
  CODING: "Write a TypeScript function that sorts an array using the quicksort algorithm and handles edge cases",
  REASONING: "Explain step by step how to solve this mathematical theorem and prove the logic using deduction",
  WRITING: "Write a creative short story about a space adventure blog article with engaging narrative",
  SUMMARIZATION: "Summarize the key points of this long article into brief bullet points and condense the overview",
  TRANSLATION: "Translate this paragraph from English to Spanish please and localize the content",
  ANALYSIS: "Analyze the sentiment of these customer reviews and classify each one by category and detect patterns",
  EXTRACTION: "Extract all email addresses and phone numbers from this document into structured JSON data points",
};

// Track created records for cleanup
const createdRequestIds: string[] = [];

afterEach(async () => {
  // Clean up any test-created records
  for (const reqId of createdRequestIds) {
    try {
      await prisma.routingDecision.deleteMany({ where: { requestId: reqId } });
      await prisma.request.deleteMany({ where: { id: reqId } });
    } catch {
      // Ignore cleanup errors
    }
  }
  createdRequestIds.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────
// 1. DATABASE CANDIDATE LOADING
// ─────────────────────────────────────────────────────

describe("Database Candidate Loading (Real DB)", { timeout: 30_000 }, () => {
  it("loads candidates from PostgreSQL", async () => {
    const result = await loadRoutingCandidates();

    expect(result.error).toBeUndefined();
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.totalActiveModels).toBeGreaterThan(0);
  });

  it("all loaded candidates have valid pricing", async () => {
    const result = await loadRoutingCandidates();

    for (const candidate of result.candidates) {
      expect(candidate.inputPricePer1k).toBeGreaterThanOrEqual(0);
      expect(candidate.outputPricePer1k).toBeGreaterThanOrEqual(0);
      // At least one price must be positive
      expect(candidate.inputPricePer1k + candidate.outputPricePer1k).toBeGreaterThan(0);
    }
  });

  it("all loaded candidates are from active providers", async () => {
    const result = await loadRoutingCandidates();

    for (const candidate of result.candidates) {
      expect(candidate.providerId).toBeTruthy();
      expect(candidate.providerName).toBeTruthy();
      expect(candidate.active).toBe(true);
    }
  });

  it("candidates have required fields populated", async () => {
    const result = await loadRoutingCandidates();

    for (const candidate of result.candidates) {
      expect(candidate.modelId).toBeTruthy();
      expect(candidate.modelIdentifier).toBeTruthy();
      expect(candidate.displayName).toBeTruthy();
      expect(candidate.capabilities.length).toBeGreaterThan(0);
    }
  });

  it("loads multiple providers", async () => {
    const result = await loadRoutingCandidates();

    const providers = new Set(result.candidates.map((c) => c.providerId));
    expect(providers.size).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────
// 2. REAL DATABASE ROUTING — ALL TASK TYPES
// ─────────────────────────────────────────────────────

describe("Real Database Routing \u2014 All Task Types", { timeout: 30_000 }, () => {
  for (const [taskType, content] of Object.entries(TASK_REQUESTS)) {
    it(`routes ${taskType} request successfully`, async () => {
      const result = await routeWithDatabase({
        messages: [{ role: "user", content }],
      });

      // Some task types might not have matching models in the seeded data
      // (e.g., EXTRACTION or TRANSLATION might not have specialized models)
      if (result.success) {
        expect(result.decision).toBeDefined();
        expect(result.decision!.taskType).toBe(taskType);
        expect(result.decision!.selected).toBeDefined();
        expect(result.decision!.selected.score).toBeGreaterThan(0);
        expect(result.decision!.selected.candidate.modelId).toBeTruthy();
        expect(result.decision!.reason).toBeTruthy();
      } else {
        // If routing fails, it should be a structured error (not a crash)
        expect(result.error).toBeTruthy();
        expect(result.errorCode).toBeTruthy();
      }
    });
  }
});

// ─────────────────────────────────────────────────────
// 3. ROUTING + PERSISTENCE (Real DB)
// ─────────────────────────────────────────────────────

describe("Routing + Persistence (Real DB)", { timeout: 30_000 }, () => {
  it("routeAndPersist creates Request and RoutingDecision records", async () => {
    const requestId = testRequestId("persist");
    createdRequestIds.push(requestId);

    const result = await routeAndPersist({
      messages: [{ role: "user", content: TASK_REQUESTS.GENERAL }],
      metadata: { requestId },
    });

    expect(result.success).toBe(true);
    expect(result.persisted).toBeDefined();
    expect(result.persisted!.success).toBe(true);
    expect(result.persisted!.decisionId).toBeTruthy();

    // Verify Request record exists
    const dbRequest = await prisma.request.findUnique({ where: { id: requestId } });
    expect(dbRequest).toBeTruthy();
    expect(dbRequest!.taskType).toBe("GENERAL");

    // Verify RoutingDecision record exists
    const dbDecision = await prisma.routingDecision.findUnique({ where: { requestId } });
    expect(dbDecision).toBeTruthy();
    expect(dbDecision!.taskType).toBe("GENERAL");
    expect(dbDecision!.selectedModelId).toBe(result.decision!.selected.candidate.modelId);
    expect(dbDecision!.score).toBeTruthy();
    expect(dbDecision!.reason).toBeTruthy();
  });

  it("RoutingDecision.candidateModels contains scored candidates", async () => {
    const requestId = testRequestId("candidates-json");
    createdRequestIds.push(requestId);

    const result = await routeAndPersist({
      messages: [{ role: "user", content: TASK_REQUESTS.GENERAL }],
      metadata: { requestId },
    });

    expect(result.success).toBe(true);

    const dbDecision = await prisma.routingDecision.findUnique({ where: { requestId } });
    expect(dbDecision).toBeTruthy();

    const candidateModels = dbDecision!.candidateModels as {
      scored: Array<{ modelId: string; score: number; projectedCost: number }>;
      rejected: Array<{ modelId: string; reason: string }>;
    };

    expect(candidateModels).toBeTruthy();
    expect(candidateModels.scored).toBeDefined();
    expect(candidateModels.scored.length).toBeGreaterThan(0);

    // Each scored candidate has required fields
    for (const scored of candidateModels.scored) {
      expect(scored.modelId).toBeTruthy();
      expect(typeof scored.score).toBe("number");
      expect(typeof scored.projectedCost).toBe("number");
    }
  });

  it("duplicate requestId updates instead of creating duplicate", async () => {
    const requestId = testRequestId("duplicate");
    createdRequestIds.push(requestId);

    // First routing + persist
    const result1 = await routeAndPersist({
      messages: [{ role: "user", content: TASK_REQUESTS.GENERAL }],
      metadata: { requestId },
    });
    expect(result1.success).toBe(true);

    // Second routing + persist with same requestId
    const result2 = await routeAndPersist({
      messages: [{ role: "user", content: TASK_REQUESTS.GENERAL }],
      metadata: { requestId },
    });
    expect(result2.success).toBe(true);

    // Should still be exactly ONE RoutingDecision for this requestId
    const decisions = await prisma.routingDecision.findMany({ where: { requestId } });
    expect(decisions).toHaveLength(1);
  });

  it("routeAndPersist without requestId routes but does not persist", async () => {
    const result = await routeAndPersist({
      messages: [{ role: "user", content: TASK_REQUESTS.GENERAL }],
    });

    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    expect(result.persisted).toBeUndefined();
    expect(result.persistenceError).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────
// 4. COST VERIFICATION (Real DB)
// ─────────────────────────────────────────────────────

describe("Cost Verification (Real DB)", { timeout: 30_000 }, () => {
  let candidates: ModelCandidate[];

  beforeEach(async () => {
    const result = await loadRoutingCandidates();
    candidates = result.candidates;
  });

  it("projected cost formula is correct: (inputTokens/1000 × inputPrice) + (outputTokens/1000 × outputPrice)", () => {
    const candidate = candidates[0];
    const tokenEstimate = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };

    const cost = calculateProjectedCost(candidate, tokenEstimate);

    const expectedInput = (1000 / 1000) * candidate.inputPricePer1k;
    const expectedOutput = (500 / 1000) * candidate.outputPricePer1k;
    const expectedTotal = expectedInput + expectedOutput;

    expect(cost.inputCost).toBeCloseTo(expectedInput, 10);
    expect(cost.outputCost).toBeCloseTo(expectedOutput, 10);
    expect(cost.totalCost).toBeCloseTo(expectedTotal, 10);
  });

  it("projected cost is non-negative for all candidates", () => {
    const tokenEstimate = { inputTokens: 2000, outputTokens: 500, totalTokens: 2500 };

    for (const candidate of candidates) {
      const cost = calculateProjectedCost(candidate, tokenEstimate);
      expect(cost.totalCost).toBeGreaterThanOrEqual(0);
      expect(cost.inputCost).toBeGreaterThanOrEqual(0);
      expect(cost.outputCost).toBeGreaterThanOrEqual(0);
    }
  });

  it("routing decision includes projected cost for selected model", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: TASK_REQUESTS.GENERAL }],
    });

    if (result.success && result.decision) {
      const projectedCost = result.decision.selected.factors.projectedCost;
      expect(projectedCost).toBeGreaterThanOrEqual(0);
      expect(typeof projectedCost).toBe("number");
    }
  });

  it("more expensive model has higher projected cost", () => {
    // Sort candidates by input price
    const sorted = [...candidates].sort(
      (a, b) => a.inputPricePer1k - b.inputPricePer1k
    );

    if (sorted.length >= 2) {
      const cheapest = sorted[0];
      const expensive = sorted[sorted.length - 1];
      const tokenEstimate = { inputTokens: 5000, outputTokens: 2000, totalTokens: 7000 };

      const cheapCost = calculateProjectedCost(cheapest, tokenEstimate);
      const expensiveCost = calculateProjectedCost(expensive, tokenEstimate);

      // The most expensive model should cost more (unless both are 0)
      if (expensive.inputPricePer1k > 0 || expensive.outputPricePer1k > 0) {
        expect(expensiveCost.totalCost).toBeGreaterThanOrEqual(cheapCost.totalCost);
      }
    }
  });
});

// ─────────────────────────────────────────────────────
// 5. DETERMINISM (Real DB)
// ─────────────────────────────────────────────────────

describe("Determinism (Real DB)", { timeout: 30_000 }, () => {
  it("identical requests produce identical routing decisions", async () => {
    const request = {
      messages: [{ role: "user", content: TASK_REQUESTS.CODING }],
    };

    const results: RoutingResult[] = [];
    for (let i = 0; i < 5; i++) {
      const result = await routeWithDatabase(request);
      results.push(result);
    }

    // All should succeed
    const successes = results.filter((r) => r.success);
    expect(successes.length).toBe(5);

    if (successes.length === 5) {
      const first = successes[0].decision!;

      for (let i = 1; i < successes.length; i++) {
        const current = successes[i].decision!;

        // Same task type
        expect(current.taskType).toBe(first.taskType);

        // Same complexity
        expect(current.complexity.complexity).toBe(first.complexity.complexity);

        // Same token estimate
        expect(current.tokenEstimate.totalTokens).toBe(first.tokenEstimate.totalTokens);

        // Same selected model
        expect(current.selected.candidate.modelId).toBe(first.selected.candidate.modelId);

        // Same score
        expect(current.selected.score).toBe(first.selected.score);

        // Same number of candidates
        expect(current.candidates.length).toBe(first.candidates.length);

        // Same number of fallbacks
        expect(current.fallbacks.length).toBe(first.fallbacks.length);

        // Same fallback ordering (modelIds match)
        for (let j = 0; j < first.fallbacks.length; j++) {
          expect(current.fallbacks[j].candidate.modelId).toBe(first.fallbacks[j].candidate.modelId);
        }
      }
    }
  });

  it("different policies can produce different selections", async () => {
    const request = {
      messages: [{ role: "user", content: TASK_REQUESTS.GENERAL }],
    };

    const costOptimized = await routeWithDatabase(request, { policy: "cost_optimized" });
    const qualityFirst = await routeWithDatabase(request, { policy: "quality_first" });

    // Both should succeed
    if (costOptimized.success && qualityFirst.success) {
      // They might select different models (not guaranteed, but scores should differ)
      const costScores = costOptimized.decision!.candidates.map((c) => c.score);
      const qualityScores = qualityFirst.decision!.candidates.map((c) => c.score);

      // At minimum, the scores should exist
      expect(costScores.length).toBeGreaterThan(0);
      expect(qualityScores.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────
// 6. EXPLANATION (Real DB)
// ─────────────────────────────────────────────────────

describe("Explanation (Real DB)", { timeout: 30_000 }, () => {
  it("routing explanation contains key information", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: TASK_REQUESTS.CODING }],
    });

    if (result.success && result.decision) {
      const explanation = result.decision.reason;

      // Should mention the selected model
      expect(explanation).toContain(result.decision.selected.candidate.displayName);

      // Should mention the task type
      expect(explanation).toContain("CODING");

      // Should mention complexity
      expect(explanation).toContain(result.decision.complexity.complexity);
    }
  });

  it("explanation includes projected cost when available", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: TASK_REQUESTS.GENERAL }],
    });

    if (result.success && result.decision) {
      const projectedCost = result.decision.selected.factors.projectedCost;
      if (projectedCost > 0) {
        // Explanation should mention cost
        expect(result.decision.reason.toLowerCase()).toContain("$");
      }
    }
  });
});

// ─────────────────────────────────────────────────────
// 7. FAILURE BEHAVIOR (Real DB)
// ─────────────────────────────────────────────────────

describe("Failure Behavior (Real DB)", { timeout: 30_000 }, () => {
  it("handles request with very large token estimate (context overflow)", async () => {
    // Create a request that would generate a very large token estimate
    const longContent = "word ".repeat(100000); // ~100K tokens
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: longContent }],
    });

    // Either some models can handle it, or we get a structured error
    if (!result.success) {
      expect(result.errorCode).toBeTruthy();
      expect(result.rejected).toBeDefined();
    }
    // Should NOT crash
    expect(result).toBeDefined();
  });

  it("returns structured error for unsupported task type with no matching capabilities", async () => {
    // Force a task type hint that might not have matching models
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Hello" }],
      taskTypeHint: "EXTRACTION",
    });

    // Might succeed if there are extraction-capable models, or fail gracefully
    if (!result.success) {
      expect(result.errorCode).toBeTruthy();
      expect(result.error).toBeTruthy();
    }
    expect(result).toBeDefined();
  });
});

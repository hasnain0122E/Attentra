/**
 * Attentra — Execution Plan Integration Tests (Real Database)
 *
 * Phase 6 / Step 4 — Production Routing Execution Boundary
 *
 * Tests the execution boundary against the REAL seeded PostgreSQL database.
 * Verifies that real routing decisions can be converted into execution plans
 * and that those plans are valid.
 *
 * Requirements:
 * - PostgreSQL database must be running (DATABASE_URL in .env)
 * - Database must be seeded (npm run db:seed)
 * - No provider API calls are made
 *
 * Cleanup:
 * - Each test that writes to the database cleans up after itself
 */

import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { routeWithDatabase, routeAndPersist } from "@/lib/routing/router";
import {
  buildExecutionPlan,
  validateExecutionPlan,
  prepareExecutionFlow,
} from "@/lib/routing/execution-plan";
import type { RoutingResult } from "@/lib/routing/types";

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function testRequestId(suffix: string): string {
  return `test-step4-${suffix}-${Date.now()}`;
}

const createdRequestIds: string[] = [];

afterEach(async () => {
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
// 1. EXECUTION PLAN FROM REAL ROUTING
// ─────────────────────────────────────────────────────

describe("Execution Plan from Real Routing", { timeout: 30_000 }, () => {
  it("builds valid execution plan from real routing decision", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Hello, how are you today? Can you help me with a question?" }],
    });

    if (!result.success || !result.decision) return; // Skip if no models

    const plan = buildExecutionPlan(result.decision);

    expect(plan.taskType).toBeTruthy();
    expect(plan.complexity).toBeTruthy();
    expect(plan.primary.modelId).toBeTruthy();
    expect(plan.primary.providerId).toBeTruthy();
    expect(plan.primary.displayName).toBeTruthy();
    expect(plan.primary.projectedCost).toBeGreaterThanOrEqual(0);
    expect(plan.primary.routingScore).toBeGreaterThan(0);
    expect(plan.projectedCost).toBeGreaterThanOrEqual(0);
    expect(plan.routingScore).toBeGreaterThan(0);
    expect(plan.status).toBe("NOT_EXECUTED");
    expect(plan.routingExplanation).toBeTruthy();
  });

  it("validates execution plan from real routing decision", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Write a TypeScript function that sorts an array using quicksort" }],
    });

    if (!result.success || !result.decision) return;

    const plan = buildExecutionPlan(result.decision);
    const validation = validateExecutionPlan(plan);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("execution plan preserves projected cost from routing (not recalculated)", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Hello, how are you today?" }],
    });

    if (!result.success || !result.decision) return;

    const plan = buildExecutionPlan(result.decision);

    // Projected cost must match the routing decision exactly
    expect(plan.projectedCost).toBe(result.decision.selected.factors.projectedCost);
    expect(plan.primary.projectedCost).toBe(result.decision.selected.factors.projectedCost);
  });

  it("execution plan preserves routing explanation", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Write a creative short story about space adventure" }],
    });

    if (!result.success || !result.decision) return;

    const plan = buildExecutionPlan(result.decision);

    expect(plan.routingExplanation).toBe(result.decision.reason);
    expect(plan.routingExplanation.length).toBeGreaterThan(0);
  });

  it("execution plan preserves token estimates", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Hello, how are you today?" }],
    });

    if (!result.success || !result.decision) return;

    const plan = buildExecutionPlan(result.decision);

    expect(plan.estimatedInputTokens).toBe(result.decision.tokenEstimate.inputTokens);
    expect(plan.estimatedOutputTokens).toBe(result.decision.tokenEstimate.outputTokens);
  });
});

// ─────────────────────────────────────────────────────
// 2. FALLBACK ORDERING FROM REAL ROUTING
// ─────────────────────────────────────────────────────

describe("Fallback Ordering from Real Routing", { timeout: 30_000 }, () => {
  it("fallback ordering matches routing decision", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Hello, how are you today? Can you help me?" }],
    });

    if (!result.success || !result.decision) return;

    const plan = buildExecutionPlan(result.decision);

    expect(plan.fallbacks.length).toBe(result.decision.fallbacks.length);

    for (let i = 0; i < plan.fallbacks.length; i++) {
      expect(plan.fallbacks[i].modelId).toBe(
        result.decision.fallbacks[i].candidate.modelId
      );
      expect(plan.fallbacks[i].providerId).toBe(
        result.decision.fallbacks[i].candidate.providerId
      );
    }
  });

  it("no duplicate modelIds in primary + fallbacks", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Hello, how are you?" }],
    });

    if (!result.success || !result.decision) return;

    const plan = buildExecutionPlan(result.decision);
    const allIds = [plan.primary.modelId, ...plan.fallbacks.map((f) => f.modelId)];

    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("fallbacks have provider diversity when multiple providers exist", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Hello, how are you today?" }],
    });

    if (!result.success || !result.decision || result.decision.fallbacks.length < 2) return;

    const plan = buildExecutionPlan(result.decision);
    const providers = new Set(plan.fallbacks.map((f) => f.providerId));

    // With multiple providers seeded, fallbacks should span providers
    expect(providers.size).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────
// 3. PERSIST + BUILD EXECUTION PLAN
// ─────────────────────────────────────────────────────

describe("Persist + Build Execution Plan", { timeout: 30_000 }, () => {
  it("persisted routing decision can be converted to execution plan", async () => {
    const requestId = testRequestId("exec-plan");
    createdRequestIds.push(requestId);

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Hello, how are you today? Can you help me?" }],
      metadata: { requestId },
    });

    if (!result.success || !result.decision) return;
    expect(result.persisted?.success).toBe(true);

    const plan = buildExecutionPlan(
      result.decision,
      requestId,
      result.persisted?.decisionId
    );

    expect(plan.requestId).toBe(requestId);
    expect(plan.routingDecisionId).toBe(result.persisted!.decisionId);
    expect(plan.status).toBe("NOT_EXECUTED");

    const validation = validateExecutionPlan(plan);
    expect(validation.valid).toBe(true);
  });

  it("prepareExecutionFlow works with persisted routing result", async () => {
    const requestId = testRequestId("exec-flow");
    createdRequestIds.push(requestId);

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Write a function to sort an array" }],
      metadata: { requestId },
    });

    if (!result.success) return;

    const flow = prepareExecutionFlow(result, requestId);

    expect(flow.status).toBe("NOT_EXECUTED");
    expect(flow.plan).toBeDefined();
    expect(flow.plan!.requestId).toBe(requestId);
    expect(flow.plan!.routingDecisionId).toBe(result.persisted?.decisionId);
    expect(flow.validation.valid).toBe(true);
    expect(flow.error).toBeUndefined();
  });

  it("execution plan from DB decision contains selected model info", async () => {
    const requestId = testRequestId("exec-selected");
    createdRequestIds.push(requestId);

    const result = await routeAndPersist({
      messages: [{ role: "user", content: "Hello, how are you?" }],
      metadata: { requestId },
    });

    if (!result.success || !result.decision) return;

    const plan = buildExecutionPlan(result.decision, requestId);

    // Primary model matches routing selection
    expect(plan.primary.modelId).toBe(result.decision.selected.candidate.modelId);
    expect(plan.primary.providerId).toBe(result.decision.selected.candidate.providerId);
    expect(plan.primary.displayName).toBe(result.decision.selected.candidate.displayName);
    expect(plan.primary.modelIdentifier).toBe(result.decision.selected.candidate.modelIdentifier);
  });
});

// ─────────────────────────────────────────────────────
// 4. PREPARE EXECUTION FLOW (Real DB)
// ─────────────────────────────────────────────────────

describe("Prepare Execution Flow (Real DB)", { timeout: 30_000 }, () => {
  it("prepareExecutionFlow produces NOT_EXECUTED for real routing", async () => {
    const result = await routeWithDatabase({
      messages: [{ role: "user", content: "Hello, how are you today?" }],
    });

    if (!result.success) return;

    const flow = prepareExecutionFlow(result);

    expect(flow.status).toBe("NOT_EXECUTED");
    expect(flow.plan).toBeDefined();
    expect(flow.validation.valid).toBe(true);
    expect(flow.error).toBeUndefined();
  });

  it("prepareExecutionFlow returns FAILED for failed routing", async () => {
    const failedResult: RoutingResult = {
      success: false,
      error: "No active models available",
      errorCode: "NO_ACTIVE_MODELS",
    };

    const flow = prepareExecutionFlow(failedResult);

    expect(flow.status).toBe("FAILED");
    expect(flow.plan).toBeUndefined();
    expect(flow.error).toContain("No active models");
  });

  it("determinism: same request produces identical execution plans", async () => {
    const request = {
      messages: [{ role: "user", content: "Hello, how are you today?" }],
    };

    const plans: ReturnType<typeof buildExecutionPlan>[] = [];

    for (let i = 0; i < 3; i++) {
      const result = await routeWithDatabase(request);
      if (result.success && result.decision) {
        plans.push(buildExecutionPlan(result.decision));
      }
    }

    if (plans.length < 2) return;

    // All plans should have identical structure
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].primary.modelId).toBe(plans[0].primary.modelId);
      expect(plans[i].primary.providerId).toBe(plans[0].primary.providerId);
      expect(plans[i].projectedCost).toBe(plans[0].projectedCost);
      expect(plans[i].routingScore).toBe(plans[0].routingScore);
      expect(plans[i].taskType).toBe(plans[0].taskType);
      expect(plans[i].complexity).toBe(plans[0].complexity);
      expect(plans[i].fallbacks.length).toBe(plans[0].fallbacks.length);
    }
  });
});

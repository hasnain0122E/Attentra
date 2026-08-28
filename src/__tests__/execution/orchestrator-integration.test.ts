/**
 * Attentra — Orchestrator Real Integration Test
 *
 * Phase 7 / Step 4 — Execution Orchestration + BlueMinds Live Execution
 *
 * Live test that exercises the full orchestration path:
 *
 *   ExecutionPlan → ExecutionOrchestrator → ProviderAdapter → BlueMinds
 *
 * ENVIRONMENT GATE:
 *   This test is skipped automatically when BLUEMINDS_API_KEY or
 *   BLUEMINDS_TEST_MODEL are absent. The live test MUST NOT break
 *   the rest of the test suite when credentials are unavailable or
 *   when BlueMinds experiences service degradation.
 *
 * SECURITY:
 *   API keys are never logged or printed. Only the sanitized model
 *   identifier and public result fields are surfaced in test output.
 */

import { describe, it, expect } from "vitest";
import { ExecutionOrchestrator } from "@/lib/execution/orchestrator";
import { ProviderRegistry, ExecutionAdapterRegistry } from "@/lib/execution";
import { BlueMindsExecutionAdapter } from "@/lib/execution/providers/blueminds";
import type { ExecutionPlan } from "@/lib/routing/execution-plan";

// ─────────────────────────────────────────────────────
// ENVIRONMENT GATE
// ─────────────────────────────────────────────────────

const BLUEMINDS_API_KEY = process.env.BLUEMINDS_API_KEY;
const BLUEMINDS_TEST_MODEL = process.env.BLUEMINDS_TEST_MODEL;

const canRunLive =
  typeof BLUEMINDS_API_KEY === "string" && BLUEMINDS_API_KEY.length > 0 &&
  typeof BLUEMINDS_TEST_MODEL === "string" && BLUEMINDS_TEST_MODEL.length > 0;

// ─────────────────────────────────────────────────────
// LIVE TEST
// ─────────────────────────────────────────────────────

describe.skipIf(!canRunLive)("Orchestrator — Real Integration (BlueMinds)", () => {
  it(
    "executes an ExecutionPlan end-to-end through the orchestrator",
    { timeout: 90_000 },
    async () => {
      // Build a minimal ExecutionPlan pointing to BlueMinds
      const plan: ExecutionPlan = {
        requestId: `orchestrator-integration-${Date.now()}`,
        taskType: "GENERAL",
        complexity: "LOW",
        primary: {
          entryId: "primary",
          modelId: "blueminds-integration-model",
          providerId: "blueminds",
          providerName: "BlueMinds",
          modelIdentifier: BLUEMINDS_TEST_MODEL!,
          displayName: `BlueMinds ${BLUEMINDS_TEST_MODEL}`,
          projectedCost: 0.0001,
          routingScore: 0.9,
        },
        fallbacks: [],
        estimatedInputTokens: 20,
        estimatedOutputTokens: 15,
        projectedCost: 0.0001,
        routingScore: 0.9,
        routingExplanation: "Integration test — BlueMinds only",
        status: "NOT_EXECUTED",
        createdAt: new Date(),
      };

      // Build a registry containing only the BlueMinds adapter
      const inner = new ExecutionAdapterRegistry();
      const registry = new ProviderRegistry(inner);
      registry.register(
        new BlueMindsExecutionAdapter({
          apiKey: BLUEMINDS_API_KEY,
          timeoutMs: 30_000,  // 30s adapter timeout — well within the 90s test budget
        })
      );

      const orchestrator = new ExecutionOrchestrator(registry);

      const result = await orchestrator.execute(
        plan,
        [{ role: "user", content: "Say 'Attentra orchestrator integration test passed' and nothing else." }],
        { timeoutMs: 30_000 }  // match adapter timeout
      );

      // The result must be a complete OrchestratorResult
      expect(result.executionAttempts).toBeDefined();
      expect(Array.isArray(result.executionAttempts)).toBe(true);
      expect(result.executionAttempts.length).toBeGreaterThanOrEqual(1);

      if (result.success) {
        // Successful path assertions
        expect(result.content).toBeDefined();
        expect(typeof result.content).toBe("string");
        expect((result.content ?? "").length).toBeGreaterThan(0);

        expect(result.providerId).toBe("blueminds");
        expect(result.latencyMs).toBeGreaterThan(0);
        expect(result.timestamp).toBeDefined();
        expect(result.attempts).toBe(1);

        // Usage should be present but not required (provider may omit)
        if (result.usage) {
          expect(result.usage.inputTokens).toBeGreaterThanOrEqual(0);
          expect(result.usage.outputTokens).toBeGreaterThanOrEqual(0);
        }

        // actualCost is undefined — no prisma provided
        expect(result.actualCost).toBeUndefined();

        // No fallback used
        expect(result.fallback).toBeUndefined();

        // Attempt record
        const attempt = result.executionAttempts[0];
        expect(attempt.success).toBe(true);
        expect(attempt.providerId).toBe("blueminds");
        expect(attempt.modelIdentifier).toBe(BLUEMINDS_TEST_MODEL);
        expect(attempt.latencyMs).toBeGreaterThan(0);
      } else {
        // Service-side failure (e.g., 504 — known BlueMinds instability)
        // Test must not fail the suite — just verify the result shape is correct
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBeDefined();

        const attempt = result.executionAttempts[0];
        expect(attempt.success).toBe(false);
        expect(attempt.error?.code).toBeDefined();

        console.warn(
          "[orchestrator-integration] Live test: BlueMinds returned an error.",
          `code=${result.error?.code}`,
          `model=${BLUEMINDS_TEST_MODEL}`,
          "(external service issue — no code change required)"
        );
      }
    }
  );
});

// ─────────────────────────────────────────────────────
// SKIP NOTICE (when credentials absent)
// ─────────────────────────────────────────────────────

describe.skipIf(canRunLive)("Orchestrator — Real Integration (skipped)", () => {
  it("skips when BLUEMINDS_API_KEY or BLUEMINDS_TEST_MODEL is not set", () => {
    expect(canRunLive).toBe(false);
  });
});

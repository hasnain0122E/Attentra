/**
 * Attentra — Real End-to-End Routing & Execution Test
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog + Real E2E
 *
 * ONE deliberate live request through the ACTUAL product flow:
 *
 *   POST /api/v1/chat/completions
 *     → validation
 *     → routeAndPersist()      (task analysis → DB candidates → pricing
 *                                gate → scoring → Attentra selects model)
 *     → prepareExecutionFlow() (ExecutionPlan)
 *     → ExecutionOrchestrator  (real provider API, actual usage/latency,
 *                                actual cost from existing pricing)
 *     → normalized response
 *
 * The request supplies ONLY the user prompt (+ requestId as a normal
 * policy input) — NO model, NO provider. Attentra selects the model.
 *
 * The assertions NEVER require a specific model to win:
 * - the routed model must belong to the eligible/routable set
 * - the persisted RoutingDecision must match the routing metadata
 * - the actually executed model may differ when fallback is used
 *
 * ENVIRONMENT GATE:
 *   Skips automatically unless RUN_LIVE_PROVIDER_TESTS === "true" AND
 *   DATABASE_URL AND at least one provider API key are present.
 *
 * Exactly ONE live generation request is made.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────
// ENVIRONMENT GATE
// ─────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;

// API credit protection: live provider requests require explicit opt-in.
const RUN_LIVE = process.env.RUN_LIVE_PROVIDER_TESTS === "true";

const hasProviderKey = Boolean(
  process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_AI_API_KEY
);

const canRunLive =
  RUN_LIVE &&
  typeof DATABASE_URL === "string" &&
  DATABASE_URL.length > 0 &&
  hasProviderKey;

// Small prompt — deliberately minimal to protect credits.
const E2E_PROMPT =
  "Explain why caching improves web application performance in two short sentences.";

// ─────────────────────────────────────────────────────
// LIVE END-TO-END TEST
// ─────────────────────────────────────────────────────

describe.skipIf(!canRunLive)(
  "Phase 8 Step 3 — Real End-to-End Attentra Routing and Execution",
  () => {
    it(
      "routes and executes a real request with no model/provider supplied",
      { timeout: 180_000 },
      async () => {
        // Dynamic imports — the route handler pulls in Prisma + execution.
        const { POST } = await import(
          "@/app/api/v1/chat/completions/route"
        );
        const { PrismaClient } = await import("@prisma/client");
        const { loadRoutingCandidates } = await import(
          "@/lib/routing/database"
        );

        const prisma = new PrismaClient();
        const requestId = `p8s3-e2e-${Date.now()}`;

        try {
          // ── The ONE live request: no model, no provider ──
          const req = new NextRequest(
            "http://localhost:3000/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                messages: [
                  {
                    role: "user",
                    content: E2E_PROMPT,
                  },
                ],
                requestId,
              }),
            }
          );

          const res = await POST(req);
          const data = (await res.json()) as Record<string, any>;

          // ───────────────────────────────────────────────
          // Check 1: Request accepted
          // ───────────────────────────────────────────────

          expect(res.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.requestId).toBe(requestId);

          // ───────────────────────────────────────────────
          // Check 13: Normalized API response
          // ───────────────────────────────────────────────

          expect(typeof data.content).toBe("string");
          expect(data.content.trim().length).toBeGreaterThan(10);

          expect(typeof data.routing).toBe("object");
          expect(typeof data.execution).toBe("object");

          expect(
            typeof data.routing.selectedModelId
          ).toBe("string");

          expect(
            typeof data.routing.selectedModelIdentifier
          ).toBe("string");

          expect(
            data.routing.selectedModelIdentifier.length
          ).toBeGreaterThan(0);

          expect(
            typeof data.routing.selectedProvider
          ).toBe("string");

          expect(
            typeof data.execution.modelId
          ).toBe("string");

          expect(
            typeof data.execution.modelIdentifier
          ).toBe("string");

          expect(
            data.execution.modelIdentifier.length
          ).toBeGreaterThan(0);

          expect(
            typeof data.execution.provider
          ).toBe("string");

          expect(
            typeof data.execution.fallbackUsed
          ).toBe("boolean");

          expect(
            typeof data.execution.usage
          ).toBe("object");

          expect(
            typeof data.execution.latencyMs
          ).toBe("number");

          expect(typeof data.timestamp).toBe("string");

          // ───────────────────────────────────────────────
          // Check 2: Analyzer executed
          // ───────────────────────────────────────────────

          expect(
            typeof data.routing.taskType
          ).toBe("string");

          expect(
            data.routing.taskType.length
          ).toBeGreaterThan(0);

          expect(["LOW", "MEDIUM", "HIGH"]).toContain(
            data.routing.complexity
          );

          // ───────────────────────────────────────────────
          // Check 6: RoutingDecision persisted
          // ───────────────────────────────────────────────

          const decision =
            await prisma.routingDecision.findUnique({
              where: { requestId },
            });

          expect(decision).not.toBeNull();

          expect(decision!.taskType).toBe(
            data.routing.taskType
          );

          expect(decision!.complexity).toBe(
            data.routing.complexity
          );

          expect(decision!.selectedModelId).toBeTruthy();

          expect(
            data.routing.selectedModelId
          ).toBe(decision!.selectedModelId);

          // Load the routed model and its logical provider.
          const selectedModel =
            await prisma.model.findUnique({
              where: {
                id: decision!.selectedModelId!,
              },
              include: {
                provider: true,
              },
            });

          expect(selectedModel).not.toBeNull();

          // ───────────────────────────────────────────────
          // Check 3: Candidates loaded from database
          // ───────────────────────────────────────────────

          const candidateData =
            decision!.candidateModels as {
              scored?: Array<{
                modelIdentifier: string;
              }>;
            } | null;

          const scored =
            candidateData?.scored ?? [];

          expect(
            scored.length
          ).toBeGreaterThan(0);

          // ───────────────────────────────────────────────
          // Check 4: >1 eligible candidate if DB permits
          // ───────────────────────────────────────────────

          const loaderResult =
            await loadRoutingCandidates();

          expect(
            loaderResult.error
          ).toBeUndefined();

          const routableIdentifiers =
            loaderResult.candidates.map(
              (candidate) =>
                candidate.modelIdentifier
            );

          if (
            loaderResult.candidates.length > 1
          ) {
            expect(
              scored.length
            ).toBeGreaterThan(1);
          }

          // ───────────────────────────────────────────────
          // Check 5: Router selected a real model
          // ───────────────────────────────────────────────

          expect(
            routableIdentifiers.length
          ).toBeGreaterThan(0);

          expect(
            routableIdentifiers
          ).toContain(
            data.routing.selectedModelIdentifier
          );

          expect(
            scored.map(
              (candidate) =>
                candidate.modelIdentifier
            )
          ).toContain(
            data.routing.selectedModelIdentifier
          );

          // ───────────────────────────────────────────────
          // Check 7: ExecutionPlan used routing winner
          // ───────────────────────────────────────────────

          expect(
            selectedModel!.modelIdentifier
          ).toBe(
            data.routing.selectedModelIdentifier
          );

          expect(
            data.routing.selectedModelDisplayName
          ).toBe(
            selectedModel!.displayName
          );

          const routedProviderName =
            selectedModel!.provider.name;

          expect(
            typeof routedProviderName
          ).toBe("string");

          expect(
            routedProviderName.length
          ).toBeGreaterThan(0);

          expect(
            data.routing.selectedProvider
          ).toBe(
            routedProviderName
          );

          // ───────────────────────────────────────────────
          // Check 8: Actual execution recorded
          // ───────────────────────────────────────────────

          expect(
            data.execution.modelId.length
          ).toBeGreaterThan(0);

          expect(
            data.execution.provider.length
          ).toBeGreaterThan(0);

          expect(
            data.execution.modelIdentifier.length
          ).toBeGreaterThan(0);

          // If fallback happened, the execution winner must be
          // different from the originally routed primary model.
          if (
            data.execution.fallbackUsed
          ) {
            expect(
              data.execution.modelId
            ).not.toBe(
              data.routing.selectedModelId
            );
          }

          // ───────────────────────────────────────────────
          // Check 9: Real content returned
          // ───────────────────────────────────────────────

          expect(
            data.content.trim().length
          ).toBeGreaterThan(10);

          // ───────────────────────────────────────────────
          // Check 10: Actual usage returned
          // ───────────────────────────────────────────────

          expect(
            data.execution.usage.inputTokens
          ).toBeGreaterThan(0);

          expect(
            data.execution.usage.outputTokens
          ).toBeGreaterThan(0);

          expect(
            data.execution.usage.totalTokens
          ).toBe(
            data.execution.usage.inputTokens +
              data.execution.usage.outputTokens
          );

          // ───────────────────────────────────────────────
          // Check 11: Latency returned
          // ───────────────────────────────────────────────

          expect(
            data.execution.latencyMs
          ).toBeGreaterThan(0);

          // ───────────────────────────────────────────────
          // Check 12: Actual cost uses EXECUTED model
          // ───────────────────────────────────────────────

          expect(
            typeof data.execution.actualCost
          ).toBe("number");

          expect(
            data.execution.actualCost
          ).toBeGreaterThanOrEqual(0);

          /**
           * Important:
           *
           * Projected cost belongs to the ROUTED primary model.
           * Actual cost must belong to the model that actually
           * produced the response.
           */
          const costModelId =
            data.execution.modelId;

          const costModel =
            await prisma.model.findUnique({
              where: {
                id: costModelId,
              },
            });

          expect(costModel).not.toBeNull();

          const inputPrice =
            Number(
              costModel!.inputPricePer1k
            );

          const outputPrice =
            Number(
              costModel!.outputPricePer1k
            );

          const expected =
            (data.execution.usage.inputTokens /
              1000) *
              inputPrice +
            (data.execution.usage.outputTokens /
              1000) *
              outputPrice;

          const expectedRounded =
            Math.round(expected * 1e8) /
            1e8;

          expect(
            data.execution.actualCost
          ).toBeCloseTo(
            expectedRounded,
            6
          );

          if (
            inputPrice > 0 ||
            outputPrice > 0
          ) {
            expect(
              data.execution.actualCost
            ).toBeGreaterThan(0);
          }

          // ───────────────────────────────────────────────
          // Dashboard readability / persistence
          // ───────────────────────────────────────────────

          const dbRequest =
            await prisma.request.findUnique({
              where: {
                id: requestId,
              },
            });

          expect(dbRequest).not.toBeNull();

          expect(
            dbRequest!.selectedModelId
          ).toBe(
            decision!.selectedModelId
          );

          expect(
            dbRequest!.taskType
          ).toBe(
            data.routing.taskType
          );

          // ───────────────────────────────────────────────
          // Diagnostic output
          // ───────────────────────────────────────────────

          console.log(
            "[p8s3-e2e] Routed:",
            `${data.routing.selectedProvider}/${data.routing.selectedModelIdentifier}`,
            "| Executed:",
            `${data.execution.provider}/${data.execution.modelIdentifier}`,
            `| task=${data.routing.taskType}`,
            `complexity=${data.routing.complexity}`,
            `| candidates=${scored.length}`,
            `| latency=${data.execution.latencyMs}ms`,
            `cost=${data.execution.actualCost}`,
            data.execution.fallbackUsed
              ? "| (fallback used)"
              : ""
          );
        } finally {
          // Cleanup only the records created by this E2E test.
          // RoutingDecision cascades with its Request relation.
          await prisma.request.deleteMany({
            where: {
              id: {
                startsWith:
                  "p8s3-e2e-",
              },
            },
          });

          await prisma.$disconnect();
        }
      }
    );
  }
);

// ─────────────────────────────────────────────────────
// SKIP NOTICE
// ─────────────────────────────────────────────────────

describe.skipIf(canRunLive)(
  "Phase 8 Step 3 — Real E2E (skipped)",
  () => {
    it(
      "skips when live testing is not enabled or credentials/database are not available",
      () => {
        expect(canRunLive).toBe(false);
      }
    );
  }
);
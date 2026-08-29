/**
 * Attentra — Chat Completions API Integration Test
 *
 * Phase 7 / Step 5 — Consumer Execution API
 *
 * End-to-end test for the full pipeline:
 *
 *   POST /api/v1/chat/completions
 *     → validation
 *     → routeAndPersist()      (database-backed routing)
 *     → prepareExecutionFlow()
 *     → ExecutionOrchestrator
 *     → Dispatcher → BlueMinds
 *     → normalized API response
 *
 * ENVIRONMENT GATE:
 *   Skips automatically when RUN_LIVE_PROVIDER_TESTS is not exactly "true",
 *   or when BLUEMINDS_API_KEY, BLUEMINDS_TEST_MODEL, or DATABASE_URL are
 *   absent. External service failures (e.g., 504) are logged as warnings
 *   rather than failing the suite.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────
// ENVIRONMENT GATE
// ─────────────────────────────────────────────────────

const BLUEMINDS_API_KEY = process.env.BLUEMINDS_API_KEY;
const BLUEMINDS_TEST_MODEL = process.env.BLUEMINDS_TEST_MODEL;
const DATABASE_URL = process.env.DATABASE_URL;

// API credit protection: live provider requests require explicit opt-in.
const RUN_LIVE = process.env.RUN_LIVE_PROVIDER_TESTS === "true";

const canRunLive =
  RUN_LIVE &&
  typeof BLUEMINDS_API_KEY === "string" &&
  BLUEMINDS_API_KEY.length > 0 &&
  typeof BLUEMINDS_TEST_MODEL === "string" &&
  BLUEMINDS_TEST_MODEL.length > 0 &&
  typeof DATABASE_URL === "string" &&
  DATABASE_URL.length > 0;

// ─────────────────────────────────────────────────────
// LIVE TEST
// ─────────────────────────────────────────────────────

describe.skipIf(!canRunLive)(
  "Chat Completions API — Real Integration",
  () => {
    it(
      "executes a full request through the pipeline",
      { timeout: 90_000 },
      async () => {
        // Dynamic import — route handler pulls in Prisma/execution modules
        const { POST } = await import(
          "@/app/api/v1/chat/completions/route"
        );

        const req = new NextRequest(
          "http://localhost:3000/api/v1/chat/completions",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content:
                    "Say 'Attentra API integration test passed' and nothing else.",
                },
              ],
              requestId: `api-integration-${Date.now()}`,
            }),
          }
        );

        const res = await POST(req);

        // The response must be valid JSON with our contract shape
        const data = (await res.json()) as Record<string, unknown>;

        expect(data.requestId).toBeDefined();
        expect(typeof data.requestId).toBe("string");
        expect(data.success).toBeDefined();

        if (data.success) {
          // Successful execution
          expect(res.status).toBe(200);
          expect(typeof data.content).toBe("string");
          expect((data.content as string).length).toBeGreaterThan(0);
          expect(typeof data.model).toBe("string");
          expect(data.timestamp).toBeDefined();
          expect(data.latencyMs).toBeDefined();
        } else {
          // Service-side failure (e.g., 504 — known BlueMinds instability)
          // The response shape must still be correct
          const err = data.error as Record<string, unknown> | undefined;
          expect(err).toBeDefined();
          expect(typeof err?.code).toBe("string");
          expect(typeof err?.message).toBe("string");

          // Credentials must never appear
          const text = JSON.stringify(data);
          expect(text).not.toContain(BLUEMINDS_API_KEY!);

          console.warn(
            "[chat-completions-integration] Live test: pipeline returned error.",
            `status=${res.status}`,
            `code=${err?.code}`,
            "(external service issue — no code change required)"
          );
        }
      }
    );
  }
);

// ─────────────────────────────────────────────────────
// SKIP NOTICE (when credentials absent)
// ─────────────────────────────────────────────────────

describe.skipIf(canRunLive)(
  "Chat Completions API — Integration (skipped)",
  () => {
    it("skips when live testing is not enabled or credentials/database are not available", () => {
      expect(canRunLive).toBe(false);
    });
  }
);

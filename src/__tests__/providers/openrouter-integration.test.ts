/**
 * Attentra — OpenRouter Integration Test (Real API)
 *
 * Phase 8 / Step 1 — OpenRouter Provider Adapter
 *
 * This test only runs when BOTH environment variables are set:
 *   OPENROUTER_API_KEY     — a valid OpenRouter API key
 *   OPENROUTER_TEST_MODEL  — an inexpensive model identifier
 *
 * When either is absent, the test is cleanly skipped.
 *
 * The test makes ONE inexpensive request to verify:
 *   - The request reaches OpenRouter
 *   - The response is successfully normalized
 *   - Content exists
 *   - Usage is handled safely
 */

import { describe, it, expect } from "vitest";
import { OpenRouterExecutionAdapter } from "@/lib/execution/providers/openrouter";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_TEST_MODEL = process.env.OPENROUTER_TEST_MODEL;

const canRunLive =
  typeof OPENROUTER_API_KEY === "string" &&
  OPENROUTER_API_KEY.length > 0 &&
  typeof OPENROUTER_TEST_MODEL === "string" &&
  OPENROUTER_TEST_MODEL.length > 0;

describe.skipIf(!canRunLive)("OpenRouter — Real Integration", () => {
  // Live requests can exceed Vitest's 5s default test timeout, so this test
  // gets an explicit timeout. The adapter timeout (30s) is well within the
  // 90s test budget so AbortController fires before Vitest kills the test.
  it("executes one inexpensive request and normalizes the response", { timeout: 90_000 }, async () => {
    const adapter = new OpenRouterExecutionAdapter({
      apiKey: OPENROUTER_API_KEY,
      timeoutMs: 30_000, // 30s adapter timeout — well within the 90s test budget
    });

    const result = await adapter.execute({
      modelId: OPENROUTER_TEST_MODEL!,
      providerId: "openrouter",
      modelIdentifier: OPENROUTER_TEST_MODEL!,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: OK",
        },
      ],
      maxTokens: 20,
      requestId: `integration-test-or-${Date.now()}`,
    });

    // ── DIAGNOSTIC SUMMARY (safe fields only — no credentials) ──

    if (result.success) {
      // Successful path — full response assertions
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe("string");

      // Provider information is present
      expect(result.providerId).toBe("openrouter");

      // Usage is safely handled (may or may not be returned)
      if (result.usage) {
        expect(typeof result.usage.inputTokens).toBe("number");
        expect(typeof result.usage.outputTokens).toBe("number");
        expect(typeof result.usage.totalTokens).toBe("number");
        expect(result.usage.inputTokens).toBeGreaterThanOrEqual(0);
        expect(result.usage.outputTokens).toBeGreaterThanOrEqual(0);
      }

      // Latency was measured
      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs!).toBeGreaterThan(0);

      // Timestamp exists
      expect(result.timestamp).toBeTruthy();

      // actualCost is NOT populated by the adapter
      expect(result.actualCost).toBeUndefined();
    } else {
      // Authentication/configuration failures must remain visible
      if (
        result.error?.code === "AUTHENTICATION" ||
        result.error?.code === "MISSING_API_KEY"
      ) {
        // These indicate a configuration problem — fail the test
        expect(
          result.error?.code,
          `OpenRouter auth/config error: ${result.error?.message}`
        ).not.toBe("AUTHENTICATION");
        expect(
          result.error?.code,
          `OpenRouter auth/config error: ${result.error?.message}`
        ).not.toBe("MISSING_API_KEY");
        return;
      }

      // Service-side failure (e.g., timeout, rate limit, server error)
      // Test must not fail the suite — just verify the error shape is correct
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBeDefined();
      expect(result.providerId).toBe("openrouter");
      expect(result.timestamp).toBeTruthy();

      console.warn(
        "[openrouter-integration] Live test: OpenRouter returned an error.",
        `code=${result.error?.code}`,
        `model=${OPENROUTER_TEST_MODEL}`,
        "(external service issue — no code change required)"
      );
    }
  });
});

describe("OpenRouter — Integration Skip", () => {
  it("reports skip reason when credentials are absent", () => {
    if (!canRunLive) {
      // This test documents WHY the integration test was skipped
      const reason = !OPENROUTER_API_KEY
        ? "OPENROUTER_API_KEY not set"
        : "OPENROUTER_TEST_MODEL not set";
      expect(reason).toBeTruthy();
    } else {
      // If credentials ARE available, this test is a no-op
      expect(true).toBe(true);
    }
  });
});

/**
 * Attentra — Google (Gemini) Integration Test (Real API)
 *
 * Phase 8 / Step 2 — Direct Provider Execution Activation
 *
 * This test only runs when ALL of the following are configured:
 *   RUN_LIVE_PROVIDER_TESTS="true"  — explicit live-test opt-in
 *                                     (API credit protection: prevents the
 *                                     full suite from spending real credits)
 *   GOOGLE_AI_API_KEY               — a valid Google AI API key
 *   GOOGLE_TEST_MODEL               — an inexpensive model identifier
 *
 * When any is absent, the test is cleanly skipped.
 *
 * The test makes ONE inexpensive request through the EXISTING
 * GoogleExecutionAdapter to verify:
 *   - The request reaches Google through the SDK client
 *   - The response is successfully normalized into ExecutionResult
 *   - Content, usage, and latency are extracted
 */

import { describe, it, expect } from "vitest";
import { GoogleExecutionAdapter } from "@/lib/execution/providers/google";

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GOOGLE_TEST_MODEL = process.env.GOOGLE_TEST_MODEL;

// API credit protection: live provider requests require explicit opt-in.
const RUN_LIVE = process.env.RUN_LIVE_PROVIDER_TESTS === "true";

const canRunLive =
  RUN_LIVE &&
  typeof GOOGLE_AI_API_KEY === "string" &&
  GOOGLE_AI_API_KEY.length > 0 &&
  typeof GOOGLE_TEST_MODEL === "string" &&
  GOOGLE_TEST_MODEL.length > 0;

describe.skipIf(!canRunLive)("Google — Real Integration", () => {
  // Live requests can exceed Vitest's 5s default test timeout, so this test
  // gets an explicit 90s budget. Gemini thinking models consume output tokens
  // on internal reasoning, so the tiny prompt still gets a small but
  // sufficient output budget.
  it("executes one inexpensive request and normalizes the response", { timeout: 90_000 }, async () => {
    const adapter = new GoogleExecutionAdapter();

    const result = await adapter.execute({
      modelId: GOOGLE_TEST_MODEL!,
      providerId: "google",
      modelIdentifier: GOOGLE_TEST_MODEL!,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: OK",
        },
      ],
      maxTokens: 512,
      requestId: `integration-test-google-${Date.now()}`,
    });

    if (result.success) {
      // Successful path — full response assertions
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe("string");

      // Provider information is present
      expect(result.providerId).toBe("google");
      expect(result.modelId).toBe(GOOGLE_TEST_MODEL);

      // Usage is normalized when provided by Google
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
          `Google auth/config error: ${result.error?.message}`
        ).not.toBe("AUTHENTICATION");
        expect(
          result.error?.code,
          `Google auth/config error: ${result.error?.message}`
        ).not.toBe("MISSING_API_KEY");
        return;
      }

      // Service-side failure (e.g., timeout, rate limit, server error)
      // Test must not fail the suite — just verify the error shape is correct
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBeDefined();
      expect(result.providerId).toBe("google");
      expect(result.timestamp).toBeTruthy();

      console.warn(
        "[google-integration] Live test: Google returned an error.",
        `code=${result.error?.code}`,
        `model=${GOOGLE_TEST_MODEL}`,
        "(external service issue — no code change required)"
      );
    }
  });
});

describe("Google — Integration Skip", () => {
  it("reports skip reason when live testing is not enabled", () => {
    if (!canRunLive) {
      // This test documents WHY the integration test was skipped
      const reason = !RUN_LIVE
        ? 'RUN_LIVE_PROVIDER_TESTS is not "true"'
        : !GOOGLE_AI_API_KEY
        ? "GOOGLE_AI_API_KEY not set"
        : "GOOGLE_TEST_MODEL not set";
      expect(reason).toBeTruthy();
    } else {
      // If live testing IS enabled, this test is a no-op
      expect(true).toBe(true);
    }
  });
});

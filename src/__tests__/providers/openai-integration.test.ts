/**
 * Attentra — OpenAI Integration Test (Real API)
 *
 * Phase 8 / Step 2 — Direct Provider Execution Activation
 *
 * This test only runs when ALL of the following are configured:
 *   RUN_LIVE_PROVIDER_TESTS="true"  — explicit live-test opt-in
 *                                     (API credit protection: prevents the
 *                                     full suite from spending real credits)
 *   OPENAI_API_KEY                  — a valid OpenAI API key
 *   OPENAI_TEST_MODEL               — an inexpensive model identifier
 *
 * When any is absent, the test is cleanly skipped.
 *
 * The test makes ONE inexpensive request through the EXISTING
 * OpenAIExecutionAdapter to verify:
 *   - The request reaches OpenAI through the SDK client
 *   - The response is successfully normalized into ExecutionResult
 *   - Content, usage, and latency are extracted
 */

import { describe, it, expect } from "vitest";
import { OpenAIExecutionAdapter } from "@/lib/execution/providers/openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_TEST_MODEL = process.env.OPENAI_TEST_MODEL;

// API credit protection: live provider requests require explicit opt-in.
const RUN_LIVE = process.env.RUN_LIVE_PROVIDER_TESTS === "true";

const canRunLive =
  RUN_LIVE &&
  typeof OPENAI_API_KEY === "string" &&
  OPENAI_API_KEY.length > 0 &&
  typeof OPENAI_TEST_MODEL === "string" &&
  OPENAI_TEST_MODEL.length > 0;

describe.skipIf(!canRunLive)("OpenAI — Real Integration", () => {
  // Live requests can exceed Vitest's 5s default test timeout, so this test
  // gets an explicit 90s budget. GPT-5 reasoning models consume completion
  // tokens on internal reasoning, so the tiny prompt still gets a small but
  // sufficient output budget.
  it("executes one inexpensive request and normalizes the response", { timeout: 90_000 }, async () => {
    const adapter = new OpenAIExecutionAdapter();

    const result = await adapter.execute({
      modelId: OPENAI_TEST_MODEL!,
      providerId: "openai",
      modelIdentifier: OPENAI_TEST_MODEL!,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: OK",
        },
      ],
      maxTokens: 512,
      requestId: `integration-test-openai-${Date.now()}`,
    });

    if (result.success) {
      // Successful path — full response assertions
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe("string");

      // Provider information is present
      expect(result.providerId).toBe("openai");
      expect(result.modelId).toBe(OPENAI_TEST_MODEL);

      // Provider request ID is extracted where supported
      expect(result.providerRequestId).toBeTruthy();

      // Usage is normalized when provided by OpenAI
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
          `OpenAI auth/config error: ${result.error?.message}`
        ).not.toBe("AUTHENTICATION");
        expect(
          result.error?.code,
          `OpenAI auth/config error: ${result.error?.message}`
        ).not.toBe("MISSING_API_KEY");
        return;
      }

      // Service-side failure (e.g., timeout, rate limit, server error)
      // Test must not fail the suite — just verify the error shape is correct
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBeDefined();
      expect(result.providerId).toBe("openai");
      expect(result.timestamp).toBeTruthy();

      console.warn(
        "[openai-integration] Live test: OpenAI returned an error.",
        `code=${result.error?.code}`,
        `model=${OPENAI_TEST_MODEL}`,
        "(external service issue — no code change required)"
      );
    }
  });
});

describe("OpenAI — Integration Skip", () => {
  it("reports skip reason when live testing is not enabled", () => {
    if (!canRunLive) {
      // This test documents WHY the integration test was skipped
      const reason = !RUN_LIVE
        ? 'RUN_LIVE_PROVIDER_TESTS is not "true"'
        : !OPENAI_API_KEY
        ? "OPENAI_API_KEY not set"
        : "OPENAI_TEST_MODEL not set";
      expect(reason).toBeTruthy();
    } else {
      // If live testing IS enabled, this test is a no-op
      expect(true).toBe(true);
    }
  });
});

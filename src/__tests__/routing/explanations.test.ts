/**
 * Attentra — Routing Explanation Helper Tests (Phase 13)
 *
 * buildConciseRoutingReason is the canonical concise explanation
 * shared by the consumer UI, the business UI, and the public API
 * (`routing.reason`). These tests pin the stable sentence shape so
 * all surfaces keep identical semantics.
 */

import { describe, it, expect } from "vitest";

import {
  buildConciseRoutingReason,
} from "@/lib/routing/explanations";

describe("buildConciseRoutingReason", () => {
  it("produces the canonical concise sentence", () => {
    const reason = buildConciseRoutingReason({
      modelDisplayName: "Gemini 3.1 Flash Lite",
      complexity: "LOW",
      taskType: "GENERAL",
    });

    expect(reason).toBe(
      "Gemini 3.1 Flash Lite selected for a low-complexity general request " +
      "based on capability, projected cost, and latency."
    );
  });

  it("lowercases complexity and task type labels", () => {
    const reason = buildConciseRoutingReason({
      modelDisplayName: "Mock Model",
      complexity: "HIGH",
      taskType: "CODING",
    });

    expect(reason).toContain("high-complexity");
    expect(reason).toContain("coding request");
    expect(reason).not.toContain("HIGH");
    expect(reason).not.toContain("CODING");
  });

  it("is deterministic for identical inputs", () => {
    const input = {
      modelDisplayName: "Claude Sonnet",
      complexity: "MEDIUM",
      taskType: "GENERAL",
    };

    expect(buildConciseRoutingReason(input)).toBe(
      buildConciseRoutingReason(input)
    );
  });

  it("does not expose fallback catalogues or rejection summaries", () => {
    const reason = buildConciseRoutingReason({
      modelDisplayName: "Mock Model",
      complexity: "LOW",
      taskType: "GENERAL",
    });

    expect(reason).not.toContain("Fallbacks:");
    expect(reason).not.toContain("Excluded:");
    expect(reason).not.toContain("|");
  });

  it("never includes formatted currency amounts", () => {
    const reason = buildConciseRoutingReason({
      modelDisplayName: "Mock Model",
      complexity: "LOW",
      taskType: "GENERAL",
    });

    expect(reason).not.toContain("$");
    expect(reason).not.toContain("PKR");
  });

  it("keeps the model display name verbatim", () => {
    const reason = buildConciseRoutingReason({
      modelDisplayName: "GPT-5.2 mini",
      complexity: "MEDIUM",
      taskType: "SUMMARIZATION",
    });

    expect(reason.startsWith("GPT-5.2 mini selected for a")).toBe(true);
  });
});

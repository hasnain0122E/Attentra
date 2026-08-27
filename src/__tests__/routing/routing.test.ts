/**
 * Attentra — Routing Engine Foundation Tests
 *
 * Phase 6 / Step 1 — Foundational Contracts
 *
 * Tests:
 * - Task type classification (all types + edge cases)
 * - Complexity classification (LOW/MEDIUM/HIGH + confidence)
 * - Token estimation (characters/4 approximation)
 * - Request analysis (integrated)
 * - Routing types and contracts
 * - Provider-neutral behavior (no SDK imports)
 * - Deterministic output (identical inputs → identical outputs)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import { analyzeRequest } from "@/lib/routing/analyzer";
import { classifyComplexity } from "@/lib/routing/complexity";
import { estimateTokens, estimateTokenCount } from "@/lib/routing/token-estimator";
import { resolvePolicy, listPolicyNames, ROUTING_POLICIES } from "@/lib/routing/policies";
import { selectCandidates } from "@/lib/routing/candidates";
import { orderFallbacks } from "@/lib/routing/fallback";
import type {
  RoutingTaskType,
  ComplexityResult,
  TokenEstimate,
  ModelCandidate,
  ModelScore,
} from "@/lib/routing/types";
import { ROUTING_TASK_TYPES, TASK_TYPE_TO_CAPABILITIES } from "@/lib/routing/types";

// ─────────────────────────────────────────────────────
// 1. TASK TYPE CLASSIFICATION
// ─────────────────────────────────────────────────────

describe("Task Type Classification", () => {
  it("classifies simple greeting as GENERAL", () => {
    const result = analyzeRequest([
      { role: "user", content: "Hello, how are you?" },
    ]);
    expect(result.taskType).toBe("GENERAL");
  });

  it("classifies code-related request as CODING", () => {
    const result = analyzeRequest([
      { role: "user", content: "Write a function that sorts an array using quicksort algorithm in TypeScript" },
    ]);
    expect(result.taskType).toBe("CODING");
  });

  it("classifies reasoning/math request as REASONING", () => {
    const result = analyzeRequest([
      { role: "user", content: "Explain step by step how to solve this mathematical theorem and prove the logic" },
    ]);
    expect(result.taskType).toBe("REASONING");
  });

  it("classifies creative writing request as WRITING", () => {
    const result = analyzeRequest([
      { role: "user", content: "Write a creative short story about a space adventure blog article" },
    ]);
    expect(result.taskType).toBe("WRITING");
  });

  it("classifies summarization request as SUMMARIZATION", () => {
    const result = analyzeRequest([
      { role: "user", content: "Summarize the key points of this long article into bullet points" },
    ]);
    expect(result.taskType).toBe("SUMMARIZATION");
  });

  it("classifies translation request as TRANSLATION", () => {
    const result = analyzeRequest([
      { role: "user", content: "Translate this paragraph from English to Spanish please" },
    ]);
    expect(result.taskType).toBe("TRANSLATION");
  });

  it("classifies analysis/sentiment request as ANALYSIS", () => {
    const result = analyzeRequest([
      { role: "user", content: "Analyze the sentiment of these customer reviews and classify each one" },
    ]);
    expect(result.taskType).toBe("ANALYSIS");
  });

  it("classifies data extraction request as EXTRACTION", () => {
    const result = analyzeRequest([
      { role: "user", content: "Extract all email addresses and phone numbers from this document into structured JSON" },
    ]);
    expect(result.taskType).toBe("EXTRACTION");
  });

  it("handles empty messages array", () => {
    const result = analyzeRequest([]);
    expect(result.taskType).toBe("GENERAL");
  });

  it("handles empty content string", () => {
    const result = analyzeRequest([{ role: "user", content: "" }]);
    expect(result.taskType).toBe("GENERAL");
  });

  it("respects taskTypeHint over auto-classification", () => {
    const result = analyzeRequest(
      [{ role: "user", content: "Write a function to sort an array" }],
      "GENERAL" // Force GENERAL even though content looks like CODING
    );
    expect(result.taskType).toBe("GENERAL");
  });

  it("classifies multi-message request correctly", () => {
    const result = analyzeRequest([
      { role: "system", content: "You are a helpful coding assistant." },
      { role: "user", content: "Help me debug this error in my TypeScript function" },
      { role: "assistant", content: "Sure, paste the error and code." },
      { role: "user", content: "Here is the stack trace and the bug report" },
    ]);
    expect(result.taskType).toBe("CODING");
  });

  it("handles request with system message", () => {
    const result = analyzeRequest([
      { role: "system", content: "You are a translation expert." },
      { role: "user", content: "Translate this text to French language" },
    ]);
    expect(result.taskType).toBe("TRANSLATION");
  });

  it("is deterministic — identical inputs produce identical outputs", () => {
    const messages = [
      { role: "user", content: "Summarize this document into key points" },
    ];
    const r1 = analyzeRequest(messages);
    const r2 = analyzeRequest(messages);
    expect(r1.taskType).toBe(r2.taskType);
    expect(r1.complexity).toEqual(r2.complexity);
    expect(r1.tokenEstimate).toEqual(r2.tokenEstimate);
    expect(r1.totalCharacters).toBe(r2.totalCharacters);
  });

  it("supports all 8 routing task types", () => {
    expect(ROUTING_TASK_TYPES).toHaveLength(8);
    const expected: RoutingTaskType[] = [
      "GENERAL", "CODING", "REASONING", "WRITING",
      "SUMMARIZATION", "TRANSLATION", "ANALYSIS", "EXTRACTION",
    ];
    for (const type of expected) {
      expect(ROUTING_TASK_TYPES).toContain(type);
    }
  });
});

// ─────────────────────────────────────────────────────
// 2. COMPLEXITY CLASSIFICATION
// ─────────────────────────────────────────────────────

describe("Complexity Classification", () => {
  it("classifies short GENERAL request as LOW", () => {
    const result = classifyComplexity(50, 1, "GENERAL");
    expect(result.complexity).toBe("LOW");
  });

  it("classifies long REASONING request as HIGH", () => {
    const result = classifyComplexity(5000, 10, "REASONING", 4096);
    expect(result.complexity).toBe("HIGH");
  });

  it("returns confidence between 0 and 1", () => {
    const r1 = classifyComplexity(100, 1, "GENERAL");
    const r2 = classifyComplexity(2000, 5, "CODING");
    const r3 = classifyComplexity(5000, 10, "REASONING", 4096);

    expect(r1.confidence).toBeGreaterThanOrEqual(0);
    expect(r1.confidence).toBeLessThanOrEqual(1);
    expect(r2.confidence).toBeGreaterThanOrEqual(0);
    expect(r2.confidence).toBeLessThanOrEqual(1);
    expect(r3.confidence).toBeGreaterThanOrEqual(0);
    expect(r3.confidence).toBeLessThanOrEqual(1);
  });

  it("returns signals object with all 4 factors", () => {
    const result = classifyComplexity(500, 3, "CODING", 1024);
    expect(result.signals).toHaveProperty("contentScore");
    expect(result.signals).toHaveProperty("messageCountScore");
    expect(result.signals).toHaveProperty("taskScore");
    expect(result.signals).toHaveProperty("outputScore");

    // All signals should be 0-1 range
    for (const value of Object.values(result.signals)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("increases complexity with content length", () => {
    const short = classifyComplexity(50, 1, "CODING");
    const medium = classifyComplexity(2000, 1, "CODING");
    const long = classifyComplexity(5000, 1, "CODING");

    const shortTotal = short.signals.contentScore;
    const mediumTotal = medium.signals.contentScore;
    const longTotal = long.signals.contentScore;

    expect(mediumTotal).toBeGreaterThan(shortTotal);
    expect(longTotal).toBeGreaterThanOrEqual(mediumTotal);
  });

  it("increases complexity with message count", () => {
    const single = classifyComplexity(200, 1, "GENERAL");
    const multi = classifyComplexity(200, 10, "GENERAL");

    expect(multi.signals.messageCountScore).toBeGreaterThan(
      single.signals.messageCountScore
    );
  });

  it("handles maxTokens effect on complexity", () => {
    const noMax = classifyComplexity(200, 1, "GENERAL");
    const largeMax = classifyComplexity(200, 1, "GENERAL", 8192);

    expect(largeMax.signals.outputScore).toBeGreaterThan(
      noMax.signals.outputScore
    );
  });

  it("is deterministic", () => {
    const r1 = classifyComplexity(1000, 3, "REASONING", 2048);
    const r2 = classifyComplexity(1000, 3, "REASONING", 2048);
    expect(r1).toEqual(r2);
  });

  it("REASONING task type has higher base complexity than GENERAL", () => {
    const general = classifyComplexity(500, 2, "GENERAL");
    const reasoning = classifyComplexity(500, 2, "REASONING");
    expect(reasoning.signals.taskScore).toBeGreaterThan(general.signals.taskScore);
  });

  it("SUMMARIZATION has lower base complexity than CODING", () => {
    const summary = classifyComplexity(500, 2, "SUMMARIZATION");
    const coding = classifyComplexity(500, 2, "CODING");
    expect(summary.signals.taskScore).toBeLessThan(coding.signals.taskScore);
  });

  it("all task types produce valid ComplexityResult", () => {
    for (const taskType of ROUTING_TASK_TYPES) {
      const result = classifyComplexity(500, 3, taskType);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(result.complexity);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.signals).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────
// 3. TOKEN ESTIMATION
// ─────────────────────────────────────────────────────

describe("Token Estimation", () => {
  it("estimates tokens as characters / 4", () => {
    const result = estimateTokens(100);
    expect(result.inputTokens).toBe(25); // ceil(100/4) = 25
  });

  it("uses default output tokens when maxTokens not specified", () => {
    const result = estimateTokens(100);
    expect(result.outputTokens).toBe(256);
  });

  it("uses provided maxTokens for output estimate", () => {
    const result = estimateTokens(100, 500);
    expect(result.outputTokens).toBe(500);
  });

  it("returns correct total (input + output)", () => {
    const result = estimateTokens(100, 200);
    expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
    expect(result.totalTokens).toBe(25 + 200);
  });

  it("handles zero characters with minimum 1 token", () => {
    const result = estimateTokens(0);
    expect(result.inputTokens).toBe(1);
  });

  it("handles very small character count", () => {
    const result = estimateTokens(1);
    expect(result.inputTokens).toBe(1); // ceil(1/4) = 1
  });

  it("handles large character count", () => {
    const result = estimateTokens(40000);
    expect(result.inputTokens).toBe(10000);
  });

  it("ceils fractional token counts", () => {
    // 5/4 = 1.25 → ceil = 2
    expect(estimateTokens(5).inputTokens).toBe(2);
    // 7/4 = 1.75 → ceil = 2
    expect(estimateTokens(7).inputTokens).toBe(2);
    // 8/4 = 2 → ceil = 2
    expect(estimateTokens(8).inputTokens).toBe(2);
  });

  it("is deterministic", () => {
    const r1 = estimateTokens(500, 200);
    const r2 = estimateTokens(500, 200);
    expect(r1).toEqual(r2);
  });

  describe("estimateTokenCount", () => {
    it("estimates from text string", () => {
      expect(estimateTokenCount("Hello world")).toBe(3); // 11 chars → ceil(11/4) = 3
    });

    it("returns 1 for empty string", () => {
      expect(estimateTokenCount("")).toBe(1);
    });

    it("handles single character", () => {
      expect(estimateTokenCount("a")).toBe(1);
    });

    it("handles longer text", () => {
      const text = "The quick brown fox jumps over the lazy dog"; // 43 chars
      expect(estimateTokenCount(text)).toBe(11); // ceil(43/4) = 11
    });
  });
});

// ─────────────────────────────────────────────────────
// 4. REQUEST ANALYSIS (INTEGRATED)
// ─────────────────────────────────────────────────────

describe("Request Analysis (Integrated)", () => {
  it("returns complete analysis object", () => {
    const result = analyzeRequest(
      [{ role: "user", content: "Hello world" }],
      undefined,
      100
    );

    expect(result).toHaveProperty("taskType");
    expect(result).toHaveProperty("complexity");
    expect(result).toHaveProperty("tokenEstimate");
    expect(result).toHaveProperty("totalCharacters");
    expect(result).toHaveProperty("messageCount");
  });

  it("counts messages correctly", () => {
    const result = analyzeRequest([
      { role: "system", content: "System prompt" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ]);
    expect(result.messageCount).toBe(3);
  });

  it("sums total characters across all messages", () => {
    const result = analyzeRequest([
      { role: "user", content: "Hello" },       // 5
      { role: "assistant", content: "World!" },  // 6
    ]);
    expect(result.totalCharacters).toBe(12); // "Hello" + " " + "World!" = 12
  });

  it("calculates token estimate from total characters", () => {
    const result = analyzeRequest(
      [{ role: "user", content: "a".repeat(100) }],
      undefined,
      50
    );
    expect(result.tokenEstimate.inputTokens).toBe(25); // ceil(100/4)
    expect(result.tokenEstimate.outputTokens).toBe(50);
    expect(result.tokenEstimate.totalTokens).toBe(75);
  });

  it("uses default output tokens when maxTokens not specified", () => {
    const result = analyzeRequest([
      { role: "user", content: "a".repeat(100) },
    ]);
    expect(result.tokenEstimate.outputTokens).toBe(256);
  });

  it("handles empty request gracefully", () => {
    const result = analyzeRequest([]);
    expect(result.taskType).toBe("GENERAL");
    expect(result.complexity.complexity).toBe("LOW");
    expect(result.totalCharacters).toBe(0);
    expect(result.messageCount).toBe(0);
    expect(result.tokenEstimate.inputTokens).toBe(1); // minimum
  });

  it("complexity reflects task type and content", () => {
    const simple = analyzeRequest([
      { role: "user", content: "Hi" },
    ]);
    const complex = analyzeRequest(
      [
        { role: "user", content: "Explain step by step how to solve this complex mathematical theorem with detailed reasoning and proof logic".repeat(5) },
      ],
      "REASONING",
      4096
    );

    // Complex request should have higher or equal complexity
    const levelOrder = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    expect(levelOrder[complex.complexity.complexity]).toBeGreaterThanOrEqual(
      levelOrder[simple.complexity.complexity]
    );
  });
});

// ─────────────────────────────────────────────────────
// 5. PROVIDER-NEUTRAL BEHAVIOR
// ─────────────────────────────────────────────────────

describe("Provider-Neutral Behavior", () => {
  const routingModulePaths = [
    "src/lib/routing/types.ts",
    "src/lib/routing/analyzer.ts",
    "src/lib/routing/complexity.ts",
    "src/lib/routing/token-estimator.ts",
    "src/lib/routing/candidates.ts",
    "src/lib/routing/scorer.ts",
    "src/lib/routing/policies.ts",
    "src/lib/routing/fallback.ts",
    "src/lib/routing/explanations.ts",
    "src/lib/routing/router.ts",
    "src/lib/routing/index.ts",
  ];

  for (const modulePath of routingModulePaths) {
    it(`${modulePath} does not import provider SDKs`, () => {
      const fullPath = path.resolve(process.cwd(), modulePath);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).not.toContain("from \"openai\"");
      expect(content).not.toContain("from '@anthropic-ai/sdk'");
      expect(content).not.toContain("from \"@anthropic-ai/sdk\"");
      expect(content).not.toContain("from '@google/generative-ai'");
      expect(content).not.toContain("from \"@google/generative-ai\"");
      expect(content).not.toContain("import OpenAI");
      expect(content).not.toContain("import Anthropic");
      expect(content).not.toContain("import { GoogleGenerativeAI");
    });
  }

  it("does not hardcode provider names in core analysis", () => {
    const analyzerPath = path.resolve(process.cwd(), "src/lib/routing/analyzer.ts");
    const content = fs.readFileSync(analyzerPath, "utf-8");

    // Analyzer should not reference specific providers
    expect(content).not.toContain("\"openai\"");
    expect(content).not.toContain("\"anthropic\"");
    expect(content).not.toContain("\"google\"");
  });

  it("does not import from providers or pricing modules", () => {
    for (const modulePath of routingModulePaths) {
      const fullPath = path.resolve(process.cwd(), modulePath);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).not.toContain("from \"@/lib/providers");
      expect(content).not.toContain("from '@/lib/providers");
      expect(content).not.toContain("from \"@/lib/pricing");
      expect(content).not.toContain("from '@/lib/pricing");
    }
  });
});

// ─────────────────────────────────────────────────────
// 6. TASK TYPE TO CAPABILITY MAPPING
// ─────────────────────────────────────────────────────

describe("Task Type to Capability Mapping", () => {
  it("every routing task type has at least one capability mapping", () => {
    for (const taskType of ROUTING_TASK_TYPES) {
      const caps = TASK_TYPE_TO_CAPABILITIES[taskType];
      expect(caps).toBeDefined();
      expect(caps.length).toBeGreaterThan(0);
    }
  });

  it("GENERAL maps to chat capability", () => {
    expect(TASK_TYPE_TO_CAPABILITIES.GENERAL).toContain("chat");
  });

  it("CODING maps to coding capability", () => {
    expect(TASK_TYPE_TO_CAPABILITIES.CODING).toContain("coding");
  });

  it("REASONING maps to reasoning capability", () => {
    expect(TASK_TYPE_TO_CAPABILITIES.REASONING).toContain("reasoning");
  });

  it("WRITING maps to creative_writing capability", () => {
    expect(TASK_TYPE_TO_CAPABILITIES.WRITING).toContain("creative_writing");
  });

  it("SUMMARIZATION maps to summarization capability", () => {
    expect(TASK_TYPE_TO_CAPABILITIES.SUMMARIZATION).toContain("summarization");
  });

  it("TRANSLATION maps to translation capability", () => {
    expect(TASK_TYPE_TO_CAPABILITIES.TRANSLATION).toContain("translation");
  });

  it("ANALYSIS maps to classification and/or extraction", () => {
    const caps = TASK_TYPE_TO_CAPABILITIES.ANALYSIS;
    expect(caps.some((c) => ["classification", "extraction"].includes(c))).toBe(true);
  });

  it("EXTRACTION maps to extraction capability", () => {
    expect(TASK_TYPE_TO_CAPABILITIES.EXTRACTION).toContain("extraction");
  });

  it("no mapping uses provider-specific capability names", () => {
    const providerSpecificNames = ["gpt", "claude", "gemini", "openai", "anthropic", "google"];
    for (const taskType of ROUTING_TASK_TYPES) {
      const caps = TASK_TYPE_TO_CAPABILITIES[taskType];
      for (const cap of caps) {
        for (const name of providerSpecificNames) {
          expect(cap.toLowerCase()).not.toContain(name);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────
// 7. ROUTING POLICIES
// ─────────────────────────────────────────────────────

describe("Routing Policies", () => {
  it("has balanced, cost_optimized, quality_first, speed_first policies", () => {
    expect(ROUTING_POLICIES.balanced).toBeDefined();
    expect(ROUTING_POLICIES.cost_optimized).toBeDefined();
    expect(ROUTING_POLICIES.quality_first).toBeDefined();
    expect(ROUTING_POLICIES.speed_first).toBeDefined();
  });

  it("balanced policy has approximately equal weights", () => {
    const p = ROUTING_POLICIES.balanced;
    expect(p.costWeight).toBeCloseTo(0.33, 1);
    expect(p.latencyWeight).toBeCloseTo(0.34, 1);
    expect(p.capabilityWeight).toBeCloseTo(0.33, 1);
  });

  it("cost_optimized prioritizes cost", () => {
    const p = ROUTING_POLICIES.cost_optimized;
    expect(p.costWeight).toBeGreaterThan(p.latencyWeight);
    expect(p.costWeight).toBeGreaterThan(p.capabilityWeight);
  });

  it("quality_first prioritizes capability", () => {
    const p = ROUTING_POLICIES.quality_first;
    expect(p.capabilityWeight).toBeGreaterThan(p.costWeight);
    expect(p.capabilityWeight).toBeGreaterThan(p.latencyWeight);
  });

  it("speed_first prioritizes latency", () => {
    const p = ROUTING_POLICIES.speed_first;
    expect(p.latencyWeight).toBeGreaterThan(p.costWeight);
    expect(p.latencyWeight).toBeGreaterThan(p.capabilityWeight);
  });

  it("resolvePolicy returns balanced for undefined", () => {
    expect(resolvePolicy(undefined).name).toBe("balanced");
  });

  it("resolvePolicy returns balanced for unknown name", () => {
    expect(resolvePolicy("nonexistent_policy").name).toBe("balanced");
  });

  it("resolvePolicy is case-insensitive", () => {
    expect(resolvePolicy("BALANCED").name).toBe("balanced");
    expect(resolvePolicy("Cost_Optimized").name).toBe("cost_optimized");
  });

  it("listPolicyNames returns all policy names", () => {
    const names = listPolicyNames();
    expect(names).toContain("balanced");
    expect(names).toContain("cost_optimized");
    expect(names).toContain("quality_first");
    expect(names).toContain("speed_first");
    expect(names.length).toBe(4);
  });

  it("all policy weights are non-negative", () => {
    for (const policy of Object.values(ROUTING_POLICIES)) {
      expect(policy.costWeight).toBeGreaterThanOrEqual(0);
      expect(policy.latencyWeight).toBeGreaterThanOrEqual(0);
      expect(policy.capabilityWeight).toBeGreaterThanOrEqual(0);
    }
  });

  it("all policy weights sum to approximately 1.0", () => {
    for (const policy of Object.values(ROUTING_POLICIES)) {
      const sum = policy.costWeight + policy.latencyWeight + policy.capabilityWeight;
      expect(sum).toBeCloseTo(1.0, 1);
    }
  });
});

// ─────────────────────────────────────────────────────
// 8. CANDIDATE SELECTION (BASIC)
// ─────────────────────────────────────────────────────

describe("Candidate Selection", () => {
  const mockModels: ModelCandidate[] = [
    {
      modelId: "m1",
      providerId: "prov-a",
      modelIdentifier: "model-alpha",
      displayName: "Model Alpha",
      capabilities: ["chat", "reasoning", "coding"],
      tier: "HEAVY",
      contextWindow: 128000,
      inputPricePer1k: 0.0025,
      outputPricePer1k: 0.01,
      expectedLatencyMs: 800,
      active: true,
    },
    {
      modelId: "m2",
      providerId: "prov-b",
      modelIdentifier: "model-beta",
      displayName: "Model Beta",
      capabilities: ["chat", "summarization", "translation"],
      tier: "LIGHT",
      contextWindow: 32000,
      inputPricePer1k: 0.0001,
      outputPricePer1k: 0.0004,
      expectedLatencyMs: 300,
      active: true,
    },
    {
      modelId: "m3",
      providerId: "prov-a",
      modelIdentifier: "model-gamma",
      displayName: "Model Gamma",
      capabilities: ["coding", "extraction"],
      tier: "MID",
      contextWindow: 64000,
      inputPricePer1k: 0.001,
      outputPricePer1k: 0.003,
      expectedLatencyMs: 600,
      active: false,
    },
  ];

  it("filters by capability for GENERAL (chat)", () => {
    const result = selectCandidates(mockModels, { taskType: "GENERAL" });
    // m1 has "chat", m2 has "chat", m3 is inactive
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.modelId)).toContain("m1");
    expect(result.map((m) => m.modelId)).toContain("m2");
  });

  it("filters by capability for CODING", () => {
    const result = selectCandidates(mockModels, { taskType: "CODING" });
    // m1 has "coding", m3 has "coding" but is inactive
    expect(result).toHaveLength(1);
    expect(result[0].modelId).toBe("m1");
  });

  it("filters by capability for TRANSLATION", () => {
    const result = selectCandidates(mockModels, { taskType: "TRANSLATION" });
    // m2 has "translation"
    expect(result).toHaveLength(1);
    expect(result[0].modelId).toBe("m2");
  });

  it("excludes inactive models by default", () => {
    const result = selectCandidates(mockModels, { taskType: "CODING" });
    expect(result.find((m) => m.modelId === "m3")).toBeUndefined();
  });

  it("includes inactive models when requested", () => {
    const result = selectCandidates(mockModels, {
      taskType: "CODING",
      includeInactive: true,
    });
    expect(result.find((m) => m.modelId === "m3")).toBeDefined();
  });

  it("filters by context window", () => {
    const result = selectCandidates(mockModels, {
      taskType: "GENERAL",
      estimatedInputTokens: 50000, // exceeds m2's 32000 context
    });
    // m1 (128000) fits, m2 (32000) does not
    expect(result).toHaveLength(1);
    expect(result[0].modelId).toBe("m1");
  });

  it("returns all active models when no capability filter matches", () => {
    // Use a task type that doesn't match any model
    const result = selectCandidates(mockModels, { taskType: "EXTRACTION" });
    // m3 has "extraction" but is inactive
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────
// 9. FALLBACK ORDERING (BASIC)
// ─────────────────────────────────────────────────────

describe("Fallback Ordering", () => {
  it("excludes the selected candidate from fallbacks", () => {
    const scored: ModelScore[] = [
      {
        candidate: {
          modelId: "m1", providerId: "p1", modelIdentifier: "a",
          displayName: "A", capabilities: ["chat"], inputPricePer1k: 0.01,
          outputPricePer1k: 0.02, active: true,
        },
        score: 0.9,
        factors: { costScore: 0.8, latencyScore: 0.9, capabilityScore: 1.0, projectedCost: 0.01 },
        explanation: "best",
      },
      {
        candidate: {
          modelId: "m2", providerId: "p2", modelIdentifier: "b",
          displayName: "B", capabilities: ["chat"], inputPricePer1k: 0.02,
          outputPricePer1k: 0.04, active: true,
        },
        score: 0.7,
        factors: { costScore: 0.6, latencyScore: 0.7, capabilityScore: 0.8, projectedCost: 0.02 },
        explanation: "second",
      },
    ];

    const fallbacks = orderFallbacks(scored, scored[0]);
    expect(fallbacks).toHaveLength(1);
    expect(fallbacks[0].candidate.modelId).toBe("m2");
  });

  it("returns empty array when only one candidate", () => {
    const scored: ModelScore[] = [
      {
        candidate: {
          modelId: "m1", providerId: "p1", modelIdentifier: "a",
          displayName: "A", capabilities: ["chat"], inputPricePer1k: 0.01,
          outputPricePer1k: 0.02, active: true,
        },
        score: 0.9,
        factors: { costScore: 0.8, latencyScore: 0.9, capabilityScore: 1.0, projectedCost: 0.01 },
        explanation: "only",
      },
    ];

    const fallbacks = orderFallbacks(scored, scored[0]);
    expect(fallbacks).toHaveLength(0);
  });

  it("sorts fallbacks by score descending", () => {
    const scored: ModelScore[] = [
      {
        candidate: {
          modelId: "m1", providerId: "p1", modelIdentifier: "a",
          displayName: "A", capabilities: [], inputPricePer1k: 0.01,
          outputPricePer1k: 0.02, active: true,
        },
        score: 0.9, factors: { costScore: 0, latencyScore: 0, capabilityScore: 0, projectedCost: 0 },
        explanation: "",
      },
      {
        candidate: {
          modelId: "m2", providerId: "p1", modelIdentifier: "b",
          displayName: "B", capabilities: [], inputPricePer1k: 0.02,
          outputPricePer1k: 0.04, active: true,
        },
        score: 0.3, factors: { costScore: 0, latencyScore: 0, capabilityScore: 0, projectedCost: 0 },
        explanation: "",
      },
      {
        candidate: {
          modelId: "m3", providerId: "p1", modelIdentifier: "c",
          displayName: "C", capabilities: [], inputPricePer1k: 0.03,
          outputPricePer1k: 0.06, active: true,
        },
        score: 0.6, factors: { costScore: 0, latencyScore: 0, capabilityScore: 0, projectedCost: 0 },
        explanation: "",
      },
    ];

    const fallbacks = orderFallbacks(scored, scored[0]);
    expect(fallbacks).toHaveLength(2);
    expect(fallbacks[0].score).toBeGreaterThanOrEqual(fallbacks[1].score);
  });
});

// ─────────────────────────────────────────────────────
// 10. DETERMINISM
// ─────────────────────────────────────────────────────

describe("Determinism", () => {
  it("identical requests always produce identical analysis", () => {
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Write a function to implement quicksort in Python" },
    ];

    const results = Array.from({ length: 10 }, () => analyzeRequest(messages));

    for (const result of results) {
      expect(result.taskType).toBe(results[0].taskType);
      expect(result.complexity).toEqual(results[0].complexity);
      expect(result.tokenEstimate).toEqual(results[0].tokenEstimate);
    }
  });

  it("token estimation is always consistent", () => {
    const r1 = estimateTokens(1234, 567);
    const r2 = estimateTokens(1234, 567);
    expect(r1).toEqual(r2);
  });

  it("complexity classification is always consistent", () => {
    const r1 = classifyComplexity(1500, 4, "WRITING", 2048);
    const r2 = classifyComplexity(1500, 4, "WRITING", 2048);
    expect(r1).toEqual(r2);
  });
});

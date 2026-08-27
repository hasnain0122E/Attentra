/**
 * Attentra — Pricing Module Tests
 *
 * Tests pricing normalization, change detection, provider isolation,
 * sync source behavior, and type contracts.
 *
 * Database operations are tested via mock objects since no live
 * database is available in the test environment.
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import type {
  NormalizedModelPricing,
  PricingSource,
  PricingSourceResult,
} from "@/lib/pricing/types";
import { detectPricingChange } from "@/lib/pricing/detector";
import { OpenAIPricingSource } from "@/lib/pricing/sources/openai";
import { AnthropicPricingSource } from "@/lib/pricing/sources/anthropic";
import { GooglePricingSource } from "@/lib/pricing/sources/google";
import { getRegisteredSourceNames } from "@/lib/pricing/sync-service";
import {
  parseMarkdownTables,
  extractDollarAmount,
  per1MtoPer1K,
  findRowByExactFirstCell,
  findRowByFirstCell,
} from "@/lib/pricing/sources/markdown-parser";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────
// MOCK FETCH FOR PRICING TESTS
// ─────────────────────────────────────────────────────
// File-level mock fetch prevents real HTTP calls during tests.
// Production pricing sources remain capable of fetching official pages.
// The "Safe Failure Handling" tests override fetch locally for error testing.

const realFetch = globalThis.fetch;

const MOCK_OPENAI_MD = `# OpenAI Pricing

| Model | Input | Cached input | Cache writes | Output |
| --- | --- | --- | --- | --- |
| gpt-4o | $2.50 | $1.25 | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.075 | $0.15 | $0.60 |
| gpt-4.1 | $2.00 | $0.50 | $1.00 | $8.00 |
| gpt-4.1-mini | $0.40 | $0.10 | $0.20 | $1.60 |
| o3-mini | $1.10 | $0.55 | - | $4.40 |
| o4-mini | $1.10 | $0.275 | - | $4.40 |

| Model | Input | Cached input | Cache writes | Output |
| --- | --- | --- | --- | --- |
| gpt-4o | $1.25 | $0.625 | $1.25 | $5.00 |
| gpt-4o-mini | $0.075 | $0.0375 | $0.075 | $0.30 |
| gpt-4.1 | $1.00 | $0.25 | $0.50 | $4.00 |
| gpt-4.1-mini | $0.20 | $0.05 | $0.10 | $0.80 |
| o3-mini | $0.55 | $0.275 | - | $2.20 |
| o4-mini | $0.55 | $0.1375 | - | $2.20 |
`;

const MOCK_ANTHROPIC_MD = `# Anthropic Pricing

| Model | Base Input Tokens | 5m Cache Writes | 1h Cache Writes | Cache Hits & Refreshes | Output Tokens |
| --- | --- | --- | --- | --- | --- |
| Claude Sonnet 5 | $3 | $3.75 | $5 | $0.30 | $15 |
| Claude Opus 5 | $15 | $18.75 | $22.50 | $1.50 | $75 |
| Claude Haiku 4.5 | $0.80 | $1.00 | $1.60 | $0.08 | $4 |
`;

const MOCK_GOOGLE_MD = `# Gemini Pricing

*gemini-2.5-pro*Try it in Google AI Studio

### Standard

| | Free Tier | Paid Tier |
| --- | --- | --- |
| Input price | $0 | $1.25 / 1M tokens |
| Output price | $0 | $10.00 / 1M tokens |
| Context caching | $0 | $0.3125 / 1M tokens |

### Batch

| | Free Tier | Paid Tier |
| --- | --- | --- |
| Input price | $0 | $0.625 / 1M tokens |
| Output price | $0 | $5.00 / 1M tokens |

*gemini-2.5-flash*Try it in Google AI Studio

### Standard

| | Free Tier | Paid Tier |
| --- | --- | --- |
| Input price | $0 | $0.30 / 1M tokens |
| Output price | $0 | $2.50 / 1M tokens |
| Context caching | $0 | $0.075 / 1M tokens |

### Batch

| | Free Tier | Paid Tier |
| --- | --- | --- |
| Input price | $0 | $0.15 / 1M tokens |
| Output price | $0 | $1.25 / 1M tokens |

*gemini-2.5-flash-lite*Try it in Google AI Studio

### Standard

| | Free Tier | Paid Tier |
| --- | --- | --- |
| Input price | $0 | $0.10 / 1M tokens |
| Output price | $0 | $0.40 / 1M tokens |
| Context caching | $0 | $0.025 / 1M tokens |

### Batch

| | Free Tier | Paid Tier |
| --- | --- | --- |
| Input price | $0 | $0.05 / 1M tokens |
| Output price | $0 | $0.20 / 1M tokens |
`;

function mockPricingFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
  let content: string | undefined;
  if (urlStr.includes("openai")) content = MOCK_OPENAI_MD;
  else if (urlStr.includes("claude") || urlStr.includes("anthropic")) content = MOCK_ANTHROPIC_MD;
  else if (urlStr.includes("google") || urlStr.includes("gemini")) content = MOCK_GOOGLE_MD;

  if (content) {
    return Promise.resolve(new Response(content, { status: 200 }));
  }
  return realFetch(url, init);
}

beforeAll(() => {
  globalThis.fetch = mockPricingFetch as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

// ─────────────────────────────────────────────────────
// 1. PRICING SOURCE NORMALIZATION TESTS
// ─────────────────────────────────────────────────────

describe("Pricing Source Normalization", () => {
  const sources: Array<{ name: string; create: () => PricingSource }> = [
    { name: "OpenAI", create: () => new OpenAIPricingSource() },
    { name: "Anthropic", create: () => new AnthropicPricingSource() },
    { name: "Google", create: () => new GooglePricingSource() },
  ];

  for (const { name, create } of sources) {
    describe(`${name} pricing source`, () => {
      let source: PricingSource;

      beforeEach(() => {
        source = create();
      });

      it("has a non-empty providerName", () => {
        expect(source.providerName).toBeTruthy();
        expect(typeof source.providerName).toBe("string");
      });

      it("has a valid sourceUrl", () => {
        expect(source.sourceUrl).toBeTruthy();
        expect(source.sourceUrl).toMatch(/^https:\/\//);
      });

      it("implements PricingSource interface", () => {
        expect(typeof source.fetchPricing).toBe("function");
      });

      it("fetchPricing returns PricingSourceResult", async () => {
        const result = await source.fetchPricing();

        expect(result).toBeDefined();
        expect(typeof result.providerName).toBe("string");
        expect(typeof result.sourceUrl).toBe("string");
        expect(result.fetchedAt).toBeInstanceOf(Date);
        expect(Array.isArray(result.models)).toBe(true);
        expect(typeof result.success).toBe("boolean");
      });

      it("returns at least one model", async () => {
        const result = await source.fetchPricing();
        expect(result.models.length).toBeGreaterThan(0);
      });

      it("model pricing conforms to NormalizedModelPricing", async () => {
        const result = await source.fetchPricing();

        for (const model of result.models) {
          expect(model.modelIdentifier).toBeTruthy();
          expect(model.displayName).toBeTruthy();
          expect(Array.isArray(model.capabilities)).toBe(true);
          expect(model.capabilities.length).toBeGreaterThan(0);
          expect(typeof model.inputPricePer1k).toBe("number");
          expect(typeof model.outputPricePer1k).toBe("number");
          expect(model.inputPricePer1k).toBeGreaterThanOrEqual(0);
          expect(model.outputPricePer1k).toBeGreaterThanOrEqual(0);
          expect(typeof model.active).toBe("boolean");
        }
      });

      it("never throws — returns success: true or error message", async () => {
        const result = await source.fetchPricing();
        // All sources should succeed (with fallback) — never throw
        expect(result.success).toBe(true);
      });
    });
  }
});

// ─────────────────────────────────────────────────────
// 2. PRICING CHANGE DETECTION TESTS
// ─────────────────────────────────────────────────────

describe("Pricing Change Detection", () => {
  it("detects new model (no existing DB record)", () => {
    const result = detectPricingChange(null, {
      modelIdentifier: "gpt-4o",
      displayName: "GPT-4o",
      capabilities: ["chat"],
      inputPricePer1k: 0.0025,
      outputPricePer1k: 0.01,
      active: true,
    });

    expect(result.isNewModel).toBe(true);
    expect(result.hasChanged).toBe(true);
    expect(result.modelIdentifier).toBe("gpt-4o");
    expect(result.newInputPrice).toBe(0.0025);
    expect(result.newOutputPrice).toBe(0.01);
  });

  it("detects unchanged pricing (same input + output)", () => {
    const dbModel = {
      modelIdentifier: "gpt-4o",
      inputPricePer1k: new Decimal(0.0025),
      outputPricePer1k: new Decimal(0.01),
    };

    const result = detectPricingChange(dbModel, {
      modelIdentifier: "gpt-4o",
      displayName: "GPT-4o",
      capabilities: ["chat"],
      inputPricePer1k: 0.0025,
      outputPricePer1k: 0.01,
      active: true,
    });

    expect(result.isNewModel).toBe(false);
    expect(result.hasChanged).toBe(false);
    expect(result.previousInputPrice).toBe(0.0025);
    expect(result.previousOutputPrice).toBe(0.01);
  });

  it("detects input price change", () => {
    const dbModel = {
      modelIdentifier: "gpt-4o",
      inputPricePer1k: new Decimal(0.0025),
      outputPricePer1k: new Decimal(0.01),
    };

    const result = detectPricingChange(dbModel, {
      modelIdentifier: "gpt-4o",
      displayName: "GPT-4o",
      capabilities: ["chat"],
      inputPricePer1k: 0.003,
      outputPricePer1k: 0.01,
      active: true,
    });

    expect(result.hasChanged).toBe(true);
    expect(result.previousInputPrice).toBe(0.0025);
    expect(result.newInputPrice).toBe(0.003);
  });

  it("detects output price change", () => {
    const dbModel = {
      modelIdentifier: "gpt-4o",
      inputPricePer1k: new Decimal(0.0025),
      outputPricePer1k: new Decimal(0.01),
    };

    const result = detectPricingChange(dbModel, {
      modelIdentifier: "gpt-4o",
      displayName: "GPT-4o",
      capabilities: ["chat"],
      inputPricePer1k: 0.0025,
      outputPricePer1k: 0.012,
      active: true,
    });

    expect(result.hasChanged).toBe(true);
    expect(result.previousOutputPrice).toBe(0.01);
    expect(result.newOutputPrice).toBe(0.012);
  });

  it("detects both input and output price changes", () => {
    const dbModel = {
      modelIdentifier: "claude-sonnet-4-20250514",
      inputPricePer1k: new Decimal(0.003),
      outputPricePer1k: new Decimal(0.015),
    };

    const result = detectPricingChange(dbModel, {
      modelIdentifier: "claude-sonnet-4-20250514",
      displayName: "Claude Sonnet 4",
      capabilities: ["chat"],
      inputPricePer1k: 0.004,
      outputPricePer1k: 0.02,
      active: true,
    });

    expect(result.hasChanged).toBe(true);
    expect(result.previousInputPrice).toBe(0.003);
    expect(result.newInputPrice).toBe(0.004);
    expect(result.previousOutputPrice).toBe(0.015);
    expect(result.newOutputPrice).toBe(0.02);
  });

  it("handles high-precision decimal comparison correctly", () => {
    const dbModel = {
      modelIdentifier: "gemini-2.5-flash",
      inputPricePer1k: new Decimal("0.00007500"),
      outputPricePer1k: new Decimal("0.00030000"),
    };

    // Same values, different representation
    const result = detectPricingChange(dbModel, {
      modelIdentifier: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      capabilities: ["chat"],
      inputPricePer1k: 0.000075,
      outputPricePer1k: 0.0003,
      active: true,
    });

    expect(result.hasChanged).toBe(false);
  });

  it("detects micro-price changes at 8 decimal places", () => {
    const dbModel = {
      modelIdentifier: "gpt-4o-mini",
      inputPricePer1k: new Decimal("0.00015000"),
      outputPricePer1k: new Decimal("0.00060000"),
    };

    const result = detectPricingChange(dbModel, {
      modelIdentifier: "gpt-4o-mini",
      displayName: "GPT-4o Mini",
      capabilities: ["chat"],
      inputPricePer1k: 0.00015001,
      outputPricePer1k: 0.0006,
      active: true,
    });

    expect(result.hasChanged).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 3. PROVIDER ISOLATION TESTS
// ─────────────────────────────────────────────────────

describe("Provider Pricing Source Isolation", () => {
  it("OpenAI source does not import Anthropic or Google SDKs", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/openai.ts"),
      "utf-8"
    );
    expect(source).not.toContain("@anthropic-ai");
    expect(source).not.toContain("@google/generative-ai");
  });

  it("Anthropic source does not import OpenAI or Google SDKs", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/anthropic.ts"),
      "utf-8"
    );
    expect(source).not.toContain('from "openai"');
    expect(source).not.toContain("@google/generative-ai");
  });

  it("Google source does not import OpenAI or Anthropic SDKs", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/google.ts"),
      "utf-8"
    );
    expect(source).not.toContain('from "openai"');
    expect(source).not.toContain("@anthropic-ai");
  });
});

// ─────────────────────────────────────────────────────
// 4. SYNC SERVICE REGISTRY TESTS
// ─────────────────────────────────────────────────────

describe("Sync Service Registry", () => {
  it("has all three providers registered", () => {
    const names = getRegisteredSourceNames();
    expect(names).toContain("openai");
    expect(names).toContain("anthropic");
    expect(names).toContain("google");
    expect(names).toHaveLength(3);
  });

  it("syncProviderPricing returns FAILED for unknown provider", async () => {
    const { syncProviderPricing } = await import("@/lib/pricing/sync-service");
    // Mock prisma (won't actually be called since the source won't be found)
    const mockPrisma = {} as any;

    const result = await syncProviderPricing(mockPrisma, "nonexistent-provider");
    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("No pricing source registered");
    expect(result.modelsSynced).toBe(0);
    expect(result.pricesUpdated).toBe(0);
  });
});

// ─────────────────────────────────────────────────────
// 5. NORMALIZED PRICING STRUCTURE TESTS
// ─────────────────────────────────────────────────────

describe("Normalized Pricing Structure", () => {
  it("supports cached input pricing dimension", () => {
    const pricing: NormalizedModelPricing = {
      modelIdentifier: "gpt-4o",
      displayName: "GPT-4o",
      capabilities: ["chat"],
      inputPricePer1k: 0.0025,
      outputPricePer1k: 0.01,
      cachedInputPricePer1k: 0.00125,
      active: true,
    };

    expect(pricing.cachedInputPricePer1k).toBe(0.00125);
  });

  it("supports batch pricing dimensions", () => {
    const pricing: NormalizedModelPricing = {
      modelIdentifier: "gpt-4o",
      displayName: "GPT-4o",
      capabilities: ["chat"],
      inputPricePer1k: 0.0025,
      outputPricePer1k: 0.01,
      batchInputPricePer1k: 0.00125,
      batchOutputPricePer1k: 0.005,
      active: true,
    };

    expect(pricing.batchInputPricePer1k).toBe(0.00125);
    expect(pricing.batchOutputPricePer1k).toBe(0.005);
  });

  it("supports provider-specific pricing dimensions", () => {
    const pricing: NormalizedModelPricing = {
      modelIdentifier: "claude-sonnet-4-20250514",
      displayName: "Claude Sonnet 4",
      capabilities: ["chat"],
      inputPricePer1k: 0.003,
      outputPricePer1k: 0.015,
      pricingDimensions: {
        promptCachingWrite: 0.00375,
        promptCachingRead: 0.0003,
      },
      active: true,
    };

    expect(pricing.pricingDimensions).toBeDefined();
    expect(pricing.pricingDimensions?.promptCachingWrite).toBe(0.00375);
  });

  it("supports model tier classification", () => {
    const tiers: Array<NormalizedModelPricing["tier"]> = ["LIGHT", "MID", "HEAVY"];
    for (const tier of tiers) {
      const pricing: NormalizedModelPricing = {
        modelIdentifier: "test",
        displayName: "Test",
        capabilities: ["chat"],
        inputPricePer1k: 0.001,
        outputPricePer1k: 0.002,
        tier,
        active: true,
      };
      expect(pricing.tier).toBe(tier);
    }
  });

  it("supports free-tier pricing (zero cost)", () => {
    const pricing: NormalizedModelPricing = {
      modelIdentifier: "gemini-2.0-flash-exp",
      displayName: "Gemini 2.0 Flash Experimental",
      capabilities: ["chat"],
      inputPricePer1k: 0,
      outputPricePer1k: 0,
      pricingDimensions: { freeTierAvailable: true },
      active: true,
    };

    expect(pricing.inputPricePer1k).toBe(0);
    expect(pricing.outputPricePer1k).toBe(0);
    expect(pricing.pricingDimensions?.freeTierAvailable).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 6. PRICING SOURCE RESULT CONTRACT TESTS
// ─────────────────────────────────────────────────────

describe("PricingSourceResult Contract", () => {
  it("successful result has required fields", async () => {
    const source = new OpenAIPricingSource();
    const result = await source.fetchPricing();

    expect(result.providerName).toBe("openai");
    expect(result.sourceUrl).toContain("openai");
    expect(result.fetchedAt).toBeInstanceOf(Date);
    expect(result.success).toBe(true);
    expect(result.models.length).toBeGreaterThan(0);
  });

  it("each provider returns unique model identifiers", async () => {
    const sources = [
      new OpenAIPricingSource(),
      new AnthropicPricingSource(),
      new GooglePricingSource(),
    ];

    const allIds = new Set<string>();
    for (const source of sources) {
      const result = await source.fetchPricing();
      for (const model of result.models) {
        const key = `${source.providerName}:${model.modelIdentifier}`;
        expect(allIds.has(key)).toBe(false);
        allIds.add(key);
      }
    }
  });
});

// ─────────────────────────────────────────────────────
// 7. BARREL EXPORT TESTS
// ─────────────────────────────────────────────────────

describe("Pricing Module Barrel Exports", () => {
  it("exports all expected symbols from @/lib/pricing", async () => {
    const pricing = await import("@/lib/pricing");

    // Types are exported as type-only, so we check runtime values
    expect(pricing.syncAllPricing).toBeDefined();
    expect(pricing.syncProviderPricing).toBeDefined();
    expect(pricing.getRegisteredSourceNames).toBeDefined();
    expect(pricing.detectPricingChange).toBeDefined();
    expect(pricing.applyPricingChange).toBeDefined();
    expect(pricing.createModelWithSnapshot).toBeDefined();
    expect(pricing.registerModelManually).toBeDefined();
    expect(pricing.registerProviderManually).toBeDefined();
    expect(pricing.OpenAIPricingSource).toBeDefined();
    expect(pricing.AnthropicPricingSource).toBeDefined();
    expect(pricing.GooglePricingSource).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────
// 8. MANUAL REGISTRATION TYPE TESTS
// ─────────────────────────────────────────────────────

describe("Manual Registration Types", () => {
  it("ManualModelInput accepts required fields", async () => {
    const mod = await import("@/lib/pricing/manual");
    expect(typeof mod.registerModelManually).toBe("function");
  });

  it("registerProviderManually is a function", async () => {
    const mod = await import("@/lib/pricing/manual");
    expect(typeof mod.registerProviderManually).toBe("function");
  });
});

// ─────────────────────────────────────────────────────
// 9. FAILURE HANDLING TESTS
// ─────────────────────────────────────────────────────

describe("Safe Failure Handling", () => {
  it("pricing source returns fallback on network failure", async () => {
    // Mock fetch to simulate failure
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const source = new OpenAIPricingSource();
    const result = await source.fetchPricing();

    // Should succeed with fallback data
    expect(result.success).toBe(true);
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.error).toBeDefined();

    globalThis.fetch = originalFetch;
  });

  it("all sources have safe fallback on fetch failure", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const sources = [
      new OpenAIPricingSource(),
      new AnthropicPricingSource(),
      new GooglePricingSource(),
    ];

    for (const source of sources) {
      const result = await source.fetchPricing();
      expect(result.success).toBe(true);
      expect(result.models.length).toBeGreaterThan(0);
    }

    globalThis.fetch = originalFetch;
  });

  it("sync service handles unknown provider gracefully", async () => {
    const { syncProviderPricing } = await import("@/lib/pricing/sync-service");
    const mockPrisma = {} as any;

    const result = await syncProviderPricing(mockPrisma, "deepseek");
    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("No pricing source registered");
  });
});

// ─────────────────────────────────────────────────────
// 10. MARKDOWN PARSER TESTS
// ─────────────────────────────────────────────────────

describe("Markdown Table Parser", () => {
  const sampleTable = `# Pricing

| Model | Input | Output |
| --- | --- | --- |
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |

Some text between tables.

| Model | Batch Input | Batch Output |
| --- | --- | --- |
| gpt-4o | $1.25 | $5.00 |
`;

  it("parses markdown tables from content", () => {
    const tables = parseMarkdownTables(sampleTable);
    expect(tables.length).toBe(2);
  });

  it("extracts correct headers", () => {
    const tables = parseMarkdownTables(sampleTable);
    expect(tables[0].headers).toEqual(["Model", "Input", "Output"]);
    expect(tables[1].headers).toEqual(["Model", "Batch Input", "Batch Output"]);
  });

  it("extracts correct row data", () => {
    const tables = parseMarkdownTables(sampleTable);
    expect(tables[0].rows.length).toBe(2);
    expect(tables[0].rows[0]).toEqual(["gpt-4o", "$2.50", "$10.00"]);
    expect(tables[0].rows[1]).toEqual(["gpt-4o-mini", "$0.15", "$0.60"]);
  });

  it("extracts dollar amounts from cells", () => {
    expect(extractDollarAmount("$2.50")).toBe(2.5);
    expect(extractDollarAmount("$0.15")).toBe(0.15);
    expect(extractDollarAmount("$10 / MTok")).toBe(10);
    expect(extractDollarAmount("$0.00055")).toBe(0.00055);
    expect(extractDollarAmount("-")).toBeNull();
    expect(extractDollarAmount("Not available")).toBeNull();
    expect(extractDollarAmount("")).toBeNull();
  });

  it("extracts first dollar amount from multi-price cells", () => {
    expect(extractDollarAmount("$1.25, prompts <= 200k tokens$2.50, prompts > 200k")).toBe(1.25);
    expect(extractDollarAmount("$0.30 (text / image / video)$1.00 (audio)")).toBe(0.3);
  });

  it("converts per-1M to per-1K correctly", () => {
    expect(per1MtoPer1K(2.5)).toBe(0.0025);
    expect(per1MtoPer1K(10)).toBe(0.01);
    expect(per1MtoPer1K(0.15)).toBe(0.00015);
    expect(per1MtoPer1K(0.075)).toBe(0.000075);
  });

  it("finds rows by exact first cell match", () => {
    const tables = parseMarkdownTables(sampleTable);
    const row = findRowByExactFirstCell(tables[0], "gpt-4o");
    expect(row).toEqual(["gpt-4o", "$2.50", "$10.00"]);
  });

  it("finds rows by partial first cell match", () => {
    const content = `| Model | Price |
| --- | --- |
| Claude Sonnet 5 ([retired]) | $3 / MTok |
`;
    const tables = parseMarkdownTables(content);
    const row = findRowByFirstCell(tables[0], "claude sonnet 5");
    expect(row).not.toBeNull();
    expect(row![0]).toContain("Claude Sonnet 5");
  });

  it("returns null for non-existent row", () => {
    const tables = parseMarkdownTables(sampleTable);
    const row = findRowByExactFirstCell(tables[0], "gpt-5");
    expect(row).toBeNull();
  });

  it("handles empty content", () => {
    const tables = parseMarkdownTables("");
    expect(tables).toEqual([]);
  });

  it("handles content with no tables", () => {
    const tables = parseMarkdownTables("# Just a heading\nSome text.\n");
    expect(tables).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 11. LIVE PRICING PARSING TESTS
// ─────────────────────────────────────────────────────

describe("Live Pricing Parsing", () => {
  it("sources fetch from .md URLs (not SDK endpoints)", () => {
    const openai = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/openai.ts"),
      "utf-8"
    );
    const anthropic = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/anthropic.ts"),
      "utf-8"
    );
    const google = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/google.ts"),
      "utf-8"
    );

    expect(openai).toContain("pricing.md");
    expect(anthropic).toContain("pricing.md");
    expect(google).toContain("pricing.md");
  });

  it("sources use markdown-parser for table extraction", () => {
    const openai = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/openai.ts"),
      "utf-8"
    );
    const anthropic = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/anthropic.ts"),
      "utf-8"
    );
    const google = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/google.ts"),
      "utf-8"
    );

    expect(openai).toContain("parseMarkdownTables");
    expect(anthropic).toContain("parseMarkdownTables");
    expect(google).toContain("parseMarkdownTables");
  });

  it("sources convert per-1M to per-1K", () => {
    const openai = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/openai.ts"),
      "utf-8"
    );
    expect(openai).toContain("per1MtoPer1K");
  });

  it("sources do NOT use provider SDK for pricing", () => {
    const openai = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/openai.ts"),
      "utf-8"
    );
    const anthropic = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/anthropic.ts"),
      "utf-8"
    );
    const google = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/google.ts"),
      "utf-8"
    );

    // Should NOT import provider SDKs
    expect(openai).not.toContain('from "openai"');
    expect(anthropic).not.toContain("@anthropic-ai");
    expect(google).not.toContain("@google/generative-ai");
  });

  it("sources have static KNOWN_MODELS fallback", () => {
    const openai = fs.readFileSync(
      path.resolve(__dirname, "../../lib/pricing/sources/openai.ts"),
      "utf-8"
    );
    expect(openai).toContain("KNOWN_MODELS");
  });
});

// ─────────────────────────────────────────────────────
// 12. EXTENSIBILITY TESTS
// ─────────────────────────────────────────────────────

describe("Pricing Extensibility", () => {
  it("new pricing sources can be created following the PricingSource interface", () => {
    const deepseekSource: PricingSource = {
      providerName: "deepseek",
      sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing",
      async fetchPricing(): Promise<PricingSourceResult> {
        return {
          providerName: "deepseek",
          sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing",
          fetchedAt: new Date(),
          models: [
            {
              modelIdentifier: "deepseek-reasoner",
              displayName: "DeepSeek R1",
              capabilities: ["reasoning", "coding"],
              tier: "HEAVY",
              inputPricePer1k: 0.00055,
              outputPricePer1k: 0.00219,
              active: true,
            },
          ],
          success: true,
        };
      },
    };

    expect(deepseekSource.providerName).toBe("deepseek");
    expect(deepseekSource.sourceUrl).toContain("deepseek");
  });

  it("PricingSource interface is provider-agnostic", () => {
    // Verify that the interface doesn't constrain to specific providers
    const genericSource: PricingSource = {
      providerName: "future-provider-x",
      sourceUrl: "https://example.com/pricing",
      async fetchPricing() {
        return {
          providerName: "future-provider-x",
          sourceUrl: "https://example.com/pricing",
          fetchedAt: new Date(),
          models: [],
          success: true,
        };
      },
    };

    expect(genericSource.providerName).toBe("future-provider-x");
  });
});

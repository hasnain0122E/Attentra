/**
 * Attentra — Pricing Source Extension Tests
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog
 *
 * Tests the extended parsing behavior that makes every eligible chat
 * model in the OFFICIAL pricing tables a priced routing candidate:
 *
 *   OpenAI:
 *     - qualifier-stripped standard rows ("gpt-5.2 (<272K context length)")
 *     - batch table rows matched by normalized id
 *     - specialized-models table (e.g. chat-latest)
 *     - eligibility filtering + "never invent prices" row skipping
 *     - tracked KNOWN_MODELS survive as static fallback
 *   Anthropic:
 *     - retired / limited-availability rows are never priced
 *     - newly recognized models priced via family profiles
 *     - unusable rows fall back to tracked static entries
 *
 * File-level mock fetch — ZERO network access.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { OpenAIPricingSource } from "@/lib/pricing/sources/openai";
import { AnthropicPricingSource } from "@/lib/pricing/sources/anthropic";
import type { NormalizedModelPricing } from "@/lib/pricing/types";

// ─────────────────────────────────────────────────────
// MOCK FETCH (extension table formats)
// ─────────────────────────────────────────────────────

const realFetch = globalThis.fetch;

// Mirrors the LIVE OpenAI pricing page structure: standard and batch
// tables carry "<qualifier>" suffixes on model cells; a specialized
// table lists chat-latest outside the main tables.
const MOCK_OPENAI_MD = `# OpenAI Pricing

| Model | Input | Cached input | Cache writes | Output |
| --- | --- | --- | --- | --- |
| gpt-5.2 (<272K context length) | $5.00 | $0.50 | $6.25 | $30.00 |
| gpt-5.2-mini (<272K context length) | $0.25 | $0.025 | $0.31 | $2.00 |
| gpt-4o | $2.50 | $1.25 | $2.50 | $10.00 |
| gpt-4o-2024-05-13 | $5.00 | $1.25 | $2.50 | $15.00 |
| text-embedding-3-small | $0.02 | - | - | $0.02 |
| gpt-5.1 | - | - | - | - |

| Model | Input | Cached input | Cache writes | Output |
| --- | --- | --- | --- | --- |
| gpt-5.2 (<272K context length) | $2.50 | $0.25 | $3.13 | $15.00 |
| gpt-4o | $1.25 | $0.625 | $1.25 | $5.00 |

| Category | Model | Input | Cached input | Output |
| --- | --- | --- | --- | --- |
| Latest | chat-latest | $5.00 | $0.50 | $30.00 |
| Coding | codex-mini-latest | $1.50 | - | $6.00 |
`;

// Mirrors the LIVE Anthropic pricing table: live rows, an unusable row,
// and rows marked retired / limited availability.
const MOCK_ANTHROPIC_MD = `# Anthropic Pricing

| Model | Base Input Tokens | 5m Cache Writes | 1h Cache Writes | Cache Hits & Refreshes | Output Tokens |
| --- | --- | --- | --- | --- | --- |
| Claude Sonnet 5 | $3 | $3.75 | $5 | $0.30 | $15 |
| Claude Opus 5 | - | $9.38 | $12.50 | $0.75 | - |
| Claude Opus 4.5 (retired) | $15 | $18.75 | $22.50 | $1.50 | $75 |
| Claude Sonnet 4.5 (limited availability) | $3 | $3.75 | $5 | $0.30 | $15 |
| Claude Fable 5 | $6 | $7.50 | $10 | $0.60 | $30 |
`;

function mockExtensionFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
  let content: string | undefined;
  if (urlStr.includes("openai")) content = MOCK_OPENAI_MD;
  else if (urlStr.includes("claude") || urlStr.includes("anthropic")) content = MOCK_ANTHROPIC_MD;

  if (content) {
    return Promise.resolve(new Response(content, { status: 200 }));
  }
  return realFetch(url, init);
}

beforeAll(() => {
  globalThis.fetch = mockExtensionFetch as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

function findById(models: NormalizedModelPricing[], id: string): NormalizedModelPricing | undefined {
  return models.find((m) => m.modelIdentifier === id);
}

// ─────────────────────────────────────────────────────
// OPENAI EXTENSIONS
// ─────────────────────────────────────────────────────

describe("OpenAI pricing source — extended parsing", () => {
  it("strips row qualifiers, matches batch rows by normalized id, and excludes non-chat rows", async () => {
    const result = await new OpenAIPricingSource().fetchPricing();
    expect(result.success).toBe(true);

    // Qualifier-stripped standard row with live prices
    const gpt52 = findById(result.models, "gpt-5.2");
    expect(gpt52).toBeDefined();
    expect(gpt52!.inputPricePer1k).toBeCloseTo(0.005, 8);
    expect(gpt52!.outputPricePer1k).toBeCloseTo(0.03, 8);
    expect(gpt52!.cachedInputPricePer1k).toBeCloseTo(0.0005, 8);

    // Batch row (also qualifier-stripped) matched by normalized id
    expect(gpt52!.batchInputPricePer1k).toBeCloseTo(0.0025, 8);
    expect(gpt52!.batchOutputPricePer1k).toBeCloseTo(0.015, 8);

    const mini = findById(result.models, "gpt-5.2-mini");
    expect(mini).toBeDefined();
    expect(mini!.inputPricePer1k).toBeCloseTo(0.00025, 8);

    // Eligibility filter applies INSIDE the pricing source
    expect(findById(result.models, "text-embedding-3-small")).toBeUndefined();
    // Dated snapshot aliases never receive a second pricing entry
    expect(findById(result.models, "gpt-4o-2024-05-13")).toBeUndefined();
    // Eligible rows without usable prices are skipped — never invented
    expect(findById(result.models, "gpt-5.1")).toBeUndefined();

    // No duplicate identifiers across standard + specialized tables
    const ids = result.models.map((m) => m.modelIdentifier);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recognizes chat-latest in the specialized table and keeps tracked models as fallback", async () => {
    const result = await new OpenAIPricingSource().fetchPricing();
    expect(result.success).toBe(true);

    // Specialized table: | Category | Model | Input | Cached input | Output |
    const chatLatest = findById(result.models, "chat-latest");
    expect(chatLatest).toBeDefined();
    expect(chatLatest!.inputPricePer1k).toBeCloseTo(0.005, 8);
    expect(chatLatest!.outputPricePer1k).toBeCloseTo(0.03, 8);
    expect(chatLatest!.cachedInputPricePer1k).toBeCloseTo(0.0005, 8);
    expect(chatLatest!.tier).toBe("HEAVY");

    // Non-chat specialized rows (codex) stay unpriced
    expect(findById(result.models, "codex-mini-latest")).toBeUndefined();

    // Tracked models absent from the live tables keep static fallback
    // entries — price history is never destroyed by a page redesign.
    const o3mini = findById(result.models, "o3-mini");
    expect(o3mini).toBeDefined();
    expect(o3mini!.inputPricePer1k).toBeCloseTo(0.0011, 8);
  });
});

// ─────────────────────────────────────────────────────
// ANTHROPIC EXTENSIONS
// ─────────────────────────────────────────────────────

describe("Anthropic pricing source — extended parsing", () => {
  it("prices live rows exactly and never prices retired / limited-availability rows", async () => {
    const result = await new AnthropicPricingSource().fetchPricing();
    expect(result.success).toBe(true);

    // Live row priced from the table, batch = 50%, cache dimensions built
    const sonnet5 = findById(result.models, "claude-sonnet-5");
    expect(sonnet5).toBeDefined();
    expect(sonnet5!.inputPricePer1k).toBeCloseTo(0.003, 8);
    expect(sonnet5!.outputPricePer1k).toBeCloseTo(0.015, 8);
    expect(sonnet5!.batchInputPricePer1k).toBeCloseTo(0.0015, 8);
    expect(sonnet5!.batchOutputPricePer1k).toBeCloseTo(0.0075, 8);
    expect(sonnet5!.pricingDimensions?.cacheWrite5m).toBeCloseTo(0.00375, 8);
    expect(sonnet5!.pricingDimensions?.cacheWrite1h).toBeCloseTo(0.005, 8);
    expect(sonnet5!.pricingDimensions?.cacheHit).toBeCloseTo(0.0003, 8);

    // Newly recognized model priced with family-profile metadata
    const fable5 = findById(result.models, "claude-fable-5");
    expect(fable5).toBeDefined();
    expect(fable5!.inputPricePer1k).toBeCloseTo(0.006, 8);
    expect(fable5!.outputPricePer1k).toBeCloseTo(0.03, 8);
    expect(fable5!.tier).toBe("HEAVY");
    expect(fable5!.displayName).toBe("Claude Fable 5");

    // Retired / limited-availability rows are never priced — not even
    // via the static fallback
    expect(findById(result.models, "claude-opus-4-5-20251101")).toBeUndefined();
    expect(findById(result.models, "claude-sonnet-4-5-20250929")).toBeUndefined();
  });

  it("falls back to the tracked static entry when a live row has unusable prices", async () => {
    const result = await new AnthropicPricingSource().fetchPricing();
    expect(result.success).toBe(true);

    // "Claude Opus 5" row carries "-" prices → static tracked entry wins
    const opus5 = findById(result.models, "claude-opus-5");
    expect(opus5).toBeDefined();
    expect(opus5!.inputPricePer1k).toBeCloseTo(0.005, 8);
    expect(opus5!.outputPricePer1k).toBeCloseTo(0.025, 8);
    expect(opus5!.batchInputPricePer1k).toBeCloseTo(0.0025, 8);

    // Model absent from the table entirely → static tracked entry
    const haiku = findById(result.models, "claude-haiku-4-5-20251001");
    expect(haiku).toBeDefined();
    expect(haiku!.inputPricePer1k).toBeCloseTo(0.001, 8);
    expect(haiku!.outputPricePer1k).toBeCloseTo(0.005, 8);
  });
});

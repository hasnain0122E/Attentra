/**
 * Attentra — Anthropic Pricing Source
 *
 * Fetches and normalizes pricing from Anthropic's official pricing page.
 * Official source: https://platform.claude.com/docs/en/about-claude/pricing
 * Markdown version: https://platform.claude.com/docs/en/about-claude/pricing.md
 *
 * Architecture:
 *   1. Fetch the official pricing page as markdown
 *   2. Parse the model pricing table (Base Input / Cache / Output columns)
 *      for every live (non-retired) Claude model
 *   3. Extract per-model pricing and normalize to per-1K tokens
 *   4. Batch = 50% of standard (per Anthropic docs)
 *   5. Fall back to static known pricing if fetch/parse fails
 *
 * Prices on the page are per MTok (million tokens).
 */

import type {
  PricingSource,
  PricingSourceResult,
  NormalizedModelPricing,
} from "../types";
import {
  parseMarkdownTables,
  extractDollarAmount,
  per1MtoPer1K,
  findRowByFirstCell,
} from "./markdown-parser";
import { classifyModelProfile } from "@/lib/catalog/profiles";

const SOURCE_URL = "https://docs.anthropic.com/en/docs/about-claude/pricing";
const MD_URL = "https://platform.claude.com/docs/en/about-claude/pricing.md";
const PROVIDER_NAME = "anthropic";

/**
 * Models we actively track. The parser looks up each display name
 * in the official pricing table. Models marked as retired on the
 * Anthropic docs page are excluded from active tracking.
 *
 * Batch API = 50% off standard pricing (documented by Anthropic).
 * Cache reads = 10% of base input price (documented by Anthropic).
 */
const KNOWN_MODELS: NormalizedModelPricing[] = [
  {
    modelIdentifier: "claude-sonnet-5",
    displayName: "Claude Sonnet 5",
    capabilities: ["chat", "reasoning", "coding", "extraction", "creative_writing", "translation"],
    tier: "MID",
    contextWindow: 1_000_000,
    expectedLatencyMs: 800,
    inputPricePer1k: 0.002,     // $2/MTok
    outputPricePer1k: 0.01,      // $10/MTok
    batchInputPricePer1k: 0.001,
    batchOutputPricePer1k: 0.005,
    pricingDimensions: {
      cacheWrite5m: 0.0025,      // $2.50/MTok
      cacheWrite1h: 0.004,       // $4/MTok
      cacheHit: 0.0002,           // $0.20/MTok
    },
    active: true,
  },
  {
    modelIdentifier: "claude-opus-5",
    displayName: "Claude Opus 5",
    capabilities: ["chat", "reasoning", "coding", "extraction", "creative_writing", "summarization"],
    tier: "HEAVY",
    contextWindow: 1_000_000,
    expectedLatencyMs: 1200,
    inputPricePer1k: 0.005,     // $5/MTok
    outputPricePer1k: 0.025,     // $25/MTok
    batchInputPricePer1k: 0.0025,
    batchOutputPricePer1k: 0.0125,
    pricingDimensions: {
      cacheWrite5m: 0.00625,
      cacheWrite1h: 0.01,
      cacheHit: 0.0005,
    },
    active: true,
  },
  {
    modelIdentifier: "claude-haiku-4-5-20251001",
    displayName: "Claude Haiku 4.5",
    capabilities: ["chat", "classification", "summarization", "extraction", "translation"],
    tier: "LIGHT",
    contextWindow: 200_000,
    expectedLatencyMs: 400,
    inputPricePer1k: 0.001,     // $1/MTok
    outputPricePer1k: 0.005,     // $5/MTok
    batchInputPricePer1k: 0.0005,
    batchOutputPricePer1k: 0.0025,
    pricingDimensions: {
      cacheWrite5m: 0.00125,
      cacheWrite1h: 0.002,
      cacheHit: 0.0001,
    },
    active: true,
  },
];

/**
 * Map from display names (as they appear in the pricing table) to our
 * model identifiers (the Anthropic Models API ids). Newly released
 * models become priced routing candidates as soon as they appear in
 * the official table; rows marked retired or limited availability are
 * never parsed.
 */
const DISPLAY_NAME_TO_ID: Record<string, string> = {
  "claude sonnet 5": "claude-sonnet-5",
  "claude opus 5": "claude-opus-5",
  "claude haiku 4.5": "claude-haiku-4-5-20251001",
  "claude fable 5": "claude-fable-5",
  "claude opus 4.8": "claude-opus-4-8",
  "claude opus 4.7": "claude-opus-4-7",
  "claude opus 4.6": "claude-opus-4-6",
  "claude opus 4.5": "claude-opus-4-5-20251101",
  "claude sonnet 4.6": "claude-sonnet-4-6",
  "claude sonnet 4.5": "claude-sonnet-4-5-20250929",
};

/**
 * Parse the Anthropic pricing markdown and extract model pricing.
 *
 * Table format:
 * | Model | Base Input Tokens | 5m Cache Writes | 1h Cache Writes | Cache Hits & Refreshes | Output Tokens |
 *
 * Rows marked retired or limited availability are skipped — catalog
 * discovery remains the authority on model availability.
 */
function parseAnthropicPricing(content: string): NormalizedModelPricing[] {
  const tables = parseMarkdownTables(content);

  // Find the model pricing table (has "Base Input" or "Input Tokens" header)
  const pricingTable = tables.find(
    (t) =>
      t.headers.length >= 5 &&
      t.headers[0].toLowerCase().includes("model") &&
      t.headers.some((h) => h.toLowerCase().includes("input"))
  );

  if (!pricingTable) return [];

  const results: NormalizedModelPricing[] = [];

  for (const [displayName, modelId] of Object.entries(DISPLAY_NAME_TO_ID)) {
    const row = findRowByFirstCell(pricingTable, displayName);
    const known = KNOWN_MODELS.find((m) => m.modelIdentifier === modelId);

    // Retired / limited-availability rows are never priced.
    if (row && /retired|limited availability/i.test(row[0] ?? "")) {
      continue;
    }

    if (!row) {
      if (known) results.push(known);
      continue;
    }

    // Column layout:
    // 0: Model | 1: Base Input | 2: 5m Cache Writes | 3: 1h Cache Writes | 4: Cache Hits | 5: Output
    const inputPer1M = extractDollarAmount(row[1]);
    const cacheWrite5mPer1M = extractDollarAmount(row[2]);
    const cacheWrite1hPer1M = extractDollarAmount(row[3]);
    const cacheHitPer1M = extractDollarAmount(row[4]);
    const outputPer1M = extractDollarAmount(row[5]);

    // Never invent prices — a row without usable input/output prices falls
    // back to the static entry (tracked models) or is skipped.
    if (inputPer1M === null || outputPer1M === null) {
      if (known) results.push(known);
      continue;
    }

    // Newly recognized models get metadata from the shared family profiles.
    const profile = classifyModelProfile("anthropic", modelId);
    const base: NormalizedModelPricing = known ?? {
      modelIdentifier: modelId,
      displayName: profile.displayName,
      capabilities: profile.capabilities,
      tier: profile.tier,
      contextWindow: profile.contextWindow,
      expectedLatencyMs: profile.expectedLatencyMs,
      inputPricePer1k: per1MtoPer1K(inputPer1M),
      outputPricePer1k: per1MtoPer1K(outputPer1M),
      active: true,
    };

    // Cache pricing dimensions (per 1K tokens) — omitted when unavailable.
    const cacheDimensions: Record<string, number> = {};
    if (cacheWrite5mPer1M !== null) {
      cacheDimensions.cacheWrite5m = per1MtoPer1K(cacheWrite5mPer1M);
    }
    if (cacheWrite1hPer1M !== null) {
      cacheDimensions.cacheWrite1h = per1MtoPer1K(cacheWrite1hPer1M);
    }
    if (cacheHitPer1M !== null) {
      cacheDimensions.cacheHit = per1MtoPer1K(cacheHitPer1M);
    }

    results.push({
      ...base,
      inputPricePer1k: per1MtoPer1K(inputPer1M),
      outputPricePer1k: per1MtoPer1K(outputPer1M),
      // Batch = 50% of standard (per Anthropic docs)
      batchInputPricePer1k: per1MtoPer1K(inputPer1M * 0.5),
      batchOutputPricePer1k: per1MtoPer1K(outputPer1M * 0.5),
      pricingDimensions:
        Object.keys(cacheDimensions).length > 0 ? cacheDimensions : known?.pricingDimensions,
    });
  }

  return results;
}

export class AnthropicPricingSource implements PricingSource {
  readonly providerName = PROVIDER_NAME;
  readonly sourceUrl = SOURCE_URL;

  async fetchPricing(): Promise<PricingSourceResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(MD_URL, {
        signal: controller.signal,
        headers: { Accept: "text/plain, text/markdown" },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Anthropic pricing page returned ${response.status}`);
      }

      const markdown = await response.text();
      const models = parseAnthropicPricing(markdown);

      if (models.length === 0) {
        throw new Error("No models parsed from Anthropic pricing page");
      }

      return {
        providerName: PROVIDER_NAME,
        sourceUrl: SOURCE_URL,
        fetchedAt: new Date(),
        models,
        success: true,
      };
    } catch (error) {
      return {
        providerName: PROVIDER_NAME,
        sourceUrl: SOURCE_URL,
        fetchedAt: new Date(),
        models: KNOWN_MODELS,
        success: true,
        error: error instanceof Error ? error.message : "Unknown error fetching Anthropic pricing",
      };
    }
  }
}

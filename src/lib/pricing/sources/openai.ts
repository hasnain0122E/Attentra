/**
 * Attentra — OpenAI Pricing Source
 *
 * Fetches and normalizes pricing from OpenAI's official pricing page.
 * Official source: https://platform.openai.com/docs/pricing
 * Markdown version: https://platform.openai.com/docs/pricing.md
 *
 * Architecture:
 *   1. Fetch the official pricing page as markdown
 *   2. Parse the standard + batch pricing tables
 *   3. Extract per-model pricing and normalize to per-1K tokens
 *   4. Fall back to static known pricing if fetch/parse fails
 *
 * Prices on the page are per 1M tokens; we convert to per 1K tokens.
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
  findRowByExactFirstCell,
} from "./markdown-parser";

const SOURCE_URL = "https://platform.openai.com/docs/pricing";
const MD_URL = "https://platform.openai.com/docs/pricing.md";
const PROVIDER_NAME = "openai";

/**
 * Models we actively track. The parser looks up each modelIdentifier
 * in the official pricing table. If a model is not found in the table,
 * its KNOWN_MODELS entry is used as fallback.
 */
const KNOWN_MODELS: NormalizedModelPricing[] = [
  {
    modelIdentifier: "gpt-4o",
    displayName: "GPT-4o",
    capabilities: ["chat", "reasoning", "coding", "extraction", "translation", "summarization"],
    tier: "HEAVY",
    contextWindow: 128_000,
    expectedLatencyMs: 800,
    inputPricePer1k: 0.0025,
    outputPricePer1k: 0.01,
    cachedInputPricePer1k: 0.00125,
    batchInputPricePer1k: 0.00125,
    batchOutputPricePer1k: 0.005,
    active: true,
  },
  {
    modelIdentifier: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    capabilities: ["chat", "classification", "summarization", "extraction", "translation"],
    tier: "LIGHT",
    contextWindow: 128_000,
    expectedLatencyMs: 400,
    inputPricePer1k: 0.00015,
    outputPricePer1k: 0.0006,
    cachedInputPricePer1k: 0.000075,
    batchInputPricePer1k: 0.000075,
    batchOutputPricePer1k: 0.0003,
    active: true,
  },
  {
    modelIdentifier: "gpt-4.1",
    displayName: "GPT-4.1",
    capabilities: ["chat", "reasoning", "coding", "extraction", "creative_writing"],
    tier: "HEAVY",
    contextWindow: 1_047_576,
    expectedLatencyMs: 900,
    inputPricePer1k: 0.002,
    outputPricePer1k: 0.008,
    cachedInputPricePer1k: 0.0005,
    batchInputPricePer1k: 0.001,
    batchOutputPricePer1k: 0.004,
    active: true,
  },
  {
    modelIdentifier: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    capabilities: ["chat", "classification", "summarization", "extraction"],
    tier: "MID",
    contextWindow: 1_047_576,
    expectedLatencyMs: 500,
    inputPricePer1k: 0.0004,
    outputPricePer1k: 0.0016,
    cachedInputPricePer1k: 0.0001,
    batchInputPricePer1k: 0.0002,
    batchOutputPricePer1k: 0.0008,
    active: true,
  },
  {
    modelIdentifier: "o3-mini",
    displayName: "o3-mini",
    capabilities: ["reasoning", "coding", "classification"],
    tier: "MID",
    contextWindow: 200_000,
    expectedLatencyMs: 2000,
    inputPricePer1k: 0.0011,
    outputPricePer1k: 0.0044,
    cachedInputPricePer1k: 0.00055,
    active: true,
  },
  {
    modelIdentifier: "o4-mini",
    displayName: "o4-mini",
    capabilities: ["reasoning", "coding", "classification"],
    tier: "MID",
    contextWindow: 200_000,
    expectedLatencyMs: 2500,
    inputPricePer1k: 0.0011,
    outputPricePer1k: 0.0044,
    cachedInputPricePer1k: 0.000275,
    active: true,
  },
];

/**
 * Parse the OpenAI pricing markdown and extract model pricing.
 * Returns a map of modelId → pricing data.
 */
function parseOpenAIPricing(content: string): NormalizedModelPricing[] {
  const tables = parseMarkdownTables(content);

  // The pricing page has multiple tables with the same column structure.
  // Standard pricing is the first table with "Model" in headers.
  // Batch pricing is the second such table.
  const modelTables = tables.filter(
    (t) => t.headers.length >= 5 && t.headers[0].toLowerCase().includes("model")
  );

  if (modelTables.length === 0) {
    return [];
  }

  const standardTable = modelTables[0];
  const batchTable = modelTables.length > 1 ? modelTables[1] : null;

  // Column layout (OpenAI pricing tables):
  // 0: Model | 1: Short context input | 2: cached input | 3: cache writes | 4: output
  const results: NormalizedModelPricing[] = [];

  for (const known of KNOWN_MODELS) {
    const row = findRowByExactFirstCell(standardTable, known.modelIdentifier);

    if (!row) {
      // Model not found in live table — use fallback
      results.push(known);
      continue;
    }

    const inputPer1M = extractDollarAmount(row[1]);
    const cachedInputPer1M = extractDollarAmount(row[2]);
    const outputPer1M = extractDollarAmount(row[4]);

    // Batch pricing (same column layout)
    let batchInputPer1M: number | null = null;
    let batchOutputPer1M: number | null = null;
    if (batchTable) {
      const batchRow = findRowByExactFirstCell(batchTable, known.modelIdentifier);
      if (batchRow) {
        batchInputPer1M = extractDollarAmount(batchRow[1]);
        batchOutputPer1M = extractDollarAmount(batchRow[4]);
      }
    }

    results.push({
      ...known,
      inputPricePer1k: inputPer1M !== null ? per1MtoPer1K(inputPer1M) : known.inputPricePer1k,
      outputPricePer1k: outputPer1M !== null ? per1MtoPer1K(outputPer1M) : known.outputPricePer1k,
      cachedInputPricePer1k:
        cachedInputPer1M !== null ? per1MtoPer1K(cachedInputPer1M) : known.cachedInputPricePer1k,
      batchInputPricePer1k:
        batchInputPer1M !== null ? per1MtoPer1K(batchInputPer1M) : known.batchInputPricePer1k,
      batchOutputPricePer1k:
        batchOutputPer1M !== null ? per1MtoPer1K(batchOutputPer1M) : known.batchOutputPricePer1k,
    });
  }

  return results;
}

export class OpenAIPricingSource implements PricingSource {
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
        throw new Error(`OpenAI pricing page returned ${response.status}`);
      }

      const markdown = await response.text();
      const models = parseOpenAIPricing(markdown);

      if (models.length === 0) {
        throw new Error("No models parsed from OpenAI pricing page");
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
        error: error instanceof Error ? error.message : "Unknown error fetching OpenAI pricing",
      };
    }
  }
}

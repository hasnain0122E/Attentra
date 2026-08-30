/**
 * Attentra — OpenAI Pricing Source
 *
 * Fetches and normalizes pricing from OpenAI's official pricing page.
 * Official source: https://platform.openai.com/docs/pricing
 * Markdown version: https://platform.openai.com/docs/pricing.md
 *
 * Architecture:
 *   1. Fetch the official pricing page as markdown
 *   2. Parse the standard + batch pricing tables plus the
 *      specialized-models table (every eligible row)
 *   3. Filter rows through the shared catalog chat-family rules
 *      (Phase 8 Step 3 — eligibility lives in exactly one place)
 *   4. Normalize to per-1K tokens with family-profile metadata
 *   5. Fall back to static known pricing if fetch/parse fails
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
} from "./markdown-parser";
import { isChatFamilyModelId, classifyModelProfile } from "@/lib/catalog/profiles";

const SOURCE_URL = "https://platform.openai.com/docs/pricing";
const MD_URL = "https://platform.openai.com/docs/pricing.md";
const PROVIDER_NAME = "openai";

/**
 * Curated entries for the models tracked since Phase 5. The parser now
 * recognizes every eligible chat model in the official pricing tables;
 * these entries supply hand-curated metadata when an identifier matches
 * and serve as the static fallback when fetch/parse fails.
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
 * Normalize a pricing-table model cell to a bare model identifier.
 * Strips qualifiers like " (<272K context length)" that OpenAI appends
 * to model names in the pricing tables.
 */
function normalizeModelCell(cell: string): string {
  return cell.split(" (")[0].trim().toLowerCase();
}

/**
 * Build the non-price metadata for a model recognized in the pricing
 * tables. Tracked KNOWN_MODELS entries win (hand-curated capabilities);
 * other models get a conservative family profile. Prices are always
 * overridden by the caller with live table values.
 */
function openAIBaseEntry(modelId: string): NormalizedModelPricing {
  const known = KNOWN_MODELS.find((m) => m.modelIdentifier === modelId);
  if (known) return known;

  const profile = classifyModelProfile("openai", modelId);
  return {
    modelIdentifier: modelId,
    displayName: profile.displayName,
    capabilities: profile.capabilities,
    tier: profile.tier,
    contextWindow: profile.contextWindow,
    expectedLatencyMs: profile.expectedLatencyMs,
    inputPricePer1k: 0,
    outputPricePer1k: 0,
    active: true,
  };
}

/**
 * Parse the OpenAI pricing markdown and extract model pricing.
 *
 * Recognizes every chat / text-generation model listed in the standard,
 * batch and specialized pricing tables — new models become priced
 * routing candidates without code changes.
 */
function parseOpenAIPricing(content: string): NormalizedModelPricing[] {
  const tables = parseMarkdownTables(content);

  // The pricing page has multiple tables with the same column structure.
  // Standard pricing is the first table with "Model" in headers.
  // Batch pricing is the second such table. (Later matches are Flex,
  // Fast, Cyber, realtime/audio, image, video, transcription and
  // fine-tuning tables — intentionally not merged into standard prices.)
  const modelTables = tables.filter(
    (t) => t.headers.length >= 5 && t.headers[0].toLowerCase().includes("model")
  );

  if (modelTables.length === 0) {
    return [];
  }

  const standardTable = modelTables[0];
  const batchTable = modelTables.length > 1 ? modelTables[1] : null;

  // Index batch rows by normalized model id so qualifier-stripped ids match.
  const batchRows = new Map<string, string[]>();
  if (batchTable) {
    for (const row of batchTable.rows) {
      const id = normalizeModelCell(row[0] ?? "");
      if (id && !batchRows.has(id)) {
        batchRows.set(id, row);
      }
    }
  }

  const results: NormalizedModelPricing[] = [];
  const seen = new Set<string>();

  // Column layout (OpenAI pricing tables):
  // 0: Model | 1: Short context input | 2: cached input | 3: cache writes | 4: output
  for (const row of standardTable.rows) {
    const modelId = normalizeModelCell(row[0] ?? "");
    if (!modelId || seen.has(modelId)) continue;
    // Only chat / text-generation families may receive pricing.
    if (!isChatFamilyModelId("openai", modelId)) continue;

    const inputPer1M = extractDollarAmount(row[1] ?? "");
    const cachedInputPer1M = extractDollarAmount(row[2] ?? "");
    const outputPer1M = extractDollarAmount(row[4] ?? "");

    // Never invent prices — skip rows without usable input/output prices.
    if (inputPer1M === null || outputPer1M === null) continue;

    const batchRow = batchRows.get(modelId) ?? null;
    const batchInputPer1M = batchRow ? extractDollarAmount(batchRow[1] ?? "") : null;
    const batchOutputPer1M = batchRow ? extractDollarAmount(batchRow[4] ?? "") : null;

    const base = openAIBaseEntry(modelId);

    results.push({
      ...base,
      inputPricePer1k: per1MtoPer1K(inputPer1M),
      outputPricePer1k: per1MtoPer1K(outputPer1M),
      cachedInputPricePer1k:
        cachedInputPer1M !== null ? per1MtoPer1K(cachedInputPer1M) : base.cachedInputPricePer1k,
      batchInputPricePer1k:
        batchInputPer1M !== null ? per1MtoPer1K(batchInputPer1M) : base.batchInputPricePer1k,
      batchOutputPricePer1k:
        batchOutputPer1M !== null ? per1MtoPer1K(batchOutputPer1M) : base.batchOutputPricePer1k,
    });
    seen.add(modelId);
  }

  // Specialized models table: | Category | Model | Input | Cached input | Output |
  // Recognizes chat models listed outside the main tables (e.g. chat-latest).
  const specializedTable = tables.find(
    (t) =>
      t.headers[0]?.toLowerCase() === "category" &&
      t.headers.some((h) => h.toLowerCase() === "model")
  );

  if (specializedTable) {
    for (const row of specializedTable.rows) {
      const modelId = normalizeModelCell(row[1] ?? "");
      if (!modelId || seen.has(modelId)) continue;
      if (!isChatFamilyModelId("openai", modelId)) continue;

      const inputPer1M = extractDollarAmount(row[2] ?? "");
      const cachedInputPer1M = extractDollarAmount(row[3] ?? "");
      const outputPer1M = extractDollarAmount(row[4] ?? "");

      if (inputPer1M === null || outputPer1M === null) continue;

      const base = openAIBaseEntry(modelId);

      results.push({
        ...base,
        inputPricePer1k: per1MtoPer1K(inputPer1M),
        outputPricePer1k: per1MtoPer1K(outputPer1M),
        cachedInputPricePer1k:
          cachedInputPer1M !== null ? per1MtoPer1K(cachedInputPer1M) : base.cachedInputPricePer1k,
      });
      seen.add(modelId);
    }
  }

  // Tracked models absent from the live tables keep their static fallback
  // entry so price history is never destroyed by a page redesign.
  for (const known of KNOWN_MODELS) {
    if (!seen.has(known.modelIdentifier)) {
      results.push(known);
      seen.add(known.modelIdentifier);
    }
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

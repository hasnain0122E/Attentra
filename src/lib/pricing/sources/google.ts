/**
 * Attentra — Google (Gemini) Pricing Source
 *
 * Fetches and normalizes pricing from Google's official pricing page.
 * Official source: https://ai.google.dev/gemini-api/docs/pricing
 * Markdown version: https://ai.google.dev/gemini-api/docs/pricing.md
 *
 * Architecture:
 *   1. Fetch the official pricing page as markdown
 *   2. Parse per-model sections (each headed by *model-id*)
 *   3. Extract Standard + Batch pricing tables within each section
 *   4. Normalize to per-1K tokens
 *   5. Fall back to static known pricing if fetch/parse fails
 *
 * Google's format differs from OpenAI/Anthropic: each model has its
 * own section with 2-column tables (Free Tier / Paid Tier).
 * Prices on the page are per 1M tokens.
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

const SOURCE_URL = "https://ai.google.dev/pricing";
const MD_URL = "https://ai.google.dev/gemini-api/docs/pricing.md";
const PROVIDER_NAME = "google";

/**
 * Models we actively track. The parser searches for each modelIdentifier
 * in the markdown content and extracts its Standard/Batch pricing tables.
 */
const KNOWN_MODELS: NormalizedModelPricing[] = [
  {
    modelIdentifier: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    capabilities: ["chat", "reasoning", "coding", "extraction", "creative_writing", "summarization"],
    tier: "HEAVY",
    contextWindow: 1_048_576,
    expectedLatencyMs: 1000,
    inputPricePer1k: 0.00125,
    outputPricePer1k: 0.01,
    cachedInputPricePer1k: 0.000125,
    batchInputPricePer1k: 0.000625,
    batchOutputPricePer1k: 0.005,
    pricingDimensions: { thinkingOutputPricePer1k: 0.01, freeTierAvailable: true },
    active: true,
  },
  {
    modelIdentifier: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    capabilities: ["chat", "reasoning", "coding", "extraction", "summarization", "translation"],
    tier: "LIGHT",
    contextWindow: 1_048_576,
    expectedLatencyMs: 500,
    inputPricePer1k: 0.0003,
    outputPricePer1k: 0.0025,
    cachedInputPricePer1k: 0.00003,
    batchInputPricePer1k: 0.00015,
    batchOutputPricePer1k: 0.00125,
    pricingDimensions: { thinkingOutputPricePer1k: 0.0025, freeTierAvailable: true },
    active: true,
  },
  {
    modelIdentifier: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash-Lite",
    capabilities: ["chat", "classification", "summarization", "extraction"],
    tier: "LIGHT",
    contextWindow: 1_048_576,
    expectedLatencyMs: 300,
    inputPricePer1k: 0.0001,
    outputPricePer1k: 0.0004,
    cachedInputPricePer1k: 0.00001,
    batchInputPricePer1k: 0.00005,
    batchOutputPricePer1k: 0.0002,
    pricingDimensions: { freeTierAvailable: true },
    active: true,
  },
];

/**
 * Split markdown content into per-model sections.
 * Each model section starts with `*model-id*` pattern.
 */
function splitModelSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split("\n");

  let currentModelId: string | null = null;
  let sectionLines: string[] = [];

  for (const line of lines) {
    // Detect model identifier line: *gemini-2.5-pro*Try it in Google AI Studio
    const match = line.match(/^\*(gemini-[\w.-]+)\*/);
    if (match) {
      // Save previous section
      if (currentModelId) {
        sections.set(currentModelId, sectionLines.join("\n"));
      }
      currentModelId = match[1];
      sectionLines = [line];
    } else if (currentModelId) {
      sectionLines.push(line);
    }
  }

  // Save last section
  if (currentModelId) {
    sections.set(currentModelId, sectionLines.join("\n"));
  }

  return sections;
}

/**
 * Extract pricing from a model section.
 * Looks for "### Standard" and "### Batch" subsections,
 * then parses their pricing tables.
 */
function extractGoogleModelPricing(
  sectionContent: string,
  known: NormalizedModelPricing
): NormalizedModelPricing {
  const tables = parseMarkdownTables(sectionContent);

  // Google tables have format: |  | Free Tier | Paid Tier |
  // We need to find the table under "### Standard" and "### Batch"
  // Since we parse tables from the section, the first table is Standard,
  // the second is Batch.
  const pricingTables = tables.filter(
    (t) => t.headers.length >= 3 && t.rows.length > 0
  );

  if (pricingTables.length === 0) return known;

  // Find input/output/caching rows in the standard table
  const standardTable = pricingTables[0];
  const batchTable = pricingTables.length > 1 ? pricingTables[1] : null;

  // Column layout: 0: (empty/label) | 1: Free Tier | 2: Paid Tier
  const PAID_COL = 2;

  let inputPer1M: number | null = null;
  let outputPer1M: number | null = null;
  let cachePer1M: number | null = null;
  let batchInputPer1M: number | null = null;
  let batchOutputPer1M: number | null = null;

  for (const row of standardTable.rows) {
    const label = row[0]?.toLowerCase() ?? "";
    const paidCell = row[PAID_COL] ?? "";

    if (label.startsWith("input price")) {
      inputPer1M = extractDollarAmount(paidCell);
    } else if (label.startsWith("output price")) {
      outputPer1M = extractDollarAmount(paidCell);
    } else if (label.startsWith("context caching")) {
      cachePer1M = extractDollarAmount(paidCell);
    }
  }

  if (batchTable) {
    for (const row of batchTable.rows) {
      const label = row[0]?.toLowerCase() ?? "";
      const paidCell = row[PAID_COL] ?? "";

      if (label.startsWith("input price")) {
        batchInputPer1M = extractDollarAmount(paidCell);
      } else if (label.startsWith("output price")) {
        batchOutputPer1M = extractDollarAmount(paidCell);
      }
    }
  }

  return {
    ...known,
    inputPricePer1k: inputPer1M !== null ? per1MtoPer1K(inputPer1M) : known.inputPricePer1k,
    outputPricePer1k: outputPer1M !== null ? per1MtoPer1K(outputPer1M) : known.outputPricePer1k,
    cachedInputPricePer1k: cachePer1M !== null ? per1MtoPer1K(cachePer1M) : known.cachedInputPricePer1k,
    batchInputPricePer1k: batchInputPer1M !== null ? per1MtoPer1K(batchInputPer1M) : known.batchInputPricePer1k,
    batchOutputPricePer1k: batchOutputPer1M !== null ? per1MtoPer1K(batchOutputPer1M) : known.batchOutputPricePer1k,
  };
}

/**
 * Parse Google's pricing markdown and extract per-model pricing.
 */
function parseGooglePricing(content: string): NormalizedModelPricing[] {
  const sections = splitModelSections(content);
  const results: NormalizedModelPricing[] = [];

  for (const known of KNOWN_MODELS) {
    const section = sections.get(known.modelIdentifier);
    if (!section) {
      results.push(known);
      continue;
    }
    results.push(extractGoogleModelPricing(section, known));
  }

  return results;
}

export class GooglePricingSource implements PricingSource {
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
        throw new Error(`Google pricing page returned ${response.status}`);
      }

      const markdown = await response.text();
      const models = parseGooglePricing(markdown);

      if (models.length === 0) {
        throw new Error("No models parsed from Google pricing page");
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
        error: error instanceof Error ? error.message : "Unknown error fetching Google pricing",
      };
    }
  }
}

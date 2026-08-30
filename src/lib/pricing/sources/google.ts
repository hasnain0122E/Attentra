/**
 * Attentra — Google (Gemini) Pricing Source
 *
 * Fetches and normalizes pricing from Google's official pricing page.
 * Official source: https://ai.google.dev/gemini-api/docs/pricing
 * Markdown version: https://ai.google.dev/gemini-api/docs/pricing.md?hl=en
 *
 * Architecture:
 *   1. Fetch the official pricing page (served as HTML today; the
 *      legacy *model-id* markdown format is still supported as fallback)
 *   2. Parse per-model sections — HTML sections are headed by
 *      <h2 id="model-id">, markdown sections by *model-id*
 *   3. Extract the Standard + Batch pricing tables within each section
 *      (identified by their h3 "Standard"/"Batch" labels, with a
 *      positional fallback for bare tables)
 *   4. Keep only chat/text-generation families (shared catalog
 *      eligibility rules — TTS, image, live, robotics, embedding and
 *      tool sections never enter the routing pool)
 *   5. Normalize to per-1K tokens
 *   6. Fall back to static known pricing if fetch/parse fails
 *
 * Google's format differs from OpenAI/Anthropic: each model has its
 * own section with 3-column tables (label / Free Tier / Paid Tier).
 * Prices on the page are per 1M tokens; tiered and dated-transition
 * cells are read at their current (first-listed) rate.
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
import {
  isChatFamilyModelId,
  classifyModelProfile,
} from "@/lib/catalog/profiles";

const SOURCE_URL = "https://ai.google.dev/pricing";
const MD_URL = "https://ai.google.dev/gemini-api/docs/pricing.md?hl=en";
const PROVIDER_NAME = "google";

/**
 * Models we actively track. Parsed models take precedence; these
 * entries serve as the static fallback when the pricing page cannot
 * be fetched or no longer lists the model.
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

// ─────────────────────────────────────────────────────
// SHARED TIER-TABLE EXTRACTION
// ─────────────────────────────────────────────────────

/**
 * Prices extracted from one Google pricing tier table (per 1M tokens).
 * Both the HTML and the legacy markdown tables have 3 columns:
 * | label | Free Tier | Paid Tier |.
 */
interface GoogleTierPrices {
  input: number;
  output: number;
  cache: number | null;
  freeTierAvailable: boolean;
}

/**
 * Extract tier prices from 3-column rows (label, Free Tier, Paid Tier).
 *
 * Tiered / dated-transition cells ("$0.75 through December 31, 2026") are
 * read at their current (first-listed) rate. Returns null when no usable
 * input+output pair exists (e.g. Gemma's "Not available" columns) — the
 * pricing gate keeps unpriced models non-routable.
 */
function extractTierPrices(rows: string[][]): GoogleTierPrices | null {
  let input: number | null = null;
  let output: number | null = null;
  let cache: number | null = null;
  let freeTierAvailable = false;

  for (const row of rows) {
    const label = (row[0] ?? "").toLowerCase();
    const paidCell = row[2] ?? "";

    if (label.startsWith("input price")) {
      input = extractDollarAmount(paidCell);
      freeTierAvailable = (row[1] ?? "").toLowerCase().includes("free");
    } else if (label.startsWith("output price")) {
      output = extractDollarAmount(paidCell);
    } else if (label.startsWith("context caching")) {
      cache = extractDollarAmount(paidCell);
    }
  }

  if (input === null || output === null) return null;

  return { input, output, cache, freeTierAvailable };
}

/** Build the normalized pricing entry for one Google model. */
function buildGooglePricing(
  modelId: string,
  standard: GoogleTierPrices,
  batch: GoogleTierPrices | null
): NormalizedModelPricing {
  const profile = classifyModelProfile("google", modelId);

  return {
    modelIdentifier: modelId,
    displayName: profile.displayName,
    capabilities: profile.capabilities,
    tier: profile.tier,
    contextWindow: profile.contextWindow,
    expectedLatencyMs: profile.expectedLatencyMs,
    inputPricePer1k: per1MtoPer1K(standard.input),
    outputPricePer1k: per1MtoPer1K(standard.output),
    cachedInputPricePer1k:
      standard.cache !== null ? per1MtoPer1K(standard.cache) : undefined,
    batchInputPricePer1k: batch ? per1MtoPer1K(batch.input) : undefined,
    batchOutputPricePer1k: batch ? per1MtoPer1K(batch.output) : undefined,
    pricingDimensions: standard.freeTierAvailable
      ? { freeTierAvailable: true }
      : undefined,
    active: true,
  };
}

// ─────────────────────────────────────────────────────
// HTML PARSING (current page format)
// ─────────────────────────────────────────────────────

/** Whether the fetched content is the current HTML page (vs legacy markdown). */
function looksLikeHtml(content: string): boolean {
  return /<h2\s+id="[\w.-]+"/.test(content) || content.includes("<table");
}

/** Strip markup inside a table cell and collapse whitespace. */
function stripHtml(cell: string): string {
  return cell
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Data rows of one HTML pricing table (label, Free Tier, Paid Tier).
 * Header rows (<th> only) are skipped.
 */
function extractHtmlRows(tableHtml: string): string[][] {
  const rows: string[][] = [];

  for (const rowMatch of tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = Array.from(
      rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g),
      (cellMatch) => stripHtml(cellMatch[1])
    );
    if (cells.length >= 3) rows.push([cells[0], cells[1], cells[2]]);
  }

  return rows;
}

/**
 * Standard + Batch tables of one model section.
 *
 * Tables are identified by their h3 labels ("Standard"/"Batch") when
 * present; sections with bare tables (no h3 labels) fall back to
 * positional order — the first pricing table is Standard.
 */
function extractHtmlPricingTables(
  sectionHtml: string
): { standard: string[][] | null; batch: string[][] | null } {
  const labeled: Array<{ label: string; rows: string[][] }> = [];
  const labeledPattern =
    /<h3[^>]*data-text="([^"]+)"[^>]*>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/g;

  for (const match of sectionHtml.matchAll(labeledPattern)) {
    labeled.push({
      label: stripHtml(match[1]).toLowerCase(),
      rows: extractHtmlRows(match[2]),
    });
  }

  const standard = labeled.find(
    (t) => t.label === "standard" && t.rows.length > 0
  );
  const batch = labeled.find((t) => t.label === "batch" && t.rows.length > 0);

  if (standard || batch) {
    return {
      standard: standard ? standard.rows : null,
      batch: batch ? batch.rows : null,
    };
  }

  // Bare tables (no h3 labels): first table is Standard, second is Batch
  const bare = Array.from(
    sectionHtml.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g),
    (tableMatch) => extractHtmlRows(tableMatch[1])
  ).filter((rows) => rows.length > 0);

  return {
    standard: bare.length > 0 ? bare[0] : null,
    batch: bare.length > 1 ? bare[1] : null,
  };
}

/** Split the HTML page into per-model sections keyed by their h2 id. */
function splitHtmlSections(
  content: string
): Array<{ id: string; html: string }> {
  const headings = Array.from(content.matchAll(/<h2\s+id="([\w.-]+)"/g));
  const sections: Array<{ id: string; html: string }> = [];

  headings.forEach((heading, index) => {
    const start = heading.index ?? 0;
    const end =
      index + 1 < headings.length
        ? headings[index + 1].index ?? content.length
        : content.length;
    sections.push({ id: heading[1], html: content.slice(start, end) });
  });

  return sections;
}

/** Parse the current HTML pricing page into per-model pricing. */
function parseGoogleHtmlPricing(content: string): NormalizedModelPricing[] {
  const results: NormalizedModelPricing[] = [];

  for (const section of splitHtmlSections(content)) {
    // Only chat/text-generation families may enter the routing pool —
    // TTS, image, live, robotics, embedding and tool sections are
    // skipped by the shared catalog eligibility rules (Phase 8 Step 3).
    if (!isChatFamilyModelId("google", section.id)) continue;

    const { standard, batch } = extractHtmlPricingTables(section.html);
    if (!standard) continue;

    const standardPrices = extractTierPrices(standard);
    if (!standardPrices) continue;

    const batchPrices = batch ? extractTierPrices(batch) : null;

    results.push(buildGooglePricing(section.id, standardPrices, batchPrices));
  }

  return results;
}

// ─────────────────────────────────────────────────────
// LEGACY MARKDOWN PARSING (fallback format)
// ─────────────────────────────────────────────────────

/**
 * Split legacy markdown content into per-model sections.
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
 * Parse the legacy markdown pricing format: per-model sections with
 * positional Standard/Batch tables (| | Free Tier | Paid Tier |).
 */
function parseGoogleMarkdownPricing(content: string): NormalizedModelPricing[] {
  const results: NormalizedModelPricing[] = [];

  for (const [modelId, sectionContent] of splitModelSections(content)) {
    if (!isChatFamilyModelId("google", modelId)) continue;

    const pricingTables = parseMarkdownTables(sectionContent).filter(
      (t) => t.headers.length >= 3 && t.rows.length > 0
    );
    if (pricingTables.length === 0) continue;

    const standardPrices = extractTierPrices(pricingTables[0].rows);
    if (!standardPrices) continue;

    const batchPrices =
      pricingTables.length > 1 ? extractTierPrices(pricingTables[1].rows) : null;

    results.push(buildGooglePricing(modelId, standardPrices, batchPrices));
  }

  return results;
}

/**
 * Parse Google pricing content (HTML or legacy markdown) and extract
 * per-model pricing. Models tracked in KNOWN_MODELS that the page no
 * longer lists keep their static fallback pricing.
 */
function parseGooglePricing(content: string): NormalizedModelPricing[] {
  const parsed = looksLikeHtml(content)
    ? parseGoogleHtmlPricing(content)
    : parseGoogleMarkdownPricing(content);

  const seen = new Set(parsed.map((m) => m.modelIdentifier));
  const results = [...parsed];

  for (const known of KNOWN_MODELS) {
    if (!seen.has(known.modelIdentifier)) {
      results.push(known);
    }
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

      const content = await response.text();
      const models = parseGooglePricing(content);

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

/**
 * Attentra — Model Catalog Discovery
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog
 *
 * Discovers provider model catalogs through the providers' official
 * model-list capabilities (spec §3):
 *
 *   OpenAI     → official SDK Models API (client.models.list())
 *   Anthropic  → official SDK Models API (client.models.list())
 *   Google     → Gemini v1beta REST model listing (generateContent
 *                compatibility via supportedGenerationMethods)
 *
 * Listing endpoints only — discovery NEVER spends generation credits
 * (spec §15). Provider SDKs are imported dynamically so that modules
 * which only use the catalog types/rules never load provider SDKs.
 *
 * Fail-safe (spec §16): a failed discovery returns success:false with
 * an error message; it never throws and never mutates any data.
 */

import type {
  CatalogDiscoveryResult,
  CatalogModelEntry,
  CatalogProviderName,
} from "./types";
import { CATALOG_PROVIDERS } from "./types";
import { deriveDisplayName, filterEligibleCatalogModels } from "./profiles";

const GOOGLE_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GOOGLE_PAGE_SIZE = 200;
const DISCOVERY_TIMEOUT_MS = 20_000;

/** Shape of the Google v1beta models listing response. */
interface GoogleModelsResponse {
  models?: Array<{
    name: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
    inputTokenLimit?: string;
    outputTokenLimit?: string;
  }>;
  nextPageToken?: string;
}

// ─────────────────────────────────────────────────────
// PROVIDER DISCOVERY
// ─────────────────────────────────────────────────────

/** Discover the OpenAI model catalog via the official SDK. */
async function discoverOpenAIModels(): Promise<CatalogModelEntry[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const entries: CatalogModelEntry[] = [];
  // The listing exposes ids only — display names are derived.
  for await (const model of client.models.list()) {
    entries.push({
      providerName: "openai",
      modelIdentifier: model.id,
      displayName: deriveDisplayName(model.id),
    });
  }
  return entries;
}

/** Discover the Anthropic model catalog via the official SDK. */
async function discoverAnthropicModels(): Promise<CatalogModelEntry[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const page = await client.models.list();

  return page.data.map((model) => ({
    providerName: "anthropic" as const,
    modelIdentifier: model.id,
    displayName: model.display_name ?? model.id,
  }));
}

/** Discover the Google (Gemini) model catalog via the REST listing. */
async function discoverGoogleModels(): Promise<CatalogModelEntry[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  const entries: CatalogModelEntry[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(GOOGLE_MODELS_URL);
    url.searchParams.set("pageSize", String(GOOGLE_PAGE_SIZE));
    url.searchParams.set("key", apiKey);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Google model listing returned ${response.status}`
      );
    }

    const data = (await response.json()) as GoogleModelsResponse;

    for (const model of data.models ?? []) {
      const modelIdentifier = model.name.replace(/^models\//, "");
      const contextWindow = Number(model.inputTokenLimit);
      const maxOutputTokens = Number(model.outputTokenLimit);

      entries.push({
        providerName: "google",
        modelIdentifier,
        displayName: model.displayName ?? modelIdentifier,
        contextWindow: Number.isFinite(contextWindow) && contextWindow > 0
          ? contextWindow
          : undefined,
        maxOutputTokens: Number.isFinite(maxOutputTokens) && maxOutputTokens > 0
          ? maxOutputTokens
          : undefined,
        generationMethods: model.supportedGenerationMethods ?? [],
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return entries;
}

// ─────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────

/**
 * Discover one provider's model catalog.
 *
 * Returns all normalized entries together with the eligible subset;
 * never throws — failures are reported via success:false.
 */
export async function discoverCatalog(
  providerName: CatalogProviderName
): Promise<CatalogDiscoveryResult> {
  try {
    let models: CatalogModelEntry[];

    switch (providerName) {
      case "openai":
        models = await discoverOpenAIModels();
        break;
      case "anthropic":
        models = await discoverAnthropicModels();
        break;
      case "google":
        models = await discoverGoogleModels();
        break;
    }

    return {
      providerName,
      success: true,
      models,
      eligibleModels: filterEligibleCatalogModels(models),
      fetchedAt: new Date(),
    };
  } catch (error) {
    return {
      providerName,
      success: false,
      models: [],
      eligibleModels: [],
      error:
        error instanceof Error
          ? error.message
          : `Failed to discover ${providerName} catalog`,
      fetchedAt: new Date(),
    };
  }
}

/**
 * Discover all provider catalogs sequentially.
 */
export async function discoverAllCatalogs(): Promise<CatalogDiscoveryResult[]> {
  const results: CatalogDiscoveryResult[] = [];
  for (const providerName of CATALOG_PROVIDERS) {
    const result = await discoverCatalog(providerName);
    results.push(result);
    console.log(
      `[catalog-discovery] ${providerName}: ${result.success ? "ok" : "FAILED"} ` +
        `(${result.models.length} listed, ${result.eligibleModels.length} eligible)` +
        (result.error ? ` — ${result.error}` : "")
    );
  }
  return results;
}

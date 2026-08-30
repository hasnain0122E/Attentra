/**
 * Attentra — Model Catalog Types
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog
 *
 * Provider-neutral catalog representation for models discovered from
 * the providers' official model-list APIs.
 *
 * The catalog is intentionally minimal: it carries only the data the
 * existing Model/routing architecture genuinely needs. Pricing is NOT
 * part of the catalog — Phase 5 PricingSnapshots remain the only
 * pricing authority (spec §6).
 */

/** Logical provider names. Must match Provider.name in the database
 *  and the execution ProviderRegistry adapter keys. */
export type CatalogProviderName = "openai" | "anthropic" | "google";

/** All logical providers with catalog discovery support. */
export const CATALOG_PROVIDERS: readonly CatalogProviderName[] = [
  "openai",
  "anthropic",
  "google",
];

/**
 * A normalized model entry discovered from a provider's official
 * model listing (before eligibility filtering).
 */
export interface CatalogModelEntry {
  /** Logical provider the model belongs to. */
  providerName: CatalogProviderName;

  /** External model identifier used when calling the provider API. */
  modelIdentifier: string;

  /** Human-readable display name (from the listing, or derived from the id). */
  displayName: string;

  /** Maximum input context in tokens, when the listing exposes it. */
  contextWindow?: number;

  /** Maximum output tokens, when the listing exposes it. */
  maxOutputTokens?: number;

  /**
   * Generation methods the model supports, when the listing exposes
   * them (e.g. Google's supportedGenerationMethods).
   */
  generationMethods?: string[];
}

/** Result of discovering a provider's model catalog. */
export interface CatalogDiscoveryResult {
  providerName: CatalogProviderName;

  /** Whether the listing API call succeeded. */
  success: boolean;

  /** All normalized entries returned by the listing. */
  models: CatalogModelEntry[];

  /** Entries that passed the eligibility rules (chat/text generation only). */
  eligibleModels: CatalogModelEntry[];

  /** Error message when discovery failed (models/eligibleModels empty). */
  error?: string;

  /** When the listing was fetched. */
  fetchedAt: Date;
}

/** Result of synchronizing one provider's catalog into the database. */
export interface CatalogSyncResult {
  providerName: CatalogProviderName;

  /** SUCCESS (synced), FAILED (discovery failed, nothing changed). */
  status: "SUCCESS" | "FAILED";

  /** Eligible models found in the listing. */
  discovered: number;

  /** Model rows created (first time the model appeared in the catalog). */
  created: number;

  /** Existing model rows updated with catalog metadata. */
  updated: number;

  /** Model rows deactivated because they were absent from the listing. */
  deactivated: number;

  /** Error message when the sync failed. */
  error?: string;
}

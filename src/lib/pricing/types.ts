/**
 * Attentra — Pricing Module Types
 *
 * Architecture.md v2.0 §7, §9, §10
 *
 * Normalized pricing structures that all provider pricing sources
 * must conform to. Provider-specific formats are translated into
 * these types before being written to the database.
 *
 * All prices are in USD per 1,000 tokens (provider-canonical).
 * PKR conversion happens at presentation time via USD_TO_PKR_RATE.
 */

// ─────────────────────────────────────────────────────
// NORMALIZED PRICING
// ─────────────────────────────────────────────────────

/**
 * Normalized pricing for a single model.
 * Every provider pricing source must return this shape.
 */
export interface NormalizedModelPricing {
  /** Provider's model identifier (e.g. "gpt-4o", "claude-sonnet-4-20250514") */
  modelIdentifier: string;

  /** Human-readable display name */
  displayName: string;

  /** Task capabilities this model supports */
  capabilities: string[];

  /** Model routing tier (Architecture.md §7) */
  tier?: "LIGHT" | "MID" | "HEAVY";

  /** Context window size in tokens */
  contextWindow?: number;

  /** Expected latency in milliseconds */
  expectedLatencyMs?: number;

  /** Input price per 1,000 tokens (USD) */
  inputPricePer1k: number;

  /** Output price per 1,000 tokens (USD) */
  outputPricePer1k: number;

  /** Cached/prompt-caching input price per 1,000 tokens (USD), if applicable */
  cachedInputPricePer1k?: number;

  /** Batch API input price per 1,000 tokens (USD), if applicable */
  batchInputPricePer1k?: number;

  /** Batch API output price per 1,000 tokens (USD), if applicable */
  batchOutputPricePer1k?: number;

  /**
   * Provider-specific pricing dimensions not covered above.
   * Examples: priority pricing, vision surcharges, audio tokens, etc.
   */
  pricingDimensions?: Record<string, unknown>;

  /** Whether this model is currently active */
  active: boolean;
}

// ─────────────────────────────────────────────────────
// PRICING SOURCE RESULT
// ─────────────────────────────────────────────────────

/**
 * Result from a provider pricing source fetch.
 * Each source returns this normalized structure.
 */
export interface PricingSourceResult {
  /** Provider name (must match Provider.name in database) */
  providerName: string;

  /** Official pricing source URL */
  sourceUrl: string;

  /** Timestamp when pricing was fetched */
  fetchedAt: Date;

  /** Models with their pricing data */
  models: NormalizedModelPricing[];

  /** Whether the fetch was successful */
  success: boolean;

  /** Error message if fetch failed */
  error?: string;
}

// ─────────────────────────────────────────────────────
// PRICING CHANGE DETECTION
// ─────────────────────────────────────────────────────

/**
 * Result of comparing current database pricing with fetched pricing.
 */
export interface PricingChangeResult {
  /** Model identifier */
  modelIdentifier: string;

  /** Whether pricing has changed */
  hasChanged: boolean;

  /** Previous input price (from database) */
  previousInputPrice?: number;

  /** New input price (from source) */
  newInputPrice?: number;

  /** Previous output price (from database) */
  previousOutputPrice?: number;

  /** New output price (from source) */
  newOutputPrice?: number;

  /** Whether this is a new model (not in database) */
  isNewModel: boolean;
}

// ─────────────────────────────────────────────────────
// SYNC RESULT
// ─────────────────────────────────────────────────────

/**
 * Result of a pricing synchronization run.
 */
export interface SyncResult {
  providerName: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  modelsSynced: number;
  pricesUpdated: number;
  error?: string;
  changes: PricingChangeResult[];
}

// ─────────────────────────────────────────────────────
// PRICING SOURCE INTERFACE
// ─────────────────────────────────────────────────────

/**
 * Contract that every provider pricing source must implement.
 *
 * Pricing sources fetch and normalize pricing data from official
 * provider sources (APIs or pricing pages). They do NOT use the
 * provider SDKs — pricing data is typically available from
 * public APIs or documentation pages.
 */
export interface PricingSource {
  /** Provider identifier (must match Provider.name in database) */
  readonly providerName: string;

  /** Official pricing source URL */
  readonly sourceUrl: string;

  /**
   * Fetch and normalize current pricing from the provider.
   * Must not throw — return success: false on failure.
   */
  fetchPricing(): Promise<PricingSourceResult>;
}

// ─────────────────────────────────────────────────────
// MANUAL REGISTRATION
// ─────────────────────────────────────────────────────

/**
 * Input for manual model/pricing registration.
 * Used when automatic pricing extraction is unavailable.
 */
export interface ManualModelInput {
  providerName: string;
  modelIdentifier: string;
  displayName: string;
  capabilities: string[];
  tier?: "LIGHT" | "MID" | "HEAVY";
  contextWindow?: number;
  expectedLatencyMs?: number;
  inputPricePer1k: number;
  outputPricePer1k: number;
  cachedInputPricePer1k?: number;
  batchInputPricePer1k?: number;
  batchOutputPricePer1k?: number;
  pricingDimensions?: Record<string, unknown>;
  active?: boolean;
}

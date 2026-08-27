/**
 * Attentra — Pricing Module Public API
 *
 * Architecture.md v2.0 §7, §9, §10
 *
 * Barrel export for the pricing module. The routing engine (Phase 6)
 * and other services consume pricing through these exports.
 */

// Types
export type {
  NormalizedModelPricing,
  PricingSourceResult,
  PricingChangeResult,
  SyncResult,
  PricingSource,
  ManualModelInput,
} from "./types";

// Sync service
export { syncAllPricing, syncProviderPricing, getRegisteredSourceNames } from "./sync-service";

// Change detection
export { detectPricingChange, applyPricingChange, createModelWithSnapshot } from "./detector";

// Manual registration
export { registerModelManually, registerProviderManually } from "./manual";

// Provider pricing sources
export { OpenAIPricingSource } from "./sources/openai";
export { AnthropicPricingSource } from "./sources/anthropic";
export { GooglePricingSource } from "./sources/google";

// Markdown parser utilities
export {
  parseMarkdownTables,
  extractDollarAmount,
  per1MtoPer1K,
} from "./sources/markdown-parser";

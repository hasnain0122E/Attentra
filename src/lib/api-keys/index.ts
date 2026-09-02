/**
 * Attentra — API Key Module
 *
 * Phase 12.2 — Business API Key Backend Foundation
 *
 * Public API for the API key lifecycle:
 *
 *   import {
 *     generateApiKey,
 *     hashApiKey,
 *     createBusinessApiKey,
 *     validateApiKey,
 *     revokeBusinessApiKey,
 *     listBusinessApiKeys,
 *   } from "@/lib/api-keys";
 */

// ── Types ────────────────────────────────────────────

export type {
  CreatedApiKey,
  ValidatedApiKey,
  ApiKeyValidationResult,
  ValidationFailureReason,
  ApiKeyMetadata,
} from "./types";

// ── Cryptography ─────────────────────────────────────

export {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  buildKeyPrefix,
  isPlausibleApiKey,
} from "./crypto";

// ── Service ──────────────────────────────────────────

export {
  createBusinessApiKey,
  validateApiKey,
  revokeBusinessApiKey,
  listBusinessApiKeys,
} from "./service";

export type { CreateBusinessApiKeyInput } from "./service";

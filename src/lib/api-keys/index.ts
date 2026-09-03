/**
 * Attentra — API Key Module
 *
 * Phase 12.2 — Business API Key Backend Foundation
 * Phase 12.13.1 — Personal API Key Ownership
 *
 * Public API for the API key lifecycle:
 *
 *   import {
 *     generateApiKey,
 *     hashApiKey,
 *     createBusinessApiKey,
 *     createPersonalApiKey,
 *     validateApiKey,
 *     revokeBusinessApiKey,
 *     revokePersonalApiKey,
 *     listBusinessApiKeys,
 *     listPersonalApiKeys,
 *   } from "@/lib/api-keys";
 */

// ── Types ────────────────────────────────────────────

export type {
  CreatedApiKey,
  ValidatedApiKey,
  ValidatedBusinessKey,
  ValidatedPersonalKey,
  ApiKeyValidationResult,
  ValidationFailureReason,
  ApiKeyMetadata,
  ApiKeyOwnership,
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
  createPersonalApiKey,
  validateApiKey,
  revokeBusinessApiKey,
  revokePersonalApiKey,
  listBusinessApiKeys,
  listPersonalApiKeys,
} from "./service";

export type {
  CreateBusinessApiKeyInput,
  CreatePersonalApiKeyInput,
} from "./service";

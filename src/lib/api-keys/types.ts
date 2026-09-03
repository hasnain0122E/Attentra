/**
 * Attentra — API Key Domain Types
 *
 * Phase 12.2 — Business API Key Backend Foundation
 * Phase 12.13.1 — Personal API Key Ownership
 *
 * Provider-independent types for the API key lifecycle.
 * These types decouple the API key module from Prisma internals.
 *
 * ApiKey supports dual ownership (XOR invariant):
 *   Personal: userId set, businessId null
 *   Business: businessId set, userId null
 */

// ─────────────────────────────────────────────────────
// OWNERSHIP
// ─────────────────────────────────────────────────────

/** Discriminated ownership for an API key. */
export type ApiKeyOwnership =
  | { type: "personal"; userId: string; businessId: null }
  | { type: "business"; userId: null; businessId: string };

// ─────────────────────────────────────────────────────
// CREATION
// ─────────────────────────────────────────────────────

/**
 * Result returned exactly once when a new API key is created.
 *
 * Contains the raw key that must be shown to the user immediately.
 * After this point the raw key can never be reconstructed.
 */
export interface CreatedApiKey {
  /** ApiKey row identifier */
  id: string;

  /** Owner type — personal or business */
  ownership: ApiKeyOwnership;

  /** Human-readable label */
  name: string;

  /**
   * The full raw API key (atr_...).
   *
   * Display to the user ONCE at creation time.
   * Never stored, never returned again.
   */
  rawKey: string;

  /** Short display prefix (e.g. "atr_ab12cd...") */
  keyPrefix: string;

  /** Optional expiry timestamp */
  expiresAt: Date | null;

  /** Creation timestamp */
  createdAt: Date;
}

// ─────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────

/**
 * Successful validation of a business API key.
 */
export interface ValidatedBusinessKey {
  type: "business";
  apiKeyId: string;
  businessId: string;
  userId: null;
  name: string;
  keyPrefix: string;
}

/**
 * Successful validation of a personal API key.
 */
export interface ValidatedPersonalKey {
  type: "personal";
  apiKeyId: string;
  userId: string;
  businessId: null;
  name: string;
  keyPrefix: string;
}

/**
 * Discriminated union of successfully validated API keys.
 */
export type ValidatedApiKey = ValidatedBusinessKey | ValidatedPersonalKey;

/**
 * Discriminated result of API key validation.
 */
export type ApiKeyValidationResult =
  | { valid: true; key: ValidatedApiKey }
  | { valid: false; reason: ValidationFailureReason };

/**
 * Why validation failed.
 *
 * These reasons are safe to return in API error responses
 * (they do not reveal whether the key exists, was revoked, etc.
 * beyond what the caller already knows).
 */
export type ValidationFailureReason =
  | "MALFORMED"
  | "NOT_FOUND"
  | "REVOKED"
  | "EXPIRED"
  | "INVALID_OWNERSHIP";

// ─────────────────────────────────────────────────────
// METADATA (listing / dashboard)
// ─────────────────────────────────────────────────────

/**
 * Safe metadata for a single API key (listing / dashboard).
 *
 * Never contains keyHash or rawKey.
 */
export interface ApiKeyMetadata {
  id: string;
  userId: string | null;
  businessId: string | null;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

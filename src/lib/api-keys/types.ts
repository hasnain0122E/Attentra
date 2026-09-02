/**
 * Attentra — API Key Domain Types
 *
 * Phase 12.2 — Business API Key Backend Foundation
 *
 * Provider-independent types for the API key lifecycle.
 * These types decouple the API key module from Prisma internals.
 */

/**
 * Result returned exactly once when a new API key is created.
 *
 * Contains the raw key that must be shown to the user immediately.
 * After this point the raw key can never be reconstructed.
 */
export interface CreatedApiKey {
  /** ApiKey row identifier */
  id: string;

  /** Business that owns this key */
  businessId: string;

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

/**
 * Result of a successful API key validation.
 *
 * Contains enough information for downstream middleware
 * to resolve request ownership without exposing secrets.
 */
export interface ValidatedApiKey {
  /** ApiKey row identifier */
  apiKeyId: string;

  /** Business that owns this key */
  businessId: string;

  /** Human-readable label */
  name: string;

  /** Short display prefix for logging / dashboards */
  keyPrefix: string;
}

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
  | "EXPIRED";

/**
 * Safe metadata for a single API key (listing / dashboard).
 *
 * Never contains keyHash or rawKey.
 */
export interface ApiKeyMetadata {
  id: string;
  businessId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

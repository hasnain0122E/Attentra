/**
 * Attentra — API Key Cryptography
 *
 * Phase 12.2 — Business API Key Backend Foundation
 *
 * Secure key generation and deterministic SHA-256 hashing.
 *
 * Design:
 *   - Keys use crypto.randomBytes(32) for 256 bits of entropy.
 *   - The human-readable prefix is "atr_".
 *   - The random portion is hex-encoded (64 hex chars).
 *   - SHA-256 hashes the ENTIRE raw key (prefix + secret).
 *   - The display prefix shows "atr_" + first 6 hex chars + "..."
 *     so users can identify keys without revealing the full secret.
 */

import { createHash, randomBytes } from "crypto";

/** Human-readable prefix for all Attentra API keys. */
export const API_KEY_PREFIX = "atr_";

/** Number of random bytes (256 bits of entropy). */
const RANDOM_BYTES = 32;

/** Number of prefix characters shown in the display prefix. */
const DISPLAY_SUFFIX_LENGTH = 6;

/**
 * Generate a new secure API key.
 *
 * Returns:
 *   rawKey    — the full key the user must copy (atr_<64 hex chars>)
 *   keyHash   — SHA-256 hex digest of the raw key (stored in DB)
 *   keyPrefix — short display identifier (atr_ab12cd...)
 */
export function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const secret = randomBytes(RANDOM_BYTES).toString("hex");
  const rawKey = `${API_KEY_PREFIX}${secret}`;

  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: buildKeyPrefix(rawKey),
  };
}

/**
 * Deterministic SHA-256 hash of a raw API key.
 *
 * The same raw key always produces the same hash.
 * Different keys always produce different hashes (SHA-256 collision resistance).
 *
 * Output: lowercase hex string (64 characters).
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Build a short display prefix from a raw key.
 *
 * Example: "atr_ab12cd..."
 *
 * The prefix reveals the key type (atr_) and a few identifying
 * characters, but not enough to reconstruct or guess the full key.
 */
export function buildKeyPrefix(rawKey: string): string {
  const suffix = rawKey.slice(
    API_KEY_PREFIX.length,
    API_KEY_PREFIX.length + DISPLAY_SUFFIX_LENGTH
  );

  return `${API_KEY_PREFIX}${suffix}...`;
}

/**
 * Check whether a string looks like a plausible Attentra API key.
 *
 * This is a fast pre-check before hashing. A key must:
 *   - Start with "atr_"
 *   - Have at least the prefix + DISPLAY_SUFFIX_LENGTH characters
 *
 * This does NOT validate the key against the database.
 */
export function isPlausibleApiKey(rawKey: string): boolean {
  return (
    typeof rawKey === "string" &&
    rawKey.startsWith(API_KEY_PREFIX) &&
    rawKey.length > API_KEY_PREFIX.length + DISPLAY_SUFFIX_LENGTH
  );
}

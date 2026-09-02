/**
 * Attentra — API Key Service
 *
 * Phase 12.2 — Business API Key Backend Foundation
 *
 * Business-scoped API key lifecycle operations:
 *
 *   createBusinessApiKey   — generate + persist (returns raw key once)
 *   validateApiKey         — hash + lookup + status checks
 *   revokeBusinessApiKey   — soft-revoke by setting revokedAt
 *   listBusinessApiKeys    — safe metadata listing (no hash, no raw key)
 *
 * This module is authorization-agnostic. The caller (API route or
 * middleware) is responsible for verifying that the authenticated
 * user has permission to manage keys for the given business.
 */

import type { PrismaClient } from "@prisma/client";

import {
  generateApiKey,
  hashApiKey,
  isPlausibleApiKey,
} from "./crypto";

import type {
  ApiKeyMetadata,
  ApiKeyValidationResult,
  CreatedApiKey,
} from "./types";

// ─────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────

export interface CreateBusinessApiKeyInput {
  businessId: string;
  name: string;
  expiresAt?: Date | null;
}

/**
 * Create a new business API key.
 *
 * The raw key is returned exactly once in the result.
 * Only the SHA-256 hash and a safe display prefix are persisted.
 *
 * @throws Error if businessId or name are invalid
 */
export async function createBusinessApiKey(
  prisma: PrismaClient,
  input: CreateBusinessApiKeyInput
): Promise<CreatedApiKey> {
  // ── Input validation ───────────────────────────────
  if (!input.businessId || typeof input.businessId !== "string") {
    throw new Error("businessId is required");
  }

  if (
    !input.name ||
    typeof input.name !== "string" ||
    input.name.trim().length === 0
  ) {
    throw new Error("name is required and must be non-empty");
  }

  const trimmedName = input.name.trim();

  if (input.expiresAt !== undefined && input.expiresAt !== null) {
    if (
      !(input.expiresAt instanceof Date) ||
      isNaN(input.expiresAt.getTime())
    ) {
      throw new Error("expiresAt must be a valid Date");
    }

    if (input.expiresAt <= new Date()) {
      throw new Error("expiresAt must be in the future");
    }
  }

  // ── Generate secure key ────────────────────────────
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  // ── Persist only the hash + prefix ─────────────────
  const record = await prisma.apiKey.create({
    data: {
      businessId: input.businessId,
      name: trimmedName,
      keyHash,
      keyPrefix,
      expiresAt: input.expiresAt ?? null,
    },
  });

  // ── Return raw key exactly once ────────────────────
  return {
    id: record.id,
    businessId: record.businessId,
    name: record.name,
    rawKey,
    keyPrefix: record.keyPrefix,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  };
}

// ─────────────────────────────────────────────────────
// VALIDATE
// ─────────────────────────────────────────────────────

/**
 * Validate a raw API key and resolve its business ownership.
 *
 * On success, updates lastUsedAt to the current timestamp.
 * On failure, returns a discriminated result with a safe reason.
 *
 * This function is designed to be called from middleware or
 * route handlers that need to authenticate API requests.
 */
export async function validateApiKey(
  prisma: PrismaClient,
  rawKey: string
): Promise<ApiKeyValidationResult> {
  // ── Fast pre-check ─────────────────────────────────
  if (!isPlausibleApiKey(rawKey)) {
    return { valid: false, reason: "MALFORMED" };
  }

  // ── Hash and lookup ────────────────────────────────
  const keyHash = hashApiKey(rawKey);

  const record = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      businessId: true,
      name: true,
      keyPrefix: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!record) {
    return { valid: false, reason: "NOT_FOUND" };
  }

  // ── Revocation check ───────────────────────────────
  if (record.revokedAt !== null) {
    return { valid: false, reason: "REVOKED" };
  }

  // ── Expiry check ───────────────────────────────────
  if (record.expiresAt !== null && record.expiresAt <= new Date()) {
    return { valid: false, reason: "EXPIRED" };
  }

  // ── Update lastUsedAt (fire-and-forget) ────────────
  //
  // This update is best-effort. A failure here must not
  // invalidate a successful validation.
  try {
    await prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });
  } catch {
    // Silently ignore — lastUsedAt is a convenience metric,
    // not a security-critical field.
  }

  return {
    valid: true,
    key: {
      apiKeyId: record.id,
      businessId: record.businessId,
      name: record.name,
      keyPrefix: record.keyPrefix,
    },
  };
}

// ─────────────────────────────────────────────────────
// REVOKE
// ─────────────────────────────────────────────────────

/**
 * Revoke a business API key.
 *
 * The key must belong to the supplied businessId.
 * Sets revokedAt to the current timestamp.
 * Does not delete the row (preserves audit history).
 *
 * @returns true if the key was revoked, false if not found
 *          or not owned by the supplied business
 */
export async function revokeBusinessApiKey(
  prisma: PrismaClient,
  apiKeyId: string,
  businessId: string
): Promise<boolean> {
  if (!apiKeyId || !businessId) {
    return false;
  }

  try {
    const result = await prisma.apiKey.updateMany({
      where: {
        id: apiKeyId,
        businessId,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // updateMany returns the count of updated rows.
    // If 0, the key either doesn't exist or belongs to another business.
    return result.count > 0;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────

/**
 * List all API keys for a business.
 *
 * Returns safe metadata only — never keyHash or rawKey.
 * Keys are ordered by creation date (newest first).
 */
export async function listBusinessApiKeys(
  prisma: PrismaClient,
  businessId: string
): Promise<ApiKeyMetadata[]> {
  if (!businessId) {
    return [];
  }

  const records = await prisma.apiKey.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      businessId: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return records;
}

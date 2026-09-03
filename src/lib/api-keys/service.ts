/**
 * Attentra — API Key Service
 *
 * Phase 12.2 — Business API Key Backend Foundation
 * Phase 12.13.1 — Personal API Key Ownership
 *
 * Unified API key lifecycle operations supporting
 * dual ownership (XOR invariant):
 *
 *   Business keys:  businessId set, userId null
 *   Personal keys:  userId set, businessId null
 *
 * Operations:
 *   createBusinessApiKey   — generate + persist (returns raw key once)
 *   createPersonalApiKey   — generate + persist (returns raw key once)
 *   validateApiKey         — hash + lookup + status + ownership checks
 *   revokeBusinessApiKey   — soft-revoke by setting revokedAt
 *   revokePersonalApiKey   — soft-revoke by setting revokedAt
 *   listBusinessApiKeys    — safe metadata listing (no hash, no raw key)
 *   listPersonalApiKeys    — safe metadata listing (no hash, no raw key)
 *
 * This module is authorization-agnostic. The caller (API route or
 * middleware) is responsible for verifying that the authenticated
 * user has permission to manage keys for the given owner.
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
// INPUT TYPES
// ─────────────────────────────────────────────────────

export interface CreateBusinessApiKeyInput {
  businessId: string;
  name: string;
  expiresAt?: Date | null;
}

export interface CreatePersonalApiKeyInput {
  userId: string;
  name: string;
  expiresAt?: Date | null;
}

// ─────────────────────────────────────────────────────
// SHARED VALIDATION
// ─────────────────────────────────────────────────────

/**
 * Validate common inputs shared by both create paths.
 */
function validateCreateInput(name: string, expiresAt?: Date | null): {
  trimmedName: string;
} {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("name is required and must be non-empty");
  }

  const trimmedName = name.trim();

  if (expiresAt !== undefined && expiresAt !== null) {
    if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime())) {
      throw new Error("expiresAt must be a valid Date");
    }

    if (expiresAt <= new Date()) {
      throw new Error("expiresAt must be in the future");
    }
  }

  return { trimmedName };
}

// ─────────────────────────────────────────────────────
// CREATE — BUSINESS
// ─────────────────────────────────────────────────────

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
  if (!input.businessId || typeof input.businessId !== "string") {
    throw new Error("businessId is required");
  }

  const { trimmedName } = validateCreateInput(input.name, input.expiresAt);

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const record = await prisma.apiKey.create({
    data: {
      businessId: input.businessId,
      userId: null,
      name: trimmedName,
      keyHash,
      keyPrefix,
      expiresAt: input.expiresAt ?? null,
    },
  });

  return {
    id: record.id,
    ownership: {
      type: "business" as const,
      userId: null,
      businessId: record.businessId!,
    },
    name: record.name,
    rawKey,
    keyPrefix: record.keyPrefix,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  };
}

// ─────────────────────────────────────────────────────
// CREATE — PERSONAL
// ─────────────────────────────────────────────────────

/**
 * Create a new personal API key.
 *
 * The raw key is returned exactly once in the result.
 * Only the SHA-256 hash and a safe display prefix are persisted.
 *
 * @throws Error if userId or name are invalid
 */
export async function createPersonalApiKey(
  prisma: PrismaClient,
  input: CreatePersonalApiKeyInput
): Promise<CreatedApiKey> {
  if (!input.userId || typeof input.userId !== "string") {
    throw new Error("userId is required");
  }

  const { trimmedName } = validateCreateInput(input.name, input.expiresAt);

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const record = await prisma.apiKey.create({
    data: {
      userId: input.userId,
      businessId: null,
      name: trimmedName,
      keyHash,
      keyPrefix,
      expiresAt: input.expiresAt ?? null,
    },
  });

  return {
    id: record.id,
    ownership: {
      type: "personal" as const,
      userId: record.userId!,
      businessId: null,
    },
    name: record.name,
    rawKey,
    keyPrefix: record.keyPrefix,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  };
}

// ─────────────────────────────────────────────────────
// VALIDATE (unified — supports both ownership types)
// ─────────────────────────────────────────────────────

/**
 * Validate a raw API key and resolve its ownership.
 *
 * Returns a discriminated result indicating whether the key
 * belongs to a personal user or a business workspace.
 *
 * On success, updates lastUsedAt to the current timestamp.
 * On failure, returns a safe reason without leaking internals.
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
      userId: true,
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

  // ── Ownership resolution (XOR invariant) ───────────
  const hasUser = record.userId !== null;
  const hasBusiness = record.businessId !== null;

  if (hasUser === hasBusiness) {
    // Both set or both null — invalid ownership state
    return { valid: false, reason: "INVALID_OWNERSHIP" };
  }

  // ── Update lastUsedAt (fire-and-forget) ────────────
  try {
    await prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });
  } catch {
    // Silently ignore — lastUsedAt is a convenience metric,
    // not a security-critical field.
  }

  // ── Build discriminated result ─────────────────────
  if (hasUser) {
    return {
      valid: true,
      key: {
        type: "personal" as const,
        apiKeyId: record.id,
        userId: record.userId!,
        businessId: null,
        name: record.name,
        keyPrefix: record.keyPrefix,
      },
    };
  }

  return {
    valid: true,
    key: {
      type: "business" as const,
      apiKeyId: record.id,
      businessId: record.businessId!,
      userId: null,
      name: record.name,
      keyPrefix: record.keyPrefix,
    },
  };
}

// ─────────────────────────────────────────────────────
// REVOKE — BUSINESS
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

    return result.count > 0;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────
// REVOKE — PERSONAL
// ─────────────────────────────────────────────────────

/**
 * Revoke a personal API key.
 *
 * The key must belong to the supplied userId.
 * Sets revokedAt to the current timestamp.
 * Does not delete the row (preserves audit history).
 *
 * @returns true if the key was revoked, false if not found
 *          or not owned by the supplied user
 */
export async function revokePersonalApiKey(
  prisma: PrismaClient,
  apiKeyId: string,
  userId: string
): Promise<boolean> {
  if (!apiKeyId || !userId) {
    return false;
  }

  try {
    const result = await prisma.apiKey.updateMany({
      where: {
        id: apiKeyId,
        userId,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count > 0;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────
// LIST — BUSINESS
// ─────────────────────────────────────────────────────

/**
 * List all API keys for a business.
 *
 * Returns safe metadata only — never keyHash or rawKey.
 * Keys are ordered by creation date (newest first).
 * Excludes personal keys (only returns keys where businessId matches).
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
      userId: true,
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

// ─────────────────────────────────────────────────────
// LIST — PERSONAL
// ─────────────────────────────────────────────────────

/**
 * List all API keys for a user.
 *
 * Returns safe metadata only — never keyHash or rawKey.
 * Keys are ordered by creation date (newest first).
 * Excludes business keys (only returns keys where userId matches).
 */
export async function listPersonalApiKeys(
  prisma: PrismaClient,
  userId: string
): Promise<ApiKeyMetadata[]> {
  if (!userId) {
    return [];
  }

  const records = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
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

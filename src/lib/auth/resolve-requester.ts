/**
 * Attentra — Unified Requester Resolver
 *
 * Phase 12.3 — Unified Authentication + Request Ownership
 *
 * Resolves the identity of an incoming request through two
 * authentication strategies, tried in order:
 *
 *   1. Auth.js session  (dashboard users with browser cookies)
 *   2. Bearer API key   (developer / workspace clients)
 *
 * Returns a discriminated union that downstream route handlers
 * can use to set correct Request ownership:
 *
 *   Session → { authType: "session", userId, businessId: null, apiKeyId: null }
 *   ApiKey  → { authType: "apiKey",  userId: null, businessId, apiKeyId }
 *   None    → { authType: "none" }
 *
 * This module does NOT perform authorization. It only resolves identity.
 * Authorization (role checks, business membership) belongs to the
 * route handler or higher-level middleware.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-keys";

import type { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

/** Authenticated via Auth.js browser session. */
export interface SessionRequester {
  authType: "session";
  userId: string;
  businessId: null;
  apiKeyId: null;
}

/** Authenticated via Business API key. */
export interface ApiKeyRequester {
  authType: "apiKey";
  userId: null;
  businessId: string;
  apiKeyId: string;
}

/** No valid authentication. */
export interface UnauthenticatedRequester {
  authType: "none";
}

export type Requester =
  | SessionRequester
  | ApiKeyRequester
  | UnauthenticatedRequester;

// ─────────────────────────────────────────────────────
// RESOLVER
// ─────────────────────────────────────────────────────

/**
 * Extract a Bearer token from the Authorization header.
 *
 * Supports:
 *   Authorization: Bearer <token>
 *
 * Returns null if the header is absent or malformed.
 */
export function extractBearerToken(
  authorizationHeader: string | null
): string | null {
  if (!authorizationHeader) return null;

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Resolve the identity of an incoming request.
 *
 * Authentication order:
 *   1. Auth.js session (cookie-based)
 *   2. Bearer API key (Authorization header)
 *   3. Unauthenticated
 *
 * The resolver never throws — it returns UnauthenticatedRequester
 * for any failure path (missing header, malformed key, revoked key,
 * expired key, database error).
 */
export async function resolveRequester(
  headers: Headers,
  db: PrismaClient = prisma
): Promise<Requester> {
  // ── 1. Try Auth.js session ─────────────────────────
  const session = await auth();

  if (session?.user?.id) {
    return {
      authType: "session",
      userId: session.user.id,
      businessId: null,
      apiKeyId: null,
    };
  }

  // ── 2. Try Bearer API key ──────────────────────────
  const authorization = headers.get("authorization");
  const token = extractBearerToken(authorization);

  if (token) {
    const result = await validateApiKey(db, token);

    if (result.valid) {
      return {
        authType: "apiKey",
        userId: null,
        businessId: result.key.businessId,
        apiKeyId: result.key.apiKeyId,
      };
    }

    // Key was present but invalid — return none.
    // The route handler decides whether to return 401.
  }

  // ── 3. Unauthenticated ─────────────────────────────
  return { authType: "none" };
}

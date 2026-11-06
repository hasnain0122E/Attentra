/**
 * Attentra — Request Rate Limiting (MVP spend protection)
 *
 * Phase 2B — API rate limiting and spending safeguards
 *
 * Limits requests per API key (and, separately, per browser-session user)
 * over a rolling window, BEFORE routing or any provider call.
 *
 * Two layers, both must allow:
 *
 *   1. Database (cross-instance): counts the subject's Request rows created
 *      in the window. Shared by every Vercel instance. BEST-EFFORT under
 *      concurrency — a request's row (and its apiKeyId/userId) is written
 *      after this check, so simultaneous requests on different instances
 *      can each see the other as not-yet-counted.
 *
 *   2. Instance (in-process sliding window): exact for requests handled by
 *      the same instance — the check-and-reserve step is synchronous, so
 *      concurrent requests on one instance cannot over-admit. Never the
 *      only protection: it does not see other instances.
 *
 * Database errors FAIL CLOSED: the caller must not route or call providers.
 *
 * Configuration (requests per 60 s; "0" disables that subject's limit):
 *   API_KEY_RATE_LIMIT_PER_MINUTE   default 20
 *   SESSION_RATE_LIMIT_PER_MINUTE   default 10
 */

import type { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

/** Whose requests are being limited. */
export type RateLimitSubject =
  | { kind: "apiKey"; apiKeyId: string }
  | { kind: "session"; userId: string };

/** Outcome of a rate-limit check. */
export interface RateLimitDecision {
  allowed: boolean;
  /** Configured requests per window (0 = disabled). */
  limit: number;
  windowSeconds: number;
  /** Seconds until a slot frees up (set when not allowed). */
  retryAfterSeconds?: number;
  /** Which layer rejected the request (set when not allowed). */
  rejectedBy?: "database" | "instance";
}

/** The database could not be queried; the request must not proceed. */
export class RateLimitUnavailableError extends Error {
  constructor(readonly cause: unknown) {
    super("Rate limit check unavailable");
    this.name = "RateLimitUnavailableError";
  }
}

// ─────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────

export const RATE_LIMIT_WINDOW_MS = 60_000;

const DEFAULT_LIMITS: Record<RateLimitSubject["kind"], number> = {
  apiKey: 20,
  session: 10,
};

const ENV_VARS: Record<RateLimitSubject["kind"], string> = {
  apiKey: "API_KEY_RATE_LIMIT_PER_MINUTE",
  session: "SESSION_RATE_LIMIT_PER_MINUTE",
};

/**
 * Configured limit for a subject kind. Invalid values fall back to the
 * default (never silently disable protection); "0" disables.
 */
export function resolveRateLimit(kind: RateLimitSubject["kind"]): number {
  const raw = process.env[ENV_VARS[kind]]?.trim();
  if (!raw) return DEFAULT_LIMITS[kind];

  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_LIMITS[kind];
}

// ─────────────────────────────────────────────────────
// INSTANCE LAYER
// ─────────────────────────────────────────────────────

/** Admission timestamps per subject on this instance. */
const instanceWindows = new Map<string, number[]>();

function subjectKey(subject: RateLimitSubject): string {
  return subject.kind === "apiKey"
    ? `apiKey:${subject.apiKeyId}`
    : `session:${subject.userId}`;
}

function secondsUntilFree(oldestMs: number, nowMs: number, windowMs: number): number {
  return Math.max(1, Math.ceil((oldestMs + windowMs - nowMs) / 1000));
}

/** Clear instance state (tests). */
export function resetInstanceRateLimiter(): void {
  instanceWindows.clear();
}

// ─────────────────────────────────────────────────────
// CHECK
// ─────────────────────────────────────────────────────

/**
 * Check — and on success reserve — one request for the subject.
 *
 * @throws RateLimitUnavailableError when the database layer fails
 */
export async function checkRequestRateLimit(
  db: PrismaClient,
  subject: RateLimitSubject,
  options: { now?: number; limit?: number; windowMs?: number } = {}
): Promise<RateLimitDecision> {
  const limit = options.limit ?? resolveRateLimit(subject.kind);
  const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const windowSeconds = Math.round(windowMs / 1000);

  if (limit === 0) {
    return { allowed: true, limit, windowSeconds };
  }

  // ── 1. Database layer (cross-instance, best-effort) ──
  const windowStart = new Date((options.now ?? Date.now()) - windowMs);

  let recent: { _count: { _all: number }; _min: { createdAt: Date | null } };
  try {
    recent = await db.request.aggregate({
      where:
        subject.kind === "apiKey"
          ? { apiKeyId: subject.apiKeyId, createdAt: { gt: windowStart } }
          : { userId: subject.userId, apiKeyId: null, createdAt: { gt: windowStart } },
      _count: { _all: true },
      _min: { createdAt: true },
    });
  } catch (error) {
    throw new RateLimitUnavailableError(error);
  }

  // Evaluate time after the await so the window reflects "now".
  const now = options.now ?? Date.now();

  if (recent._count._all >= limit) {
    const oldest = recent._min.createdAt?.getTime() ?? now;
    return {
      allowed: false,
      limit,
      windowSeconds,
      retryAfterSeconds: secondsUntilFree(oldest, now, windowMs),
      rejectedBy: "database",
    };
  }

  // ── 2. Instance layer (synchronous check-and-reserve) ──
  const key = subjectKey(subject);
  const hits = (instanceWindows.get(key) ?? []).filter((t) => t > now - windowMs);

  if (hits.length >= limit) {
    instanceWindows.set(key, hits);
    return {
      allowed: false,
      limit,
      windowSeconds,
      retryAfterSeconds: secondsUntilFree(hits[0], now, windowMs),
      rejectedBy: "instance",
    };
  }

  hits.push(now);
  instanceWindows.set(key, hits);

  // Bound memory: drop subjects whose windows have fully expired.
  if (instanceWindows.size > 1_000) {
    for (const [k, v] of instanceWindows) {
      if (v.every((t) => t <= now - windowMs)) instanceWindows.delete(k);
    }
  }

  return { allowed: true, limit, windowSeconds };
}

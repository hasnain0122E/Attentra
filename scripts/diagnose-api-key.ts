/**
 * Attentra — API Key Diagnostic CLI Script
 *
 * Explains why a raw Attentra API key is (or is not) accepted by
 * POST /api/v1/chat/completions, without printing the key.
 *
 * Read-only: performs a single SELECT by key hash. Never writes,
 * never prints the full key or its hash.
 *
 * Usage (PowerShell):
 *   $env:ATTENTRA_API_KEY = Read-Host "Attentra API key"
 *   npx tsx scripts/diagnose-api-key.ts
 *
 * Requires: DATABASE_URL in .env — the result is only meaningful if it
 * points at the same database as the deployment being tested.
 */

import { PrismaClient } from "@prisma/client";
import {
  buildKeyPrefix,
  hashApiKey,
  isPlausibleApiKey,
} from "../src/lib/api-keys/crypto";

async function main() {
  const raw = process.env.ATTENTRA_API_KEY;

  if (!raw) {
    console.error("ATTENTRA_API_KEY is not set.");
    process.exit(1);
  }

  const key = raw.trim();

  // Hostname only — compare with "dbHost:" in the production
  // "[chat-completions] Authentication rejected." log line.
  // Same "<host>/<database>" format as the route's log; no credentials.
  let dbHost = "unset";
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    dbHost = `${url.hostname || "unset"}${url.pathname || ""}`;
  } catch {
    dbHost = "unparseable";
  }
  console.log("Database host:       ", dbHost);

  // ── Shape checks (what the server sees after "Bearer ") ──
  console.log("Display prefix:      ", buildKeyPrefix(key));
  console.log("Length:              ", key.length, "(expected 68)");
  console.log("Surrounding spaces:  ", raw !== key);
  console.log("Contains quotes:     ", /["']/.test(key));
  console.log("Starts with Bearer:  ", /^bearer\s/i.test(key));
  console.log("Is display prefix:   ", key.endsWith("..."));
  console.log("Plausible format:    ", isPlausibleApiKey(key));

  if (!/^atr_[0-9a-f]{64}$/.test(key)) {
    console.log(
      "\nResult: key does not match atr_<64 hex>. Copy the full key shown once at creation.",
    );
    return;
  }

  // ── Database lookup (same query as validateApiKey) ──
  const prisma = new PrismaClient();

  try {
    const record = await prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(key) },
      select: {
        keyPrefix: true,
        userId: true,
        businessId: true,
        revokedAt: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    if (!record) {
      console.log(
        "\nResult: NOT_FOUND — no key with this hash in the configured database.",
      );
      return;
    }

    console.log("Created:             ", record.createdAt.toISOString());
    console.log("Owner:               ", record.userId ? "personal" : record.businessId ? "business" : "none");
    console.log("Revoked:             ", record.revokedAt?.toISOString() ?? "no");
    console.log("Expires:             ", record.expiresAt?.toISOString() ?? "never");
    console.log("Last used:           ", record.lastUsedAt?.toISOString() ?? "never");

    if (record.revokedAt) {
      console.log("\nResult: REVOKED — create a new key in the dashboard.");
    } else if (record.expiresAt && record.expiresAt <= new Date()) {
      console.log("\nResult: EXPIRED — create a new key in the dashboard.");
    } else if (!record.userId === !record.businessId) {
      console.log("\nResult: INVALID_OWNERSHIP — key has no single owner.");
    } else {
      console.log("\nResult: VALID — this key should authenticate.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Diagnostic failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

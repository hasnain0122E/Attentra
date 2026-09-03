/**
 * Attentra — API Key Backend Foundation Tests
 *
 * Phase 12.2 — Security + correctness tests for the API key module.
 * Phase 12.13.1 — Personal API Key ownership tests.
 *
 * Coverage:
 *   GENERATION   — prefix, uniqueness, entropy, hash determinism
 *   CREATION     — persistence, input validation, one-time raw key
 *   VALIDATION   — happy path, malformed, not found, revoked, expired
 *   REVOCATION   — ownership scoping, idempotency
 *   LISTING      — business/personal scoping, no secret leakage
 *   PERSONAL     — create, list, revoke, validation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";

import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  buildKeyPrefix,
  isPlausibleApiKey,
  createBusinessApiKey,
  createPersonalApiKey,
  validateApiKey,
  revokeBusinessApiKey,
  revokePersonalApiKey,
  listBusinessApiKeys,
  listPersonalApiKeys,
} from "@/lib/api-keys";

// ─────────────────────────────────────────────────────
// MOCK PRISMA
// ─────────────────────────────────────────────────────

/**
 * Build a minimal mock Prisma client that simulates the ApiKey table.
 *
 * The mock stores records in memory and supports:
 *   apiKey.create, findUnique, updateMany, findMany, update
 */
function createMockPrisma() {
  const store: Map<string, Record<string, unknown>> = new Map();

  const apiKey = {
    create: vi.fn(
      async ({ data }: { data: Record<string, unknown> }) => {
        const id = `key-${store.size + 1}`;
        const record = {
          id,
          userId: data.userId ?? null,
          businessId: data.businessId ?? null,
          name: data.name,
          keyHash: data.keyHash,
          keyPrefix: data.keyPrefix,
          lastUsedAt: null,
          expiresAt: data.expiresAt ?? null,
          revokedAt: null,
          createdAt: new Date(),
        };
        store.set(id, record);
        return { ...record };
      }
    ),

    findUnique: vi.fn(
      async ({
        where,
        select,
      }: {
        where: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) => {
        for (const record of store.values()) {
          const match = Object.entries(where).every(
            ([key, value]) => record[key] === value
          );
          if (match) {
            if (select) {
              const filtered: Record<string, unknown> = {};
              for (const [key, included] of Object.entries(select)) {
                if (included) filtered[key] = record[key];
              }
              return filtered;
            }
            return { ...record };
          }
        }
        return null;
      }
    ),

    updateMany: vi.fn(
      async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const record of store.values()) {
          const match = Object.entries(where).every(
            ([key, value]) => record[key] === value
          );
          if (match) {
            Object.assign(record, data);
            count++;
          }
        }
        return { count };
      }
    ),

    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        for (const record of store.values()) {
          const match = Object.entries(where).every(
            ([key, value]) => record[key] === value
          );
          if (match) {
            Object.assign(record, data);
            return { ...record };
          }
        }
        throw new Error("Record not found");
      }
    ),

    findMany: vi.fn(
      async ({
        where,
        orderBy: _orderBy,
        select,
      }: {
        where: Record<string, unknown>;
        orderBy?: unknown;
        select?: Record<string, boolean>;
      }) => {
        const results: Record<string, unknown>[] = [];
        for (const record of store.values()) {
          const match = Object.entries(where).every(
            ([key, value]) => record[key] === value
          );
          if (match) {
            if (select) {
              const filtered: Record<string, unknown> = {};
              for (const [key, included] of Object.entries(select)) {
                if (included) filtered[key] = record[key];
              }
              results.push(filtered);
            } else {
              results.push({ ...record });
            }
          }
        }
        return results;
      }
    ),
  };

  return { apiKey, _store: store };
}

// ─────────────────────────────────────────────────────
// 1. KEY GENERATION (crypto.ts)
// ─────────────────────────────────────────────────────

describe("API Key — Generation", () => {
  it("generated key begins with atr_ prefix", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey).toMatch(/^atr_/);
  });

  it("generated keys are unique across 100 iterations", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey().rawKey);
    }
    expect(keys.size).toBe(100);
  });

  it("random portion has at least 32 bytes (64 hex chars)", () => {
    const { rawKey } = generateApiKey();
    const secret = rawKey.slice(API_KEY_PREFIX.length);
    expect(secret.length).toBeGreaterThanOrEqual(64);
    expect(secret).toMatch(/^[0-9a-f]+$/);
  });

  it("total key length is prefix + 64 hex chars = 68 chars", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey.length).toBe(API_KEY_PREFIX.length + 64);
  });

  it("hash is deterministic — same input always produces same hash", () => {
    const { rawKey } = generateApiKey();
    const hash1 = hashApiKey(rawKey);
    const hash2 = hashApiKey(rawKey);
    expect(hash1).toBe(hash2);
  });

  it("different keys produce different hashes", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.keyHash).not.toBe(b.keyHash);
  });

  it("hash is a 64-char lowercase hex SHA-256 digest", () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hash matches independent SHA-256 computation", () => {
    const { rawKey, keyHash } = generateApiKey();
    const independent = createHash("sha256").update(rawKey).digest("hex");
    expect(keyHash).toBe(independent);
  });

  it("raw key differs from stored hash", () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(rawKey).not.toBe(keyHash);
  });

  it("safe prefix does not reveal the complete key", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(keyPrefix.length).toBeLessThan(rawKey.length);
    expect(rawKey).not.toBe(keyPrefix);
    expect(keyPrefix).toMatch(/\.\.\.$/);
  });

  it("buildKeyPrefix produces a deterministic short identifier", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(buildKeyPrefix(rawKey)).toBe(keyPrefix);
  });
});

// ─────────────────────────────────────────────────────
// 2. PLAUSIBILITY CHECK
// ─────────────────────────────────────────────────────

describe("API Key — Plausibility", () => {
  it("accepts a well-formed key", () => {
    const { rawKey } = generateApiKey();
    expect(isPlausibleApiKey(rawKey)).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isPlausibleApiKey("")).toBe(false);
  });

  it("rejects key without atr_ prefix", () => {
    expect(isPlausibleApiKey("xyz_abcdef1234567890")).toBe(false);
  });

  it("rejects key that is too short", () => {
    expect(isPlausibleApiKey("atr_ab")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isPlausibleApiKey(null as unknown as string)).toBe(false);
    expect(isPlausibleApiKey(undefined as unknown as string)).toBe(false);
    expect(isPlausibleApiKey(123 as unknown as string)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// 3. CREATION — BUSINESS
// ─────────────────────────────────────────────────────

describe("API Key — Business Creation", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("persists a key with correct businessId and name", async () => {
    const result = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Production",
    });

    expect(prisma.apiKey.create).toHaveBeenCalledOnce();
    const call = prisma.apiKey.create.mock.calls[0][0];
    expect(call.data.businessId).toBe("biz-1");
    expect(call.data.name).toBe("Production");
    expect(call.data.userId).toBeNull();
  });

  it("database receives keyHash, never rawKey", async () => {
    const result = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    const call = prisma.apiKey.create.mock.calls[0][0];
    const persistedHash = call.data.keyHash as string;
    expect(typeof persistedHash).toBe("string");
    expect(persistedHash.length).toBe(64);
    expect(persistedHash).not.toBe(result.rawKey);
    expect(call.data).not.toHaveProperty("rawKey");
  });

  it("returned result includes rawKey exactly once", async () => {
    const result = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    expect(result.rawKey).toMatch(/^atr_/);
    expect(result.rawKey.length).toBeGreaterThan(10);
  });

  it("returned result includes keyPrefix", async () => {
    const result = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    expect(result.keyPrefix).toMatch(/^atr_.*\.\.\.$/);
  });

  it("ownership is business type", async () => {
    const result = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    expect(result.ownership.type).toBe("business");
    expect(result.ownership.businessId).toBe("biz-1");
    expect(result.ownership.userId).toBeNull();
  });

  it("rejects empty businessId", async () => {
    await expect(
      createBusinessApiKey(prisma as unknown as any, {
        businessId: "",
        name: "Test",
      })
    ).rejects.toThrow("businessId is required");
  });

  it("rejects blank name", async () => {
    await expect(
      createBusinessApiKey(prisma as unknown as any, {
        businessId: "biz-1",
        name: "   ",
      })
    ).rejects.toThrow("name is required");
  });

  it("rejects past expiry date", async () => {
    await expect(
      createBusinessApiKey(prisma as unknown as any, {
        businessId: "biz-1",
        name: "Test",
        expiresAt: new Date("2020-01-01"),
      })
    ).rejects.toThrow("expiresAt must be in the future");
  });

  it("rejects invalid Date for expiresAt", async () => {
    await expect(
      createBusinessApiKey(prisma as unknown as any, {
        businessId: "biz-1",
        name: "Test",
        expiresAt: new Date("not-a-date"),
      })
    ).rejects.toThrow("expiresAt must be a valid Date");
  });

  it("accepts a valid future expiresAt", async () => {
    const future = new Date(Date.now() + 86400000 * 30);
    const result = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
      expiresAt: future,
    });

    expect(result.expiresAt).toEqual(future);
  });
});

// ─────────────────────────────────────────────────────
// 4. CREATION — PERSONAL
// ─────────────────────────────────────────────────────

describe("API Key — Personal Creation", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("persists a key with correct userId and name", async () => {
    await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "My App",
    });

    expect(prisma.apiKey.create).toHaveBeenCalledOnce();
    const call = prisma.apiKey.create.mock.calls[0][0];
    expect(call.data.userId).toBe("user-1");
    expect(call.data.businessId).toBeNull();
    expect(call.data.name).toBe("My App");
  });

  it("ownership is personal type", async () => {
    const result = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    expect(result.ownership.type).toBe("personal");
    expect(result.ownership.userId).toBe("user-1");
    expect(result.ownership.businessId).toBeNull();
  });

  it("raw key returned exactly once", async () => {
    const result = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    expect(result.rawKey).toMatch(/^atr_/);
    expect(result.rawKey.length).toBe(68);
  });

  it("database receives keyHash, never rawKey", async () => {
    const result = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    const call = prisma.apiKey.create.mock.calls[0][0];
    expect(call.data.keyHash).not.toBe(result.rawKey);
    expect(call.data).not.toHaveProperty("rawKey");
  });

  it("rejects empty userId", async () => {
    await expect(
      createPersonalApiKey(prisma as unknown as any, {
        userId: "",
        name: "Test",
      })
    ).rejects.toThrow("userId is required");
  });

  it("rejects blank name", async () => {
    await expect(
      createPersonalApiKey(prisma as unknown as any, {
        userId: "user-1",
        name: "   ",
      })
    ).rejects.toThrow("name is required");
  });

  it("accepts optional expiry", async () => {
    const future = new Date(Date.now() + 86400000 * 30);
    const result = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
      expiresAt: future,
    });

    expect(result.expiresAt).toEqual(future);
  });
});

// ─────────────────────────────────────────────────────
// 5. VALIDATION (unified — supports both types)
// ─────────────────────────────────────────────────────

describe("API Key — Validation", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("valid business key returns type=business", async () => {
    const created = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Production",
    });

    const result = await validateApiKey(
      prisma as unknown as any,
      created.rawKey
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.key.type).toBe("business");
      expect(result.key.apiKeyId).toBeTruthy();
      expect(result.key.businessId).toBe("biz-1");
      expect(result.key.userId).toBeNull();
      expect(result.key.name).toBe("Production");
    }
  });

  it("valid personal key returns type=personal", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "My App",
    });

    const result = await validateApiKey(
      prisma as unknown as any,
      created.rawKey
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.key.type).toBe("personal");
      expect(result.key.apiKeyId).toBeTruthy();
      expect(result.key.userId).toBe("user-1");
      expect(result.key.businessId).toBeNull();
      expect(result.key.name).toBe("My App");
    }
  });

  it("rejects malformed key (no prefix)", async () => {
    const result = await validateApiKey(
      prisma as unknown as any,
      "not-a-real-key"
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("MALFORMED");
    }
  });

  it("rejects empty string", async () => {
    const result = await validateApiKey(prisma as unknown as any, "");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("MALFORMED");
    }
  });

  it("rejects nonexistent key", async () => {
    const result = await validateApiKey(
      prisma as unknown as any,
      "atr_0000000000000000000000000000000000000000000000000000000000000000"
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("NOT_FOUND");
    }
  });

  it("rejects revoked business key", async () => {
    const created = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    await revokeBusinessApiKey(
      prisma as unknown as any,
      created.id,
      "biz-1"
    );

    const result = await validateApiKey(
      prisma as unknown as any,
      created.rawKey
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("REVOKED");
    }
  });

  it("rejects revoked personal key", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    await revokePersonalApiKey(
      prisma as unknown as any,
      created.id,
      "user-1"
    );

    const result = await validateApiKey(
      prisma as unknown as any,
      created.rawKey
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("REVOKED");
    }
  });

  it("rejects expired key", async () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    prisma._store.set("key-expired", {
      id: "key-expired",
      userId: null,
      businessId: "biz-1",
      name: "Expired",
      keyHash,
      keyPrefix,
      lastUsedAt: null,
      expiresAt: new Date(Date.now() - 86400000),
      revokedAt: null,
      createdAt: new Date(),
    });

    const result = await validateApiKey(
      prisma as unknown as any,
      rawKey
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("EXPIRED");
    }
  });

  it("rejects invalid ownership state (both null)", async () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    prisma._store.set("key-invalid", {
      id: "key-invalid",
      userId: null,
      businessId: null,
      name: "Invalid",
      keyHash,
      keyPrefix,
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });

    const result = await validateApiKey(
      prisma as unknown as any,
      rawKey
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("INVALID_OWNERSHIP");
    }
  });

  it("rejects invalid ownership state (both set)", async () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    prisma._store.set("key-both", {
      id: "key-both",
      userId: "user-1",
      businessId: "biz-1",
      name: "Both",
      keyHash,
      keyPrefix,
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });

    const result = await validateApiKey(
      prisma as unknown as any,
      rawKey
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("INVALID_OWNERSHIP");
    }
  });

  it("updates lastUsedAt after successful validation", async () => {
    const created = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    await validateApiKey(prisma as unknown as any, created.rawKey);

    expect(prisma.apiKey.update).toHaveBeenCalled();
    const updateCall = prisma.apiKey.update.mock.calls[0][0];
    expect(updateCall.data.lastUsedAt).toBeInstanceOf(Date);
  });

  it("does NOT update lastUsedAt for invalid key", async () => {
    await validateApiKey(prisma as unknown as any, "atr_tooshort");

    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it("does NOT update lastUsedAt for revoked key", async () => {
    const created = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    await revokeBusinessApiKey(
      prisma as unknown as any,
      created.id,
      "biz-1"
    );

    await validateApiKey(prisma as unknown as any, created.rawKey);

    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// 6. REVOCATION — BUSINESS
// ─────────────────────────────────────────────────────

describe("API Key — Business Revocation", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("revokes a key belonging to the correct business", async () => {
    const created = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    const revoked = await revokeBusinessApiKey(
      prisma as unknown as any,
      created.id,
      "biz-1"
    );

    expect(revoked).toBe(true);
    expect(prisma.apiKey.updateMany).toHaveBeenCalled();
  });

  it("another business cannot revoke the key", async () => {
    const created = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    const revoked = await revokeBusinessApiKey(
      prisma as unknown as any,
      created.id,
      "biz-OTHER"
    );

    expect(revoked).toBe(false);
  });

  it("repeated revocation is idempotent", async () => {
    const created = await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    const first = await revokeBusinessApiKey(
      prisma as unknown as any,
      created.id,
      "biz-1"
    );
    const second = await revokeBusinessApiKey(
      prisma as unknown as any,
      created.id,
      "biz-1"
    );

    expect(first).toBe(true);
    expect(second).toBe(true);
  });

  it("returns false for nonexistent key", async () => {
    const revoked = await revokeBusinessApiKey(
      prisma as unknown as any,
      "nonexistent-id",
      "biz-1"
    );

    expect(revoked).toBe(false);
  });

  it("returns false for empty arguments", async () => {
    expect(
      await revokeBusinessApiKey(prisma as unknown as any, "", "biz-1")
    ).toBe(false);
    expect(
      await revokeBusinessApiKey(prisma as unknown as any, "key-1", "")
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// 7. REVOCATION — PERSONAL
// ─────────────────────────────────────────────────────

describe("API Key — Personal Revocation", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("revokes a key belonging to the correct user", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    const revoked = await revokePersonalApiKey(
      prisma as unknown as any,
      created.id,
      "user-1"
    );

    expect(revoked).toBe(true);
  });

  it("another user cannot revoke the key", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    const revoked = await revokePersonalApiKey(
      prisma as unknown as any,
      created.id,
      "user-OTHER"
    );

    expect(revoked).toBe(false);
  });

  it("returns false for empty arguments", async () => {
    expect(
      await revokePersonalApiKey(prisma as unknown as any, "", "user-1")
    ).toBe(false);
    expect(
      await revokePersonalApiKey(prisma as unknown as any, "key-1", "")
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// 8. LISTING — BUSINESS
// ─────────────────────────────────────────────────────

describe("API Key — Business Listing", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("returns keys scoped by businessId", async () => {
    await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Key A",
    });
    await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Key B",
    });
    await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-2",
      name: "Other Biz Key",
    });

    const keys = await listBusinessApiKeys(
      prisma as unknown as any,
      "biz-1"
    );

    expect(keys).toHaveLength(2);
    expect(keys.every((k) => k.businessId === "biz-1")).toBe(true);
  });

  it("does not return personal keys", async () => {
    await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Personal Key",
    });

    const keys = await listBusinessApiKeys(
      prisma as unknown as any,
      "biz-1"
    );

    expect(keys).toHaveLength(0);
  });

  it("raw key is never returned", async () => {
    await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    const keys = await listBusinessApiKeys(
      prisma as unknown as any,
      "biz-1"
    );

    for (const key of keys) {
      expect(key).not.toHaveProperty("rawKey");
    }
  });

  it("keyHash is never returned", async () => {
    await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    const keys = await listBusinessApiKeys(
      prisma as unknown as any,
      "biz-1"
    );

    for (const key of keys) {
      expect(key).not.toHaveProperty("keyHash");
    }
  });

  it("returns safe metadata fields", async () => {
    await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Test",
    });

    const keys = await listBusinessApiKeys(
      prisma as unknown as any,
      "biz-1"
    );

    expect(keys).toHaveLength(1);
    const key = keys[0];
    expect(key).toHaveProperty("id");
    expect(key).toHaveProperty("userId");
    expect(key).toHaveProperty("businessId");
    expect(key).toHaveProperty("name");
    expect(key).toHaveProperty("keyPrefix");
    expect(key).toHaveProperty("createdAt");
  });

  it("returns empty array for empty businessId", async () => {
    const keys = await listBusinessApiKeys(
      prisma as unknown as any,
      ""
    );

    expect(keys).toEqual([]);
  });

  it("returns empty array when business has no keys", async () => {
    const keys = await listBusinessApiKeys(
      prisma as unknown as any,
      "biz-empty"
    );

    expect(keys).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 9. LISTING — PERSONAL
// ─────────────────────────────────────────────────────

describe("API Key — Personal Listing", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("returns keys scoped by userId", async () => {
    await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Key A",
    });
    await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Key B",
    });
    await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-2",
      name: "Other User Key",
    });

    const keys = await listPersonalApiKeys(
      prisma as unknown as any,
      "user-1"
    );

    expect(keys).toHaveLength(2);
    expect(keys.every((k) => k.userId === "user-1")).toBe(true);
  });

  it("does not return business keys", async () => {
    await createBusinessApiKey(prisma as unknown as any, {
      businessId: "biz-1",
      name: "Business Key",
    });

    const keys = await listPersonalApiKeys(
      prisma as unknown as any,
      "user-1"
    );

    expect(keys).toHaveLength(0);
  });

  it("keyHash is never returned", async () => {
    await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    const keys = await listPersonalApiKeys(
      prisma as unknown as any,
      "user-1"
    );

    for (const key of keys) {
      expect(key).not.toHaveProperty("keyHash");
    }
  });

  it("returns empty array for empty userId", async () => {
    const keys = await listPersonalApiKeys(
      prisma as unknown as any,
      ""
    );

    expect(keys).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 10. SECURITY GUARANTEES
// ─────────────────────────────────────────────────────

describe("API Key — Security Guarantees", () => {
  it("stored hash is always SHA-256 (64 hex chars)", () => {
    for (let i = 0; i < 10; i++) {
      const { keyHash } = generateApiKey();
      expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("key prefix reveals at most 6 random characters", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(keyPrefix.length).toBe(API_KEY_PREFIX.length + 6 + 3);
    expect(keyPrefix.length).toBeLessThan(rawKey.length / 2);
  });

  it("two keys generated in rapid succession are different", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.rawKey).not.toBe(b.rawKey);
    expect(a.keyHash).not.toBe(b.keyHash);
  });
});

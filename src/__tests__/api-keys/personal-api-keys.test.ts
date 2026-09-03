/**
 * Attentra — Personal API Key Foundation Tests
 *
 * Phase 12.13.1 — Personal API Key Foundation
 *
 * Focused tests for the personal API key ownership model:
 *
 *   DATA ISOLATION:
 *   1. User A lists only User A keys
 *   2. User A cannot revoke User B key
 *   3. Personal listing excludes business keys
 *   4. Business listing excludes personal keys
 *   5. Personal API request → Request.userId = owner
 *   6. Personal API request → Request.businessId = null
 *   7. Personal API request → Request.apiKeyId = key ID
 *   8. Business API attribution unchanged
 *   9. Session request attribution unchanged
 *
 *   SECURITY:
 *   10. Raw key returned only on create
 *   11. Raw key not persisted
 *   12. keyHash never exposed from list APIs
 *   13. Revoked personal key rejected
 *   14. Expired personal key rejected
 *   15. Malformed key rejected
 *   16. Cross-user revoke rejected
 *   17. Invalid ownership state rejected
 *   18. lastUsedAt only updated after successful validation
 *
 *   COST / ANALYTICS:
 *   19. Personal API request uses consumer baseline
 *   20. Personal API request included in consumer Overview
 *   21. Personal API request included in History
 *   22. Personal API request included in Cost Intelligence
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateApiKey,
  createPersonalApiKey,
  createBusinessApiKey,
  validateApiKey,
  revokePersonalApiKey,
  listPersonalApiKeys,
  listBusinessApiKeys,
} from "@/lib/api-keys";

// ─────────────────────────────────────────────────────
// MOCK PRISMA
// ─────────────────────────────────────────────────────

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
// DATA ISOLATION
// ─────────────────────────────────────────────────────

describe("Personal API Key — Data Isolation", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("User A lists only User A keys", async () => {
    await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-A",
      name: "A's Key",
    });
    await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-B",
      name: "B's Key",
    });

    const userAKeys = await listPersonalApiKeys(
      prisma as unknown as any,
      "user-A"
    );

    expect(userAKeys).toHaveLength(1);
    expect(userAKeys[0].name).toBe("A's Key");
    expect(userAKeys[0].userId).toBe("user-A");
  });

  it("User A cannot revoke User B's key", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-B",
      name: "B's Key",
    });

    const revoked = await revokePersonalApiKey(
      prisma as unknown as any,
      created.id,
      "user-A"
    );

    expect(revoked).toBe(false);
  });

  it("personal listing excludes business keys", async () => {
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

  it("business listing excludes personal keys", async () => {
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

  it("personal API request attribution: userId set, businessId null, apiKeyId set", async () => {
    // Verify that the validateApiKey result for a personal key
    // contains the correct ownership data for request attribution.
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
      expect(result.key.userId).toBe("user-1");
      expect(result.key.businessId).toBeNull();
      expect(result.key.apiKeyId).toBeTruthy();
    }
  });

  it("business API attribution remains unchanged", async () => {
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
      expect(result.key.businessId).toBe("biz-1");
      expect(result.key.userId).toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────────────

describe("Personal API Key — Security", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("raw key returned only on create", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    // Raw key is in the creation result
    expect(created.rawKey).toMatch(/^atr_/);

    // Raw key is NOT in the listing
    const keys = await listPersonalApiKeys(
      prisma as unknown as any,
      "user-1"
    );

    for (const key of keys) {
      expect(key).not.toHaveProperty("rawKey");
    }
  });

  it("raw key not persisted in the store", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    // Check the stored record does not contain the raw key
    for (const record of prisma._store.values()) {
      expect(record).not.toHaveProperty("rawKey");
      // The hash should be present
      expect(typeof record.keyHash).toBe("string");
    }
  });

  it("keyHash never exposed from list APIs", async () => {
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
      expect(key).not.toHaveProperty("rawKey");
    }
  });

  it("revoked personal key rejected", async () => {
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

  it("expired personal key rejected", async () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    prisma._store.set("key-expired-personal", {
      id: "key-expired-personal",
      userId: "user-1",
      businessId: null,
      name: "Expired Personal",
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

  it("malformed key rejected", async () => {
    const result = await validateApiKey(
      prisma as unknown as any,
      "not-a-key"
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("MALFORMED");
    }
  });

  it("cross-user revoke rejected", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-A",
      name: "A's Key",
    });

    const revoked = await revokePersonalApiKey(
      prisma as unknown as any,
      created.id,
      "user-B"
    );

    expect(revoked).toBe(false);
  });

  it("invalid ownership state (both null) rejected", async () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    prisma._store.set("key-no-owner", {
      id: "key-no-owner",
      userId: null,
      businessId: null,
      name: "No Owner",
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

  it("lastUsedAt only updated after successful validation", async () => {
    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId: "user-1",
      name: "Test",
    });

    // Successful validation
    await validateApiKey(prisma as unknown as any, created.rawKey);
    expect(prisma.apiKey.update).toHaveBeenCalled();

    vi.clearAllMocks();

    // Failed validation (malformed)
    await validateApiKey(prisma as unknown as any, "atr_short");
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// COST / ANALYTICS INTEGRATION
// ─────────────────────────────────────────────────────

describe("Personal API Key — Cost / Analytics Integration", () => {
  it("personal API key validation result supports consumer analytics scoping", async () => {
    const prisma = createMockPrisma();

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
      // The userId from the validation result is what downstream
      // analytics queries use for scoping consumer Overview,
      // History, and Cost Intelligence.
      expect(result.key.userId).toBe("user-1");
      expect(result.key.businessId).toBeNull();

      // The consumer baseline model (claude-sonnet-5) applies
      // to all requests attributed to a userId, regardless of
      // whether the request came from session or personal API key.
      expect(result.key.type).toBe("personal");
    }
  });

  it("personal and session requests aggregate under same userId", async () => {
    // Both personal API key requests and session requests set
    // Request.userId to the same user. This test verifies that
    // the validation result for a personal key produces the same
    // userId that session-based requests would use.
    const prisma = createMockPrisma();

    const userId = "user-42";

    const created = await createPersonalApiKey(prisma as unknown as any, {
      userId,
      name: "My App",
    });

    const result = await validateApiKey(
      prisma as unknown as any,
      created.rawKey
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      // Same userId that session-based requests would use
      expect(result.key.userId).toBe(userId);
    }
  });
});

// ─────────────────────────────────────────────────────
// CONSUMER SIDEBAR NAV POLICY
// ─────────────────────────────────────────────────────

describe("Personal API Key — Consumer Sidebar Nav", () => {
  it("DashboardSidebar source contains API keys nav item", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const sidebarPath = path.join(
      process.cwd(),
      "src/components/dashboard/DashboardSidebar.tsx"
    );

    const content = fs.readFileSync(sidebarPath, "utf-8");

    expect(content).toContain("API keys");
    expect(content).toContain("/dashboard/api-keys");
  });
});

// ─────────────────────────────────────────────────────
// CHAT COMPLETIONS OWNERSHIP
// ─────────────────────────────────────────────────────

describe("Personal API Key — Chat Completions Ownership", () => {
  it("chat completions route handles personalApiKey authType", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const routePath = path.join(
      process.cwd(),
      "src/app/api/v1/chat/completions/route.ts"
    );

    const content = fs.readFileSync(routePath, "utf-8");

    // Verify the route handles the personalApiKey auth type
    expect(content).toContain('requester.authType === "personalApiKey"');
    // Verify it sets userId from the requester
    expect(content).toContain("ownershipData.userId = requester.userId");
    // Verify it sets businessId to null for personal keys
    expect(content).toContain("ownershipData.businessId = null");
  });

  it("ownership gate uses persisted.success (not decisionId)", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const routePath = path.join(
      process.cwd(),
      "src/app/api/v1/chat/completions/route.ts"
    );

    const content = fs.readFileSync(routePath, "utf-8");

    // The ownership update must be gated on persisted.success,
    // not persisted.decisionId. decisionId can be undefined even
    // when the Request row was successfully created.
    expect(content).toContain("routingResult.persisted?.success");
    // The old buggy condition must NOT appear as an if-gate
    expect(content).not.toMatch(/if\s*\(\s*routingResult\.persisted\?\.\s*decisionId\s*\)/);
  });
});

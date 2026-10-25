/**
 * Attentra — Personal API Key Regression Tests
 *
 * Production reliability audit (2026-10-25):
 * 1. Unauthenticated requests return 401, not a 500 "Unable to load API keys"
 *    (requireAuth() redirect was previously caught as a server error).
 * 2. The empty state (new accounts with zero keys) mounts the create modal.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  listPersonalApiKeys: vi.fn(),
  createPersonalApiKey: vi.fn(),
  revokePersonalApiKey: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/api-keys", () => ({
  listPersonalApiKeys: mocks.listPersonalApiKeys,
  createPersonalApiKey: mocks.createPersonalApiKey,
  revokePersonalApiKey: mocks.revokePersonalApiKey,
}));

import { GET, POST } from "@/app/api/dashboard/api-keys/route";
import { DELETE } from "@/app/api/dashboard/api-keys/[apiKeyId]/route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/dashboard/api-keys", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────
// 1. UNAUTHENTICATED → 401
// ─────────────────────────────────────────────────────

describe("Personal API key routes — unauthenticated", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue(null);
  });

  it("GET returns 401 without touching the database", async () => {
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(mocks.listPersonalApiKeys).not.toHaveBeenCalled();
  });

  it("POST returns 401 without creating a key", async () => {
    const res = await POST(postRequest({ name: "test" }));

    expect(res.status).toBe(401);
    expect(mocks.createPersonalApiKey).not.toHaveBeenCalled();
  });

  it("DELETE returns 401 without revoking", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/dashboard/api-keys/k1", {
        method: "DELETE",
      }),
      { params: { apiKeyId: "k1" } },
    );

    expect(res.status).toBe(401);
    expect(mocks.revokePersonalApiKey).not.toHaveBeenCalled();
  });

  it("session without user.id is treated as unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ user: { email: "a@example.com" } });

    const res = await GET();

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────
// 2. AUTHENTICATED — OWNERSHIP + FAILURE MAPPING
// ─────────────────────────────────────────────────────

describe("Personal API key routes — authenticated", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue({ user: { id: "user-new" } });
  });

  it("GET returns an empty list for a new account", async () => {
    mocks.listPersonalApiKeys.mockResolvedValue([]);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, data: [] });
    expect(mocks.listPersonalApiKeys).toHaveBeenCalledWith({}, "user-new");
  });

  it("POST scopes the key to the session user", async () => {
    mocks.createPersonalApiKey.mockResolvedValue({
      id: "k1",
      name: "first",
      rawKey: "atr_" + "a".repeat(64),
      keyPrefix: "atr_aaaaaa...",
      expiresAt: null,
      createdAt: new Date("2026-10-25T00:00:00Z"),
    });

    const res = await POST(postRequest({ name: "first", userId: "attacker" }));

    expect(res.status).toBe(201);
    expect(mocks.createPersonalApiKey).toHaveBeenCalledWith(
      {},
      { userId: "user-new", name: "first", expiresAt: null },
    );
  });

  it("GET still returns 500 for genuine database failures", async () => {
    mocks.listPersonalApiKeys.mockRejectedValue(
      new Error("Server has closed the connection."),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();

    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────
// 3. EMPTY STATE MOUNTS MODALS (source verification)
// ─────────────────────────────────────────────────────

describe("PersonalApiKeysClient empty state", () => {
  it("renders the shared modals in the empty-state branch", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/dashboard/api-keys/PersonalApiKeysClient.tsx",
      "utf-8",
    );

    const emptyStart = content.indexOf("if (apiKeys.length === 0)");
    const fullStart = content.indexOf("// ── Full view");
    expect(emptyStart).toBeGreaterThan(-1);
    expect(fullStart).toBeGreaterThan(emptyStart);

    const emptyBranch = content.slice(emptyStart, fullStart);
    expect(emptyBranch).toContain('setModalState({ type: "create" })');
    expect(emptyBranch).toContain("{modals}");

    // The modals element must contain the create modal
    expect(content).toMatch(/const modals = \([\s\S]*<CreateKeyModal/);
  });
});

/**
 * Attentra — Unified Requester Resolver Tests
 *
 * Phase 12.3 — Focused tests for resolveRequester()
 *
 * Coverage:
 *   - Session auth returns session requester
 *   - Bearer API key returns apiKey requester
 *   - Session takes priority over API key
 *   - Invalid / revoked / expired API key → none
 *   - Missing auth → none
 *   - extractBearerToken edge cases
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─────────────────────────────────────────────────────
// HOISTED MOCKS
// ─────────────────────────────────────────────────────

const { mockAuth, mockValidateApiKey } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockValidateApiKey: vi.fn(),
}));

// ─────────────────────────────────────────────────────
// MODULE MOCKS
// ─────────────────────────────────────────────────────

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/api-keys", () => ({
  validateApiKey: mockValidateApiKey,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// ─────────────────────────────────────────────────────
// IMPORT (after mocks)
// ─────────────────────────────────────────────────────

import {
  resolveRequester,
  extractBearerToken,
} from "@/lib/auth/resolve-requester";

// ─────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
  mockValidateApiKey.mockResolvedValue({
    valid: false,
    reason: "NOT_FOUND",
  });
});

// ─────────────────────────────────────────────────────
// extractBearerToken
// ─────────────────────────────────────────────────────

describe("extractBearerToken", () => {
  it("extracts token from valid Bearer header", () => {
    expect(extractBearerToken("Bearer atr_abc123")).toBe(
      "atr_abc123"
    );
  });

  it("is case-insensitive for Bearer scheme", () => {
    expect(extractBearerToken("bearer atr_abc123")).toBe(
      "atr_abc123"
    );
    expect(extractBearerToken("BEARER atr_abc123")).toBe(
      "atr_abc123"
    );
  });

  it("returns null for null header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
  });

  it("trims whitespace from extracted token", () => {
    expect(extractBearerToken("Bearer  atr_abc123  ")).toBe(
      "atr_abc123"
    );
  });
});

// ─────────────────────────────────────────────────────
// SESSION AUTH
// ─────────────────────────────────────────────────────

describe("resolveRequester — Session Auth", () => {
  it("returns session requester when Auth.js session is valid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    });

    const headers = new Headers();
    const result = await resolveRequester(headers);

    expect(result).toEqual({
      authType: "session",
      userId: "user-1",
      businessId: null,
      apiKeyId: null,
    });
  });

  it("session takes priority over Bearer API key", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });

    const headers = new Headers({
      authorization: "Bearer atr_validkey1234567890",
    });

    const result = await resolveRequester(headers);

    expect(result.authType).toBe("session");
    expect(mockValidateApiKey).not.toHaveBeenCalled();
  });

  it("returns none when session has no user.id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const headers = new Headers();
    const result = await resolveRequester(headers);

    expect(result.authType).toBe("none");
  });

  it("returns none when session is null", async () => {
    mockAuth.mockResolvedValue(null);

    const headers = new Headers();
    const result = await resolveRequester(headers);

    expect(result.authType).toBe("none");
  });
});

// ─────────────────────────────────────────────────────
// API KEY AUTH
// ─────────────────────────────────────────────────────

describe("resolveRequester — API Key Auth", () => {
  it("returns apiKey requester for valid Bearer key", async () => {
    mockAuth.mockResolvedValue(null);
    mockValidateApiKey.mockResolvedValue({
      valid: true,
      key: {
        apiKeyId: "key-1",
        businessId: "biz-1",
        name: "Production",
        keyPrefix: "atr_ab12cd...",
      },
    });

    const headers = new Headers({
      authorization: "Bearer atr_validkey1234567890",
    });

    const result = await resolveRequester(headers);

    expect(result).toEqual({
      authType: "apiKey",
      userId: null,
      businessId: "biz-1",
      apiKeyId: "key-1",
    });
  });

  it("returns none for invalid API key", async () => {
    mockAuth.mockResolvedValue(null);
    mockValidateApiKey.mockResolvedValue({
      valid: false,
      reason: "NOT_FOUND",
    });

    const headers = new Headers({
      authorization: "Bearer atr_nonexistent",
    });

    const result = await resolveRequester(headers);

    expect(result.authType).toBe("none");
  });

  it("returns none for revoked API key", async () => {
    mockAuth.mockResolvedValue(null);
    mockValidateApiKey.mockResolvedValue({
      valid: false,
      reason: "REVOKED",
    });

    const headers = new Headers({
      authorization: "Bearer atr_revokedkey123456789",
    });

    const result = await resolveRequester(headers);

    expect(result.authType).toBe("none");
  });

  it("returns none for expired API key", async () => {
    mockAuth.mockResolvedValue(null);
    mockValidateApiKey.mockResolvedValue({
      valid: false,
      reason: "EXPIRED",
    });

    const headers = new Headers({
      authorization: "Bearer atr_expiredkey12345678",
    });

    const result = await resolveRequester(headers);

    expect(result.authType).toBe("none");
  });

  it("returns none for malformed API key", async () => {
    mockAuth.mockResolvedValue(null);
    mockValidateApiKey.mockResolvedValue({
      valid: false,
      reason: "MALFORMED",
    });

    const headers = new Headers({
      authorization: "Bearer not-a-real-key",
    });

    const result = await resolveRequester(headers);

    expect(result.authType).toBe("none");
  });

  it("returns none when no Authorization header is present", async () => {
    mockAuth.mockResolvedValue(null);

    const headers = new Headers();
    const result = await resolveRequester(headers);

    expect(result.authType).toBe("none");
    expect(mockValidateApiKey).not.toHaveBeenCalled();
  });
});

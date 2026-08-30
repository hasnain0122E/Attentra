/**
 * Attentra — Catalog Sync Tests
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog
 *
 * Tests the database synchronization semantics against a mocked Prisma
 * client and a mocked discovery module:
 *
 *   - upsert by (provider, modelIdentifier) preserves stable internal ids
 *   - new models are created INACTIVE with zero prices (pricing gate)
 *   - existing models keep/lose routability based on their active
 *     PricingSnapshot — never based on the listing alone
 *   - models absent from the listing are deactivated, never deleted
 *   - failed or zero-eligible discovery performs NO writes (fail-safe)
 *
 * No real database and no network access.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/catalog/discovery", () => ({
  discoverCatalog: vi.fn(),
  discoverAllCatalogs: vi.fn(),
}));

import { discoverCatalog } from "@/lib/catalog/discovery";
import { syncProviderCatalog } from "@/lib/catalog/sync";
import type {
  CatalogDiscoveryResult,
  CatalogModelEntry,
} from "@/lib/catalog/types";

// ─────────────────────────────────────────────────────
// MOCK HELPERS
// ─────────────────────────────────────────────────────

interface MockModelRow {
  id: string;
  modelIdentifier: string;
  displayName: string;
  contextWindow: number | null;
  active: boolean;
  pricingSnapshots: Array<{ id: string }>;
}

function createMockPrisma(options?: {
  provider?: { id: string; name: string } | null;
  models?: MockModelRow[];
  deactivatedCount?: number;
}) {
  return {
    provider: {
      findUnique: vi
        .fn()
        .mockResolvedValue(options?.provider === undefined ? { id: "provider-1", name: "openai" } : options.provider),
      create: vi.fn().mockResolvedValue({ id: "provider-new", name: "openai" }),
    },
    model: {
      findMany: vi.fn().mockResolvedValue(options?.models ?? []),
      create: vi.fn().mockResolvedValue({ id: "model-created-1" }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi
        .fn()
        .mockResolvedValue({ count: options?.deactivatedCount ?? 0 }),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

function entry(modelIdentifier: string, overrides?: Partial<CatalogModelEntry>): CatalogModelEntry {
  return {
    providerName: "openai",
    modelIdentifier,
    displayName: modelIdentifier.toUpperCase(),
    ...overrides,
  };
}

function successfulDiscovery(models: CatalogModelEntry[], eligible: CatalogModelEntry[]): CatalogDiscoveryResult {
  return {
    providerName: "openai",
    success: true,
    models,
    eligibleModels: eligible,
    fetchedAt: new Date(),
  };
}

const mockedDiscover = vi.mocked(discoverCatalog);

beforeEach(() => {
  mockedDiscover.mockReset();
});

// ─────────────────────────────────────────────────────
// FAIL-SAFE SEMANTICS
// ─────────────────────────────────────────────────────

describe("Catalog sync — fail-safe", () => {
  it("performs NO database writes when discovery fails", async () => {
    mockedDiscover.mockResolvedValue({
      providerName: "openai",
      success: false,
      models: [],
      eligibleModels: [],
      error: "OPENAI_API_KEY is not configured",
      fetchedAt: new Date(),
    });

    const prisma = createMockPrisma();
    const result = await syncProviderCatalog(prisma as unknown as PrismaClient, "openai");

    expect(result.status).toBe("FAILED");
    expect(result.error).toBeDefined();
    expect(result.created).toBe(0);
    expect(result.deactivated).toBe(0);

    // Nothing touched — previously synced data is never destroyed
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
    expect(prisma.provider.create).not.toHaveBeenCalled();
    expect(prisma.model.findMany).not.toHaveBeenCalled();
    expect(prisma.model.create).not.toHaveBeenCalled();
    expect(prisma.model.update).not.toHaveBeenCalled();
    expect(prisma.model.updateMany).not.toHaveBeenCalled();
    expect(prisma.model.delete).not.toHaveBeenCalled();
    expect(prisma.model.deleteMany).not.toHaveBeenCalled();
  });

  it("performs NO database writes when the listing yields zero eligible models", async () => {
    mockedDiscover.mockResolvedValue(
      successfulDiscovery(
        [entry("text-embedding-3-small"), entry("whisper-1")],
        []
      )
    );

    const prisma = createMockPrisma();
    const result = await syncProviderCatalog(prisma as unknown as PrismaClient, "openai");

    expect(result.status).toBe("FAILED");
    expect(result.discovered).toBe(0);
    expect(prisma.model.findMany).not.toHaveBeenCalled();
    expect(prisma.model.updateMany).not.toHaveBeenCalled();
    // The whole provider catalog must not be deactivated on a suspicious listing
    expect(prisma.model.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// UPSERT SEMANTICS
// ─────────────────────────────────────────────────────

describe("Catalog sync — upsert", () => {
  it("creates newly discovered models INACTIVE with zero prices (pricing gate keeps them non-routable)", async () => {
    mockedDiscover.mockResolvedValue(
      successfulDiscovery([entry("gpt-5.2")], [entry("gpt-5.2")])
    );

    const prisma = createMockPrisma({ provider: null, models: [] });
    const result = await syncProviderCatalog(prisma as unknown as PrismaClient, "openai");

    // Logical provider row ensured
    expect(prisma.provider.create).toHaveBeenCalledWith({
      data: { name: "openai" },
    });

    expect(prisma.model.create).toHaveBeenCalledTimes(1);
    expect(prisma.model.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerId: "provider-new",
        modelIdentifier: "gpt-5.2",
        inputPricePer1k: 0,
        outputPricePer1k: 0,
        active: false,
        tier: "HEAVY",
        contextWindow: 272_000,
      }),
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
  });

  it("refreshes existing models by stable internal id — never delete + recreate", async () => {
    const existing: MockModelRow = {
      id: "model-stable-1",
      modelIdentifier: "gpt-4o",
      displayName: "GPT-4o",
      contextWindow: 128_000,
      active: true,
      pricingSnapshots: [{ id: "snap-1" }],
    };

    mockedDiscover.mockResolvedValue(
      successfulDiscovery(
        [entry("gpt-4o", { displayName: "GPT-4o Refreshed" })],
        [entry("gpt-4o", { displayName: "GPT-4o Refreshed" })]
      )
    );

    const prisma = createMockPrisma({ models: [existing] });
    const result = await syncProviderCatalog(prisma as unknown as PrismaClient, "openai");

    // Update targets the existing internal id — history stays intact
    expect(prisma.model.update).toHaveBeenCalledWith({
      where: { id: "model-stable-1" },
      data: {
        displayName: "GPT-4o Refreshed",
        contextWindow: 128_000,
        active: true,
      },
    });
    expect(prisma.model.create).not.toHaveBeenCalled();
    expect(prisma.model.delete).not.toHaveBeenCalled();
    expect(prisma.model.deleteMany).not.toHaveBeenCalled();

    expect(result.status).toBe("SUCCESS");
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  it("keeps existing models without an active PricingSnapshot non-routable", async () => {
    // A model that lost its active snapshot (pricing gate) must never be
    // re-activated just because it appears in the listing.
    const existing: MockModelRow = {
      id: "model-unpriced-1",
      modelIdentifier: "gpt-4o",
      displayName: "GPT-4o",
      contextWindow: 128_000,
      active: true,
      pricingSnapshots: [], // no active snapshot
    };

    mockedDiscover.mockResolvedValue(
      successfulDiscovery([entry("gpt-4o")], [entry("gpt-4o")])
    );

    const prisma = createMockPrisma({ models: [existing] });
    await syncProviderCatalog(prisma as unknown as PrismaClient, "openai");

    expect(prisma.model.update).toHaveBeenCalledWith({
      where: { id: "model-unpriced-1" },
      data: expect.objectContaining({ active: false }),
    });
  });
});

// ─────────────────────────────────────────────────────
// DEACTIVATION SEMANTICS
// ─────────────────────────────────────────────────────

describe("Catalog sync — deactivation", () => {
  it("deactivates active models absent from the eligible listing (never deletes)", async () => {
    const existing: MockModelRow[] = [
      {
        id: "model-current-1",
        modelIdentifier: "gpt-5.2",
        displayName: "GPT 5.2",
        contextWindow: 272_000,
        active: true,
        pricingSnapshots: [{ id: "snap-1" }],
      },
      {
        id: "model-stale-1",
        modelIdentifier: "gpt-old-retired",
        displayName: "GPT Old",
        contextWindow: 8_192,
        active: true,
        pricingSnapshots: [{ id: "snap-2" }],
      },
    ];

    mockedDiscover.mockResolvedValue(
      successfulDiscovery([entry("gpt-5.2")], [entry("gpt-5.2")])
    );

    const prisma = createMockPrisma({ models: existing, deactivatedCount: 1 });
    const result = await syncProviderCatalog(prisma as unknown as PrismaClient, "openai");

    expect(prisma.model.updateMany).toHaveBeenCalledWith({
      where: {
        providerId: "provider-1",
        active: true,
        modelIdentifier: { notIn: ["gpt-5.2"] },
      },
      data: { active: false },
    });
    expect(prisma.model.delete).not.toHaveBeenCalled();
    expect(prisma.model.deleteMany).not.toHaveBeenCalled();

    expect(result.status).toBe("SUCCESS");
    expect(result.deactivated).toBe(1);
  });
});

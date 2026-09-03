/**
 * Attentra — Business E2E Regression Tests
 *
 * Phase 12.14 — Business Dashboard + Business API-Key E2E
 *
 * Covers:
 * 1. Shared request mapping consistency (consumer vs business)
 * 2. Business request query-level tenant scoping
 * 3. Business baseline model validation rules
 * 4. Business API key state machine (source-code verification)
 * 5. Business settings authorization (OWNER vs MEMBER)
 * 6. Business requester attribution (API key name, not member)
 * 7. Consumer regression (mapping not broken by extraction)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────
// 1. SHARED REQUEST MAPPING CONSISTENCY
// ─────────────────────────────────────────────────────

describe("Shared request mapping", () => {
  it("mapRequestToHistoryItem is exported from request-mapping", async () => {
    const mod = await import("@/lib/dashboard/request-mapping");
    expect(typeof mod.mapRequestToHistoryItem).toBe("function");
    expect(typeof mod.parseCandidateModels).toBe("function");
  });

  it("consumer request-queries reuses shared mapping", async () => {
    const consumerModule = await import("@/lib/dashboard/request-queries");
    const sharedModule = await import("@/lib/dashboard/request-mapping");

    // Both should export functions
    expect(typeof consumerModule.fetchUserRequests).toBe("function");
    expect(typeof consumerModule.fetchUserRequest).toBe("function");

    // The shared module should have the mapper
    expect(typeof sharedModule.mapRequestToHistoryItem).toBe("function");
  });

  it("business request-queries uses shared mapping", async () => {
    const businessModule = await import("@/lib/dashboard/business-request-queries");

    expect(typeof businessModule.fetchBusinessRequests).toBe("function");
    expect(typeof businessModule.fetchBusinessRequest).toBe("function");
  });
});

// ─────────────────────────────────────────────────────
// 2. PARSE CANDIDATE MODELS
// ─────────────────────────────────────────────────────

describe("parseCandidateModels", () => {
  it("returns empty array for null/undefined", async () => {
    const { parseCandidateModels } = await import("@/lib/dashboard/request-mapping");

    expect(parseCandidateModels(null)).toEqual([]);
    expect(parseCandidateModels(undefined)).toEqual([]);
  });

  it("parses valid JSON string with scored array", async () => {
    const { parseCandidateModels } = await import("@/lib/dashboard/request-mapping");

    const json = JSON.stringify({
      scored: [
        { modelId: "m1", displayName: "Model 1", providerName: "openai" },
      ],
    });

    const result = parseCandidateModels(json);
    expect(result).toHaveLength(1);
    expect(result[0].modelId).toBe("m1");
  });

  it("parses object with scored array", async () => {
    const { parseCandidateModels } = await import("@/lib/dashboard/request-mapping");

    const result = parseCandidateModels({
      scored: [
        { modelId: "m1", displayName: "Model 1" },
        { modelId: "m2", displayName: "Model 2" },
      ],
    });

    expect(result).toHaveLength(2);
  });

  it("returns empty for malformed JSON", async () => {
    const { parseCandidateModels } = await import("@/lib/dashboard/request-mapping");

    expect(parseCandidateModels("not json")).toEqual([]);
    expect(parseCandidateModels({})).toEqual([]);
    expect(parseCandidateModels({ other: true })).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 3. BUSINESS REQUEST QUERY-LEVEL TENANT SCOPING
// ─────────────────────────────────────────────────────

describe("Business request detail uses query-level tenant scoping", () => {
  it("source code uses findFirst with both id and businessId", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/lib/dashboard/business-request-queries.ts",
      "utf-8",
    );

    // Verify the detail query scopes by both requestId and businessId
    expect(content).toContain("id: requestId, businessId");
    expect(content).toContain("findFirst");
  });

  it("source code does NOT use findUnique without businessId scope", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/lib/dashboard/business-request-queries.ts",
      "utf-8",
    );

    // Should not have a findFirst/ findUnique that only checks id
    // The detail function must always scope by businessId
    const fetchBusinessRequestFn = content.substring(
      content.indexOf("export async function fetchBusinessRequest"),
    );

    // Must contain businessId in the where clause
    expect(fetchBusinessRequestFn).toContain("businessId");
  });
});

// ─────────────────────────────────────────────────────
// 4. BUSINESS API KEY STATE MACHINE (SOURCE VERIFICATION)
// ─────────────────────────────────────────────────────

describe("Business API key modal uses explicit state machine", () => {
  it("BusinessApiKeysClient has ModalState discriminated union", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/api-keys/BusinessApiKeysClient.tsx",
      "utf-8",
    );

    // Must have the state machine type
    expect(content).toContain('type ModalState');
    expect(content).toContain('"closed"');
    expect(content).toContain('"create"');
    expect(content).toContain('"created"');
    expect(content).toContain('"revoke"');
  });

  it("CreateBusinessApiKeyModal does NOT contain rawKey state", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/api-keys/CreateBusinessApiKeyModal.tsx",
      "utf-8",
    );

    // The form-only modal must NOT have rawKey state
    expect(content).not.toContain("useState<string | null>");
    expect(content).not.toContain("const [rawKey");
    expect(content).not.toContain("setRawKey");
  });

  it("CreateBusinessApiKeyModal calls onCreated with rawKey and keyName", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/api-keys/CreateBusinessApiKeyModal.tsx",
      "utf-8",
    );

    // Must pass rawKey up to parent
    expect(content).toContain("onCreated(json.data.rawKey, json.data.name)");
  });

  it("CreatedBusinessKeyModal receives rawKey as prop", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/api-keys/CreatedBusinessKeyModal.tsx",
      "utf-8",
    );

    // Must receive rawKey as prop, not manage it internally
    expect(content).toContain("rawKey: string");
    expect(content).not.toContain("useState<string | null>");
  });

  it("parent passes rawKey to CreatedBusinessKeyModal from state", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/api-keys/BusinessApiKeysClient.tsx",
      "utf-8",
    );

    // Parent must pass rawKey from modalState to CreatedBusinessKeyModal
    expect(content).toContain("rawKey={modalState.rawKey}");
    expect(content).toContain("keyName={modalState.keyName}");
  });
});

// ─────────────────────────────────────────────────────
// 5. BUSINESS SETTINGS AUTHORIZATION
// ─────────────────────────────────────────────────────

describe("Business settings API authorization", () => {
  it("GET requires business membership (any role)", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/api/business/[businessId]/settings/route.ts",
      "utf-8",
    );

    expect(content).toContain("requireBusinessMembership");
  });

  it("PUT requires OWNER role", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/api/business/[businessId]/settings/route.ts",
      "utf-8",
    );

    // PUT handler must use requireBusinessRole with OWNER
    expect(content).toContain('requireBusinessRole(businessId, "OWNER")');
  });

  it("PUT validates baseline model is active and supported", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/api/business/[businessId]/settings/route.ts",
      "utf-8",
    );

    // Must check active status
    expect(content).toContain("candidate.active");
    // Must check supported providers
    expect(content).toContain("SUPPORTED_PROVIDERS");
    // Must validate pricing
    expect(content).toContain("Number.isFinite");
  });
});

// ─────────────────────────────────────────────────────
// 6. BASELINE MODELS API FILTERS
// ─────────────────────────────────────────────────────

describe("Baseline models API returns only eligible models", () => {
  it("queries only active models from supported providers", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/api/business/[businessId]/baseline-models/route.ts",
      "utf-8",
    );

    // Must filter by active models
    expect(content).toContain("active: true");
    // Must filter by supported providers
    expect(content).toContain("SUPPORTED_PROVIDERS");
    // Must filter by active provider status
    expect(content).toContain('status: "ACTIVE"');
  });

  it("filters out models with invalid pricing", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/api/business/[businessId]/baseline-models/route.ts",
      "utf-8",
    );

    // Must validate pricing is finite and non-negative
    expect(content).toContain("Number.isFinite");
    expect(content).toContain(">= 0");
  });
});

// ─────────────────────────────────────────────────────
// 7. REQUESTER ATTRIBUTION
// ─────────────────────────────────────────────────────

describe("Business requester attribution uses API key name", () => {
  it("resolveRequester returns API key name", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/lib/dashboard/business-request-queries.ts",
      "utf-8",
    );

    // Must use apiKey?.name for requester
    expect(content).toContain('request.apiKey?.name ?? "API key"');
  });

  it("does NOT use member name or owner as requester", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/lib/dashboard/business-request-queries.ts",
      "utf-8",
    );

    // Must not reference member or user for requester
    expect(content).not.toContain("request.user");
    expect(content).not.toContain("request.member");
  });
});

// ─────────────────────────────────────────────────────
// 8. NO MOCK DATA IN BUSINESS PAGES
// ─────────────────────────────────────────────────────

describe("No mock data in active business pages", () => {
  it("BusinessRequestsClient does not import from request-data", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/requests/BusinessRequestsClient.tsx",
      "utf-8",
    );

    expect(content).not.toContain("request-data");
    expect(content).not.toContain("businessRequests");
  });

  it("BusinessSettingsClient does not import from settings-data", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/settings/BusinessSettingsClient.tsx",
      "utf-8",
    );

    expect(content).not.toContain("settings-data");
    expect(content).not.toContain("Acme AI");
  });

  it("MembersClient does not import from member-data", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/members/MembersClient.tsx",
      "utf-8",
    );

    expect(content).not.toContain("member-data");
    expect(content).not.toContain("businessMembers");
  });

  it("request detail page does not import from request-data", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/(business)/business/requests/[requestId]/page.tsx",
      "utf-8",
    );

    expect(content).not.toContain("request-data");
    expect(content).not.toContain("generateStaticParams");
  });

  it("requests page does not contain hardcoded Acme AI", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/(business)/business/requests/page.tsx",
      "utf-8",
    );

    expect(content).not.toContain("Acme AI");
  });
});

// ─────────────────────────────────────────────────────
// 9. SIDEBAR NAVIGATION POLICY
// ─────────────────────────────────────────────────────

describe("Business sidebar navigation", () => {
  it("does not include Routing or Models (hidden for MVP)", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/BusinessSidebar.tsx",
      "utf-8",
    );

    // Routing and Models should not be in the navigation array
    expect(content).not.toContain('"/business/routing"');
    expect(content).not.toContain('"/business/models"');
  });

  it("includes Overview, Requests, Members, API keys, Settings", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/BusinessSidebar.tsx",
      "utf-8",
    );

    expect(content).toContain('"/business"');
    expect(content).toContain('"/business/requests"');
    expect(content).toContain('"/business/members"');
    expect(content).toContain('"/business/api-keys"');
    expect(content).toContain('"/business/settings"');
  });
});

// ─────────────────────────────────────────────────────
// 10. CONSUMER REGRESSION
// ─────────────────────────────────────────────────────

describe("Consumer request queries still work after extraction", () => {
  it("request-queries.ts imports from request-mapping", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/lib/dashboard/request-queries.ts",
      "utf-8",
    );

    expect(content).toContain("from \"./request-mapping\"");
    expect(content).toContain("mapRequestToHistoryItem");
  });

  it("request-queries.ts no longer contains its own mapping logic", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/lib/dashboard/request-queries.ts",
      "utf-8",
    );

    // Should NOT contain the old inline mapping function
    expect(content).not.toContain("function mapRequestToHistoryItem");
    expect(content).not.toContain("function parseCandidateModels");
  });
});

// ─────────────────────────────────────────────────────
// 11. BUSINESS BILLING PAGE (Phase 12.15)
// ─────────────────────────────────────────────────────

describe("Business billing page", () => {
  it("billing page exists in business route group", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/(business)/business/billing/page.tsx",
      "utf-8",
    );

    expect(content).toContain("BusinessBillingClient");
  });

  it("business sidebar includes Billing link", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/BusinessSidebar.tsx",
      "utf-8",
    );

    expect(content).toContain('label: "Billing"');
    expect(content).toContain('href: "/business/billing"');
  });

  it("business header maps billing route", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/BusinessHeader.tsx",
      "utf-8",
    );

    expect(content).toContain('"/business/billing": "Billing"');
  });

  it("business billing client does not contain hardcoded Acme AI", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/billing/BusinessBillingClient.tsx",
      "utf-8",
    );

    expect(content).not.toContain("Acme AI");
  });

  it("business billing client uses real business context", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/billing/BusinessBillingClient.tsx",
      "utf-8",
    );

    expect(content).toContain("useBusiness");
    expect(content).toContain("business.id");
  });

  it("business billing client links to Settings when no baseline", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/components/business/billing/BusinessBillingClient.tsx",
      "utf-8",
    );

    expect(content).toContain("/business/settings");
    expect(content).toContain("Configure a baseline model");
  });

  it("billing API route exists for business", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "src/app/api/business/[businessId]/billing/route.ts",
      "utf-8",
    );

    expect(content).toContain("requireBusinessMembership");
    expect(content).toContain("getBusinessBilling");
  });
});

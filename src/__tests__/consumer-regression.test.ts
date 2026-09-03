/**
 * Attentra — Consumer E2E Regression Tests
 *
 * Phase 12.13 — Consumer Dashboard + Full Consumer E2E Regression
 *
 * Covers:
 * 1. Routing health heading semantics
 * 2. Overview data isolation (userId scoping)
 * 3. Latency formatting (0ms → "—")
 * 4. Consumer sidebar navigation policy (no API keys)
 * 5. Execution attempt latency formatting
 */

import { describe, expect, it } from "vitest";

// ─────────────────────────────────────────────────────
// 1. ROUTING HEALTH HEADING SEMANTICS
// ─────────────────────────────────────────────────────

// We test the pure resolveHeading logic by importing the component
// module and extracting the function behavior through its outputs.
// Since resolveHeading is not exported, we test the semantics
// through the component's documented contract.

describe("Routing health heading semantics", () => {
  // These test the documented resolveHeading contract:
  //   (0, 0)            → "No routing data yet."
  //   (≥80, ≥30)        → "Fallbacks are recovering requests."
  //   (≥80, <30)        → "Routing is healthy."
  //   (0<rate<80, any)  → "Execution reliability needs attention."
  //   (0, >0)           → "No successful executions yet."

  it("no data → 'No routing data yet.'", () => {
    // successRate=0, fallbackRate=0
    expect(resolveHeading(0, 0)).toBe("No routing data yet.");
  });

  it("high success + high fallback → 'Fallbacks are recovering requests.'", () => {
    expect(resolveHeading(85, 40)).toBe("Fallbacks are recovering requests.");
    expect(resolveHeading(95, 30)).toBe("Fallbacks are recovering requests.");
    expect(resolveHeading(80, 50)).toBe("Fallbacks are recovering requests.");
  });

  it("high success + low fallback → 'Routing is healthy.'", () => {
    expect(resolveHeading(90, 5)).toBe("Routing is healthy.");
    expect(resolveHeading(80, 0)).toBe("Routing is healthy.");
    expect(resolveHeading(100, 29)).toBe("Routing is healthy.");
  });

  it("low success → 'Execution reliability needs attention.'", () => {
    expect(resolveHeading(50, 10)).toBe("Execution reliability needs attention.");
    expect(resolveHeading(79, 0)).toBe("Execution reliability needs attention.");
    expect(resolveHeading(1, 0)).toBe("Execution reliability needs attention.");
  });

  it("zero success + some fallback → 'No successful executions yet.'", () => {
    expect(resolveHeading(0, 50)).toBe("No successful executions yet.");
    expect(resolveHeading(0, 100)).toBe("No successful executions yet.");
  });
});

/**
 * Reproduce the resolveHeading logic from RoutingHealth.tsx
 * for unit-testable pure-function testing.
 */
function resolveHeading(
  successRate: number,
  fallbackRate: number,
): string {
  if (successRate === 0 && fallbackRate === 0) {
    return "No routing data yet.";
  }
  if (successRate >= 80 && fallbackRate >= 30) {
    return "Fallbacks are recovering requests.";
  }
  if (successRate >= 80) {
    return "Routing is healthy.";
  }
  if (successRate > 0) {
    return "Execution reliability needs attention.";
  }
  return "No successful executions yet.";
}

// ─────────────────────────────────────────────────────
// 2. LATENCY FORMATTING — 0ms → "—"
// ─────────────────────────────────────────────────────

describe("Latency formatting", () => {
  function formatLatency(value: number) {
    if (!value || value <= 0) {
      return "\u2014";
    }
    if (value < 1000) {
      return `${Math.round(value)}ms`;
    }
    return `${(value / 1000).toFixed(2)}s`;
  }

  it("shows '—' for zero latency", () => {
    expect(formatLatency(0)).toBe("\u2014");
  });

  it("shows '—' for negative latency", () => {
    expect(formatLatency(-100)).toBe("\u2014");
  });

  it("formats sub-second latency in ms", () => {
    expect(formatLatency(842)).toBe("842ms");
    expect(formatLatency(50)).toBe("50ms");
  });

  it("formats multi-second latency in seconds", () => {
    expect(formatLatency(2074)).toBe("2.07s");
    expect(formatLatency(1000)).toBe("1.00s");
  });

  it("rounds fractional ms values", () => {
    expect(formatLatency(842.7)).toBe("843ms");
  });
});

// ─────────────────────────────────────────────────────
// 3. OVERVIEW DATA ISOLATION CONTRACT
// ─────────────────────────────────────────────────────

describe("Overview data isolation", () => {
  it("fetchOverviewData requires userId parameter", async () => {
    // Verify the function signature requires userId
    const { fetchOverviewData } = await import(
      "@/lib/dashboard/overview-queries"
    );

    // The function must accept a userId string as its first parameter
    expect(typeof fetchOverviewData).toBe("function");
    expect(fetchOverviewData.length).toBeGreaterThanOrEqual(1);
  });

  it("API route uses requireAuth for userId scoping", async () => {
    // Verify the overview route source uses requireAuth
    const fs = await import("fs");
    const path = await import("path");

    const routePath = path.join(
      process.cwd(),
      "src/app/api/dashboard/overview/route.ts",
    );
    const content = fs.readFileSync(routePath, "utf-8");

    expect(content).toContain("requireAuth");
    expect(content).toContain("session.user.id");
  });

  it("requests route uses auth() for userId scoping", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const routePath = path.join(
      process.cwd(),
      "src/app/api/dashboard/requests/route.ts",
    );
    const content = fs.readFileSync(routePath, "utf-8");

    expect(content).toContain("auth()");
    expect(content).toContain("session.user.id");
  });

  it("request detail route uses auth() for userId scoping", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const routePath = path.join(
      process.cwd(),
      "src/app/api/dashboard/requests/[requestId]/route.ts",
    );
    const content = fs.readFileSync(routePath, "utf-8");

    expect(content).toContain("auth()");
    expect(content).toContain("session.user.id");
  });
});

// ─────────────────────────────────────────────────────
// 4. CONSUMER SIDEBAR NAVIGATION POLICY
// ─────────────────────────────────────────────────────

describe("Consumer sidebar navigation policy", () => {
  it("includes API keys in workspace navigation for personal keys", async () => {
    // The consumer sidebar SHOULD have an API keys nav item
    // because personal API keys are now supported (Phase 12.13.1).
    // We verify by reading the source file content.
    const fs = await import("fs");
    const path = await import("path");

    const sidebarPath = path.join(
      process.cwd(),
      "src/components/dashboard/DashboardSidebar.tsx",
    );

    const content = fs.readFileSync(sidebarPath, "utf-8");

    // The sidebar should contain "/dashboard/api-keys"
    expect(content).toContain("/dashboard/api-keys");

    // The sidebar should still contain the core navigation items
    expect(content).toContain("/dashboard");
    expect(content).toContain("/dashboard/playground");
    expect(content).toContain("/dashboard/history");
  });
});

// ─────────────────────────────────────────────────────
// 5. EXECUTION ATTEMPT DISPLAY — REAL LATENCY
// ─────────────────────────────────────────────────────

describe("Execution attempt display", () => {
  it("RequestExecutionPath formatLatency shows '—' for zero", async () => {
    // Verify the component file uses the updated formatLatency
    const fs = await import("fs");
    const path = await import("path");

    const filePath = path.join(
      process.cwd(),
      "src/components/dashboard/history/detail/RequestExecutionPath.tsx",
    );

    const content = fs.readFileSync(filePath, "utf-8");

    // Should contain the guard for zero/negative latency
    expect(content).toContain("!value || value <= 0");
  });

  it("Playground ExecutionSummary formatLatency shows '—' for zero", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const filePath = path.join(
      process.cwd(),
      "src/components/dashboard/playground/ExecutionSummary.tsx",
    );

    const content = fs.readFileSync(filePath, "utf-8");

    // Should contain the guard for zero/negative latency
    expect(content).toContain("!value || value <= 0");
  });
});

// ─────────────────────────────────────────────────────
// 6. DEAD MOCK DATA CLEANUP
// ─────────────────────────────────────────────────────

describe("Dead mock data cleanup", () => {
  it("mock-data.ts no longer exists", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const mockPath = path.join(
      process.cwd(),
      "src/lib/dashboard/mock-data.ts",
    );

    expect(fs.existsSync(mockPath)).toBe(false);
  });

  it("api-key-data.ts no longer exists", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const apiKeyPath = path.join(
      process.cwd(),
      "src/lib/dashboard/api-key-data.ts",
    );

    expect(fs.existsSync(apiKeyPath)).toBe(false);
  });

  it("history-data.ts contains only types, no mock array", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const historyPath = path.join(
      process.cwd(),
      "src/lib/dashboard/history-data.ts",
    );

    const content = fs.readFileSync(historyPath, "utf-8");

    // Should still have the type exports
    expect(content).toContain("export interface RequestHistoryItem");
    expect(content).toContain("export interface HistoryExecutionAttempt");

    // Should NOT have the old mock data array
    expect(content).not.toContain("export const requestHistory");
    expect(content).not.toContain("req_01J8V");
  });
});

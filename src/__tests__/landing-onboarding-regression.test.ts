/**
 * Attentra — Landing page & onboarding regression (Phase 3B)
 *
 * Source-level checks (same style as consumer-regression.test.ts):
 * no dead controls, no placeholder links, no fictitious SDK, no
 * over-claims, and the first-call guidance stays in the product.
 */

import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf-8");

const PAGE = "src/app/(marketing)/page.tsx";
const SECTIONS = [
  "Hero",
  "RoutingEngine",
  "ModelFragmentation",
  "HowItWorks",
  "ProductDemo",
  "WhyAttentra",
  "DeveloperIntegration",
  "Pricing",
  "FinalCTA",
].map((name) => `src/components/sections/${name}.tsx`);
const LAYOUT = ["src/components/layout/Navbar.tsx", "src/components/layout/Footer.tsx"];
const LANDING = [...SECTIONS, ...LAYOUT];

describe("landing page composition", () => {
  it("renders the eight-section narrative in order", () => {
    const page = read(PAGE);
    const order = [
      "<Hero />",
      "<ModelFragmentation />",
      "<HowItWorks />",
      "<ProductDemo />",
      "<WhyAttentra />",
      "<DeveloperIntegration />",
      "<Pricing />",
      "<FinalCTA />",
    ].map((tag) => page.indexOf(tag));

    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(page).not.toMatch(/<(Architecture|UseCases|CostIntelligence) \/>/);
  });

  it("every in-page anchor link targets a section that exists", () => {
    const ids = new Set(
      LANDING.flatMap((f) => [...read(f).matchAll(/\bid="([a-z-]+)"/g)].map((m) => m[1])),
    );
    const anchors = LANDING.flatMap((f) =>
      [...read(f).matchAll(/href[:=]\s*\{?["']#([a-z-]+)["']/g)].map((m) => m[1]),
    );

    expect(anchors.length).toBeGreaterThan(5);
    for (const anchor of anchors) expect(ids).toContain(anchor);
  });

  it("has no placeholder destinations", () => {
    const text = LANDING.map(read).join("\n");

    expect(text).not.toMatch(/href[:=]\s*\{?["']#docs["']/);
    expect(text).not.toContain('"https://github.com"');
    expect(text).not.toContain('"https://linkedin.com"');
    expect(text).not.toContain("mailto:hello@attentra.ai");
  });

  it("offers Log in and sign-up in the navigation", () => {
    const nav = read("src/components/layout/Navbar.tsx");

    expect(nav.match(/href="\/login"/g)?.length).toBe(2); // desktop + mobile
    expect(nav.match(/href="\/signup"/g)?.length).toBe(2);
  });
});

describe("landing claims", () => {
  const text = LANDING.map(read).join("\n");

  it.each([
    [/Every time\./],
    [/Optimal match/],
    [/\+73%/],
    [/verified savings/i],
    [/production engine will evaluate/i],
    [/Best fit selected/],
    [/>\s*LIVE\s*</],
  ])("does not contain %s", (pattern) => {
    expect(text).not.toMatch(pattern);
  });

  it("labels simulated and illustrative content", () => {
    expect(read("src/components/sections/ProductDemo.tsx")).toMatch(/SIMULATION/);
    expect(read("src/components/sections/RoutingEngine.tsx")).toMatch(/ILLUSTRATIVE EXAMPLE/);
  });

  it("presents pricing as a preview, not live billing", () => {
    const pricing = read("src/components/sections/Pricing.tsx");

    expect(pricing).toMatch(/NOT YET BILLED/);
    expect(pricing).toMatch(/No\s+payments are collected today/);
    expect(pricing).not.toMatch(/RECOMMENDED|PKR/);
  });
});

describe("developer quickstart", () => {
  const dev = read("src/components/sections/DeveloperIntegration.tsx");

  it("uses the official OpenAI SDK, the production base URL and model auto", () => {
    expect(dev).toContain('import OpenAI from "openai";');
    expect(dev).toContain('baseURL: "https://attentra-nine.vercel.app/api/v1"');
    expect(dev).toContain('model: "auto"');
    expect(dev).not.toMatch(/attentra\.chat\.completions/);
  });

  it("states the current limits without advertising streaming", () => {
    expect(dev).toMatch(/max_tokens up to 4,096/);
    expect(dev).toMatch(/Streaming and tool calls are not\s+supported yet/);
  });
});

describe("authentication pages", () => {
  it.each([["LoginForm"], ["SignupForm"]])("%s is Google-only with no dead controls", (name) => {
    const form = read(`src/components/auth/${name}.tsx`);

    expect(form).toContain("<GoogleButton />");
    expect(form).not.toMatch(/<input/);
    expect(form).not.toMatch(/type="submit"/);
    expect(form).not.toMatch(/#forgot-password|#terms|#privacy/);
  });
});

describe("first-call guidance in the product", () => {
  const keys = read("src/components/dashboard/api-keys/PersonalApiKeysClient.tsx");

  it("API key screens show base URL, SDK example and limits", () => {
    expect(keys).toContain('const API_BASE_URL = "https://attentra-nine.vercel.app/api/v1";');
    expect(keys).toContain("from openai import OpenAI");
    expect(keys).toMatch(/os\.environ\["ATTENTRA_API_KEY"\]/);
    expect(keys).toMatch(/up to 4,096/);
    expect(keys).toMatch(/Streaming isn&apos;t supported yet/);
    // Created-key modal + empty state + full view
    expect(keys.match(/<FirstCallGuide/g)?.length).toBe(3);
  });

  it("new-user overview links to the Playground and API keys", () => {
    const overview = read("src/components/dashboard/overview/DashboardOverviewClient.tsx");

    expect(overview).toContain('href="/dashboard/playground"');
    expect(overview).toContain('href="/dashboard/api-keys"');
  });

  it("unknown actual cost is never shown as zero in the Playground", () => {
    const summary = read("src/components/dashboard/playground/ExecutionSummary.tsx");

    expect(summary).not.toContain("actualCost ?? 0");
    expect(summary).toContain('"Not available"');
  });
});

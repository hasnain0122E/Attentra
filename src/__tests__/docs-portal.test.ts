/**
 * Phase 3C — /docs portal regression tests (source-level, no network).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { searchDocs } from "@/lib/docs/search";
import * as examples from "@/lib/docs/examples";
import { highlight } from "@/lib/docs/highlight";
import {
  DOCS_PAGES,
  PRODUCTION_BASE_URL,
  adjacentDocsPages,
  buildDocsSearchIndex,
  docsHref,
  findDocsPage,
} from "@/lib/docs/navigation";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const CONTENT_DIR = "src/components/docs/content";
const contentSource = readdirSync(join(ROOT, CONTENT_DIR))
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => read(`${CONTENT_DIR}/${f}`))
  .join("\n");

const ALL_EXAMPLES = Object.entries(examples).filter(
  ([, v]) => typeof v === "string",
) as Array<[string, string]>;

describe("docs registry", () => {
  it("every page has content and a unique href", () => {
    const hrefs = DOCS_PAGES.map(docsHref);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    const map = read("src/components/docs/content/index.ts");
    const keys = [...map.matchAll(/^\s+"?([a-z/-]*)"?: [A-Z]\w+,$/gm)].map((m) => m[1]);
    expect(keys.sort()).toEqual(DOCS_PAGES.map((p) => p.slug.join("/")).sort());
    for (const page of DOCS_PAGES) expect(page.description.length).toBeGreaterThan(20);
  });

  it("resolves pages and prev/next", () => {
    expect(findDocsPage(undefined)?.title).toBe("Introduction");
    expect(findDocsPage(["api", "errors"])?.title).toBe("Errors");
    expect(findDocsPage(["nope"])).toBeUndefined();
    const first = DOCS_PAGES[0];
    expect(adjacentDocsPages(first).previous).toBeUndefined();
    expect(adjacentDocsPages(first).next).toBe(DOCS_PAGES[1]);
  });

  it("every registered heading id is rendered by the page content", () => {
    const ids = new Set([...contentSource.matchAll(/<DocsH2 id="([a-z0-9-]+)"/g)].map((m) => m[1]));
    for (const page of DOCS_PAGES) {
      for (const h of page.headings) expect(ids, `${docsHref(page)}#${h.id}`).toContain(h.id);
    }
  });

  it("every internal docs link targets a real page (and heading when anchored)", () => {
    const links = [...contentSource.matchAll(/href="(\/docs[^"]*)"/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(20);
    for (const link of links) {
      const [path, hash] = link.split("#");
      const page = DOCS_PAGES.find((p) => docsHref(p) === path);
      expect(page, link).toBeDefined();
      if (hash) expect(page!.headings.map((h) => h.id), link).toContain(hash);
    }
  });

  it("links outside /docs point only at real app routes", () => {
    const allowed = ["/login", "/dashboard/api-keys", "/dashboard/history"];
    const links = [...contentSource.matchAll(/href="(\/(?!docs)[^"#]*)"/g)].map((m) => m[1]);
    for (const link of links) expect(allowed, link).toContain(link);
  });
});

describe("docs search", () => {
  it("indexes pages and headings", () => {
    const index = buildDocsSearchIndex();
    expect(index.length).toBeGreaterThan(DOCS_PAGES.length);
  });

  it("finds relevant pages and returns empty for nonsense", () => {
    expect(searchDocs("rate limits")[0].href).toBe("/docs/api/rate-limits");
    expect(searchDocs("conversation history").some((r) => r.href.startsWith("/docs/guides/conversation-history"))).toBe(true);
    expect(searchDocs("cost_optimized").some((r) => r.href.startsWith("/docs/concepts/policies"))).toBe(true);
    expect(searchDocs("zzqxv")).toEqual([]);
    expect(searchDocs("   ")).toEqual([]);
  });

  it("every result points at a real page", () => {
    for (const r of searchDocs("api", 50)) {
      expect(DOCS_PAGES.some((p) => docsHref(p) === r.href.split("#")[0])).toBe(true);
    }
  });
});

describe("docs examples", () => {
  it("never contain a real-looking key and use the production base URL", () => {
    for (const [name, code] of ALL_EXAMPLES) {
      expect(code, name).not.toMatch(/atr_[0-9a-f]{16,}/);
      expect(code, name).not.toMatch(/sk-[A-Za-z0-9]{10,}/);
    }
    for (const code of [examples.PY_QUICKSTART, examples.JS_QUICKSTART, examples.CHATBOT_PY]) {
      expect(code).toContain(PRODUCTION_BASE_URL);
    }
    expect(examples.CURL_REQUEST).toContain(`${PRODUCTION_BASE_URL}/chat/completions`);
    expect(examples.CURL_REQUEST).toContain("Authorization: Bearer $ATTENTRA_API_KEY");
  });

  it("use correct SDK option names, model auto, no streaming, no eval, max_tokens within cap", () => {
    for (const code of Object.values(examples.PYTHON_EXAMPLES)) {
      expect(code).not.toMatch(/\bbaseURL\b|\bapiKey\b/);
      expect(code).not.toMatch(/\beval\(/);
    }
    for (const code of Object.values(examples.JAVASCRIPT_EXAMPLES)) {
      expect(code).not.toMatch(/\bbase_url\b|\bapi_key\b/);
    }
    for (const [name, code] of ALL_EXAMPLES) {
      expect(code, name).not.toMatch(/stream["']?\s*[:=]\s*True|stream["']?\s*:\s*true/);
      for (const m of code.matchAll(/max_tokens["']?\s*[=:]\s*(\d+)/g)) {
        expect(Number(m[1]), name).toBeLessThanOrEqual(4096);
      }
    }
    expect(examples.PY_QUICKSTART).toContain('model="auto"');
    expect(examples.JS_QUICKSTART).toContain('model: "auto"');
    expect(examples.CHATBOT_PY).toContain('model="auto"');
    expect(examples.PY_QUICKSTART).toContain('os.environ["ATTENTRA_API_KEY"]');
  });

  it("JSON examples are valid JSON", () => {
    for (const [name, code] of Object.entries(examples.JSON_EXAMPLES)) {
      expect(() => JSON.parse(code), name).not.toThrow();
    }
    const body = JSON.parse(examples.RESPONSE_EXAMPLE);
    expect(body.object).toBe("chat.completion");
    expect(body.model).toBe(body.execution.modelIdentifier);
  });

  it("JavaScript examples parse as ES modules", () => {
    const dir = mkdtempSync(join(tmpdir(), "attentra-docs-js-"));
    for (const [name, code] of Object.entries(examples.JAVASCRIPT_EXAMPLES)) {
      const file = join(dir, `${name}.mjs`);
      writeFileSync(file, code.includes("const client") ? code : `const client = {};\n${code}`);
      expect(() => execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }), name).not.toThrow();
    }
  });

  const python = process.env.ATTENTRA_OPENAI_SDK_PYTHON;
  it.skipIf(!python)("Python examples parse (ast)", () => {
    const dir = mkdtempSync(join(tmpdir(), "attentra-docs-py-"));
    for (const [name, code] of Object.entries(examples.PYTHON_EXAMPLES)) {
      const file = join(dir, `${name}.py`);
      writeFileSync(file, code);
      expect(
        () => execFileSync(python!, ["-I", "-c", "import ast,sys;ast.parse(open(sys.argv[1],encoding='utf-8').read())", file], { stdio: "pipe" }),
        name,
      ).not.toThrow();
    }
  });
});

describe("docs content accuracy guards", () => {
  it("documents source-backed facts and avoids over-claims", () => {
    expect(contentSource).toContain("0.60");
    expect(contentSource).toContain("5 attempts");
    expect(contentSource).toContain("30 seconds");
    expect(contentSource).toContain("does not remember conversations");
    expect(contentSource).not.toMatch(/guaranteed (lowest|cheapest|best)/i);
    expect(contentSource).not.toContain("/v1/responses\"");
    // The requestId REQUEST parameter is intentionally undocumented (see Phase 3C report);
    // the requestId response field is documented.
    const api = read("src/components/docs/content/ApiReference.tsx");
    const parameters = api.slice(api.indexOf("export function ApiParameters"), api.indexOf("export function ApiResponses"));
    expect(parameters).not.toContain("requestId");
  });

  it("highlighter round-trips source text", () => {
    for (const [name, code] of ALL_EXAMPLES) {
      for (const lang of ["python", "javascript", "bash", "json"] as const) {
        expect(highlight(code, lang).map((t) => t.text).join(""), name).toBe(code);
      }
    }
  });
});

describe("site navigation points at /docs", () => {
  it("navbar and footer link to /docs; dashboard sidebar has Docs", () => {
    const nav = read("src/components/layout/Navbar.tsx");
    expect(nav).toContain('{ label: "Docs", href: "/docs" }');
    expect(nav).not.toContain('href: "#developers"');
    expect(nav).toContain('import Link from "next/link"');
    const footer = read("src/components/layout/Footer.tsx");
    expect(footer).toContain('href: "/docs"');
    expect(read("src/components/dashboard/DashboardSidebar.tsx")).toContain('href: "/docs"');
    // Landing developer section remains.
    expect(read("src/app/(marketing)/page.tsx")).toContain("DeveloperIntegration");
  });

  it("/docs is not behind authentication", () => {
    const mw = read("src/middleware.ts");
    expect(mw).toContain('const AUTHENTICATED_PREFIXES = ["/dashboard", "/history"]');
  });
});

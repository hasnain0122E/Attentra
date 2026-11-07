/**
 * Attentra — Documentation registry
 *
 * Single source of truth for the /docs portal: sidebar, search index,
 * breadcrumbs, previous/next links, metadata and static params.
 *
 * `headings` must match the `id`s rendered by each page's <DocsH2>
 * (verified by src/__tests__/docs-portal.test.ts).
 */

export interface DocsHeading {
  id: string;
  title: string;
}

export interface DocsPage {
  /** Path segments after /docs ([] = /docs). */
  slug: string[];
  title: string;
  description: string;
  section: string;
  headings: DocsHeading[];
  /** Extra search terms not present in titles or headings. */
  keywords: string[];
}

export interface DocsSection {
  title: string;
  pages: DocsPage[];
}

export const PRODUCTION_BASE_URL = "https://attentra-nine.vercel.app/api/v1";

export const DOCS_SECTIONS: DocsSection[] = [
  {
    title: "Get started",
    pages: [
      {
        slug: [],
        title: "Introduction",
        description:
          "What Attentra is, what it does between your app and AI providers, and what stays your responsibility.",
        section: "Get started",
        headings: [
          { id: "what-is-attentra", title: "What is Attentra?" },
          { id: "why-routing", title: "Why route requests?" },
          { id: "request-flow", title: "What happens to a request" },
          { id: "responsibilities", title: "What Attentra does and doesn't do" },
          { id: "next-steps", title: "Next steps" },
        ],
        keywords: ["overview", "gateway", "openai compatible", "architecture"],
      },
      {
        slug: ["quickstart"],
        title: "Quickstart",
        description:
          "Create an API key and send your first routed request with the official OpenAI SDK in a few minutes.",
        section: "Get started",
        headings: [
          { id: "create-key", title: "1. Create an API key" },
          { id: "store-key", title: "2. Store the key as an environment variable" },
          { id: "install-sdk", title: "3. Install the OpenAI SDK" },
          { id: "first-request", title: "4. Send your first request" },
          { id: "check-history", title: "5. Find it in History" },
        ],
        keywords: ["getting started", "first request", "setup", "environment variable", "powershell", "export"],
      },
      {
        slug: ["authentication"],
        title: "Authentication",
        description:
          "API key format, the Bearer header, one-time display, storage, revocation and expiry.",
        section: "Get started",
        headings: [
          { id: "bearer", title: "Bearer authentication" },
          { id: "key-format", title: "Key format" },
          { id: "lifecycle", title: "Creating, revoking and expiring keys" },
          { id: "personal-business", title: "Personal and business keys" },
          { id: "storage", title: "Storing keys safely" },
          { id: "auth-errors", title: "Authentication errors" },
        ],
        keywords: ["api key", "atr_", "401", "revoke", "secret", "authorization header"],
      },
    ],
  },
  {
    title: "SDKs",
    pages: [
      {
        slug: ["sdk", "python"],
        title: "Python",
        description: "Use the official OpenAI Python SDK with Attentra.",
        section: "SDKs",
        headings: [
          { id: "install", title: "Install" },
          { id: "client", title: "Create a client" },
          { id: "completion", title: "Send a completion" },
          { id: "attentra-fields", title: "Read Attentra metadata" },
          { id: "policy", title: "Choose a routing policy" },
          { id: "errors", title: "Handle errors" },
        ],
        keywords: ["pip", "openai python", "extra_body", "model_extra", "base_url"],
      },
      {
        slug: ["sdk", "javascript"],
        title: "JavaScript",
        description: "Use the official OpenAI Node.js SDK with Attentra from server-side code.",
        section: "SDKs",
        headings: [
          { id: "install", title: "Install" },
          { id: "client", title: "Create a client" },
          { id: "completion", title: "Send a completion" },
          { id: "policy", title: "Choose a routing policy" },
          { id: "errors", title: "Handle errors" },
          { id: "browser", title: "Never call Attentra from the browser" },
        ],
        keywords: ["node", "npm", "typescript", "baseURL", "openai node"],
      },
      {
        slug: ["sdk", "curl"],
        title: "cURL",
        description: "Call the chat completions endpoint directly over HTTP.",
        section: "SDKs",
        headings: [
          { id: "request", title: "Request" },
          { id: "response", title: "Response" },
          { id: "windows", title: "Windows PowerShell" },
        ],
        keywords: ["http", "rest", "raw request", "invoke-restmethod"],
      },
    ],
  },
  {
    title: "Core concepts",
    pages: [
      {
        slug: ["concepts", "routing"],
        title: "Automatic routing",
        description:
          'What happens when you send model: "auto", step by step, and what the router weighs.',
        section: "Core concepts",
        headings: [
          { id: "auto", title: 'Using model: "auto"' },
          { id: "pipeline", title: "The routing pipeline" },
          { id: "scoring", title: "How models are scored" },
          { id: "estimates", title: "Estimates, not measurements" },
          { id: "explicit", title: "Choosing a model explicitly" },
        ],
        keywords: ["router", "task type", "complexity", "score", "explicit model", "provider/model"],
      },
      {
        slug: ["concepts", "policies"],
        title: "Routing policies",
        description:
          "The four policies — balanced, cost_optimized, quality_first, speed_first — and their exact weights.",
        section: "Core concepts",
        headings: [
          { id: "policies", title: "The four policies" },
          { id: "complexity", title: "How complexity shifts the weights" },
          { id: "using", title: "Selecting a policy" },
          { id: "caveats", title: "What a policy does not guarantee" },
        ],
        keywords: ["balanced", "cost_optimized", "quality_first", "speed_first", "weights"],
      },
      {
        slug: ["concepts", "fallback"],
        title: "Fallback & reliability",
        description:
          "Primary and fallback models, which errors trigger fallback, attempt limits and operator settings.",
        section: "Core concepts",
        headings: [
          { id: "plan", title: "Primary and fallback candidates" },
          { id: "triggers", title: "Which errors trigger fallback" },
          { id: "limits", title: "Attempts and timeouts" },
          { id: "selected-vs-executed", title: "Selected vs executed model" },
          { id: "operator", title: "Operator settings" },
        ],
        keywords: ["retry", "failover", "provider outage", "ROUTING_MAX_FALLBACK_COST_MULTIPLIER", "ROUTING_EXCLUDED_MODELS", "soft", "strict"],
      },
      {
        slug: ["concepts", "models"],
        title: "Models & availability",
        description:
          "Which models can be routed, why a listed model may still be unavailable, and how exclusions work.",
        section: "Core concepts",
        headings: [
          { id: "registry", title: "The model registry" },
          { id: "availability", title: "Listed is not the same as available" },
          { id: "identifiers", title: "Model identifiers" },
        ],
        keywords: ["catalog", "gemini", "claude", "gpt", "retired", "quota", "exclusions"],
      },
    ],
  },
  {
    title: "Guides",
    pages: [
      {
        slug: ["guides", "conversation-history"],
        title: "Conversation history",
        description:
          "Attentra does not remember conversations between calls — your app sends the context it needs each time.",
        section: "Guides",
        headings: [
          { id: "stateless", title: "Each request stands alone" },
          { id: "roles", title: "System, user and assistant messages" },
          { id: "multi-turn", title: "Keeping context across turns" },
          { id: "history-vs-context", title: "Model context vs. the History dashboard" },
        ],
        keywords: ["memory", "messages array", "chat history", "stateless", "multi-turn"],
      },
      {
        slug: ["guides", "context-optimization"],
        title: "Context optimization",
        description:
          "Why long conversations cost more, and how to trim, summarize or retrieve context responsibly.",
        section: "Guides",
        headings: [
          { id: "growth", title: "Why input tokens grow" },
          { id: "sliding-window", title: "Sliding window" },
          { id: "token-budget", title: "Token-aware trimming" },
          { id: "summarize", title: "Summarization and retrieval" },
          { id: "trade-offs", title: "Trade-offs" },
        ],
        keywords: ["tokens", "trim", "window", "summarize", "rag", "retrieval", "cost"],
      },
      {
        slug: ["guides", "usage-and-costs"],
        title: "Usage & costs",
        description:
          "Tokens, projected vs actual cost, savings against a baseline, and how currency is displayed.",
        section: "Guides",
        headings: [
          { id: "tokens", title: "Tokens" },
          { id: "costs", title: "Projected vs actual cost" },
          { id: "savings", title: "Savings" },
          { id: "where", title: "Where to find these numbers" },
          { id: "currency", title: "Currency" },
        ],
        keywords: ["usage", "prompt_tokens", "completion_tokens", "billing", "baseline", "pkr", "usd"],
      },
      {
        slug: ["guides", "build-a-chatbot"],
        title: "Build a chatbot",
        description:
          "A complete terminal chatbot in Python with bounded context, model attribution and error handling.",
        section: "Guides",
        headings: [
          { id: "setup", title: "Setup" },
          { id: "code", title: "The chatbot" },
          { id: "how-it-works", title: "How it works" },
          { id: "which-model", title: "Which model answered?" },
        ],
        keywords: ["python", "dotenv", "terminal", "chat loop", "example"],
      },
    ],
  },
  {
    title: "API reference",
    pages: [
      {
        slug: ["api", "chat-completions"],
        title: "Chat completions",
        description: "POST /api/v1/chat/completions — the only Attentra API endpoint.",
        section: "API reference",
        headings: [
          { id: "endpoint", title: "Endpoint" },
          { id: "example", title: "Example" },
          { id: "compatibility", title: "OpenAI compatibility" },
        ],
        keywords: ["endpoint", "post", "chat/completions", "v1"],
      },
      {
        slug: ["api", "parameters"],
        title: "Parameters",
        description: "Every request field Attentra accepts, its constraints, and fields it rejects.",
        section: "API reference",
        headings: [
          { id: "supported", title: "Supported parameters" },
          { id: "messages", title: "messages" },
          { id: "defaults-only", title: "Accepted only at their default value" },
          { id: "ignored", title: "Accepted with no effect" },
          { id: "unsupported", title: "Not supported" },
        ],
        keywords: ["max_tokens", "temperature", "policy", "taskTypeHint", "requestId", "stream", "tools"],
      },
      {
        slug: ["api", "responses"],
        title: "Response format",
        description: "The OpenAI-compatible envelope plus Attentra's routing and execution metadata.",
        section: "API reference",
        headings: [
          { id: "envelope", title: "OpenAI fields" },
          { id: "attentra", title: "Attentra fields" },
          { id: "example", title: "Full example" },
          { id: "selected-executed", title: "Selected vs executed model" },
        ],
        keywords: ["choices", "usage", "finish_reason", "routing", "execution", "json"],
      },
      {
        slug: ["api", "errors"],
        title: "Errors",
        description: "Error format, HTTP status codes, and what to do about each one.",
        section: "API reference",
        headings: [
          { id: "format", title: "Error format" },
          { id: "codes", title: "Status codes" },
          { id: "vercel", title: "Hosting security checkpoint" },
        ],
        keywords: ["400", "401", "404", "429", "500", "502", "503", "504", "error codes", "troubleshooting"],
      },
      {
        slug: ["api", "rate-limits"],
        title: "Rate limits",
        description: "Request limits per API key and per user, output-token caps, and Retry-After.",
        section: "API reference",
        headings: [
          { id: "limits", title: "Current limits" },
          { id: "behavior", title: "How limits behave" },
          { id: "retry", title: "Handling 429" },
        ],
        keywords: ["429", "retry-after", "throttle", "quota", "4096"],
      },
    ],
  },
  {
    title: "More",
    pages: [
      {
        slug: ["limitations"],
        title: "Limitations & roadmap",
        description: "What Attentra supports today, what it doesn't, and what isn't guaranteed.",
        section: "More",
        headings: [
          { id: "supported", title: "Supported today" },
          { id: "not-supported", title: "Not supported yet" },
          { id: "not-guaranteed", title: "Not guaranteed" },
        ],
        keywords: ["streaming", "tools", "function calling", "multimodal", "roadmap", "billing"],
      },
    ],
  },
];

export const DOCS_PAGES: DocsPage[] = DOCS_SECTIONS.flatMap((s) => s.pages);

export function docsHref(page: Pick<DocsPage, "slug">): string {
  return page.slug.length === 0 ? "/docs" : `/docs/${page.slug.join("/")}`;
}

export function findDocsPage(slug: string[] | undefined): DocsPage | undefined {
  const key = (slug ?? []).join("/");
  return DOCS_PAGES.find((p) => p.slug.join("/") === key);
}

export function adjacentDocsPages(page: DocsPage): {
  previous?: DocsPage;
  next?: DocsPage;
} {
  const index = DOCS_PAGES.indexOf(page);
  return {
    previous: index > 0 ? DOCS_PAGES[index - 1] : undefined,
    next: index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1] : undefined,
  };
}

/** Flat entries for the client-side search (pages and their headings). */
export interface DocsSearchEntry {
  href: string;
  title: string;
  pageTitle: string;
  section: string;
  text: string;
}

export function buildDocsSearchIndex(): DocsSearchEntry[] {
  return DOCS_PAGES.flatMap((page) => {
    const href = docsHref(page);
    const pageEntry: DocsSearchEntry = {
      href,
      title: page.title,
      pageTitle: page.title,
      section: page.section,
      text: [page.title, page.description, ...page.keywords].join(" ").toLowerCase(),
    };
    const headingEntries = page.headings.map((h) => ({
      href: `${href}#${h.id}`,
      title: h.title,
      pageTitle: page.title,
      section: page.section,
      text: [h.title, page.title].join(" ").toLowerCase(),
    }));
    return [pageEntry, ...headingEntries];
  });
}

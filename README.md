# Attentra

**Intelligent model routing for AI cost optimization.**

Attentra sits between your application and multiple LLM providers (OpenAI, Anthropic, Google AI). Every request is analyzed, routed to the most cost-efficient capable model, executed with automatic fallback, and measured against a baseline so verified savings can be billed transparently.

---

## The Problem

Production AI applications overpay for intelligence. Teams pick one premium model for every request — including trivial ones — because evaluating model capability, context windows, and pricing across providers is manual work that never ends. Model catalogs change weekly.

## The Solution

Attentra automates that decision per request:

1. **Analyze** — detect task type and estimate token count / complexity
2. **Route** — score every active model in the registry on capability, context fit, and projected cost
3. **Execute** — call the selected provider adapter; on failure, fall through a provider-diverse fallback chain
4. **Measure** — persist actual usage cost plus an equivalent-usage baseline cost for every request
5. **Bill** — charge 10% of net verified savings per billing period; customers keep 90%

Routing decisions are fully transparent: the API response and dashboards expose the selected model, task type, complexity, projected cost, routing score, candidate ranking, and a concise decision explanation.

## Features

- **Dynamic routing engine** — pure, deterministic scoring pipeline with task-affinity policies, context-window enforcement, and rejection tracking
- **Three provider adapters** — OpenAI, Anthropic, Google AI, built on a common execution abstraction with normalized error codes
- **Automatic fallback** — provider-diverse fallback ordering; a failing provider never dead-ends a request
- **Cost intelligence** — per-request actual cost (real usage × executed model pricing) and baseline cost (same usage priced on the configured baseline model)
- **Billing foundation** — period-level verified savings, 10% optimization fee on net positive savings, separate consumer and business ledgers
- **Two workspaces** — consumer dashboard (playground, history, personal API keys, billing) and business workspace (organization requests, shared API keys, members, settings, billing)
- **API keys** — personal or business scoped; raw key shown exactly once, only a SHA-256 hash is stored; revocation and expiry supported
- **Live pricing intelligence** — model catalog discovery and pricing snapshots kept fresh by a scheduled sync
- **Display currency** — USD internally; PKR presentation conversion (configurable)

## Architecture Overview

```
Client / API
  → validation (POST /api/v1/chat/completions)
  → authentication (Auth.js session or Bearer API key)
  → routing: analyze → candidates → score → persist RoutingDecision
  → reliability gate: core persistence (Request + ownership) verified
  → execution plan → ExecutionOrchestrator → provider adapter → fallback
  → cost intelligence persistence
  → normalized JSON response
```

See [docs/architecture.md](docs/architecture.md) for the full request flow and module boundaries.

## Public API

### `POST /api/v1/chat/completions`

Authenticate with either an Auth.js session cookie or an API key:

```
Authorization: Bearer atr_your_key_here
```

```json
{
  "messages": [
    { "role": "user", "content": "Summarize this paragraph in one line." }
  ],
  "maxTokens": 256
}
```

Optional fields: `maxTokens` (positive integer ≤ 256000), `taskTypeHint`, `policy`, `requestId`.

Success response (abridged):

```json
{
  "success": true,
  "requestId": "req_...",
  "content": "…",
  "routing": {
    "selectedModelId": "…",
    "selectedModelIdentifier": "…",
    "selectedModelDisplayName": "…",
    "selectedProvider": "anthropic",
    "reason": "Mock Model selected for a low-complexity general request based on capability, projected cost, and latency.",
    "taskType": "GENERAL",
    "complexity": "LOW",
    "projectedCost": 0.001,
    "candidates": [ { "rank": 1, "score": 0.87, "selected": true, "…": "…" } ]
  },
  "execution": {
    "modelIdentifier": "…",
    "provider": "anthropic",
    "fallbackUsed": false,
    "usage": { "inputTokens": 10, "outputTokens": 5, "totalTokens": 15 },
    "latencyMs": 420,
    "actualCost": 0.00042
  }
}
```

Errors are normalized — `{ "success": false, "requestId", "error": { "code", "message", "retryable??" } }` — with stable codes mapped to HTTP status (`MISSING_API_KEY` 401, `RATE_LIMIT` 429, `TIMEOUT` 504, `NO_COMPATIBLE_MODELS` 400, `PERSISTENCE_FAILED` 500). Internal details are never exposed.

## Billing Model

Per billing period (defaults to the current calendar month):

```
verifiedSavings    = comparableBaselineCost − comparableActualCost   (net, period level)
billableSavings    = max(verifiedSavings, 0)
optimizationFee    = billableSavings × 0.10
customerNetSavings = billableSavings − optimizationFee
totalCustomerCost  = totalActualUsageCost + optimizationFee
```

- **Comparable requests** are successful requests with both actual and baseline cost. Non-comparable requests still count toward usage cost, and coverage (`comparable / total`) is reported honestly.
- **Net, not summed**: negative-savings requests offset positive ones before the fee. A period of +100 +100 −150 yields a 5-unit fee, not 20.
- **No double counting**: consumer billing covers requests with a user and no business (session or personal key); business billing covers everything scoped to the business, including API-key traffic with no user.
- Negative verified savings are exposed as-is; the fee simply stays 0.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (any reachable instance — Neon works well)
- Google OAuth credentials
- At least one provider API key (OpenAI / Anthropic / Google AI)

### Setup

```bash
npm install

# 1. Configure environment
cp .env.example .env      # then fill in values (see table below)

# 2. Apply the database schema
npx prisma migrate deploy

# 3. Seed the model registry + providers (optional but recommended)
npm run db:seed

# 4. Run
npm run dev               # http://localhost:3000
```

### Environment Variables

All variables below are verified against actual source usage.

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `DATABASE_URL` | server | yes | PostgreSQL connection string (Prisma) |
| `AUTH_SECRET` | server | yes | JWT session encryption (Auth.js v5) |
| `GOOGLE_CLIENT_ID` | server | yes | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | server | yes | Google OAuth client |
| `OPENAI_API_KEY` | server | yes* | OpenAI execution + catalog discovery |
| `ANTHROPIC_API_KEY` | server | yes* | Anthropic execution + catalog discovery |
| `GOOGLE_AI_API_KEY` | server | yes* | Google AI execution + catalog discovery |
| `CRON_SECRET` | server | production | Protects `/api/internal/pricing-sync` |
| `CONSUMER_BASELINE_MODEL` | server | yes | Baseline model identifier for verified savings |
| `NEXT_PUBLIC_DISPLAY_CURRENCY` | public | no | Display currency (default `PKR`) |
| `NEXT_PUBLIC_USD_TO_PKR_RATE` | public | no | Presentation conversion rate (default `277`) |

\* Required for live execution; the app runs without them but cannot execute requests on that provider.

Never set `RUN_LIVE_PROVIDER_TESTS` in production — it is a local test gate that enables real provider calls in E2E tests.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Full Vitest suite (non-live by default) |
| `npm run db:seed` | Seed providers + model registry |
| `npm run pricing:sync` | Manual pricing sync |
| `npm run catalog:sync` | Manual catalog discovery |

## Testing

```bash
npx vitest run          # full suite — unit, API, routing, execution, billing
```

The suite is deterministic and makes **no provider calls** by default; providers are exercised through mocked adapters. A separate live E2E suite (`src/__tests__/e2e/`) runs only when `RUN_LIVE_PROVIDER_TESTS=true` and real credentials are present.

## Deployment (Vercel)

1. Push the repository to GitHub and import it in Vercel (framework auto-detected: Next.js).
2. Add all environment variables from the table above as Production/Preview env vars (server-only values stay server-side; `NEXT_PUBLIC_*` are required at build time).
3. Attach a PostgreSQL database and set `DATABASE_URL`; run `npx prisma migrate deploy` against it once.
4. Deploy. `vercel.json` registers the pricing-sync cron (`0 */10 * * *`, every 10 hours) which calls `GET /api/internal/pricing-sync` with `Authorization: Bearer CRON_SECRET`.
5. Add the production OAuth redirect URI (`https://your-domain/api/auth/callback/google`) in Google Cloud Console.

## Security Notes

- API keys are stored **only** as SHA-256 hashes; the raw key is displayed once at creation and never retrievable.
- Business API-key requests are attributed to the organization (`userId = null`, `businessId` set); personal keys and sessions are attributed to the user (`businessId = null`).
- Provider API keys are server-side only and never shipped to the client.
- Error responses are sanitized (structured codes, no stack traces or SDK messages with credentials).
- `.env` / `.env.local` are git-ignored.

## Known Limitations (MVP)

- Authentication is Google OAuth only; the login page's email/password fields are decorative.
- No payment processing, invoices, or subscription management — billing is calculated and displayed, not charged.
- Billing periods are query-driven; there is no invoice archive.
- There is no per-business Models/Routing analytics or management surface; model-level insight is available per request in history, and the registry itself is engine-owned.
- Business settings are organization-identity only (name/slug); routing defaults are engine policies, not per-business configuration.
- No usage rate limiting per key beyond provider-level errors.

## License

Private project — all rights reserved.

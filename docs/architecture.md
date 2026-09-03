# Attentra — Architecture

A concise map of how a request flows through Attentra and which module owns each step.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + React 18, TypeScript |
| Styling | Tailwind CSS 3, design tokens in `src/styles/design-tokens.css` |
| Database | PostgreSQL via Prisma 6 (Neon-compatible) |
| Auth | Auth.js v5 (NextAuth) — Google OAuth, JWT sessions, Prisma adapter |
| Validation/testing | Vitest (no runtime validation framework) |

## Data Model (prisma/schema.prisma)

- **User / Account / Session / VerificationToken** — Auth.js identity tables
- **Business / Membership** — organizations and role-scoped membership (`OWNER` / `ADMIN` / `MEMBER`)
- **ApiKey** — personal (user-owned) or business (organization-owned) keys; SHA-256 hash, prefix, expiry, revocation, `lastUsedAt`
- **Provider / Model / PricingSnapshot / PricingSyncLog** — model registry + pricing intelligence
- **Request** — every routing+execution attempt: ownership (`userId` / `businessId` / `apiKeyId`), status, prompt/response, latency, `actualCost`, `baselineCost`
- **RoutingDecision** — persisted decision audit: selected model, score, reason, candidate list

**Ownership convention:** `businessId = null` → consumer request (session or personal API key); `businessId` set → business request (business API keys carry `userId = null`). Every aggregation obeys this split.

## Request Flow (POST /api/v1/chat/completions)

```
1. Validation           src/app/api/v1/chat/completions/validation.ts
                        messages shape, roles, maxTokens ≤ 256000
2. Authentication       src/lib/auth/resolve-requester.ts
                        session cookie → Bearer API key → unauthenticated
3. Routing              src/lib/routing/  (layered)
     a. database.ts     load active, priced, capability-compatible candidates
     b. analyzer        task type + token estimate + complexity
     c. candidates.ts   context-window enforcement, rejection tracking
     d. scorer.ts       capability / cost / context scoring → normalized ranking
     e. fallback.ts     provider-diverse fallback ordering
     f. router.ts       pure pipeline orchestration (no I/O)
     g. persistence.ts  RoutingDecision upsert (audit trail)
4. Core-persistence gate (Phase 12.14.1)
                        Request row + ownership MUST be verified before
                        any provider call; otherwise normalized error, no execution
5. Execution plan       src/lib/routing/execution-plan.ts
6. Execution            src/lib/execution/orchestrator.ts
     dispatcher.ts      attempt sequencing, retryable error mapping
     providers/*.ts     OpenAI / Anthropic / Google adapters
     fallback           next target on retryable failure
7. Cost intelligence    src/lib/cost-intelligence/service.ts
                        actualCost (real usage × executed pricing)
                        baselineCost (same usage on baseline model)
                        failure never invalidates a successful execution
8. Response             normalized JSON: routing transparency + execution telemetry
```

Error mapping lives in the route (`errorToHttpStatus`): `401` authentication, `429` rate limit, `504` timeout, `400` invalid/no-compatible-model, `500` persistence failure, `502` default. Messages are sanitized (`sanitizeErrorMessage`) at every layer.

## Routing Domain Purity

`router.ts`, `scorer.ts`, `candidates.ts`, `fallback.ts`, and `explanations.ts` are **pure** — no database, no clock, no SDK. Database access is confined to `database.ts` and `persistence.ts`. This keeps the scoring pipeline unit-testable and deterministic.

## Explanations (shared semantics)

- `explainDecision()` — verbose internal audit string (model, reasons, score, fallbacks, rejections). Persisted on `RoutingDecision.reason`.
- `buildConciseRoutingReason()` — canonical concise sentence used **identically** by the consumer UI, business UI, and the public API `routing.reason` field. Pure, currency-free, fallback-free.

## Cost Intelligence & Billing

- **Per request** (`src/lib/cost-intelligence/`): baseline resolution order — business requests use `Business.baselineModelId`; consumer requests use `CONSUMER_BASELINE_MODEL`; without a baseline only actual cost is stored (savings are never fabricated).
- **Per period** (`src/lib/billing/`): pure `calculateBillingPeriod` computes
  `verifiedSavings → billableSavings (≥0) → optimizationFee (×0.10) → customerNetSavings → totalCustomerCost`
  at the **period level** (net across requests), with coverage = comparable / total costed requests.
- **Aggregators**: consumer (`userId, businessId: null, SUCCESS`) and business (`businessId, SUCCESS` — includes `userId = null` API-key traffic).
- **Currency**: all computation is USD; `src/lib/currency/display-currency.ts` converts for presentation only.

## Scheduled Work

`vercel.json` cron → `0 */10 * * *` → `GET /api/internal/pricing-sync` (also accepts POST) guarded by `Authorization: Bearer CRON_SECRET` → `syncAllPricing` refreshes `PricingSnapshot` rows and logs to `PricingSyncLog`.

## Workspace Surface

- **Marketing** `/`
- **Auth** `/login`, `/signup` (Google OAuth)
- **Consumer** `/dashboard` (overview, playground, history, api-keys, settings) + `/billing`
- **Business** `/business` (overview, requests, api-keys, members, settings) + `/business/billing`
- All authenticated pages render through `useBusiness()` / session context — no hardcoded workspace identity.

## Testing Layout

`src/__tests__/` mirrors the domain: routing (pure + DB integration), execution (orchestrator, adapters), api (route contracts incl. reliability gates), api-keys, auth, billing, cost-intelligence, currency, plus consumer/business E2E regression suites. Live provider E2E is gated behind `RUN_LIVE_PROVIDER_TESTS=true`.

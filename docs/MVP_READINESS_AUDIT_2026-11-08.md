# Attentra — MVP Readiness Audit (Investor Demo, Sunday 2026-11-08)

**Audit date:** Friday 2026-11-06 (evening)
**Commit inspected:** `ff72037` (`main`), plus one uncommitted doc edit (`docs/PRODUCTION_AUTHENTICATION_RESOLUTION_REPORT.md`)
**Mode:** read-only. No source, configuration, dependency, environment, deployment or database changes were made. No paid provider calls. Database access was limited to read-only aggregate queries (counts, model identifiers, timestamps; no prompts, responses or user identifiers).

**Evidence labels used below:**
- **[PROD]**: observed in production (Vercel dashboard, production DB rows, prior production requests).
- **[TEST]**: covered by the local test suite.
- **[SRC]**: read in source only.
- **[ASSUMPTION]**: inferred and not verified.

---

## 1. Executive Assessment

Attentra has a **real, working end-to-end core**:

```text
API key → authenticated request → task/complexity analysis → weighted routing over a live-priced
58-model registry → real provider call → token/cost/savings persistence → dashboard history
```

This was proven in production today. Three API-key requests at 19:43–19:47 UTC executed on Google `gemini-3.1-flash-lite` and were persisted with cost and savings. **[PROD]**

**It is not yet developer-ready in the "OpenRouter alternative" sense.** Three gaps would visibly fail in front of a technical audience:

1. **The OpenAI SDK cannot read responses.** The success body has no `choices`, `id`, `object` or `usage`. `model`, `max_tokens`, `temperature` and `stream` are silently ignored. **[SRC]**
2. **No rate limiting or spend guard.** Any valid key can drive unlimited provider spend, and `maxTokens` accepts up to 256,000. **[SRC]**
3. **Vercel's automatic DDoS mitigation challenged all scripted clients from one IP** after modest traffic, returning 403 HTML. It is not a project rule. A live scripted demo from a single laptop is at risk. **[PROD]**

Multi-provider claims need care:
- **Google** executed via API key **[PROD]**.
- **OpenAI** executed via the Playground (3 requests in 30 days) **[PROD]**.
- **Anthropic has not executed once in 30 days.** It is registered and priced but unverified.
- Fallback is implemented and unit-tested **[TEST]**, but has never been observed in production.

"Intelligent routing" is accurate if described precisely: a **rule-based, explainable weighted scorer** using keyword task detection, length-based complexity, **static family-level latency/capability estimates**, and **live-synced pricing**. It is **not** learned, measured-latency, or quality-evaluated routing. Do not claim "optimal" or "lowest-cost".

**Verdict:** **GO for a demo**, conditional on the P0 items in §9:
- an additive OpenAI-compatible response;
- basic request guards;
- one verified demo path per provider shown;
- a firewall-safe demo plan.

All P0 items are SMALL/MEDIUM changes to existing files. **No rebuild and no new backend are needed.**

---

## 2. Current Architecture

| Layer | Implementation |
|---|---|
| Web/API | Next.js 14.2 App Router on Vercel (project `attentra`, Hobby, Fluid compute in use per usage page) |
| Auth (users) | Auth.js v5 beta, Google OAuth, JWT sessions, PrismaAdapter (`src/auth.ts`, `src/auth.config.ts`, edge-safe `src/middleware.ts`) |
| Auth (API) | `atr_` + 64-hex keys, SHA-256 stored, Bearer (`src/lib/api-keys/*`, `src/lib/auth/resolve-requester.ts`) |
| Data | Neon PostgreSQL via Prisma 6.19 (`prisma/schema.prisma`, 4 migrations, all applied) |
| Routing | `src/lib/routing/*`: analyzer → complexity → candidates (DB) → scorer (policy weights) → execution plan + fallbacks → persistence |
| Execution | `src/lib/execution/*`: orchestrator (fallback, max 5 attempts), executor (30 s per-attempt timeout via `Promise.race`) |
| Providers | `src/lib/providers/{openai,anthropic,google}.ts` (official SDKs; OpenAI uses `chat.completions`) |
| Catalog/pricing | `src/lib/catalog/*` (listing APIs + family rules), `src/lib/pricing/*` (pricing page sync); daily Vercel cron `/api/internal/pricing-sync` (`CRON_SECRET`) |
| Cost/billing | `src/lib/cost-intelligence/*`, `src/lib/billing/*`: actual vs baseline cost, savings, 10% fee (reporting only) |
| UI | Marketing site; consumer dashboard (overview, playground, history, API keys, billing, settings); business dashboard (overview, requests, API keys, members, billing, settings) |

---

## 3. Feature Status Matrix

Effort scale: **S** under 2 h, **M** half a day, **L** more than a day.

| # | Feature | Status | Key files | Evidence | MVP-essential | Severity if broken | Smallest safe improvement | Effort |
|---|---|---|---|---|---|---|---|---|
| 1 | User auth & onboarding | **WORKING** (onboarding PARTIAL) | `src/auth*.ts`, `src/middleware.ts`, `(auth)/login`, `signup` | [PROD] sign-ins in logs; dashboard reachable; [TEST] | Yes | Critical | Add a "first API call" panel on the empty API-keys/overview state (copy-ready snippet) | S |
| 2 | Personal & business key management | **WORKING** (personal), **WORKING** (business, owner-only) | `api/dashboard/api-keys/*`, `api/business/[id]/api-keys/*`, `PersonalApiKeysClient.tsx` | [PROD] keys created/revoked today; [TEST] 25 auth + key suites | Yes | Critical | None for demo | — |
| 3 | Key auth & revocation | **WORKING** | `resolve-requester.ts`, `api-keys/service.ts`, v1 route | [PROD] 3 × 200 today; revoked keys rejected; [TEST] | Yes | Critical | None (diagnostics deployed in `ff72037`) | — |
| 4 | Chat completions API | **WORKING** (Attentra contract) | `api/v1/chat/completions/route.ts`, `validation.ts` | [PROD] 200s with real content; [TEST] | Yes | Critical | See #5 | — |
| 5 | OpenAI request/response compatibility | **BROKEN** for SDKs | same | [SRC] no `choices/id/object/created/model/usage`; `model`, `max_tokens`, `temperature`, `stream` dropped | **Yes (P0)** | High (SDK users fail on first call) | Additive OpenAI envelope + param aliases (§7) | M |
| 6 | Explicit model selection | **MISSING** | `validation.ts` ignores `model` | [SRC] | P1 | Medium | P0: `auto`/absent → routing, unknown value → clear 400. P1: route to a named registry model | S / M |
| 7 | Automatic routing | **WORKING** (heuristic) | `src/lib/routing/*` | [PROD] routed to Gemini 3.1 Flash Lite; [TEST] routing suites; policies `balanced/cost_optimized/quality_first/speed_first` | Yes | High | Document honestly; expose `policy` in docs | S |
| 8 | Provider integration & credentials | **PARTIAL** | `src/lib/providers/*`, Vercel env | Google [PROD] via API; OpenAI [PROD] via Playground; **Anthropic never executed (0 requests/30 d)**; all 3 keys set in Vercel (names verified) | Yes | High | One controlled request per provider before the demo (needs authorization, ~cents) | S |
| 9 | Fallback & retries | **PARTIAL** | `execution/orchestrator.ts`, `errors.ts` | [TEST] retryable vs non-retryable well tested; [PROD] fallback never observed | Yes (claimed in README) | Medium | Keep; demonstrate only via tests/routing UI unless verified | — |
| 10 | Streaming | **MISSING** | — | [SRC] no SSE; `stream:true` silently returns JSON | P1 | Medium (SDK `stream=True` breaks) | P0: reject `stream:true` with clear 400. P2: real SSE | S / L |
| 11 | Model registry & availability | **WORKING** (registry), **PARTIAL** (availability) | `catalog/*`, `pricing/*`, cron | [PROD] 58 active priced models (OpenAI 36, Anthropic 10, Google 12); sync ran 00:59 UTC today | Yes | Medium | [ASSUMPTION] some `-pro`/`o1-pro` OpenAI models may not support `chat.completions`; if routed, `INVALID_REQUEST` is non-retryable → no fallback. Deactivate or mark ineligible | S |
| 12 | Rate limiting / abuse prevention | **MISSING** | — | [SRC] only provider `RATE_LIMIT` error mapping; `maxTokens` ≤ 256,000 accepted | **Yes (P0)** | High (runaway spend) | Per-key requests/minute via existing `Request(apiKeyId, createdAt)` count; clamp `maxTokens` default/max | M |
| 13 | Token usage & cost accounting | **WORKING** | `cost-intelligence/*`, `billing/*` | [PROD] cost + savings persisted on today's requests; [TEST] calculator/precision suites | Yes | High | Show baseline model name next to "savings" everywhere | S |
| 14 | History & analytics dashboard | **WORKING** | `dashboard/history/*`, `overview/*`, `dashboard/*-queries.ts` | [PROD] requests visible in History/Usage; [TEST] regression suites assert no mock data | Yes | High | None | — |
| 15 | Provider availability/monitoring | **MISSING** (beyond logs) | — | [SRC] no health endpoint or provider status tracking; `Provider.status` static | P2 | Low | Post-MVP | M |
| 16 | DB integrity & migrations | **WORKING** | `prisma/*` | `prisma validate` ✔, `migrate status` up to date (previous pass); XOR key ownership app-enforced only | Yes | Medium | P2: DB CHECK constraint, pooled URL + `directUrl` | S |
| 17 | Customer docs & SDK examples | **PARTIAL** | `README.md`, `docs/demo-guide.md` | README calls the API "OpenAI-style" with a curl example only; no Python/JS SDK example; no params/errors reference | **Yes (P0)** | Medium | One docs page: auth, request/response, errors, Python + curl | S |
| 18 | Deployment & security config | **PARTIAL** | Vercel project, `vercel.json` | [PROD] env names complete; firewall: 0 custom rules, Bot Protection off, **System DDoS mitigation challenged 25 requests**; no `maxDuration` set | Yes | High (demo) | Firewall-safe demo plan (§6); confirm function duration ≥ worst case | S |
| 19 | Duplicate Vercel project & cron | **RISK** | Vercel `attentra-f635` | [PROD] same repo; separate `DATABASE_URL` (added Sep 3, never updated vs `attentra` updated Oct 25); both run daily pricing-sync | P1 | Medium (confusion, keys not portable, duplicate cron) | Disconnect Git or delete `attentra-f635` (owner decision) | S |
| 20 | First successful API call (onboarding) | **PARTIAL** | API-keys page, README | [PROD] works for an informed user; no in-app snippet; firewall can block scripts | **Yes (P0)** | High | In-app snippet + docs page + compatible response | S |
| — | Business members | **PARTIAL** | `api/business/[id]/members` (GET only) | [SRC] no invite/add/remove | No | Low | Defer | M |
| — | Billing/payments | **PARTIAL** (reporting) | `billing/*` | [SRC] fee calculation only; no payment provider | No | Low | Present as "billing model", not "payments" | — |
| — | Lint | **MISSING** | — | `next lint` unconfigured (interactive prompt) | No | Low | P2 (needs new dev deps → approval) | S |

---

## 4. Confirmed Working Capabilities

These can be shown with confidence:

- **Google sign-in → personal workspace → API key creation** (one-time display, SHA-256 storage, revoke). **[PROD][TEST]**
- **API-key authenticated `POST /api/v1/chat/completions`** with HTTP 200 and real Gemini output. **[PROD]**
- **Explainable routing:** task type, complexity, ranked candidates, selected model and reason are returned in `routing` and shown in the Playground. **[PROD][SRC]**
- **Live model registry with daily pricing sync** across 3 providers (58 active models). **[PROD]**
- **Per-request telemetry and persistence:** tokens, latency, actual cost, baseline cost, savings, routing decision, ownership (user/business/key). **[PROD]**
- **History and dashboards** backed by real DB queries (tests assert no mock data in active pages). **[TEST][PROD]**
- **Business workspace** with tenant-scoped requests and business keys (OWNER-only management). **[TEST]**
- **Secure auth failure handling:**
  - 401 for missing or rejected keys;
  - 503 when the auth backend fails;
  - 502 for provider credential errors;
  - structured, secret-free rejection logs.

  **[TEST][PROD]** (deployed in `ff72037`)
- **Test suite:** `npx tsc --noEmit` passes. Safe suite: **45 files, 944 passed, 4 skipped, 0 failed** (two DB-writing integration suites excluded).

---

## 5. Broken and Missing Features

| Item | Status | Impact on demo |
|---|---|---|
| OpenAI SDK response compatibility | BROKEN | `client.chat.completions.create(...)` returns an object with `choices=None`, so `.choices[0]` raises. **First thing a developer tries.** |
| `model`, `max_tokens`, `temperature` | Silently ignored | Misleading: the user thinks they chose a model or limit |
| `stream: true` | Silently ignored | SDK streaming iterator breaks |
| Rate limiting / spend caps | MISSING | Unlimited spend per key, and 256 k-token outputs are allowed |
| Anthropic execution | UNVERIFIED | Claiming "3 providers working" is unproven |
| Production fallback | UNVERIFIED | Claim only as "implemented and tested" |
| Content parts / `developer` / `tool` roles | Rejected (400) | Newer SDK message formats fail; acceptable for MVP if documented |
| Explicit model routing | MISSING | Expected by OpenRouter-style users; P1 |
| Streaming | MISSING | P2 (properly), P0 (clear rejection) |
| Business invites, payments, provider health | MISSING | Out of scope for Sunday |

---

## 6. Critical Security and Production Risks

| # | Risk | Evidence | Severity | Mitigation for Sunday |
|---|---|---|---|---|
| R1 | **Vercel system DDoS mitigation challenges scripted clients** (403 HTML, `X-Vercel-Mitigated: challenge`) | [PROD] Firewall: 0 custom rules, Bot Protection inactive, System Mitigations active, 25 challenged under "DDoS Mitigation" | **High (demo)** | Do not bypass. Keep scripted traffic low and avoid test loops on demo day. Rehearse from the demo network. Keep the **browser Playground** as primary fallback (browsers pass challenges). Pre-record a backup video. [ASSUMPTION] Configurable bypass of system mitigations may need a paid plan; verify in Firewall settings before relying on it |
| R2 | **No rate limit / spend cap** | [SRC] | High | P0-3 below |
| R3 | **Duplicate project `attentra-f635`** with a likely different DB and a second cron | [PROD] | Medium | Disconnect or delete it (owner action). Demo only on `attentra-nine.vercel.app` |
| R4 | Provider call not aborted on timeout (`Promise.race`), so the provider may still bill after Attentra gives up | [SRC] `executor.ts:154` | Low | P2: pass `AbortSignal` to SDKs |
| R5 | Prompts and responses stored in plaintext (`Request.prompt/response`) | [SRC] | Medium (privacy claim) | Disclose; do not claim "we don't store prompts". P2 retention controls |
| R6 | Sign-in event logs user email | [SRC] `src/auth.ts` | Low | P1 one-line change |
| R7 | Function duration: no `maxDuration`; worst case 5 attempts × 30 s = 150 s | [SRC]; [ASSUMPTION] Fluid default limit (300 s) applies | Low | P1: set explicit `maxDuration` |
| R8 | Client-supplied `requestId` becomes the DB primary key; a collision returns 500 | [SRC] | Low | P1: namespace or ignore client IDs |
| R9 | `-pro` / `o1-pro` OpenAI models may be Responses-API-only while the adapter uses `chat.completions`; a non-retryable failure skips fallback | [SRC] + [ASSUMPTION] | Medium | P0-5 below |
| R10 | Secrets | [PROD][SRC] all provider/DB/auth secrets server-side; Vercel envs set; keys hashed; logs exclude keys/hashes/URLs (tested) | OK | — |
| R11 | Rollback | Vercel Instant Rollback available; no pending migrations | OK | Note the last known-good deployment before the freeze |

---

## 7. OpenAI Compatibility Findings

Endpoint: `POST /api/v1/chat/completions`. Base URL for SDKs: `https://attentra-nine.vercel.app/api/v1`.

| Aspect | OpenAI SDK expects | Attentra today | Gap |
|---|---|---|---|
| Auth | `Authorization: Bearer <key>` | Same | ✔ |
| Path | `{base_url}/chat/completions` | Same | ✔ |
| `messages` (string content; system/user/assistant) | Supported | Supported | ✔ |
| `messages` content parts array; `developer`/`tool` roles | Supported | 400 | Document as unsupported (P2) |
| `model` | Required; selects the model | Ignored | P0: accept `auto`/absent; reject others clearly. P1: explicit selection |
| `max_tokens` / `max_completion_tokens` | Supported | Ignored (only `maxTokens`) | P0 alias |
| `temperature` | Supported | Dropped by validator (executor supports it) | P0 pass-through (0–2) |
| `stream` | SSE | Ignored, returns JSON | P0 reject `stream:true` (400). P2 SSE |
| Response `id`, `object`, `created`, `model` | Required | Absent | P0 additive |
| `choices[0].message.{role,content}`, `finish_reason` | Required | `content` only. Adapters capture `finishReason` but the orchestrator drops it | P0 additive (thread `finishReason` through) |
| `usage.{prompt,completion,total}_tokens` | Expected | `execution.usage.{inputTokens,outputTokens}` | P0 additive |
| Errors | non-2xx + `{"error":{"message","type","code"}}` | non-2xx + `{"success":false,"requestId","error":{"code","message"}}` | Mostly works (the SDK reads `error.message`). P1 add `type` |

**Smallest safe strategy (preserves the Playground, history, billing and routing):**
- Keep **every existing field**: `success`, `requestId`, `content`, `routing`, `execution`, `timestamp`. The Playground (`PlaygroundClient.tsx` → `/api/v1/chat/completions`) and the tests read them.
- **Add** these fields to the success body:
  - `id` (= `requestId`), `object: "chat.completion"`, `created` (unix seconds);
  - `model` (the executed `modelIdentifier`);
  - `choices: [{ index: 0, message: { role: "assistant", content }, finish_reason }]`;
  - `usage: { prompt_tokens, completion_tokens, total_tokens }`.
- In `validation.ts`:
  - accept `max_tokens` / `max_completion_tokens` as aliases of `maxTokens`;
  - accept `temperature` (0–2);
  - accept `model` = `"auto"` or absent;
  - reject `stream: true` and unknown explicit models with clear 400s.
- Map provider finish reasons to OpenAI values (`stop`, `length`, `content_filter`) in one helper. Default to `"stop"` only when the provider returns none.
- No ownership, persistence or billing code changes.

---

## 8. Multi-Provider Routing and Fallback Findings

| Question | Finding | Evidence |
|---|---|---|
| Routes to configured, available models? | Yes. Candidates are loaded from the DB (`active`, supported provider, priced) | [SRC] `routing/database.ts`; [PROD] 58 active priced models |
| Real policies, not placeholders? | Yes. 4 weighted policies; complexity-adjusted weights; deterministic | [SRC] `policies.ts`, `scorer.ts`; [TEST] determinism suites |
| Basis of "latency" and "capability" | **Static family estimates** in `catalog/profiles.ts` (e.g. `-nano` 800 ms); not measured | [SRC] |
| Basis of "cost" | Live-synced per-model pricing × token estimate | [SRC][PROD] sync today |
| ≥ 2 working providers? | **Google** (API, today) and **OpenAI** (Playground) observed. **Anthropic: no executions in 30 days** | [PROD] |
| Safe retries/fallback | Fallback on TIMEOUT, RATE_LIMIT, SERVER_ERROR, NETWORK_ERROR, MODEL_UNAVAILABLE; stops on non-retryable; max 5 attempts | [SRC][TEST]; never observed in [PROD] |
| Timeouts | 30 s per attempt (`DEFAULT_EXECUTION_TIMEOUT_MS`); not aborted upstream | [SRC] |
| Records actual provider/model | Yes. Cost persistence overwrites `selectedProviderId/selectedModelId` with the **executed** model | [SRC] `cost-intelligence/service.ts:211,270` |
| Cost/usage calculation documented | Yes: README "Cost & Billing Model". Savings are relative to a configured baseline (`CONSUMER_BASELINE_MODEL`, e.g. `claude-sonnet-5`) | [SRC][PROD] |
| Abuse/spend limits | **None** | [SRC] |

**Honest pitch language:** "Attentra routes each request with an explainable, policy-weighted scorer over a live-priced multi-provider registry, falls back automatically on transient failures, and measures actual cost and savings against your chosen baseline model."

Avoid "optimal", "AI-powered routing", or "guaranteed lowest cost".

---

## 9. Friday / Saturday / Sunday Execution Plan

### Friday Nov 6 (tonight): API compatibility and reliability
- **P0-1** Additive OpenAI response envelope + `finish_reason` threading (§7). (M)
- **P0-2** Request param handling: `max_tokens` alias, `temperature`, `model:auto`, explicit 400s for `stream:true` and unknown `model`. (S)
- **P0-3** Spend guards (S–M):
  - per-key limit, for example 20 requests/minute, counted from `Request` rows by `apiKeyId` + `createdAt`, returning 429 with `Retry-After`;
  - default `maxTokens` cap, for example 2,048, with a max of 8,192.
  - Optional: per-key daily request cap.
- Tests for all of the above (existing Vitest patterns; no real DB).

### Saturday Nov 7: Routing validation, safeguards, dashboard, onboarding
- **P0-4** Provider verification (requires your authorization, ~USD 0.01):
  - one controlled request per provider using `policy`/hints, or temporarily via the Playground;
  - confirm Anthropic works, or stop claiming it.
- **P0-5** Registry hygiene: deactivate or mark ineligible models that fail on `chat.completions` (verify `-pro`/`o1-pro` behavior first; data-only change, needs approval).
- **P0-6** Onboarding:
  - an "Make your first call" snippet (Python OpenAI SDK + curl) on the API-keys page;
  - a docs page `docs/API.md` (auth, request fields, response, errors, limits, unsupported features).
- **P1** if P0 is stable:
  - explicit model selection;
  - remove email from sign-in log;
  - `maxDuration`;
  - disconnect `attentra-f635`;
  - OpenAI-style error `type`.

### Sunday Nov 8: Regression, freeze, rehearsal
- Morning: full safe suite, `tsc`, `next build`. Deploy once. Record the deployment ID for rollback.
- **Code freeze** after the deploy.
- Run the go/no-go checklist (§13) **once** with low request volume (firewall).
- Rehearse the demo twice in the browser Playground and once with the Python SDK. Record a backup video.

---

## 10. Exact Recommended Implementation Order

1. `src/app/api/v1/chat/completions/route.ts`: additive OpenAI fields in `buildSuccessResponse` (P0-1).
2. `src/lib/execution/orchestrator.ts` (+ types): surface `finishReason` from the successful attempt (P0-1).
3. `src/app/api/v1/chat/completions/validation.ts`: aliases, `temperature`, `model`/`stream` handling, `maxTokens` cap (P0-2, P0-3 part).
4. Route: per-key rate limit before routing, returning 429 (P0-3). Add an index on `Request(apiKeyId, createdAt)` only if needed; that is a migration and needs approval.
5. Tests: extend `chat-completions.test.ts` and `chat-completions-api-key-auth.test.ts`. Add an OpenAI-SDK-shape contract test.
6. Docs + in-app snippet (P0-6).
7. Provider verification and registry hygiene (P0-4/5, needs authorization).
8. P1 items in the order listed in §9.

## 11. Acceptance Criteria (P0)

| Task | Acceptance criteria |
|---|---|
| P0-1 Envelope | The official OpenAI Python SDK `client.chat.completions.create(model="auto", messages=[...])` returns `choices[0].message.content` (non-empty), `usage.total_tokens > 0`, `model` = the executed identifier. Existing fields unchanged; Playground renders identically; all existing tests pass |
| P0-2 Params | `max_tokens` limits output (verified via `usage.completion_tokens`). `temperature` reaches the provider (unit test on the adapter request). `stream:true` → 400 with a clear message. `model:"gpt-x-unknown"` → 400 listing `auto`. `model` absent or `auto` → routed |
| P0-3 Guards | The 21st request within 60 s for one key → 429 + `Retry-After`. Session/Playground unaffected or separately limited. `maxTokens` > cap → clamped or 400 (documented). Tests cover both |
| P0-4 Providers | At least one persisted SUCCESS per provider shown in the demo, with provider/model in History. Any provider not verified is not claimed |
| P0-5 Registry | No active model whose adapter call is known to fail with a non-retryable error. A list of deactivated models is recorded |
| P0-6 Onboarding | A new user can go from sign-in to a successful SDK call in under 5 minutes following only in-app text and `docs/API.md` |

## 12. Explicitly Deferred Until After Sunday (P2)

- Streaming (SSE) support.
- Tool/function calling, vision/content parts, `developer` role, JSON mode.
- Measured-latency and quality-evaluated routing; provider health monitoring and circuit breakers.
- Upstream request abort on timeout.
- Payments (Stripe etc.), invoices, business member invites/roles beyond OWNER.
- Prompt-retention controls / encryption at rest beyond Neon defaults.
- DB CHECK constraint for key ownership; Neon pooled URL + `directUrl`.
- ESLint setup; gating DB-writing integration tests; dedicated test database.
- Vercel paid-plan firewall configuration.

## 13. Go / No-Go Checklist (Sunday morning)

- [ ] `npx tsc --noEmit`, the safe `npx vitest run` and `npx next build` all pass on the deployed commit.
- [ ] The production deployment ID is recorded. The previous good deployment is known for Instant Rollback.
- [ ] Browser Playground: one request succeeds, and History shows provider, model, tokens and cost.
- [ ] Python OpenAI SDK call with a fresh key returns `choices[0].message.content` (one request, from the demo network).
- [ ] The key's Last Used updates. The request appears in History with the API key attribution.
- [ ] Revoked key → 401. Missing key → 401 (show the secure-failure story).
- [ ] Rate limit returns 429 (tested on a non-demo key, low volume).
- [ ] Each provider claimed in the pitch has a persisted SUCCESS.
- [ ] No firewall challenge from the demo network (one probe). Backup video ready.
- [ ] Pitch wording reviewed against §8 (no "optimal", no unverified provider claims, savings stated relative to the baseline).
- [ ] `attentra-f635` is disconnected or not referenced anywhere in the demo.

**No-go triggers:**
- the build or tests fail on the freeze commit;
- the Playground fails twice in a row;
- an SDK call fails and there is no browser fallback.

## 14. Recommended First Implementation Task

**P0-1: additive OpenAI-compatible success envelope**, in `route.ts` `buildSuccessResponse` plus `finishReason` threading in the orchestrator.

It has the highest demo impact (it unblocks every OpenAI SDK user, including your Python bot). It is low-risk because it is purely additive, it touches no persistence, billing or auth code, and it is fully testable without a database or provider calls.

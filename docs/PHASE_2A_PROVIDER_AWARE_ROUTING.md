# Attentra — Phase 2A: Provider-Aware Routing and Fallback Reliability

**Date:** 2026-11-06
**Base:** `ff72037` plus the uncommitted OpenAI-compatibility work (`docs/OPENAI_API_COMPATIBILITY_IMPLEMENTATION_REPORT.md`)
**Status:** implemented locally and verified by tests; **not committed or deployed**. No production model records, provider keys, Vercel settings or schema were changed. No paid provider calls.

---

## 1. Evidence and Causes

### 1.1 What the system knows about availability today
| Representation | Where | Behavior |
|---|---|---|
| `Model.active` | DB, set by catalog sync (`src/lib/catalog/sync.ts:152–170`) and pricing sync (`src/lib/pricing/detector.ts`) | `active = listed by provider listing API AND has an active pricing snapshot` |
| Provider entitlement / account tier | **Not represented** | The listing API (`models.get`/`models.list`) can include models the account cannot generate with |
| Model health | **Not represented** | No per-model failure history. Attempt errors were not logged or persisted before this phase |
| `MODEL_UNAVAILABLE` handling | `src/lib/execution/orchestrator.ts` (§5b) | Non-retryable, but **falls through to the next target**, explicitly for "a model still present in the listing API but closed to new users" |
| Google 401/403 | `src/lib/providers/google.ts` `normalizeError` | → `AUTHENTICATION_ERROR` → non-retryable → **chain stops, no fallback** |

### 1.2 Historical evidence (read-only, no prompt or response content)
- 23 production requests (2026-09-02 → 2026-11-06), all Playground/session, show **routed ≠ executed** (`Request.selectedModelId` vs `RoutingDecision.selectedModelId`).
  - 22 were routed to `google/gemini-2.5-flash`; 1 to `google/gemini-3.1-pro-preview`.
  - They were executed on `openai/gpt-4o` (20) or `anthropic/claude-sonnet-5` (3).
- Fallback latencies: median 2.39 s, max 5.73 s. The primary failed **fast**, not by the 30 s timeout.
- `gemini-2.5-flash` has **0** direct successes in production.
- **Per-attempt error codes were never stored or logged**, so no historical request carries its failure reason.

### 1.3 Entitlement check (2026-11-06, free metadata endpoints only)
- **Google:** `models.get` plus `models.{id}:countTokens`. Neither bills generation.
- **OpenAI and Anthropic:** `GET /v1/models/{id}`.
- Keys from `.env.local`, sent in headers and never printed.

| Result | Models |
|---|---|
| Accessible (55 of 58 active) | all 36 OpenAI, all 10 Anthropic, 9 of 12 Google (incl. `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview`) |
| **Listed but closed to this account** (3) | `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`, `google/gemini-2.5-pro`. `models.get` returns OK; `countTokens` returns **404 NOT_FOUND "This model models/gemini-2.5-… is no longer available to new users. Please update your code to use models/gemini-3.8-flash …"** |

### 1.4 Classification of causes
| Cause | Verdict | Basis |
|---|---|---|
| `gemini-2.5-flash` (+ `-flash-lite`, `-pro`) closed to the configured Google project, while the listing still reports it | **Confirmed for the current state** (2026-11-06) | Google API response above |
| Same cause for the 22 historical `gemini-2.5-flash` fallbacks | **Strongly supported, not individually proven** | Consistent fast failure. The adapter maps "404 … model … not found" → `MODEL_UNAVAILABLE`, which is the only non-retryable code that falls through. 0 direct successes ever. No per-attempt records exist |
| `gemini-3.1-pro-preview` fallback (1×, 2026-09-02 21:00 UTC) | **Unexplained** | Accessible today. Suspected free-tier generation quota or transient error. `countTokens` cannot test generation quota. **Not excluded** |
| Permission errors (403) | **Ruled out** for all 23 | A Google 403 maps to `AUTHENTICATION_ERROR`, which stops the chain. All 23 fell back |
| Routing-algorithm defect | **Ruled out** | It correctly scored a model the registry reports as active, cheap and fast |
| Google adapter defect | **Ruled out** for this behavior | The mapping and fall-through work as designed |
| Quota exhaustion / rate limiting | **Not evidenced** for `gemini-2.5-flash`; possible for the preview model | — |

### 1.5 Why a database deactivation is not enough
- Catalog sync sets `active = hasActiveSnapshot` for every listed model (`catalog/sync.ts:152–170`).
- The daily pricing sync writes `active: newPricing.active` on price changes (`pricing/detector.ts`).
- A manual `active = false` on a model the listing still returns can therefore be **silently reverted**.

---

## 2. Code Modifications

| File | Change |
|---|---|
| `src/lib/routing/router.ts` | `parseRoutingExclusions()` and `applyRoutingExclusions()`. `routeWithDatabase` removes operator-excluded models (`ROUTING_EXCLUDED_MODELS`) from the candidate pool **before** auto routing and explicit selection. **Unset means no behavior change** |
| `src/lib/execution/orchestrator.ts` | One structured `console.warn("[orchestrator] attempt failed", JSON)` per failed attempt: `requestId, attempt, maxAttempts, provider, model, code, category, retryable, willFallback, latencyMs, message`. The message is sanitized, prompt-redacted and capped at 200 characters. Fallback decisions are unchanged |
| `src/lib/execution/errors.ts` | `classifyAttemptFailure(code, message)` → `model_unavailable_for_account / model_not_found / quota_exhausted / rate_limited / permission_denied / auth_failed / timeout / provider_unavailable / network / invalid_request / context_length / other` (provider-neutral wording, diagnostics only). `redactPromptContent()`. **`sanitizeErrorMessage` now also redacts `sk-ant-…`/`sk-proj-…`** (the old `sk-[a-zA-Z0-9]{20,}` missed hyphenated keys), **Google `AIza…`** and **Attentra `atr_…`** keys. This also applies to API error responses |
| `src/__tests__/routing/provider-aware-routing.test.ts` | **new**: 29 tests |

Size: 3 source files, +200 / −6 lines. No schema, migration, dependency, route-contract or UI changes.

### Log line example
```
[orchestrator] attempt failed {"requestId":"req_…","attempt":1,"maxAttempts":5,"provider":"google",
 "model":"gemini-2.5-flash","code":"MODEL_UNAVAILABLE","category":"model_unavailable_for_account",
 "retryable":false,"willFallback":true,"latencyMs":412,"message":"Google model not found: … no longer available to new users …"}
```
Search in Vercel → Logs: `attempt failed`. It contains no prompt, response, API key, Authorization header, key hash or connection string.

### Recommended exclusion value (owner action; not applied)
```
ROUTING_EXCLUDED_MODELS=google/gemini-2.5-flash,google/gemini-2.5-flash-lite,google/gemini-2.5-pro
```
Set this in Vercel → Project `attentra` → Settings → Environment Variables (**Production**, optionally Preview), then redeploy. Remove an entry when the provider project regains access. `gemini-3.1-pro-preview` should **not** be excluded on current evidence.

---

## 3. Fallback Cost Ceiling (evaluated, not implemented)

- **Problem:** fallback chooses the next best model regardless of price. Production fallbacks moved cheap-model traffic (Gemini 2.5 Flash) onto GPT-4o.
- **Recommended mechanism:** `ROUTING_MAX_FALLBACK_COST_MULTIPLIER`, applied when the execution plan is built (`src/lib/routing/execution-plan.ts`). It drops fallback targets whose `projectedCost` is more than *N* × the primary's projected cost. Unset means unlimited (today's behavior).
- **Suggested value:** 20 at first. Log dropped targets in the routing reason.
- **Why deferred:**
  - it trades availability for cost, which is a product decision;
  - it can leave a request with no fallback;
  - once retired models are excluded (§2), the observed expensive fallbacks stop at the source.
- **Size:** S (one filter + tests), when approved.

---

## 4. Minimal MVP Safeguards (identified, not implemented in this phase)

| Safeguard | Today | Minimum for MVP |
|---|---|---|
| Per-key request rate | **None** | 20 requests/min per `apiKeyId`, counted from `Request(apiKeyId, createdAt)`. Returns 429 + `Retry-After`, `error.type=rate_limit_error`. Index on `(apiKeyId, createdAt)` later (migration) |
| Output tokens | Default 256 (implicit routing estimate); explicit up to 256,000 | Cap explicit `max_tokens` / `max_completion_tokens` at 4,096 → 400 with `param` |
| Attempts per request | Max 5 (implemented) | Keep |
| Per-attempt timeout | 30 s, no upstream abort | Keep for MVP; `AbortSignal` post-MVP |

---

## 5. Tests

| Command | Result |
|---|---|
| `npx vitest run src/__tests__/routing/provider-aware-routing.test.ts` | ✔ **29 passed** |
| `npx tsc --noEmit -p .` | ✔ 0 errors |
| Full safe suite (`npx vitest run --exclude …routing-integration… --exclude …execution-plan-integration…`, with `ATTENTRA_OPENAI_SDK_PYTHON` set) | ✔ **49 files, 1,042 passed, 4 skipped** (live-provider gates), **0 failed**. Includes the official OpenAI Python SDK test and all existing routing, orchestrator, auth and compatibility suites, unchanged |
| `npx prisma validate` | ✔ valid |
| `npx next build` | ✔ compiled successfully |
| Lint | Not configured |

**Required coverage (all in `provider-aware-routing.test.ts`, no DB, no network):**

| Requirement | Tests |
|---|---|
| Eligible model selection | baseline: without exclusion the attractive model wins. With exclusion, routing selects among the remaining models |
| Known inaccessible model handling | excluded model never selected nor in fallbacks; explicit request → `MODEL_NOT_FOUND`; parsing (provider case, bare id, whitespace); all excluded → `NO_ACTIVE_MODELS` |
| Temporary failures + fallback | quota, rate limit, timeout, 5xx, network → fallback with correct category and `willFallback: true` |
| Non-retryable errors | permission 403, invalid key, invalid request, context length → stop, no fallback call, `willFallback: false` |
| Model closed to account | "no longer available to new users" → `model_unavailable_for_account`, cross-provider fallback |
| Executed-model reporting | result `providerId/modelId` = fallback model; attempts `[false, true]` |
| Cross-provider preservation | fallback[0] provider ≠ selected provider after exclusion |
| No secrets / prompts in logs | `sk-ant-`, `sk-proj-`, `AIza`, `atr_`, `Bearer` and prompt text all absent; `[PROMPT]` marker present; message ≤ 200 characters |
| Existing routing + SDK compatibility | full suite unchanged and passing |

**Not run:** DB-writing integration suites; paid live-provider tests; production.

---

## 6. Deployment Safety

- **Default behavior is unchanged.** Exclusions apply only when `ROUTING_EXCLUDED_MODELS` is set. Logging adds one line per *failed* attempt only.
- **Sanitizer change is strictly broader.** More secret formats are redacted in logs and API error messages. All existing sanitizer and security tests pass.
- **No change to:** response contracts, History, ownership/usage attribution, the four routing policies, or cost calculation.
- **Rollback:** Vercel Instant Rollback, or unset `ROUTING_EXCLUDED_MODELS` (takes effect on the next deployment).

---

## 7. Remaining Risks

1. **Entitlements change over time.** The exclusion list is manual; a periodic free `countTokens` check could flag new closures (post-MVP).
2. **Google 403 stops the whole chain.** A provider-wide credential problem would fail requests that another provider could serve. Recommended post-MVP: on `AUTHENTICATION` from one provider, skip that provider's remaining targets but continue with other providers. This needs a deliberate change to the tested non-retryable rule.
3. **Google error classification uses substring matching** (`"401"`, `"403"`, `"quota"`, `"model"`) on the raw message (`google.ts`), which is fragile for unusual messages.
4. **`/v1/models` access does not prove `chat.completions` compatibility** for OpenAI `-pro` / `o1-pro` models. Still unverified.
5. **Free-tier generation quotas** cannot be checked without paid or quota-consuming calls. A quota failure now shows up as `quota_exhausted` in logs.
6. No rate limit or spend cap yet (§4). No fallback cost ceiling (§3).
7. Historical failure causes stay inferred; only failures **after deployment** are logged.

---

## 8. Smallest Next Action

1. Commit and deploy this change. It is safe with the variable unset.
2. **Owner, in Vercel (Production):** set `ROUTING_EXCLUDED_MODELS=google/gemini-2.5-flash,google/gemini-2.5-flash-lite,google/gemini-2.5-pro` and redeploy.
3. **Verify with one Playground request** using a prompt similar to those that previously routed to Gemini 2.5 Flash. It should run on its routed model with no "Fallback used" badge in History, and Vercel Logs should show no `attempt failed` line for it.

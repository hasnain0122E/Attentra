# Attentra — MVP Routing and Fallback Audit

**Date:** 2026-11-06 (evening)
**Code inspected:** working tree on `ff72037`. It includes the uncommitted OpenAI-compatibility changes from `docs/OPENAI_API_COMPATIBILITY_IMPLEMENTATION_REPORT.md`, which do not alter `auto` routing or fallback behavior.
**Mode:** read-only.
- No code, database, provider-key, Vercel or deployment changes.
- No provider calls and no load tests.
- Production evidence comes from **read-only database queries**: model identifiers, statuses, timestamps, token/cost figures and ID prefixes only. No prompts, responses or user identities were read.

**Classification labels:**
- **VERIFIED IN PRODUCTION**: observed in production data.
- **VERIFIED IN TESTS**: automated tests only. Every test cited here mocks the provider unless stated otherwise.
- **IMPLEMENTED BUT UNVERIFIED**
- **BROKEN**
- **MISSING**

> **Corrections to `docs/MVP_READINESS_AUDIT_2026-11-08.md`:**
> - That audit said fallback was "never observed in production". **It has run 23 times in production** (§4.4).
> - It said Anthropic was unverified. **Anthropic has executed in production** (claude-sonnet-5, including 3 fallback executions on 2026-09-02), though not within the last 30 days.

---

## 1. Routing Architecture

```text
POST /api/v1/chat/completions
  → resolveRequester (API key / session)                                  src/lib/auth/resolve-requester.ts
  → routeAndPersist                                                       src/lib/routing/router.ts
      loadRoutingCandidates  (active models with current pricing snapshot) src/lib/routing/database.ts
      analyzeRequest         (task type, complexity, token estimate)     src/lib/routing/analyzer.ts, complexity.ts, token-estimator.ts
      filterCandidates       (active, capability, context window, price) src/lib/routing/candidates.ts
      scoreCandidates        (policy × complexity-adjusted weights)      src/lib/routing/scorer.ts, policies.ts
      orderFallbacks         (provider-diverse round-robin)              src/lib/routing/fallback.ts
      explainDecision                                                    src/lib/routing/explanations.ts
      persistRoutingDecision (Request PENDING + RoutingDecision, 1 txn)  src/lib/routing/persistence.ts
  → attach ownership (userId / businessId / apiKeyId)                    route.ts
  → prepareExecutionFlow → ExecutionPlan (primary + all fallbacks)        src/lib/routing/execution-plan.ts
  → ExecutionOrchestrator (≤5 attempts, fallback on retryable errors)     src/lib/execution/orchestrator.ts
      Dispatcher → Executor (30 s Promise.race timeout) → provider adapter src/lib/execution/{dispatcher,executor}.ts, providers/*
  → persistRequestCostIntelligence (executed model, real tokens, cost,   src/lib/cost-intelligence/service.ts
     baseline cost, savings) → Request SUCCESS / FAILED
```

---

## 2. Routing Decision Logic (`model="auto"`)

| Step | Implementation | Status |
|---|---|---|
| Task type | Keyword signal lists (`analyzer.ts`, e.g. `CODING_SIGNALS`, `REASONING_SIGNALS`) or `taskTypeHint` | VERIFIED IN TESTS (`routing.test.ts`, `routing-step2.test.ts`); VERIFIED IN PRODUCTION (persisted `taskType`) |
| Complexity | Four equally weighted (0.25) signals: content length thresholds 200/1,000/4,000 chars etc. (`complexity.ts`) → LOW/MEDIUM/HIGH | VERIFIED IN TESTS; VERIFIED IN PRODUCTION (persisted) |
| Token estimate | Character-based input estimate. Output = `maxTokens` or **256** default (`token-estimator.ts:32`) | VERIFIED IN TESTS |
| Filters | inactive → reject; missing task capability → reject; estimated tokens > context window (or unknown window) → reject; pricing required when policy cost weight > 0.3 | VERIFIED IN TESTS (`routing-step2/3`, `explicit-model.test.ts`) |
| Policies | `balanced` (0.33/0.34/0.33 cost/latency/capability), `cost_optimized` (0.60/0.15/0.25), `quality_first` (0.15/0.15/0.70), `speed_first` (0.15/0.60/0.25), via the request `policy` field | VERIFIED IN TESTS. In production only the default `balanced` is evidenced; other policies are IMPLEMENTED BUT UNVERIFIED in production |
| Complexity weighting | Multipliers on policy weights, re-normalized: LOW ×(1.3, 1.15, 0.55), MEDIUM ×(0.9, 1.0, 1.3), HIGH ×(0.1, 0.2, 4.0) | VERIFIED IN TESTS (`routing-score-balance.test.ts`) |
| Selection | Highest score, deterministic tie order | VERIFIED IN TESTS (determinism suites); VERIFIED IN PRODUCTION |

### Score formula (`scorer.ts`)
```text
costScore       = minmax_lower_better(projected cost over all eligible candidates)
                  projected cost = live pricing snapshot × (estimated input, estimated output tokens)
latencyScore    = minmax_lower_better(expectedLatencyMs)          (missing → 0)
capabilityScore = min( min(matchRatio×0.7 + min(#caps×0.02, 0.15), 0.85) + tierBonus, 1 )
                  tierBonus: HEAVY 0.12 / MID 0.06 / LIGHT 0, scaled LOW×0.3, MEDIUM×0.8, HIGH×1.5
score           = Σ factor × complexity-adjusted policy weight
```

### What the factors really measure
| Factor | Source | Nature |
|---|---|---|
| **Cost** | Daily-synced provider pricing (`PricingSnapshot`), last sync 2026-11-06 00:59 UTC | **Real, current** |
| **Latency** | `expectedLatencyMs` from **static family rules** in `src/lib/catalog/profiles.ts` (e.g. `-nano` 800 ms; gemini-2.5-flash stores 500 ms) | **Estimate, not measured** |
| **Quality** | Capability tags + model tier from the same name-based family rules | **Heuristic, not evaluated** |
| **Task requirements** | Keyword task detection → required capability tags | **Heuristic** |

**Production example** (request `req_1793999977628_4mh9z76m`, your OpenAI-SDK call): GENERAL / LOW. The selected model was Gemini 3.1 Flash Lite (score 0.9628, projected $0.000303), with fallbacks "GPT 4.1 Nano (openai), Claude Haiku 4.5 (anthropic), Gemini 3.5 Flash Lite (google), …". **VERIFIED IN PRODUCTION.**

---

## 3. Provider and Model Support

| Provider | Registry (active / priced) | Production execution evidence | Status |
|---|---|---|---|
| Google | 12 / 12 | `gemini-3.1-flash-lite` direct successes (incl. 3 API-key requests and the SDK call today). **`gemini-2.5-flash`: 23 of 23 production selections failed and fell back** | VERIFIED IN PRODUCTION; **gemini-2.5-flash BROKEN** |
| OpenAI | 36 / 36 | `gpt-4o` executed **20 times as a fallback target** (latest 2026-11-06 20:51 UTC) | VERIFIED IN PRODUCTION (as fallback) |
| Anthropic | 10 / 10 | `claude-sonnet-5` executed directly and as fallback (3× on 2026-09-02); none in the last 30 days | VERIFIED IN PRODUCTION historically; current key health UNVERIFIED |

- Real-provider tests exist but are opt-in (`RUN_LIVE_PROVIDER_TESTS`): `src/__tests__/providers/{openai,anthropic,google}-integration.test.ts` and `src/__tests__/e2e/attentra-e2e.test.ts`. They were **not run** (paid). All other provider tests mock the SDKs.
- **[ASSUMPTION]** OpenAI `-pro` / `o1-pro` models in the registry may require the Responses API, while the adapter uses `chat.completions`. Unverified.

---

## 4. Fallback Implementation

### 4.1 Plan generation (`fallback.ts`, `execution-plan.ts`)
- Fallbacks = **all remaining scored candidates**, grouped by provider and ordered round-robin, **other providers first**. That gives a cross-provider first fallback.
- **VERIFIED IN TESTS** (`execution-plan.test.ts`, `routing-integration` [DB, not run]) and **VERIFIED IN PRODUCTION** (persisted reasons list cross-provider fallbacks).

### 4.2 Execution rules (`orchestrator.ts`)
| Error code | Behavior | Evidence |
|---|---|---|
| TIMEOUT, REQUEST_TIMEOUT, RATE_LIMIT, SERVER_ERROR, NETWORK_ERROR | Fallback to next target | VERIFIED IN TESTS (`orchestrator.test.ts:161–231`) |
| MODEL_UNAVAILABLE | Falls through to next target | VERIFIED IN TESTS (`:326`, `:355`) |
| AUTHENTICATION, INVALID_REQUEST, CONTEXT_LENGTH | Stop immediately | VERIFIED IN TESTS (`:259–304`) |
| Max attempts | `min(1 + #fallbacks, 5)`; hard cap `MAX_ORCHESTRATOR_ATTEMPTS = 5` | VERIFIED IN TESTS (`:457`, `:480`) |
| Same-model retry | **None** (each attempt is a different model) | By design |
| Explicit `model` | Single candidate, **no fallback** | VERIFIED IN TESTS (`explicit-model.test.ts`) |

Fault injection is `MockProviderAdapter` (`src/lib/execution/mock.ts`, 9 behaviors). It is exported but **not registered** in the production registry (`createDefaultProviderRegistry` registers only OpenAI/Anthropic/Google), which is correct. **There is no production fault-injection mechanism (MISSING, by design).**

### 4.3 Cross-provider fallback
**VERIFIED IN PRODUCTION.** Routed `google/*` → executed `openai/gpt-4o` (20×) or `anthropic/claude-sonnet-5` (3×).

### 4.4 Production fallback evidence (read-only)
| Metric | Value |
|---|---|
| All-time requests | 54 (39 SUCCESS, 15 PENDING — see §5) |
| SUCCESS with routed ≠ executed (fallback) | **23** (2026-09-02 → 2026-11-06 20:51 UTC), all browser-session (Playground) requests |
| Routed model in those 23 | `google/gemini-2.5-flash` (22), `google/gemini-3.1-pro-preview` (1) |
| Latency of fallback requests | median 2.39 s, max 5.73 s, so the primary fails **fast**, not by the 30 s timeout |
| Direct successes of `gemini-2.5-flash` | **0** |

**Root cause of the gemini-2.5-flash failures: unknown.**
- Attempt errors are returned in the API response, and shown in the Playground attempt panel, but are **neither persisted nor logged**.
- The failure is quick and retryable (it triggered fallback): rate limit/quota, 5xx/overload, network or model-unavailable.
- The same Google key succeeds with `gemini-3.1-flash-lite`, so the key itself works.

---

## 5. Failure Modes

| # | Failure mode | Status | Impact |
|---|---|---|---|
| F1 | `gemini-2.5-flash` fails on every production selection | **BROKEN** | Adds a failed attempt to every such request. Executes on GPT-4o, a much higher price tier than the routed model's projection. Routing keeps choosing it because profile latency (500 ms) and LIGHT tier score well |
| F2 | Attempt errors not persisted or logged | **MISSING** | Fallback causes cannot be diagnosed from logs or History |
| F3 | Timeout does not abort the provider call (`executor.ts` `Promise.race`) | IMPLEMENTED (limitation) | A timed-out primary may still complete and bill while the fallback also bills. Only the fallback's cost is recorded |
| F4 | No total request deadline | IMPLEMENTED (limitation) | Worst case 5 × 30 s = 150 s plus DB time; relies on the platform function limit [ASSUMPTION: Fluid default] |
| F5 | Explicit model has no fallback | By design | Explicit-model provider errors are returned to the caller |
| F6 | Non-retryable provider error (e.g. INVALID_REQUEST from an incompatible model) stops the chain | By design | A registry model incompatible with `chat.completions` fails the request instead of falling back |
| F7 | 15 `PENDING` rows from **test runs** (`api-integr…`, `test-step3…`, 2026-08-29 → 09-03, no owner) in the production DB | Data hygiene issue | Confirms that DB-writing integration tests have targeted production. No user impact (no owner) |
| F8 | Neon connectivity | Observed during this audit: a transient `Can't reach database server` (P1001) on one local read; the retry succeeded | Same compute-suspend behavior as the earlier incident |

---

## 6. Cost and Usage Accuracy

| Item | Status | Evidence |
|---|---|---|
| Executed model recorded | **VERIFIED IN PRODUCTION** | `Request.selectedModelId/ProviderId` overwritten with the executed model (`cost-intelligence/service.ts:211,270`). History infers "Fallback used" from routed ≠ executed (`dashboard/request-mapping.ts:65`) |
| Provider-reported tokens | **VERIFIED IN PRODUCTION** | SDK request: 10 / 29 tokens persisted, matching the SDK response |
| Actual cost | **VERIFIED IN PRODUCTION** | 10/1000 × $0.00025 + 29/1000 × $0.0015 = **$0.000046** = persisted `actualCost` |
| Savings | VERIFIED IN PRODUCTION (as calculated) | baseline $0.00031 − actual $0.000046 = $0.000264. Baseline = configured `CONSUMER_BASELINE_MODEL` |
| Fallback cost uses executed model's price | VERIFIED IN TESTS (`orchestrator.test.ts:528`) + production rows priced on GPT-4o | — |
| Price source consistency | IMPLEMENTED (minor gap) | Routing uses `PricingSnapshot`; actual cost uses `Model.inputPricePer1k/outputPricePer1k`. They match after sync, but can diverge between syncs |
| Latency recorded | **Inaccurate under fallback** | `Request.latencyMs` = the **winning attempt only**. Failed-attempt time is excluded |
| Failed requests | **Inaccurate** | `FAILED` rows keep the **routing estimates** in `inputTokens/outputTokens` (set at routing time, `persistence.ts:134`) |
| Cost of failed attempts | **MISSING** | Not recorded. Usually $0 for fast errors; non-zero possible for timeouts (F3) |
| Attribution across fallback | **VERIFIED IN TESTS** + PRODUCTION | Ownership is attached once before execution (`route.ts`). Fallback changes only the executed model. Fallback rows are owned by their session users. `chat-completions-openai-compat.test.ts` asserts API-key attribution and executed-model cost |

---

## 7. Security and Spending Risks

| Safeguard | Status |
|---|---|
| Max attempts per request (5) | IMPLEMENTED, VERIFIED IN TESTS |
| Per-attempt timeout (30 s) | IMPLEMENTED (no upstream abort, F3) |
| Default output cap 256 tokens when `max_tokens` is absent | IMPLEMENTED (implicit, via token estimate) |
| Client `max_tokens` upper bound | 256,000. **Effectively uncapped** |
| Per-key / per-user rate limit | **MISSING** |
| Daily/monthly spend budget per key/user/business | **MISSING** |
| Fallback to expensive models | **No cost ceiling on fallback**. F1 already routes cheap-model traffic to GPT-4o |
| Key isolation / ownership | VERIFIED (previous audits; tests) |
| Secrets in attempt records | Sanitized, VERIFIED IN TESTS (`orchestrator.test.ts:720–760`) |
| Mock adapter in production | Not registered, VERIFIED (source) |

---

## 8. Missing Regression Tests

1. **Route-level fallback with the real orchestrator.** A failing primary `MockProviderAdapter` and a succeeding fallback, asserting the persisted executed model, tokens, cost and owner. Today, route tests mock the orchestrator and orchestrator tests do not touch persistence.
2. **Attempt-failure logging** (once added). Asserts code, provider, model, sanitized message and no secrets.
3. **`FAILED` request token fields.** Estimates must not be presented as provider-reported usage.
4. **Total-latency accounting under fallback.**
5. **Timeout abort.** The provider call is cancelled after the timeout (after an `AbortSignal` is added).
6. **Policies through the API.** `policy=quality_first` vs `cost_optimized` select different models for the same prompt (fixture registry).
7. **Spend guards** (rate limit, `max_tokens` cap) once implemented.
8. **Registry compatibility.** No active model whose adapter call is known to be non-retryably incompatible.
9. **Live smoke per provider** (opt-in, paid). One cheap request per provider before the demo, using the existing gated integration tests.

---

## 9. Prioritized Plan to MVP Readiness (by 2026-11-08)

| Priority | Task | Change type | Effort | Approval |
|---|---|---|---|---|
| **P0-1** | **Diagnose and neutralize gemini-2.5-flash.** (a) Send **one** Playground prompt that routes to it and read the attempt `errorCode/errorMessage` shown in the execution panel. (b) If it is an adapter/parameter issue, fix it with a test. If it is quota/overload, **deactivate the model** (`Model.active=false`) | Diagnosis + small code fix or 1-row data change | S | **Yes** (paid request ≈ $0.001; DB change) |
| **P0-2** | **Log every failed attempt**: `[orchestrator] attempt failed` with requestId, attempt #, provider, model, code, retryable, sanitized message, latency. Uses existing `sanitizeErrorMessage`; no schema change | Code | S | — |
| **P0-3** | **Spend guards**: per-key requests/minute (count `Request` by `apiKeyId` + `createdAt`), returning 429; cap `max_tokens` (e.g. 4,096) | Code | M | — |
| P1-1 | Record total latency (all attempts) and keep final-attempt latency in `execution` | Code | S | — |
| P1-2 | Clear or flag estimated tokens on `FAILED` rows | Code | S | — |
| P1-3 | Route-level fallback integration test (§8.1) | Test | S | — |
| P1-4 | Gate DB-writing integration tests (`RUN_DB_INTEGRATION_TESTS`) and use a Neon test branch. Delete the 15 test `PENDING` rows | Code + data | S | **Yes** (data deletion) |
| P2 | Upstream abort on timeout; total deadline; measured latency (rolling p50 per model) replacing static estimates; provider health/circuit breaker; persisted attempt table; spend budgets | Code + schema | L | Later |

---

## 10. Recommended Demo Scenario (honest differentiation)

**Goal:** show *explainable, cost-aware, multi-provider routing with real fallback*, all from real data.

1. **Warm up**, 10–15 min before the pitch. Send one Playground request: the SDK request today took 14.2 s, consistent with a cold function and database.
2. **Cost-aware routing (live, Playground).** A short, simple prompt.
   - Show the candidate ranking, the selected cheap model (e.g. Gemini 3.1 Flash Lite), the explanation, the projected vs actual cost, and the savings vs the baseline model.
3. **Task-aware routing (live, Playground).** A clearly complex reasoning or coding prompt.
   - Show a different, higher-tier model chosen and why (complexity/capability weighting).
   - **Rehearse first** to confirm which model wins and that it executes. Avoid prompts that route to gemini-2.5-flash until P0-1 is done.
4. **Automatic cross-provider fallback (real production record).** Open History, find a request marked **"Fallback used"** (e.g. 2026-11-06 20:51 UTC: routed Gemini 2.5 Flash, executed GPT-4o), and open its detail page.
   - Say: "When Google failed, Attentra re-routed to OpenAI automatically. The user still got an answer, and cost was recorded on the model that actually ran."
   - Optional, technical audiences: run `npx vitest run src/__tests__/execution/orchestrator.test.ts` locally to show deterministic fault injection (timeout, rate limit, 5xx → next provider; auth errors stop).
5. **Developer experience (live, SDK).** The official OpenAI Python SDK with `model="auto"` (from a hotspot if Wi-Fi is challenged). Then show the request in History attributed to the API key, with tokens and cost.

**Do not claim:**
- "optimal" or "AI-learned" routing;
- measured latency;
- quality benchmarks;
- spend controls (until P0-3 ships).

---

## 11. Three Highest-Priority Improvements

### 1. Fix or deactivate `gemini-2.5-flash` (P0-1)
- The failing attempt's error code and message are captured from one controlled request, and the cause is written down.
- After the fix or deactivation, a prompt that previously routed to it shows **no fallback** (routed = executed) on its next run. History shows no new "Fallback used" rows for that model.
- Existing routing tests still pass. If deactivated, no other model's ranking changes beyond its removal.

### 2. Attempt-failure logging (P0-2)
- For any request with a failed attempt, Vercel logs contain one line per failed attempt: requestId, attempt #, provider, model, normalized code, retryable flag, sanitized message, latency.
- A unit test asserts the line is emitted for a fallback scenario and contains **no** API key, Authorization header, key hash or connection string.
- No change to responses, persistence or routing.

### 3. Spend guards (P0-3)
- The 21st request within 60 s for one API key returns **429** with `Retry-After` and `error.type="rate_limit_error"`. Other keys are unaffected. Session (Playground) traffic is limited separately or exempted, and documented.
- `max_tokens` above the cap is rejected with 400 (`param: "max_tokens"`) or clamped, as documented.
- Tests cover both, using in-memory counting (no DB writes). The full safe suite and build still pass.

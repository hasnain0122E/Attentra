# Attentra — Phase 2B: API Rate Limiting and Spend Protection

**Date:** 2026-11-06
**Base commit:** `5831d7d` (Phase 1 + 2A committed). Phase 2B changes are **uncommitted and undeployed**.
**Constraints honored:** no migrations, no new infrastructure or services, no dependency changes, no environment changes, no production data changes, no paid provider calls.

---

## 1. Files Modified

| File | Change |
|---|---|
| `src/lib/rate-limit/index.ts` | **new**: `checkRequestRateLimit()` (database layer + per-instance layer), `resolveRateLimit()` (env config), `RateLimitUnavailableError`, `resetInstanceRateLimiter()` (tests) |
| `src/app/api/v1/chat/completions/route.ts` | Step **4b**: rate-limit check after authentication and validation, **before routing or any provider call**. 429 with `Retry-After` + `X-RateLimit-Limit`; 503 when the limiter cannot reach the database |
| `src/app/api/v1/chat/completions/validation.ts` | `MAX_OUTPUT_TOKENS = 4096` for `maxTokens`, `max_tokens`, `max_completion_tokens` (was 256,000) |
| `src/__tests__/api/rate-limit-and-token-caps.test.ts` | **new**: 24 tests |
| `src/__tests__/api/chat-completions.test.ts`, `chat-completions-api-key-auth.test.ts`, `chat-completions-openai-compat.test.ts` | Fixture only, +4 lines each: the Prisma mock gains `request.aggregate` (zero recent requests) and `beforeEach` resets the instance limiter. **No assertion changed** |

Size: route +71 lines, validation +10/−3, new limiter about 190 lines.

---

## 2. Rate-Limiting Design

### 2.1 Placement
```text
auth (401) → content-type/JSON/validation (400, incl. token caps) → RATE LIMIT (429 / 503) → routing + persistence → provider
```
- Requests rejected by authentication, validation or the limiter **never reach routing, persistence or a provider**.
- Invalid requests do not consume rate-limit slots.

### 2.2 Subjects and defaults
| Subject | Key | Default (requests / rolling 60 s) | Env override |
|---|---|---|---|
| API key (personal **or** business) | `apiKeyId`, so each key is independent | **20** | `API_KEY_RATE_LIMIT_PER_MINUTE` |
| Browser session (Playground) | `userId` (rows with `apiKeyId = null`) | **10** | `SESSION_RATE_LIMIT_PER_MINUTE` |

- `0` disables that subject's limit.
- Invalid values fall back to the default, so a typo cannot silently disable protection.
- A user's Playground traffic and their API-key traffic are separate subjects.

### 2.3 Two layers (both must allow)
1. **Database layer (cross-instance).** `prisma.request.aggregate` counts the subject's `Request` rows with `createdAt` inside the window, plus the oldest timestamp for `Retry-After`. All Vercel instances share it.
2. **Instance layer (per process).** An in-memory sliding window with a synchronous check-and-reserve after the database read. It is never the only protection.

The 429 body (OpenAI-compatible, through the existing error wrapper):
```json
{ "success": false, "requestId": "req_…",
  "error": { "code": "RATE_LIMIT_EXCEEDED", "type": "rate_limit_error", "param": null, "retryable": true,
             "message": "Rate limit exceeded: 20 requests per 60 seconds per API key. Retry after 15 seconds." } }
```
Headers: `Retry-After: <seconds until the oldest counted request leaves the window, ≥ 1>`, `X-RateLimit-Limit`. The OpenAI SDK raises `RateLimitError`.

### 2.4 Concurrency guarantees (stated precisely)
| Scenario | Guarantee |
|---|---|
| Concurrent requests for one key on the **same instance** | **Exact.** At most *limit* admitted per rolling window: check-and-reserve runs synchronously on the event loop. Tested with a 30-request burst while the database shows 0, giving exactly 20 admitted |
| Sustained traffic across **different instances** | **Enforced via the database count.** Each instance sees other instances' requests once their rows carry the key |
| Simultaneous bursts across **different instances** | **Best-effort, not a hard limit.** A request's `Request` row is created during routing and receives its `apiKeyId`/`userId` slightly later (ownership step), typically well under a second to a few seconds after the check. Requests landing on different instances within that gap can each pass. Worst case is bounded by (instances concurrently serving the key) × limit for that gap. Realistic over-admission is a few requests |
| Hard cross-instance guarantee | **Not provided.** It requires an atomic counter (§7) |

Counting semantics:
- The database counts persisted requests (SUCCESS, FAILED, with or without fallback; one row per request).
- Requests rejected at 400/401/429/503 are not counted.
- The window uses application time against the database `createdAt` default. NTP-level skew is negligible against 60 s.

### 2.5 Failure behavior
- The limiter's database query fails (e.g. Neon P1001): **fail closed**, returning `503 SERVICE_UNAVAILABLE` (`retryable: true`, `type: server_error`). There is no routing and no provider call. The response contains no database host or error text; the log records only the error class name.
- This is no new failure class. The same outage would already have failed at routing persistence. It now fails earlier and before any spend.

### 2.6 Logging
`[chat-completions] Rate limit exceeded.` with requestId, subject kind, limit, layer and retry-after. It never contains the API key, Authorization header, prompt or request body (tested).

---

## 3. Token Limit Implementation
- `validation.ts`: `MAX_OUTPUT_TOKENS = 4096` for **each** of `maxTokens`, `max_tokens` and `max_completion_tokens`.
- Above the cap → `400 INVALID_REQUEST`, `type: invalid_request_error`, `param: "<field>"`, message `'<field>' must be a positive integer (max 4096)`. No routing, no provider call.
- Unchanged:
  - the conflict check when several fields are sent;
  - the default when none is sent. The provider receives the routing estimate of 256 output tokens (pre-existing behavior, `routing/token-estimator.ts`).

---

## 4. Fallback Cost Ceiling (evaluated, not implemented)

| Option | Behavior | Pros | Cons |
|---|---|---|---|
| A. Hard multiplier (`ROUTING_MAX_FALLBACK_COST_MULTIPLIER = N`) | Drop fallbacks with `projectedCost > N × primary` | Simple; predictable spend | Can remove **every** fallback, so availability drops exactly when a provider fails |
| B. Soft multiplier (recommended) | As A, but always keep the **cheapest cross-provider fallback** even when over N | Caps typical spend while preserving availability | One expensive fallback is still possible |
| C. Absolute USD ceiling per request | Drop targets above $X projected | Easy to explain | Needs a per-tier value; penalizes long prompts |

**Recommendation:** do not ship before the pitch.
- Phase 2A already removes the root cause of the observed expensive fallbacks: retired Gemini models falling back to GPT-4o.
- After the pitch, implement **B** with `N = 20`, default unset (no behavior change). Record dropped targets in the persisted routing reason. Test that a cross-provider fallback always remains.

---

## 5. Tests and Results

All commands below were executed in this session.

| Command | Result |
|---|---|
| `npx vitest run src/__tests__/api/rate-limit-and-token-caps.test.ts` | ✔ **24 passed** |
| `npx vitest run src/__tests__/api` | ✔ 8 files, 232 passed, 1 skipped (SDK test without env) |
| Full safe suite with `ATTENTRA_OPENAI_SDK_PYTHON` set (excluding the two DB-writing suites) | ✔ **50 files, 1,066 passed, 4 skipped** (live-provider gates), **0 failed**. Includes the official OpenAI Python SDK test |
| `npx tsc --noEmit -p .` | ✔ 0 errors |
| `npx prisma validate` | ✔ valid |
| `npx next build` | ✔ compiled successfully |
| Lint | not configured |

**Coverage:**

| Requirement | Tests |
|---|---|
| Rate limit, 429 + `Retry-After` + OpenAI shape | 21st request → 429, `retry-after ≥ 1`, `x-ratelimit-limit: 20`, `RATE_LIMIT_EXCEEDED` / `rate_limit_error` |
| Database (cross-instance) layer | DB count at limit → 429 before routing; `Retry-After` from the oldest row (45 s old → 15 s); query filters on the subject only |
| Concurrency | 30 concurrent checks with DB lag → exactly 20 admitted. A DB rejection does not reserve an instance slot |
| Window roll-over | rejected at +59 s, allowed at +60.001 s |
| API-key isolation | key A exhausted → key B still 200 |
| Playground sessions | separate 10/min per user; the same user's API key unaffected |
| Fail closed | aggregate throws → `RateLimitUnavailableError` / route 503, no routing, no provider, no host leak |
| Configuration | defaults 20/10, override, invalid → default, `0` disables (no DB query) |
| Token caps | 4096 accepted, 4097 → 400 with `param` for each of the 3 fields; invalid requests consume no slots |
| No provider spend on rejection | `routeAndPersist` / orchestrator not called for 400/401/429/503 |
| Logs | no key, no prompt text |
| Regression | OpenAI envelope + History ownership on allowed requests; all existing suites unchanged |

---

## 6. Known Limitations
1. **Cross-instance bursts are best-effort** (§2.4). This is not a hard quota.
2. **No index on `Request(apiKeyId, createdAt)`.** Fine at current volume (tens of rows). Needs an index (migration) as traffic grows.
3. **Instance memory** holds at most one timestamp list per active subject, pruned when it exceeds 1,000 subjects. It resets on cold start; the database layer still applies.
4. **The limit counts requests, not tokens or dollars.** There are no daily or monthly spend budgets yet.
5. The default output of 256 tokens when no limit is sent is unchanged. Responses may end with `finish_reason: "length"`.
6. Upstream provider rate limits still map to HTTP 429 with code `RATE_LIMIT`, distinct from Attentra's own `RATE_LIMIT_EXCEEDED`.
7. **Demo note:** the Playground allows 10 requests per minute per user, so avoid rapid repeated clicks during the pitch.

---

## 7. Hard-Enforcement Path (post-MVP, requires a migration)
Add a small table and admit with one atomic statement:
```sql
CREATE TABLE "RateLimitWindow" (subject TEXT, window_start TIMESTAMPTZ, count INT, PRIMARY KEY (subject, window_start));
INSERT INTO "RateLimitWindow" VALUES ($1, date_trunc('minute', now()), 1)
ON CONFLICT (subject, window_start) DO UPDATE SET count = "RateLimitWindow".count + 1
RETURNING count;   -- admit iff count <= limit
```
This is fixed-window, but atomic across instances. Alternatively use an index on `Request(apiKeyId, createdAt)` plus a per-key advisory lock held only for check-and-insert.

---

## 8. Deployment and Rollback

**Deploy:**
```powershell
git add src/lib/rate-limit src/app/api/v1/chat/completions `
  src/__tests__/api/rate-limit-and-token-caps.test.ts `
  src/__tests__/api/chat-completions.test.ts `
  src/__tests__/api/chat-completions-api-key-auth.test.ts `
  src/__tests__/api/chat-completions-openai-compat.test.ts `
  docs/PHASE_2B_API_SPEND_PROTECTION.md
git commit -m "feat(api): per-key rate limiting and output token caps"
git push
```
- No environment variables are required. The defaults (20 per key, 10 per session, 4,096 tokens) are active on deploy.
- No migration.

**Rollback options:**
- Vercel Instant Rollback to the previous deployment.
- Or set `API_KEY_RATE_LIMIT_PER_MINUTE=0` / `SESSION_RATE_LIMIT_PER_MINUTE=0` (takes effect on the next deployment) to disable a layer without reverting code.
- The token cap needs a code change or rollback.

---

## 9. Production Verification
Keep volume low: no loops against production, because of cost and the Vercel DDoS mitigation.

1. **Token cap (free; rejected before routing):**
   ```python
   from openai import OpenAI, BadRequestError
   c = OpenAI(base_url="https://attentra-nine.vercel.app/api/v1", api_key=KEY, max_retries=0)
   try: c.chat.completions.create(model="auto", max_tokens=5000, messages=[{"role":"user","content":"hi"}])
   except BadRequestError as e: print(e.status_code, e.body)   # expect 400, param "max_tokens"
   ```
2. **Normal request:** one `model="auto"` call with `max_tokens=200` returns 200. History shows the request.
3. **429 behavior, safest on a Preview deployment.**
   - **Owner action:** set `API_KEY_RATE_LIMIT_PER_MINUTE=2` for the **Preview** environment only, and deploy a preview.
   - Send 3 requests with one key within 60 s. The 3rd returns **429**, `Retry-After` is present, and the SDK raises `RateLimitError`. The Preview shares the production DB, so each successful request writes one real row and costs about $0.0001.
   - Vercel Logs show `Rate limit exceeded.` for the rejected request ID.
   - Remove the Preview override afterwards.
4. Confirm the Playground still works with a couple of requests, staying under 10 per minute.

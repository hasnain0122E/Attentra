# Attentra — API Authentication Audit Report

**Date:** 2026-11-06
**Endpoint:** `POST /api/v1/chat/completions`
**Base commit:** `908dfbe` (`main`)
**Final status:** **PARTIALLY FIXED** (see §11)

---

## 1. Executive Summary

A Python client calling the production API with a dashboard-generated key received `401 AUTHENTICATION` on every request.

**The server-side key authentication is not broken.**
- An in-process test drives the real chain: dashboard key generation → `Authorization: Bearer` parsing → SHA-256 lookup → status checks → route.
- That test **passes against the original, unmodified production code** for valid personal and business keys sent without any browser session.
- Generation and validation use the same `hashApiKey()`, the same table and the same field.

**The 401 means the token that reached the server was not an active key in the database the deployment uses.** Read-only database evidence (§3) narrows this to three causes:
1. the client sent the key created at 17:41 UTC, which is **revoked**;
2. the client sent a malformed or partial string;
3. the key was created against a different database from the one production reads.

Nothing on the server side identifies which. The new diagnostic script and the new server log line identify it in one step.

The audit also found and fixed two server-side defects (locally, not deployed):
1. **Provider credential failures were returned as `401 AUTHENTICATION`.** If Attentra's own OpenAI/Anthropic/Google key were invalid or missing in Vercel, the caller got the same status and code as an invalid Attentra key. They now return **502**.
2. **Authentication rejections were not diagnosable.** Every rejection returned an identical 401 and logged nothing, so a request ID could not be traced to a cause. The route now logs the reason (`NO_CREDENTIALS`, `MALFORMED_HEADER`, `MALFORMED`, `NOT_FOUND`, `REVOKED`, `EXPIRED`) with the request ID and the key's display prefix only. It also sends `WWW-Authenticate: Bearer` and separates "Authentication required" from "Invalid API key".

The audit also found that **the endpoint is not OpenAI-response-compatible.** It returns `content`, not `choices[0].message.content`. The OpenAI Python SDK will authenticate but cannot read the answer. This was documented and not changed (API contract change, needs approval; §10).

---

## 2. Original Problem

```http
HTTP/1.1 401 Unauthorized
X-Matched-Path: /api/v1/chat/completions
```
```json
{"success":false,"requestId":"req_1793988900831_yetnz8zk",
 "error":{"code":"AUTHENTICATION","message":"Authentication required"}}
```

- `GET` returns 405 (only `POST` is exported, which is correct).
- `POST` reaches the route handler (`X-Matched-Path`).
- Request IDs:
  - `req_1793988900831_yetnz8zk` decodes to **2026-11-06T18:15:00.831Z**.
  - `…1793988900468_d92905a33af7` is **not** an Attentra request ID. It matches the `X-Vercel-Id` header format (`<region>::<id>-<ms>-<12 hex>`), confirmed against live production responses. It is Vercel's edge ID for the same 18:15:00 request.

---

## 3. Root Cause Analysis

### 3.1 Which code path produced the 401 (confirmed)
The route has two ways to return 401:

| Path | Body shape |
|---|---|
| Early auth check (`resolveRequester` → `none`) | `{code, message}` only |
| Execution failure with code `AUTHENTICATION`/`MISSING_API_KEY` via `buildErrorResponse` | `{code, message, retryable}` (+ `fallback`) |

The reported body has **no `retryable`**, so it came from the early check. `resolveRequester()` returned `none` for one of these reasons: no session, and either no parseable Bearer token or `validateApiKey()` returned `valid: false`.

Database exceptions in `validateApiKey` propagate to the route's outer `catch` → **500 `INTERNAL_ERROR`**, so a DB outage cannot produce this 401 (confirmed by code).

### 3.2 Server path verified correct (confirmed by test)
`src/__tests__/api/chat-completions-api-key-auth.test.ts` runs the real `createPersonalApiKey`/`createBusinessApiKey` → route → `resolveRequester` → `extractBearerToken` → `validateApiKey` chain against an in-memory `ApiKey` table. Run against the **original** `route.ts` and `resolve-requester.ts`:

| Test | Original code |
|---|---|
| Personal key, no session → 200, attributed to owner, `lastUsedAt` set | ✔ pass |
| Business key, no session → 200, attributed to business | ✔ pass |
| `bearer` lowercase + extra whitespace → 200 | ✔ pass |
| `model: "auto"` accepted | ✔ pass |
| Another user cannot revoke the key | ✔ pass |

The checks below were also verified by reading the code:
- **Generation:** `crypto.randomBytes(32)`, formatted `atr_<64 hex>`.
- **Storage:** SHA-256 of the full raw key, in the unique column `ApiKey.keyHash`, plus a display prefix `atr_xxxxxx...`.
- **Display:** the raw key is shown once in `CreatedKeyModal`, and the copy button copies the full `rawKey`.
- **Validation:** the same `hashApiKey(fullKey)` → `findUnique({ keyHash })`. There is no session requirement for API keys and the middleware does not touch `/api/v1`.

### 3.3 Database evidence (read-only, metadata only)
The locally configured `DATABASE_URL` (Neon `ep-raspy-bar-…`) contains:

| Key prefix | Created (UTC) | Revoked | Expires | Last used |
|---|---|---|---|---|
| `atr_68c042...` | 2026-11-06 17:48:45 | no | never | **never** |
| `atr_651fd4...` | 2026-11-06 17:41:12 | **yes** | never | never |

The failing requests were at 18:15 UTC, 27 minutes after `atr_68c042...` was created. A correctly formatted request with that key would have authenticated and set `lastUsedAt` (proven in §3.2). It is still `null`. So the token sent was **not** `atr_68c042...`'s full value, or production does not use this database.

### 3.4 Conclusion
| Hypothesis | Status | How to confirm |
|---|---|---|
| H1: client still uses the revoked 17:41 key `atr_651fd4...` | Strongly supported (timeline) | Diagnostic script prints `REVOKED`. New log shows `reason: REVOKED keyPrefix: atr_651fd4...` |
| H2: malformed token (quotes from `.env`, display prefix, truncated, `Bearer Bearer …`, other env var) | Possible | Diagnostic script shape checks. Log shows `MALFORMED`/`MALFORMED_HEADER`/`NOT_FOUND` |
| H3: dashboard used (e.g. localhost) writes to a different DB than production reads | Possible | Script says `VALID` locally, but the deployed log still shows `NOT_FOUND`. Compare `DATABASE_URL` host in Vercel vs `.env` |
| Server-side generation/validation mismatch | **Ruled out** (test on original code) | — |
| Auth.js session required for API keys | **Ruled out** | — |
| DB failure reported as 401 | **Ruled out** (would be 500) | — |

---

## 4. Issues Identified

| # | Issue | File / Component | Severity | Root Cause | Status |
|---|---|---|---|---|---|
| A1 | Presented token not an active key in the production DB | Client / key handling | High (blocks usage) | Revoked, malformed, or wrong-DB key (§3.4) | **Diagnosable; not confirmed** |
| A2 | Provider credential errors returned to caller as 401 `AUTHENTICATION` | `src/app/api/v1/chat/completions/route.ts` `errorToHttpStatus` | Medium | `AUTHENTICATION`/`MISSING_API_KEY` from provider execution mapped to 401 | **Fixed locally** |
| A3 | Auth rejections indistinguishable; no server log | `route.ts`, `src/lib/auth/resolve-requester.ts` | Medium | Resolver discarded `validateApiKey` reason | **Fixed locally** |
| A4 | Response not OpenAI-compatible (`content` instead of `choices`; `max_tokens` ignored; `model` ignored; no streaming) | `route.ts`, `validation.ts` | Medium (for SDK clients) | Custom response contract | Documented; needs approval |
| A5 | No rate limiting | v1 route | Medium | Not implemented | Open |
| A6 | Client-supplied `requestId` used as `Request` primary key → collision returns 500 `PERSISTENCE_FAILED` | `route.ts` | Low | Design | Open |
| A7 | Session takes precedence over Bearer key | `resolve-requester.ts` | Low (by design, tested) | Intentional | Documented |
| A8 | No CORS / `OPTIONS` handler → browser calls from other origins blocked | v1 route | Info | Server-to-server API | Documented |
| A9 | DB-writing integration tests ungated; local `.env` points at a Neon DB that likely serves production | `src/__tests__/routing/*-integration.test.ts` | Low | Test setup | Open (excluded from runs) |
| A10 | ESLint not configured | `package.json` | Low | Not set up | Open |

---

## 5. Fixes Implemented

### 5.1 `src/lib/auth/resolve-requester.ts`
- **Before:** returned `{ authType: "none" }` for every failure.
- **After:** returns `{ authType: "none", reason, keyPrefix? }`.
  - `reason` is one of `NO_CREDENTIALS`, `MALFORMED_HEADER`, or `validateApiKey`'s `MALFORMED`/`NOT_FOUND`/`REVOKED`/`EXPIRED`/`INVALID_OWNERSHIP`.
  - `keyPrefix` is the 10-character display prefix that is already shown in the dashboard. It is omitted for malformed tokens.
- **Why:** makes production rejections diagnosable.
- **Impact:** additive optional fields. Authentication decisions are unchanged. Existing resolver tests pass unchanged.

### 5.2 `src/app/api/v1/chat/completions/route.ts`
- **Auth rejection (before):** silent 401 `"Authentication required"`.
- **Auth rejection (after):**
  - logs `console.warn("[chat-completions] Authentication rejected.", requestId, reason, keyPrefix)`;
  - the 401 carries `WWW-Authenticate: Bearer`;
  - the message is `"Authentication required"` when there are no credentials, otherwise `"Invalid API key. Send a valid, active key as 'Authorization: Bearer atr_...'"`;
  - `code` stays `AUTHENTICATION`. The response never states *why* a key was rejected (no revoked/expired disclosure), and the full key is never logged.
- **`errorToHttpStatus` (before):** `AUTHENTICATION`/`MISSING_API_KEY` from provider execution → 401.
- **`errorToHttpStatus` (after):** they fall through to **502**. The error `code` is unchanged.
- **Impact:** clients now see 502 for Attentra's upstream credential problems. Caller-key failures remain 401.

### 5.3 `scripts/diagnose-api-key.ts` (new)
- Read-only CLI. It reads `ATTENTRA_API_KEY` from the environment and reports shape checks:
  - length (68 expected);
  - surrounding spaces;
  - quotes;
  - a `Bearer` prefix included by mistake;
  - display prefix pasted instead of the full key.
- It then runs the same hash lookup as the server and reports `NOT_FOUND`/`REVOKED`/`EXPIRED`/`VALID` with owner type and timestamps.
- It never prints the key or its hash.

### 5.4 `src/__tests__/api/chat-completions-api-key-auth.test.ts` (new)
16 tests: the in-process end-to-end auth suite described in §3.2 and §8.

---

## 6. Authentication Flow After Fix

```mermaid
flowchart TD
  A[Dashboard: POST /api/dashboard/api-keys] --> B[generateApiKey: atr_ + 64 hex]
  B --> C[(ApiKey: keyHash = sha256(rawKey), keyPrefix)]
  B --> D[Raw key shown once, copied by user]
  D --> E[Client: Authorization: Bearer atr_...]
  E --> F[Middleware: /api/v1 passthrough]
  F --> G{Auth.js session cookie?}
  G -- yes --> S[Session requester]
  G -- no --> H{Bearer token parsed?}
  H -- no --> X1[401 + log NO_CREDENTIALS / MALFORMED_HEADER]
  H -- yes --> I[validateApiKey: sha256 → findUnique keyHash]
  I -- DB error --> X0[500 INTERNAL_ERROR]
  I -- invalid --> X2[401 + log reason + keyPrefix]
  I -- valid --> J[lastUsedAt updated; personal or business requester]
  S --> K[Validate body → routeAndPersist → ownership attach]
  J --> K
  K --> L[Orchestrator → provider with fallback]
  L -- success --> M[200 content + routing + execution + cost persisted]
  L -- provider auth/missing key --> X3[502]
```

---

## 7. Security Improvements and Review

**Verified sound:**
- Keys come from a CSPRNG (256 bits).
- Only the SHA-256 hash is stored. Lookup goes through a unique index, so there is no string comparison of secrets and constant-time comparison is not required.
- The raw key is returned once and is never in URLs or logs.
- Revoked and expired keys are rejected.
- Ownership comes from the DB, not the client. Personal revoke is scoped by `userId`, business management by membership/role.
- Provider error messages are sanitized (an existing test checks that bearer tokens do not leak).

**Improved:** rejection reasons are logged with a safe prefix only, and provider credential failures no longer masquerade as caller auth failures.

**Remaining concerns:**
- No rate limiting or brute-force throttling. 256-bit keys make guessing infeasible, but cost abuse by a valid key is unbounded.
- No scopes/permissions on keys.
- Session-over-Bearer precedence (A7).
- The sign-in event logs the user's email (`src/auth.ts`).

---

## 8. Testing Results

| Test | Expected | Actual | Status |
|---|---|---|---|
| `npx tsc --noEmit` | 0 errors | 0 errors | ✔ Pass |
| `npx vitest run` (excluding 2 DB-writing suites) | all pass | **45 files, 935 passed, 4 skipped, 0 failed** | ✔ Pass |
| New auth suite (fixed code) | 16 pass | 16 pass | ✔ Pass |
| New auth suite vs **original** code | valid-key tests pass; new diagnostics/502 tests fail | 5 pass, 11 fail (as expected) | ✔ Confirms analysis |
| Valid personal key, no session | 200 | 200 | ✔ |
| Valid business key, no session | 200 | 200 | ✔ |
| Lowercase `bearer` / extra spaces | 200 | 200 | ✔ |
| No Authorization header | 401 | 401 `Authentication required` | ✔ |
| `Bearer ` (empty) | 401 | 401 | ✔ |
| `Basic …` | 401 | 401 | ✔ |
| Non-`atr_` key | 401 | 401 | ✔ |
| Random `atr_` key | 401 | 401 | ✔ |
| Display prefix instead of key | 401 | 401 | ✔ |
| Revoked key | 401 | 401 | ✔ |
| Expired key | 401 | 401 | ✔ |
| Full key absent from body and logs | yes | yes | ✔ |
| Cross-user revoke | refused, key still works | refused, 200 | ✔ |
| Provider `AUTHENTICATION` / `MISSING_API_KEY` | 502 | 502 | ✔ |
| Existing chat-completions suite (validation, empty messages, ownership, cost persistence, sanitization, failure formatting) | pass | pass | ✔ |
| Existing API-key, dashboard, business regression suites | pass | pass | ✔ |
| `npx prisma validate` | valid | valid | ✔ |
| `npx prisma migrate status` (read-only) | up to date | up to date (first attempt hit a transient Neon connection error; retry succeeded) | ✔ |
| `npx next build` | success | compiled successfully | ✔ |
| Lint | — | not configured | ⚠ Not run |
| `routing-integration`, `execution-plan-integration` | — | not run: they write to the configured (likely production) DB | ⚠ Blocked |
| Live provider tests (`RUN_LIVE_PROVIDER_TESTS`) | — | skipped (paid, opt-in) | ⚠ Requires credentials |
| Real provider completion via `auto` routing | real answer | not executed | ⚠ Requires production key |
| Production API with dashboard key | 200 | not executed (no key access) | ⚠ **Pending (you)** |
| Rate limiting / streaming / provider timeout | — | not implemented / covered only by existing unit tests | — |

---

## 9. Production Deployment Requirements

**Vercel environment variables (names only):**
- `DATABASE_URL`: must be the same database the dashboard you use writes to.
- `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`: at least one must be valid, otherwise requests now return 502.
- `CRON_SECRET`, `CONSUMER_BASELINE_MODEL`, `NEXT_PUBLIC_DISPLAY_CURRENCY`, `NEXT_PUBLIC_USD_TO_PKR_RATE`.
- Check the Production **and** Preview scopes separately. They can hold different `DATABASE_URL`s.

**Migrations:** none required. All 4 migrations are applied on the configured DB.

**Deployment:** commit the 4 files (§12), push, verify on a Preview deployment, then promote. Rollback is Vercel Instant Rollback; there are no schema or env changes.

**Dashboard:** use a key created on the **production** dashboard (`https://attentra-nine.vercel.app/dashboard/api-keys`), copied in full at creation (68 chars, `atr_` + 64 hex).

---

## 10. Remaining Issues

1. **A1 is not confirmed.** The exact reason the 18:15 requests were rejected needs either the diagnostic script run with your key or the new production log line.
2. **OpenAI SDK compatibility (A4).** `client.chat.completions.create(...)` will get past auth but the SDK expects `choices[0].message.content`. Options:
   - (a) use the plain-HTTP client in §12 now;
   - (b) approve an **additive** compatibility layer: add `id`, `object`, `created`, `model`, `choices`, `usage` alongside the existing fields, and accept `max_tokens`.
3. No rate limiting (A5). No streaming.
4. `requestId` collision (A6), ungated DB tests (A9), and lint (A10).
5. Production end-to-end with a real provider is unverified.

No known server-side authentication defect remains within the tested scope. This is not a claim that the platform is issue-free.

---

## 11. Final Status

**PARTIALLY FIXED.**
- The confirmed server-side defects (A2, A3) are fixed and pass all local tests and the build.
- They are **not deployed**, and the production API has **not** been verified.
- The trigger of the original 401 (A1) is narrowed by evidence to the presented key, but it is not yet confirmed.

---

## 12. Developer Handover

**1. Check your key locally (key never displayed):**
```powershell
$env:ATTENTRA_API_KEY = Read-Host "Attentra API key"
npx tsx scripts/diagnose-api-key.ts
```
- `REVOKED`, or a shape problem: create a new key on the **production** dashboard, copy the full value, and update your Python `.env` (no quotes or spaces).
- `VALID` here but production still returns 401: Vercel's `DATABASE_URL` differs from your `.env`. Compare the hostnames in the Vercel dashboard.

**2. Deploy the fix:**
```powershell
git add src/app/api/v1/chat/completions/route.ts src/lib/auth/resolve-requester.ts scripts/diagnose-api-key.ts src/__tests__/api/chat-completions-api-key-auth.test.ts docs/AUTHENTICATION_AUDIT_REPORT.md
git commit -m "fix(api): diagnosable API-key auth rejections; provider auth errors return 502"
git push
```
After deploying, any remaining 401 shows up in Vercel → Logs as `[chat-completions] Authentication rejected. requestId: … reason: … keyPrefix: atr_xxxxxx...`.

**3. Verify production.** In Windows PowerShell 5.1, `curl.exe -d '{"…"}'` loses the inner quotes, so use `Invoke-RestMethod`:
```powershell
$key  = $env:ATTENTRA_API_KEY.Trim()
$body = @{ model = "auto"; messages = @(@{ role = "user"; content = "Hello, are you working?" }) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "https://attentra-nine.vercel.app/api/v1/chat/completions" `
  -Headers @{ Authorization = "Bearer $key" } -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 6
```
Success looks like this:
- `success: true` and a non-empty `content`;
- `execution.provider` and `execution.modelIdentifier` name a real provider and model;
- the request appears in Dashboard → History with cost;
- the key's "Last used" updates.

**4. Python client matching the current contract:**
```python
import os, requests

URL = "https://attentra-nine.vercel.app/api/v1/chat/completions"
KEY = os.environ["ATTENTRA_API_KEY"].strip()

history = []
while True:
    user = input("> ")
    history.append({"role": "user", "content": user})
    r = requests.post(URL, json={"model": "auto", "messages": history},
                      headers={"Authorization": f"Bearer {KEY}"}, timeout=120)
    data = r.json()
    if not r.ok:
        print(f"[{r.status_code}] {data['error']['code']}: {data['error']['message']} ({data.get('requestId')})")
        history.pop()
        continue
    print(data["content"], f"\n  — {data['execution']['modelIdentifier']}")
    history.append({"role": "assistant", "content": data["content"]})
```
Use `maxTokens` (not `max_tokens`) if you need a limit.

**5. Decide** whether to approve the OpenAI-compatible response layer (A4) and rate limiting (A5).

---

## 13. Follow-up Investigation (second pass, 2026-11-06 ~19:00 UTC)

**New input:** `scripts/diagnose-api-key.ts` reported the key **VALID** in the locally configured DB (68 chars, personal, not revoked, never expires, never used).

### 13.1 Facts established
| Check | Result | Evidence |
|---|---|---|
| Fixes from the first pass deployed? | **No.** All changes are uncommitted; `origin/main` = `908dfbe` | `git status`. Production 401s still lack `WWW-Authenticate` and still say "Authentication required" for a non-empty Bearer token (probe at 19:01 UTC, fake key only) |
| Vercel env / CLI access | **None** (no `vercel` CLI, no `.vercel` link) | Production `DATABASE_URL` cannot be read from here |
| Environment-specific DB selection in code | **None.** Only `env("DATABASE_URL")` in `prisma/schema.prisma`. No `directUrl`, `.env.production`, or `POSTGRES_*`/`NEON_*` usage | grep |
| Local `.env` vs `.env.local` | Same Neon host | Hostname comparison (values not printed) |
| Route runtime / middleware | Node runtime (no `runtime` export). Middleware returns `NextResponse.next()` for `/api/v1` before any session check | `route.ts:60`, `middleware.ts:46` |
| Server accepts a valid key with no session | Yes, including on the original code | §3.2 test |

### 13.2 What the VALID result means
The key sits in the local DB unused, while production rejected a key at 18:15. One of these must be true:

- **(a) The key was created on the production dashboard.** Then production writes to the same DB that contains it, so the databases are the same. In that case the production request did **not** carry this exact 68-character key. Likely reasons:
  - the Python client read a different or stale variable (for example, the revoked 17:41 key);
  - the value had quotes or whitespace;
  - the header was not sent at all.
- **(b) The key was created on a local dashboard (`npm run dev`).** Then it lives only in the local DB, and production may read a **different** database (for example a Neon branch set by the Vercel–Neon integration, or a different Production-scope `DATABASE_URL`).

The code cannot tell (a) from (b) without production visibility. The diagnostics below decide it with one request.

### 13.3 Diagnostics added in this pass
- `resolve-requester.ts`: the rejection result also carries `tokenLength`. Only the length is recorded, never the content.
- `route.ts`: the rejection log now includes `tokenLength` and `dbHost`. `dbHost` is the hostname parsed from `DATABASE_URL` at module load, with no credentials.
- `scripts/diagnose-api-key.ts`: prints `Database host:` so it can be compared directly with production's `dbHost:`.
- Tests added:
  - the log contains `tokenLength: 68` and a `dbHost`;
  - the log never contains the connection string or its password;
  - a key wrapped in quotes from a `.env` file is reported as `MALFORMED` with `tokenLength: 70`.

### 13.4 Decision table after deploying
Send one request with the key, then find its `requestId` in Vercel → Logs:

| Production log | Meaning | Action |
|---|---|---|
| No "Authentication rejected" line, 200 response | Works | Done |
| `reason: NOT_FOUND`, `tokenLength: 68`, `dbHost` **≠** local `Database host` | **Database mismatch (confirmed)** | Point Vercel Production `DATABASE_URL` at the intended DB (your approval and action), or create the key on the production dashboard |
| `reason: NOT_FOUND`, `tokenLength: 68`, `dbHost` **=** local | Client sent a different well-formed key | Check which variable/value the client uses; re-run the diagnostic on that exact value |
| `reason: REVOKED` | Client uses the revoked key | Use the active key |
| `reason: MALFORMED` / `tokenLength ≠ 68` | Quotes, whitespace or truncation | Fix the client's key value |
| `reason: NO_CREDENTIALS` | Client sent no `Authorization` header | Fix the client header |
| `reason: MALFORMED_HEADER` | Header present but not `Bearer <token>` | Fix the client header format |

A quick check needs no deploy: open `https://attentra-nine.vercel.app/dashboard/api-keys` and look for **`atr_68c042...`**.
- **Listed:** production uses the same DB, which is case (a).
- **Not listed:** production uses a different DB, which confirms case (b).

### 13.5 Updated test results
- `npx tsc --noEmit`: pass.
- `npx vitest run` (same 2 DB-writing suites excluded): **45 files, 937 passed, 4 skipped, 0 failed**.
- New auth suite: 18 tests.
- `npx next build`: compiled successfully.

### 13.6 Status
Still **PARTIALLY FIXED, production verification pending.** The root cause of the original 401 is narrowed to (a) or (b) above. It will be confirmed by the first production request after deployment, or by the dashboard check in §13.4. No database URLs were changed and nothing was deployed.

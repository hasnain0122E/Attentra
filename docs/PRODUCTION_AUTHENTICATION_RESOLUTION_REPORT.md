# Attentra — Production API Authentication Resolution Report

**Date:** 2026-11-06
**Endpoint:** `POST https://attentra-nine.vercel.app/api/v1/chat/completions`
**Base commit:** `908dfbe` (`main` = `origin/main`); all changes below are **uncommitted and undeployed**
**Prior report:** `docs/AUTHENTICATION_AUDIT_REPORT.md`

---

## 1. Executive Summary

**What was wrong:** a dashboard-generated key that the local diagnostic reports as **VALID** received `401 AUTHENTICATION` from production at 18:15 UTC.

**Is it fixed?** **Not yet confirmed.** The root cause of that 401 **cannot be conclusively established without production visibility.** There is no Vercel CLI, project link, env access or log access from this environment.

Evidence narrows it to exactly two possibilities (§2.2):
- **(a)** the production request did not carry that exact key;
- **(b)** production reads a different database from the local `DATABASE_URL`.

The Attentra authentication code has been ruled out by tests run against the original code.

**New production blocker found during verification (confirmed):**
- Since about **19:08 UTC**, the Vercel Firewall answers **every** non-browser request to the site with **`403` + `X-Vercel-Mitigated: challenge`** (the "Vercel Security Checkpoint" page). This covers `/`, `/login`, `/api/auth/session` and `/api/v1/chat/completions`.
- These requests never reach Attentra. Until the challenge is lifted for `/api/v1`, the Python client gets 403 HTML even with a valid key.
- This is a Vercel project setting or mitigation, not repository code (§2.3).

**What was changed (local):**
- Authentication failures now produce one structured, secret-free log line covering:
  - `NO_CREDENTIALS`, `MALFORMED_HEADER`, `MALFORMED`, `NOT_FOUND`, `REVOKED`, `EXPIRED`, `INVALID_OWNERSHIP`, `DATABASE_ERROR`;
  - the request ID, key display prefix, token length, environment, and database host/name.
  - That line decides (a) vs (b) from a single request.
- A database outage during key lookup now returns **503 (retryable)** instead of a generic 500. It was never a 401.
- Provider credential failures now return **502** instead of 401.
- New: an offline key diagnostic, a production verification script, and 25 auth tests.

**Ready to deploy:** yes. Type check, 944 tests and the production build pass, and there are no migrations or env changes. Deploying alone will not make the API usable while the Firewall challenge is active.

---

## 2. Root Cause

### 2.1 Ruled out (with evidence)
| Candidate | Evidence | Verdict |
|---|---|---|
| Hash or encoding mismatch between generation and validation | Both call `hashApiKey()` in `src/lib/api-keys/crypto.ts` (SHA-256 of the full key, hex) | Ruled out |
| Field or model mismatch | Create writes `ApiKey.keyHash`. Validate runs `findUnique({ where: { keyHash } })` (`service.ts`) | Ruled out |
| Header parsing / trimming / case | `extractBearerToken`: `/^Bearer\s+(.+)$/i` + `trim()`. Tested with `bearer`, extra spaces, trailing spaces | Ruled out |
| Session required for API keys | `resolveRequester` falls through to Bearer when `auth()` is null. Tested with no session | Ruled out |
| Middleware blocking `/api/v1` | `src/middleware.ts:46` returns `NextResponse.next()` for `/api/v1` before any session check | Ruled out |
| Edge runtime / Prisma incompatibility | Route has no `runtime` export, so it runs on Node. Prisma is never imported by middleware | Ruled out |
| DB failure reported as 401 | A thrown lookup error propagates out of `resolveRequester`; it is never mapped to 401 | Ruled out |
| Revoked/expired/ownership handling bug | Each case tested and rejected correctly | Ruled out |
| Original code itself | The new end-to-end suite's valid-key tests pass on the **original** `route.ts`/`resolve-requester.ts` | Ruled out |

The original 401 body (`code` + `message`, no `retryable`) can only come from the `requester.authType === "none"` branch. So production's `resolveRequester` found no valid key in the token it received.

### 2.2 Remaining hypotheses (cannot be decided without production access)
| | Hypothesis | Supporting evidence | Decisive check |
|---|---|---|---|
| **(a)** | Production request carried a different string (stale/revoked key, quotes, truncation, no header) | Local DB holds a revoked key `atr_651fd4...` created 17:41 and an active `atr_68c042...` created 17:48. Both show `lastUsedAt = null` | Post-deploy log `reason:` ≠ `NOT_FOUND`, or `NOT_FOUND` with `dbHost` equal to local |
| **(b)** | Production `DATABASE_URL` points to a different database/branch | Only possible if the key was created on a **local** dashboard; the code has no other DB selection path | Production dashboard does **not** list `atr_68c042...`, or post-deploy log shows `reason: NOT_FOUND tokenLength: 68 dbHost: <different>` |

**Logical constraint:** if the key was created on the **production** dashboard, then production's DB contains it. The local diagnostic finding it means local and production share a DB, so (b) is impossible and (a) holds.

### 2.3 Vercel Firewall challenge (confirmed, separate)
| Time (UTC) | Client | Result |
|---|---|---|
| 18:15 | Your Python/curl | `401` JSON from the route (`X-Matched-Path: /api/v1/chat/completions`) |
| 19:01 | curl, fake key | `401` JSON from the route |
| ≈19:08 | PowerShell `Invoke-WebRequest`, fake key | **`403` Vercel Security Checkpoint** |
| ≈19:08 | curl / python-requests / OpenAI-Python / httpx / Chrome UAs | **all `403`, `X-Vercel-Mitigated: challenge`**, for `/`, `/login`, `/api/auth/session`, `/api/v1/...` |

Notes:
- The timestamps are decoded from the `X-Vercel-Challenge-Token` values.
- The repository contains no firewall configuration (`vercel.json` holds only a cron).
- The cause is a Vercel-side setting or automatic mitigation: Attack Challenge Mode, a Bot Protection managed ruleset, a custom Challenge rule, or system DDoS mitigation.
- Contributing factors were not established. Roughly 20 audit probes were made from this machine over about an hour, and they were stopped as soon as the challenge was observed.
- **Hypothesis:** the checkpoint page runs obfuscated `eval` (`window["eva"+"l"]`) inside a challenge worker. This may also explain the CSP `eval` warning from the first audit.

---

## 3. Before vs After

| Area | Before | After |
|---|---|---|
| Auth rejection log | None | One `console.warn` line, `[chat-completions] Authentication rejected.`, with `requestId`, `reason`, `keyPrefix`, `tokenLength`, `env`, `dbHost` (+ `errorCode` for backend errors) |
| Rejection reasons visible | No | `NO_CREDENTIALS`, `MALFORMED_HEADER`, `MALFORMED`, `NOT_FOUND`, `REVOKED`, `EXPIRED`, `INVALID_OWNERSHIP`, `DATABASE_ERROR`, `AUTH_BACKEND_ERROR` |
| 401 response | `"Authentication required"` for everything | Same code `AUTHENTICATION`. Message is "Authentication required" (no credentials) or "Invalid API key…" (rejected). Adds `WWW-Authenticate: Bearer`. Never states the specific reason |
| DB failure during key lookup | Generic `500 INTERNAL_ERROR`, no auth log | `503 SERVICE_UNAVAILABLE`, `retryable: true`, logged `DATABASE_ERROR` + Prisma code (e.g. `P1001`). No internals in the body |
| Provider credential error (`AUTHENTICATION`/`MISSING_API_KEY` from provider) | `401` (indistinguishable from a bad Attentra key) | `502`, same error code |
| Key troubleshooting | None | `scripts/diagnose-api-key.ts` (read-only) |
| Production check | Ad-hoc curl | `scripts/verify-production-api.ps1` (detects Firewall challenge) |

---

## 4. Files Modified

| File | Status | Purpose |
|---|---|---|
| `src/app/api/v1/chat/completions/route.ts` | modified | `DATABASE_IDENTITY` (host/db from `DATABASE_URL`, no credentials) + `DEPLOYMENT_ENV` (`VERCEL_ENV`→`NODE_ENV`); `logAuthFailure()`; 503 path for credential-check failures; 401 message/header; provider auth codes → 502 |
| `src/lib/auth/resolve-requester.ts` | modified | `AuthFailureReason` type; `none` result now carries `reason`, `keyPrefix`, `tokenLength` (no behavior change to who is authenticated) |
| `src/__tests__/api/chat-completions-api-key-auth.test.ts` | new | 25 end-to-end-in-process tests with an in-memory `ApiKey` table (no real DB) |
| `scripts/diagnose-api-key.ts` | new | Reads `ATTENTRA_API_KEY`; shape checks; same hash lookup as the server; prints DB host/name; never prints the key or hash |
| `scripts/verify-production-api.ps1` | new | Production check; key only sent to the fixed production URL; prints prefix only; reports HTTP status, requestId, provider/model/content; detects `X-Vercel-Mitigated` |
| `docs/AUTHENTICATION_AUDIT_REPORT.md` | new (previous pass) | First and second pass findings |
| `docs/PRODUCTION_AUTHENTICATION_RESOLUTION_REPORT.md` | new | This report |

No schema, migration, middleware, auth-config, dependency, or env-file changes.

A non-public diagnostic **endpoint** was deliberately **not** added. The log line already shows the DB identity on the first rejected request, and a new endpoint would add attack surface.

---

## 5. Tests

All of these were executed in this pass.

| Command | Result |
|---|---|
| `npx tsc --noEmit -p .` | ✔ 0 errors |
| `npx vitest run src/__tests__/api/chat-completions-api-key-auth.test.ts` | ✔ **25 passed** |
| `npx vitest run` on auth-related suites (`api/chat-completions*`, `auth`, `api-keys`) | ✔ 188 passed (before the final 7 tests were added) |
| `npx vitest run --exclude …/routing-integration.test.ts --exclude …/execution-plan-integration.test.ts` | ✔ **45 files, 944 passed, 4 skipped, 0 failed** |
| `npx prisma validate` | ✔ valid |
| `npx next build` | ✔ compiled successfully |
| `npx next lint` | ⚠ **Not configured.** It only shows the interactive "How would you like to configure ESLint?" prompt. Exit 1, no files changed |
| `scripts/verify-production-api.ps1` parse check | ✔ 0 parse errors |
| `scripts/verify-production-api.ps1` with fake keys | Format guard works (exit 1). Production returned 403 Firewall challenge, which led to §2.3 |
| `scripts/diagnose-api-key.ts` with fake keys (previous pass) | ✔ shape checks and `NOT_FOUND` |

**Auth suite coverage:**

| Scenario | Expected | Result |
|---|---|---|
| Valid personal key, no session | 200, owner attribution, `lastUsedAt` set | ✔ |
| Valid business key, no session | 200, business attribution | ✔ |
| Surrounding whitespace / lowercase `bearer` | 200 | ✔ |
| `model: "auto"` | accepted | ✔ |
| Valid session + bogus Bearer | 200 as session user, no key lookup (intended precedence) | ✔ |
| Missing header | 401 `NO_CREDENTIALS` | ✔ |
| `Bearer ` empty | 401 `MALFORMED_HEADER` | ✔ |
| `Basic …` | 401 `MALFORMED_HEADER` | ✔ |
| Non-`atr_` key / `ATR_` prefix | 401 `MALFORMED` | ✔ |
| Quoted key (`"atr_…"`) | 401 `MALFORMED`, `tokenLength: 70` | ✔ |
| 67-char key | 401 `NOT_FOUND`, `tokenLength: 67` | ✔ |
| Random well-formed key / display prefix | 401 `NOT_FOUND` | ✔ |
| Revoked / expired | 401 `REVOKED` / `EXPIRED` | ✔ |
| Both owners set | 401 `INVALID_OWNERSHIP` | ✔ |
| DB lookup throws (Prisma `P1001`) | 503 retryable, `DATABASE_ERROR`, no host in body | ✔ |
| Auth backend throws | 503, `AUTH_BACKEND_ERROR` | ✔ |
| Log excludes raw key, hash, connection string, password | yes | ✔ |
| Cross-user revoke | refused, key still works | ✔ |
| Provider `AUTHENTICATION` / `MISSING_API_KEY` | 502 | ✔ |

**Not run:**
- `routing-integration` / `execution-plan-integration`: they write to the configured Neon DB, which may be production.
- Live provider tests: paid, opt-in.
- Any production request with a real key: no key access, and the site is currently challenged.

The new tests never touch a real database: `@/lib/prisma` is replaced by an in-memory table.

---

## 6. Security Review

- **Keys:** 256-bit CSPRNG keys, stored **only** as SHA-256 hashes (unique index). The raw key is shown once. Unchanged.
- **Logs never contain:** the full key, the Authorization header, the key hash, the connection string, the DB password, or provider keys. Each is asserted by tests where applicable.
- **Logs do contain:** the 10-character display prefix already shown in the dashboard, the token length, and the DB hostname/name.
- **Responses:** they never reveal the rejection reason, DB host, or Prisma messages. The DB-failure body is a fixed string.
- **No authentication weakened:** who is accepted is unchanged. DB failures now **fail closed** (503), not open.
- **Not done:** no new unauthenticated endpoints, no firewall changes, no env changes, no production data changes.
- **Pre-existing, unchanged:** no rate limiting; session precedence over Bearer (intended and tested); sign-in log includes email (`src/auth.ts`).

---

## 7. Deployment Instructions

1. **Commit and push** (not done automatically):
   ```powershell
   git add src/app/api/v1/chat/completions/route.ts src/lib/auth/resolve-requester.ts `
     src/__tests__/api/chat-completions-api-key-auth.test.ts scripts/diagnose-api-key.ts `
     scripts/verify-production-api.ps1 docs/AUTHENTICATION_AUDIT_REPORT.md `
     docs/PRODUCTION_AUTHENTICATION_RESOLUTION_REPORT.md
   git commit -m "fix(api): structured API-key auth diagnostics; 503 on auth backend failure; 502 for provider auth"
   git push
   ```
2. **Vercel Firewall** (Project → Firewall), your decision:
   - Find which mitigation is active: Attack Challenge Mode, Bot Protection, a custom rule, or a system mitigation shown in Firewall → Overview/Traffic.
   - If it is a rule you control, scope it so `/api/v1/*` is not challenged (for example a Bypass rule for that path, kept below rate limits).
   - If it is Attack Challenge Mode, it challenges all non-browser clients site-wide. Turn it off once you no longer need it.
   - Do **not** disable protection for the whole site just to test.
3. **Environment variables** (names only; confirm in Vercel → Settings → Environment Variables, **Production** scope):
   - `DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`;
   - `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_AI_API_KEY` (at least one valid);
   - `CRON_SECRET`, `CONSUMER_BASELINE_MODEL`, `NEXT_PUBLIC_DISPLAY_CURRENCY`, `NEXT_PUBLIC_USD_TO_PKR_RATE`.
4. **Database match:** compare the hostname in Vercel's Production `DATABASE_URL` with the `Database host:` printed by `scripts/diagnose-api-key.ts`. Compare the host only and do not share the full URL.
   - If they differ and the production DB is the wrong one, correct **`DATABASE_URL` (Production scope)** and redeploy. This is your decision.
   - Alternatively, create keys on the production dashboard.
5. **Migrations:** none required. The local DB is up to date; run `npx prisma migrate status` against production only if you change `DATABASE_URL`.
6. **Rollback:** Vercel Instant Rollback. There are no schema or env changes.

---

## 8. Production Verification

```powershell
$env:ATTENTRA_API_KEY = Read-Host "Enter your Attentra API key"
powershell -ExecutionPolicy Bypass -File scripts/verify-production-api.ps1
```

| Exit | Meaning |
|---|---|
| 0 / `PASS` | Authenticated, completion returned |
| 2 / `BLOCKED by the Vercel Firewall` | Request never reached Attentra (§2.3) |
| 1 / `FAIL - AUTHENTICATION` | Find the printed `requestId` in Vercel → Logs |

Reading the log line for a 401:

| Log line | Conclusion |
|---|---|
| `reason: NOT_FOUND tokenLength: 68 dbHost: X`, where X ≠ local `Database host` | **Database mismatch confirmed** |
| `NOT_FOUND`, same host | A different key was sent |
| `REVOKED` / `EXPIRED` | Use an active key |
| `MALFORMED` / `MALFORMED_HEADER` / `NO_CREDENTIALS` | Fix the client's header or key value |
| `DATABASE_ERROR errorCode: P10xx` (response 503) | Neon connectivity problem |

**Success criteria:**
1. HTTP 200 and `success: true`.
2. Non-empty `content`.
3. `execution.provider` and `execution.modelIdentifier` present.
4. The key's **Last used** updates on `/dashboard/api-keys`.
5. The request appears in Dashboard → History with cost.

---

## 9. Remaining Issues

1. **Root cause of the 18:15 401 is unconfirmed:** (a) vs (b) needs one post-deploy request or the dashboard check (`atr_68c042...` listed on the production dashboard → (a)).
2. **Vercel Firewall challenge** blocks all programmatic access. It is a dashboard action outside the repository.
3. **The response is not OpenAI-compatible.** It returns `content`, `routing` and `execution`, not `choices`. It ignores `max_tokens` (it uses `maxTokens`), ignores `model`, and has no streaming. The OpenAI Python SDK will not parse it, so use the `requests` client in `docs/AUTHENTICATION_AUDIT_REPORT.md` §12. An additive compatibility layer needs your approval.
4. No rate limiting.
5. ESLint not configured.
6. DB-writing integration tests are ungated and point at a shared Neon DB.
7. A client-supplied `requestId` collision returns 500.

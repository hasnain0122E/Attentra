# Attentra — P0 Security Hotfix: Request ID Ownership Isolation

**Date:** 2026-11-07
**Base commit:** `4428f32`, plus the uncommitted Phase 3C work (preserved, unchanged). Nothing is committed or deployed.
**Severity:** High. Cross-tenant data disclosure and integrity violation. Authenticated attacker; precondition: knowing the victim's request ID.

---

## 1. Confirmed Vulnerability and Affected Code Path

`POST /api/v1/chat/completions` (`src/app/api/v1/chat/completions/route.ts`):

| Step | Code (before fix) | Effect with an attacker-chosen `requestId` = victim's ID |
|---|---|---|
| 4 Validate | `validation.ts` accepts `requestId` (any string) | Passes |
| 5 Resolve ID | `effectiveRequestId = clientRequestId \|\| requestId` | Persistence ID = **victim's ID** |
| 6 Route + persist | `persistRoutingDecision`: `findUnique` → **skip create if the row exists** → `routingDecision.upsert` | Victim's Request **reused**; victim's RoutingDecision **overwritten** |
| 7 Ownership | `request.update({ where: { id } , data: owner })` | Victim's row **re-owned** by the attacker (`userId` / `businessId` / `apiKeyId`) |
| 10 Success | `persistRequestCostIntelligence`, then `request.update` prompt/response | Victim's usage, cost, prompt and response overwritten with the attacker's |
| 11 Failure | `request.update` status `FAILED` only | Victim's **prompt and response remain** and are now owned by the attacker |
| History | `fetchUserRequest`: `findFirst({ where: { id, userId } })` | Attacker can read the victim's prompt and response (failure path); victim loses the record |

**Reproduced**, not just theorised. The new regression suite, run against the **pre-fix** route and persistence, fails 12/12 attack scenarios, including "User B cannot read User A's request through History detail". See §6.

**Other flows checked:**
- **Playground:** uses the same route (session auth). It does not send `requestId`, but any session caller could — **affected, now fixed.**
- **Personal and business API keys:** same route — **affected, now fixed.**
- **History detail (consumer and business):** the ownership checks were correct. The bug was that ownership itself was re-assigned. Unchanged.
- **Other Request writers:** none. `persistRoutingDecision` is the only `request.create` in `src/`; all later writes go through the route using the same ID.

## 2. Root Cause

Three defects combined:
1. **Untrusted input chose the persistence identity.** The client `requestId` became the `Request` primary key.
2. **Find-or-reuse persistence.** `persistRoutingDecision` silently reused an existing Request and upserted (overwrote) its RoutingDecision. The doc comment described this as intentional idempotent re-routing; no production caller relied on it.
3. **Unconditional ownership write.** Ownership was attached with `update({ where: { id } })`, which re-owns any row, including one already owned by someone else.

## 3. Exploitability and Remaining Uncertainty

**Preconditions:** a valid account or API key, plus the victim's request ID.
- **ID format:** `req_<ms timestamp>_<8 chars>`.
- **Guessing:** the suffix came from `Math.random()` (~41 bits), so brute force is impractical. Note also that each attempt costs a rate-limited request.
- **Where IDs appear:** in the owner's API responses, History URLs, logs, screenshots, the demo recording and support conversations. **Leaked IDs are the realistic vector.**
- **Integrity impact needs no read access:** any known ID lets an attacker overwrite or re-own the record.

**Uncertainty:** I did not inspect production data, by design, so I can't say whether this was ever exploited. A post-deploy check could look for requests whose `routingDecision.createdAt` / `updatedAt` diverge or that changed owner. That would need log or DB review by the owner; it isn't done here.

## 4. The Fix and Why It Prevents Reassignment

Three independent layers. Any one of them alone blocks the attack.

1. **Server-only request IDs** (`route.ts`):
   - `effectiveRequestId = requestId`, always the server-generated value.
   - The client `requestId` is still *accepted* by the validator (no 400 for old clients) but is **never read**.
   - `generateRequestId` now uses `crypto.randomBytes`, in the same `req_<ms>_<8 base36>` format, so there is no public contract change.
2. **Create-only persistence** (`persistence.ts`):
   - One transaction does `request.create` + `routingDecision.create`. No `findUnique`, no reuse, no `upsert`.
   - A duplicate ID raises **P2002** on the primary key or the `requestId` unique constraint; the transaction rolls back and the route returns `500 PERSISTENCE_FAILED` **before any provider call**.
   - The database enforces this atomically, so there is **no check-then-write race**.
3. **Conditional ownership attach** (`route.ts` §7):
   - `update({ where: { id, userId: null, businessId: null, apiKeyId: null } })`, using Prisma 6's non-unique filters on `update`.
   - Only a row that is still unowned can be claimed. An owned row gives **P2025** → `500 OWNERSHIP_FAILED`, fail closed before execution. Atomic in one statement.

**Unchanged:**
- **Routing and execution:** routing policies, fallback, execution, authentication, rate limiting, cost logic, response shape (`id === requestId`, `req_…` format), History queries and access checks.
- **Database:** schema — no migration.

## 5. Files Modified

| File | Change |
|---|---|
| `src/app/api/v1/chat/completions/route.ts` | Crypto-random `generateRequestId`; client `requestId` ignored; conditional ownership `where` |
| `src/lib/routing/persistence.ts` | Create-only transaction; returns the created decision ID; doc comments updated |
| `src/__tests__/security/request-id-ownership.test.ts` | **New**: 16 security regression tests |
| `src/__tests__/api/chat-completions.test.ts` | Expectations updated: server ID (`SERVER_ID`), `UNOWNED_WHERE` ownership filter, client ID not echoed |
| `src/__tests__/routing/routing-step3.test.ts` | Persistence tests rewritten for create-only semantics (+ duplicate fails safely, never upserts) |
| `Tracker.md` | Hotfix entry |
| `docs/PHASE_3C_REQUEST_ID_SECURITY_HOTFIX.md` | This report |

## 6. Security Regression Tests

`src/__tests__/security/request-id-ownership.test.ts` runs the **real** route, router, `persistRoutingDecision` and `fetchUserRequest` against an in-memory Prisma fake that enforces the real constraints:
- create on an existing key → P2002;
- `update` whose filters don't match → P2025;
- `$transaction` rollback.

Mocked: model catalog, auth resolver, provider execution (**no paid calls**) and cost service. **No database is touched.**

| # | Case | Fixed code | Pre-fix code |
|---|---|---|---|
| 1 | Baseline request created, owned, server ID | ✔ | ✔ |
| 2–3 | User B sends User A's ID (successful / failed execution): A's ownership, prompt, response, usage, cost and routing decision unchanged; B gets a distinct server ID and its own row | ✔ | ✘ |
| 4 | User B can't read A's record via History; A still can | ✔ | ✘ (**disclosure reproduced**) |
| 5–6 | Personal API key / business API key: isolated, correctly attributed | ✔ | ✘ |
| 7–11 | Malicious or malformed IDs (path traversal, 10 kB, SQL-ish, valid-looking `req_…`, empty) never become the persistence ID | ✔ | ✘ ×4, ✔ empty |
| 12 | No client ID: normal OpenAI envelope, `id === requestId`, 5 distinct IDs | ✔ | ✔ |
| 13 | 4 concurrent requests (session, personal key, business key) carrying the victim's ID: victim untouched, 4 distinct IDs | ✔ | ✘ |
| 14 | `persistRoutingDecision` on an existing ID fails safely, no overwrite | ✔ | ✘ |
| 15 | Ownership attach on an owned row → P2025, owner unchanged | ✔ | ✔ (fake-level) |
| 16 | Source guard: no `clientRequestId`, server ID only, conditional `where`, no `Math.random`, no `upsert`/`findUnique` in persistence | ✔ | ✘ |

Result: **16/16 pass on the fix; 12/16 fail on the pre-fix code.** Verified by temporarily restoring the `HEAD` versions of the two source files, then restoring the fix.

## 7. Full Test Results

All commands below were executed in this session.

| Check | Result |
|---|---|
| Security suite | ✔ 16 passed |
| Chat completions route suites (`src/__tests__/api`, 4 files incl. API-key auth, OpenAI compatibility, rate limits) | ✔ 256 passed, 1 skipped |
| Routing persistence (`routing-step3`) | ✔ 18 passed |
| **Full safe suite** (excluding the 2 production-DB integration suites; official OpenAI Python SDK compatibility test enabled, against a local mock) | ✔ **55 files, 1,166 passed, 4 skipped, 0 failed** |
| `npx tsc --noEmit -p .` | ✔ 0 errors |
| `npx prisma validate` | ✔ valid |
| `npx next build` | ✔ compiled successfully |

The 4 skips are the existing live-provider gates. No production database writes, no paid provider calls.

## 8. Compatibility Impact of Ignoring Client `requestId`

- **Search:** no client, SDK, script or doc in the repo sends `requestId`. The Playground doesn't. `scripts/verify-production-api.ps1` only *reads* it. The Phase 3C public docs intentionally never documented it.
- **Effect on a client that sends one:** still 200. The response `id` / `requestId` is the server ID instead of the echoed value. A client that correlated by its own ID must use the returned `id`.
- **Response format:** unchanged (`req_<ms>_<8 base36>`). The OpenAI SDKs are unaffected.
- **Behaviour change:** re-sending the same ID no longer "re-routes" an existing record. That was never a used feature.

## 9. Remaining Security Concerns

1. **Historical integrity** of production records can't be confirmed from code (§3).
2. **`requestId` is still silently accepted.** Options: reject it with 400, or rename it to clearly untrusted correlation metadata (`metadata`/`user` are already accepted no-ops). Not done, to avoid breaking unknown clients during the pitch week.
3. **Unvalidated `policy` and `taskTypeHint`** (Phase 3C report) — not a security issue, but input validation should be tightened.
4. **Request IDs are bearer-like identifiers** in URLs and logs. With this fix they no longer grant write access, and reads are owner-checked, so their exposure is now low-risk.
5. **Already-mitigated duplicate risk:** a server-ID collision (probability negligible) now fails with a retryable 500 instead of merging records.

## 10. Deployment and Rollback

**Deploy** (together with, or before, Phase 3C):
```powershell
git add src/app/api/v1/chat/completions/route.ts src/lib/routing/persistence.ts `
  src/__tests__/security/request-id-ownership.test.ts src/__tests__/api/chat-completions.test.ts `
  src/__tests__/routing/routing-step3.test.ts docs/PHASE_3C_REQUEST_ID_SECURITY_HOTFIX.md Tracker.md
git commit -m "fix(security): server-only request IDs and create-only request persistence"
git push
```
- No environment variables, migrations or settings changes.
- **After deploy:**
  - one Playground request and one API-key request;
  - confirm the `req_…` ID, the History entry, and the owner shown correctly;
  - optionally, send a request with `"requestId": "test"` and confirm the response ID is server-generated.

**Rollback:** Vercel Instant Rollback. **Warning: rolling back re-opens the vulnerability.** Prefer rolling forward.

## 11. GO / NO-GO

**GO.** The vulnerability is eliminated at three independent layers, reproduced and then shown fixed by tests, with no schema change and no behaviour change for normal requests. All checks pass.

Deploy this **before or with** Phase 3C and before any broader external API access. Recommended follow-ups: the §3 historical review, and an explicit decision on rejecting `requestId` (§9.2).

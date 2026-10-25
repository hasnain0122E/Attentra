# Attentra — Production Reliability Audit

**Date:** 2026-10-25
**Scope:** API-key incident, Auth.js/Prisma/Neon reliability, full test baseline, CSP warning
**Branch:** `main` @ `1b46549` (plus uncommitted changes, see §3)
**Method:** Static source tracing, local automated tests, a production build, read-only `prisma migrate status`, and read-only unauthenticated HTTP requests against `https://attentra-nine.vercel.app`. No production data was read, written, or modified. No authenticated production workflow was exercised.

---

## 1. Executive summary

There are two confirmed code defects. Together they explain the reported API-key symptoms without assuming the database was at fault.

| ID | Finding | Severity | Confidence |
|----|---------|----------|------------|
| F-01 | The "Create API key" button in the **empty state** does nothing: the create modal is never mounted when the user has zero keys. Any account without keys, which includes every new account, cannot create its first key. | **High** | **Confirmed** (source + regression test fails on original code) |
| F-02 | Personal-key routes (and overview, billing, cost-intelligence) return **HTTP 500 "Unable to load…"** for a missing or invalid session. `requireAuth()` throws Next's `redirect()`, and the route's `try/catch` swallows it. The UI then shows "API keys could not be loaded." | **Medium** | **Confirmed** in production (`GET /api/dashboard/api-keys` → 500 `LIST_FAILED` without a cookie) |
| F-03 | The runtime uses a **direct (non-pooled) Neon endpoint** (verified locally, unverified for production) with a per-lambda Prisma client. Neon compute suspend/restart terminates idle connections (`E57P01`). | Medium | Strongly supported (local config); production URL unverified |

The `E57P01` log lines on `/api/auth/session` are **probably not the cause** of the failures. Sessions use the JWT strategy, so `/api/auth/session` runs no database query. The lines most likely come from Prisma's engine logging the termination of an idle pooled connection, attributed to whichever invocation was running in that lambda (§6).

The CSP `eval` warning is **unrelated**. Attentra sends no CSP header at all (verified on `/` and `/login`), so the warning cannot come from the app's own policy (§14).

Minimal fixes for F-01 and F-02 (personal-key routes only) were applied locally with regression tests. They are **not deployed**.

**The incident is not marked resolved.** Production deployment, verification with a fresh Google account, and review of Vercel function logs for `[dashboard/api-keys]` are still outstanding.

---

## 2. Incident description and impact

Reported symptoms:
1. API keys previously worked for existing accounts.
2. The UI showed "API keys could not be loaded."
3. Creating keys appeared to fail or become unresponsive, including for new accounts.
4. Existing and new accounts behaved differently.
5. A Chrome DevTools CSP `eval` warning appeared.
6. Vercel logs showed `SqlState(E57P01): terminating connection due to administrator command` on `/api/auth/session` (~18:42–18:43 UTC), next to successful sign-in events.

How each symptom maps to the evidence:

| Symptom | Explained by | Notes |
|---|---|---|
| Create unresponsive, new accounts | **F-01** | The click changes state but no modal renders and no network request is sent. This matches "unresponsive". |
| Existing vs new behave differently | **F-01** | Accounts with ≥1 key (active or revoked) render the full view, which does mount the modal. |
| "Could not be loaded" | **F-02** and/or a transient DB error | Both paths end in the same 500 + generic UI message. The production route logs (`[dashboard/api-keys] GET failed`) would tell which; we do not have them. |
| E57P01 | Neon compute lifecycle (F-03) | Not shown to cause any failed user request. |
| CSP eval | External to app | See §14. |

---

## 3. Repository and architecture overview (baseline)

- **Git:** `main`, up to date with `origin/main`. Uncommitted changes that predate this audit (left untouched):
  - `package.json` / `package-lock.json`: dependencies re-sorted, **`sharp@^0.35.5` added**.
  - `src/auth.config.ts`: `trustHost: true` added.
- **Toolchain:** Node v24.19.0, npm 12.0.2, npm lockfile.
- **Scripts (`package.json`):** `dev`, `build`, `start`, `lint` (`next lint`), `test` (`vitest run`), `test:watch`, `db:seed`, `pricing:sync`, `catalog:sync`.
- **Stack:** Next.js 14.2 App Router, Auth.js v5 beta.32 (Google, **JWT session strategy**, `PrismaAdapter`), Prisma 6.19.3, Neon PostgreSQL, Vitest 4 (node environment).
- **No `next.config.*`**. `vercel.json` only defines the daily pricing-sync cron.
- **Auth split:** `src/auth.config.ts` (edge-safe, used by `src/middleware.ts`) and `src/auth.ts` (adds `PrismaAdapter`, Node runtime).
- **Prisma client:** `src/lib/prisma.ts`. It is a module-level singleton, cached on `globalThis` only outside production. In production each lambda instance holds one client, which is the normal pattern.
- **Env variable names** (values not displayed):
  - `.env`: `DATABASE_URL`.
  - `.env.local`: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`, `GOOGLE_CLIENT_ID/SECRET`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `CRON_SECRET`, `CONSUMER_BASELINE_MODEL`, `NEXT_PUBLIC_DISPLAY_CURRENCY`, `NEXT_PUBLIC_USD_TO_PKR_RATE`, `*_TEST_MODEL`, plus `BLUEMINDS_*` / `OPENROUTER_*` (unused by the tracked source).
  - All are set.
  - Both `DATABASE_URL`s point at the **same Neon host** (`ep-raspy-bar-…`, non-pooler, `sslmode` + `channel_binding`).
- **Migrations:** 4 migrations. `prisma migrate status` on the locally configured DB reports **"Database schema is up to date"**, including `20260903000000_add_personal_api_key_ownership`. `prisma validate` passes.

---

## 4. API-key lifecycle analysis

### Endpoints (from source)

| Method | Path | Auth | Ownership source |
|---|---|---|---|
| GET | `/api/dashboard/api-keys` | session | `session.user.id` → `ApiKey.userId` |
| POST | `/api/dashboard/api-keys` | session | `session.user.id` (client `userId` ignored) |
| DELETE | `/api/dashboard/api-keys/[apiKeyId]` | session | `updateMany where {id, userId}` |
| GET | `/api/business/[businessId]/api-keys` | session + membership | `Membership(userId, businessId)` |
| POST | `/api/business/[businessId]/api-keys` | session + OWNER | role check |
| DELETE | `/api/business/[businessId]/api-keys/[apiKeyId]` | session + OWNER | `updateMany where {id, businessId}` |
| POST | `/api/v1/chat/completions` | session **or** Bearer `atr_…` | `validateApiKey` → XOR ownership |

### Service layer (`src/lib/api-keys/service.ts`, `crypto.ts`)
- Keys are `atr_` + 64 hex chars (32 random bytes). Only the **SHA-256 hash** and a display prefix (`atr_xxxxxx...`) are stored. The raw key is returned once from create and never logged.
- XOR ownership (userId xor businessId) is enforced in the app (`validateApiKey` rejects `INVALID_OWNERSHIP`). There is no DB-level CHECK constraint.
- Revocation is soft (`revokedAt`), and `validateApiKey` rejects revoked and expired keys.
- List queries filter by `userId` or `businessId` from trusted server state. **No cross-user exposure path was found.** The client cannot choose the owner.

### Identity consistency
- `jwt` callback: `token.id = user.id` at sign-in. With `PrismaAdapter`, `user.id` is the DB `User.id` (created by `adapter.createUser` for new users before the JWT is issued).
- `session` callback copies `token.id` → `session.user.id`. Personal key routes use exactly this as `ApiKey.userId` (FK → `User.id`, cascade).
- **A new user's `User` row exists before any key request.** If `createUser` fails, OAuth sign-in itself fails and no session cookie is issued.
- Residual risk: a JWT stays valid even if the `User` row is later removed (for example after a DB restore or branch switch). Listing would then return `[]`, and create would fail with a P2003 FK error → 500. There is no evidence this happened.

### F-01 — Empty-state create modal never mounted (Confirmed)
`src/components/dashboard/api-keys/PersonalApiKeysClient.tsx` (original `HEAD` lines 245–292):
- The `apiKeys.length === 0` branch renders a "Create API key" button with `onClick={() => setModalState({ type: "create" })}`.
- That branch returned **without** rendering `CreateKeyModal`, `CreatedKeyModal`, or `RevokeModal`. Those were only rendered by the full-view return (lines 552–575).
- Result: the click changes state, nothing appears, no request is sent, and no console error is logged.
- The file was introduced this way in `afe1035` and has had no later edits, so this is not a recent regression. Existing accounts with keys never hit this branch. Keys created during E2E/scripts would have masked it; we cannot verify how existing accounts got their first keys.

**Reproduction:** sign in with an account that has no personal keys, open `/dashboard/api-keys`, click "Create API key". Nothing happens, and the Network tab shows no POST.

### F-02 — Auth failure reported as 500 (Confirmed in production)
`requireAuth()` (`src/lib/auth-utils.ts:17`) calls `redirect("/login")`, which throws `NEXT_REDIRECT`. In route handlers it was called **inside** `try {}`, so the generic `catch` turned it into a 500 and logged it as an error:

```
GET https://attentra-nine.vercel.app/api/dashboard/api-keys  (no cookie)
→ 500 {"success":false,"error":{"code":"LIST_FAILED","message":"Unable to load API keys"}}
```

The same behavior was observed for `/api/dashboard/overview`, `/api/dashboard/billing`, and `/api/dashboard/cost-intelligence`. By contrast, `/api/dashboard/requests` returns a correct 401.

Impact:
- An expired session (Auth.js JWT default maxAge is 30 days), a session cookie missing `id`, or a rotated `AUTH_SECRET` produces "API keys could not be loaded." instead of a login prompt.
- These auth failures are logged as `[dashboard/api-keys] GET failed`, which **makes real DB failures indistinguishable from auth failures in Vercel logs**.

---

## 5. Auth.js and new-user creation analysis

- Strategy is `jwt` with `PrismaAdapter`. The adapter writes `User`/`Account` at first OAuth sign-in only. After that, `auth()` decodes the cookie without any DB access.
- Middleware gates `/dashboard`, `/history`, `/business` on `req.auth` (edge, no DB). `/api/*` is not gated by middleware; each route checks for itself.
- `src/auth.ts` sign-in event logs `userId` **and email** (PII in production logs; Low, F-05).
- `trustHost: true` is an uncommitted local change. Auth.js already trusts the host on Vercel (`VERCEL` env), so it is harmless but redundant there.
- `.env.local` `NEXTAUTH_URL` is an `http://` URL (local). We could not verify that production does not carry an equivalent localhost value.
- **No new-user-specific server-side failure was found.** The new-user difference is fully explained by F-01, a UI-only problem.

---

## 6. Neon and Prisma connection analysis

- `datasource db { url = env("DATABASE_URL") }`. There is no `directUrl` and no pooler endpoint (`-pooler` absent in the local URL). No `connection_limit`, `pgbouncer`, or `connect_timeout` parameters are set.
- Prisma client per lambda instance. Each warm instance holds its own small pool of direct connections to Neon compute.
- **E57P01 ("terminating connection due to administrator command")** is what Postgres sends when a backend is killed by the server side. On Neon this typically happens on compute **suspend (scale-to-zero after idle)**, restart, or maintenance.
- Why it shows up on `/api/auth/session`: with the JWT strategy, `GET /api/auth/session` does **not** query the database. That route bundle does contain a Prisma client, which the adapter used during the sign-ins logged moments earlier. When Neon terminated those idle connections, Prisma's engine logged the termination asynchronously. Vercel attributes the log line to whatever invocation is running in that instance.
- **Conclusion:** the E57P01 entries indicate compute lifecycle events, not demonstrated request failures. Prisma reconnects transparently on the next query in most cases. The first query after termination *can* fail (`P1017` "Server has closed the connection" / `P1001`), which would surface as a 500 on any route, including the key list. That is **possible, not proven**.
- **Cannot be verified from source:** Neon compute events, suspend timeout, maintenance windows, the production `DATABASE_URL` (pooled or direct, and which branch), and whether those session requests actually returned 200.
- No retries were added. API-key creation in particular must not be retried blindly: it is not idempotent and would create duplicate keys.

---

## 7. API endpoint inventory

Session-authenticated (consumer): `dashboard/api-keys` (GET/POST), `dashboard/api-keys/[id]` (DELETE), `dashboard/overview`, `dashboard/billing`, `dashboard/cost-intelligence`, `dashboard/requests`, `dashboard/requests/[id]`.
Business (session + membership/role): `business` (POST create), `business/[id]/{api-keys, api-keys/[keyId], baseline-models, billing, cost-intelligence, members, overview, requests, requests/[rid], settings}`.
Public: `v1/chat/completions` (session or Bearer). Internal: `internal/pricing-sync` (Bearer `CRON_SECRET`; unauthenticated if the secret is unset, per `.env.example`). Auth: `auth/[...nextauth]`.

Production spot checks (unauthenticated, read-only):

| Request | Result |
|---|---|
| `GET /` | 200, no CSP header |
| `GET /login` | 200 (prerendered), no CSP header |
| `GET /dashboard/api-keys` | 307 → `/login?callbackUrl=…` ✔ |
| `GET /api/auth/session` | 200 `null` ✔ |
| `GET /api/dashboard/api-keys` | **500 LIST_FAILED** ✘ (F-02) |
| `GET /api/dashboard/{overview,billing,cost-intelligence}` | **500** ✘ (F-02) |
| `GET /api/dashboard/requests` | 401 ✔ |
| `POST /api/v1/chat/completions` no auth | 401 `AUTHENTICATION` ✔ |
| `POST /api/v1/chat/completions` bogus `atr_` key | 401 `AUTHENTICATION` ✔ |

---

## 8. Automated tests executed

| Command | Purpose |
|---|---|
| `npx tsc --noEmit -p .` | Type check |
| `npx vitest run --exclude src/__tests__/routing/routing-integration.test.ts --exclude src/__tests__/routing/execution-plan-integration.test.ts` | Unit/route tests |
| `npx prisma validate` | Schema validation |
| `npx prisma migrate status` | Read-only migration check |
| `npx vitest run src/__tests__/api-keys/personal-api-keys-regression.test.ts` | New regression tests (also run against original `HEAD` code) |
| `npx next build` | Production build |

**Deliberately not run:**
- `routing-integration.test.ts` and `execution-plan-integration.test.ts`. They **write and delete `Request`/`RoutingDecision` rows** in whatever `DATABASE_URL` resolves to, with no gate. The locally configured DB is a Neon database that may be production, and that cannot be ruled out.
- Live provider tests (`RUN_LIVE_PROVIDER_TESTS` unset): they self-skip and are paid.
- `npm run lint`: there is no ESLint config and `eslint` is not installed. `next lint` would prompt interactively and install dependencies.

## 9. Test results

| Check | Baseline (before fix) | After fix |
|---|---|---|
| TypeScript | ✔ pass | ✔ pass |
| Vitest | 43 files, **911 passed, 4 skipped**, 0 failed | 44 files, **919 passed, 4 skipped**, 0 failed |
| New regression file vs original code | n/a | **5 failed / 3 passed** (proves the tests detect F-01 and F-02) |
| New regression file vs fixed code | n/a | **8 passed** |
| Prisma validate | ✔ | ✔ |
| Migrate status (local DB) | up to date | up to date |
| `next build` | not run pre-fix | ✔ compiled successfully |
| Lint | not configured | not configured |

The 4 skips are the live-provider gates (`e2e/attentra-e2e` + OpenAI/Anthropic/Google integration).

## 10. Test coverage gaps

- No component/DOM tests: Vitest runs in the `node` environment, and UI "regression" tests are source-text assertions. This is why F-01 shipped.
- No test asserts 401 for unauthenticated dashboard routes. Overview, billing, and cost-intelligence tests mock `requireAuth` as always resolving.
- DB integration tests have no isolated test database or safety gate.
- No browser E2E (Playwright/Cypress not installed). Google OAuth, logout, and the create/revoke flow are untested end-to-end.
- No test for Prisma connection errors (P1001/P1017) mapping.

---

## 11. Frontend interaction analysis

- **Personal keys:** `PersonalApiKeysClient` has the branches `loading`, `error`, `empty`, and `full`.
  - Empty → F-01.
  - Error → only a "Try again" button. Create is not offered.
  - Any non-OK response (including 401) shows the same generic message.
- After a successful create, `fetchKeys()` sets `loading=true`. The loading branch briefly unmounts the "created" modal. It re-mounts when loading completes because `modalState` (holding `rawKey`) lives in the parent. This is a cosmetic flash and the key is not lost (Low, F-09).
- Revoke failures are only `console.error`'d. The modal stays open with no message (Low).
- **Business keys:** `BusinessApiKeysClient` renders its modals from a single return, so it does **not** have the F-01 defect.
- Missing network request on click = frontend (F-01). A request that returns 500 = API (F-02 or DB). Users can distinguish the two by checking the DevTools Network tab.

## 12. Provider integration review (static)

- The adapters (`src/lib/execution/providers/{openai,anthropic,google}.ts`) are behind a provider registry, and routing/cost logic is provider-independent, as required by AGENTS.md.
- The v1 route enforces a **persistence gate**: provider execution does not start unless the `Request` + `RoutingDecision` rows are persisted. Otherwise it returns a normalized 500.
- Missing-key handling and error normalization are covered by unit tests (`providers.test.ts`), all passing.
- No live provider calls were made, so real-provider behavior, timeouts, and fallback against live APIs are **unverified**.
- Observation (Low, F-08): `resolveRequester` gives a browser **session precedence over a Bearer key**. A request carrying both is attributed to the session user, not the key's business. This looks intended, but should be documented.

## 13. Cost / persistence review (static + unit tests)

- Cost-intelligence, billing (10% of verified positive savings), and baseline logic have extensive deterministic unit tests (calculator, precision-audit, consumer/business, billing). All pass.
- Request ownership is set from the resolved requester (userId or businessId). Queries are scoped server-side (`business-e2e-regression` asserts query-level tenant scoping).
- Persisted production metrics were not inspected (no production data access).

## 14. CSP finding (F-06, Info)

- There is no CSP anywhere in the repository: no `next.config`, no headers in `vercel.json`, and none in the middleware.
- Production `/` and `/login` responses carry **no `Content-Security-Policy` header**, so Attentra's own pages do not block `eval`.
- The warning therefore comes from a context with its own policy, most likely:
  - a Chrome extension;
  - Google's OAuth pages (`accounts.google.com`) during sign-in;
  - an embedded third-party frame.
- **Not linked to the API-key button.** F-01 fully explains the unresponsive button.
- Recommendation: do not add `'unsafe-eval'`. To identify the source, check the DevTools Issues panel "Source"/frame column for the warning, or reproduce in an incognito window with extensions disabled.

---

## 15. Root cause

**Confirmed:**
1. **F-01**: the first-key creation is impossible for accounts with zero personal keys. This is the cause of "create unresponsive, especially for new accounts."
2. **F-02**: auth failures in the personal-key, overview, billing, and cost-intelligence routes return 500 "Unable to load…". This is one confirmed path to "API keys could not be loaded."

**Remaining hypotheses (need production evidence):**
- H-1: Some "could not be loaded" events were real DB errors after Neon compute suspend or restart (first query on a terminated connection). *Evidence needed:* Vercel logs for `[dashboard/api-keys] GET failed` with the Prisma error code, plus the Neon compute event history around 18:42 UTC.
- H-2: Production `DATABASE_URL` uses the direct endpoint instead of the pooler. *Evidence needed:* Vercel env (host contains `-pooler`?), checked by the owner without sharing the value.
- H-3: Production DB schema matches migrations. The locally configured DB is up to date, but we have no proof it is the production DB.

---

## 16. Prioritized remediation plan

| Priority | Item | Files | Status |
|---|---|---|---|
| P0 | Mount modals in the empty state (F-01) | `src/components/dashboard/api-keys/PersonalApiKeysClient.tsx` | **Applied locally** |
| P0 | Return 401 instead of caught-redirect 500 (F-02) in personal-key routes | `src/app/api/dashboard/api-keys/route.ts`, `…/[apiKeyId]/route.ts` | **Applied locally** |
| P1 | Same 401 fix for `dashboard/overview`, `dashboard/billing`, `dashboard/cost-intelligence`, and audit the `business/*` routes that use `requireAuth`/`requireBusiness*` inside `try` | those route files | Proposed |
| P1 | Deploy, then verify with a fresh Google account | Vercel | **Needs approval** |
| P1 | Use Neon **pooled** URL for runtime (`-pooler`, `?pgbouncer=true&connect_timeout=15`) and add `directUrl = env("DIRECT_URL")` for migrations | `prisma/schema.prisma` + Vercel env | **Needs approval** (schema + prod config change) |
| P2 | Client: on 401, redirect to `/login`. Show revoke errors in the modal | `PersonalApiKeysClient.tsx` | Proposed |
| P2 | Log Prisma error `code` (no secrets) in route catch blocks so DB and auth failures are distinguishable | api-key routes | Proposed |
| P2 | Gate DB integration tests behind e.g. `RUN_DB_INTEGRATION_TESTS=true` and a dedicated Neon test branch | the two integration test files, `vitest.config.ts` | Proposed |
| P3 | Remove email from the sign-in log line (F-05) | `src/auth.ts` | Proposed |
| P3 | Add ESLint config (`eslint`, `eslint-config-next`) | `package.json` | **Needs approval** (new dependencies) |
| P3 | Add jsdom + React Testing Library for real component tests | `package.json` | **Needs approval** (new dependencies) |

## 17. Regression test recommendations

- Added: `src/__tests__/api-keys/personal-api-keys-regression.test.ts`, which covers:
  - 401 for GET/POST/DELETE without a session, and a session without `user.id`;
  - new-account empty list;
  - client-supplied `userId` ignored on create;
  - genuine DB errors still return 500;
  - the empty-state branch renders `{modals}` containing `CreateKeyModal`.
- Add the same 401 assertions for overview, billing, and cost-intelligence once P1 is done.
- Once a DOM test environment is approved: render `PersonalApiKeysClient` with a mocked `fetch` returning `[]`, click "Create API key", and assert the dialog appears and a POST is sent.
- Prisma error mapping: mock `PrismaClientKnownRequestError` P1017/P2003 and assert a 5xx with a logged code.

## 18. Production rollout and rollback plan

1. Review and commit the three changed source files plus the new test, separately from the pre-existing uncommitted `package.json`/`sharp`/`trustHost` changes. Decide on those on their own merits.
2. Push to a branch and open a Vercel **preview** deployment. Run the manual checklist (§19) on the preview, using a Google account with zero keys.
3. Promote to production.
4. **Rollback:** use Vercel "Instant Rollback" to the previous deployment. The changes have no DB, schema, or env impact, so rollback is risk-free.
5. The pooled-URL change (P1) is a separate deployment. Set `DIRECT_URL` first, then switch `DATABASE_URL` to the pooler host, then redeploy. Rollback means restoring the previous `DATABASE_URL` value and redeploying.

## 19. Manual validation checklist

- [ ] New Google account → `/dashboard/api-keys` shows the empty state → "Create API key" opens the dialog → POST 201 → secret shown once → list shows 1 key.
- [ ] Copy the key, then `POST /api/v1/chat/completions` with Bearer → success (paid call, owner opt-in).
- [ ] Revoke → status "Revoked" → the same key returns 401 on v1.
- [ ] Existing account with keys: list, create, and revoke are unchanged.
- [ ] Logged-out `GET /api/dashboard/api-keys` → **401**, not 500.
- [ ] A second account cannot DELETE the first account's key ID (expect 404).
- [ ] Business owner: create/list/revoke business key. A member cannot create (403). Another business's ID returns 403.
- [ ] Vercel logs: no `[dashboard/api-keys] GET failed` entries caused by auth.
- [ ] CSP warning: reproduce in incognito with extensions disabled and record the frame/source.

## 20. Limitations and evidence not accessed

- No access to Neon Console (compute events, suspend settings, maintenance), Vercel env values, or full Vercel function logs.
- We could not confirm whether the local `DATABASE_URL` is the production database. All DB-writing tests were skipped for that reason.
- No authenticated production or local browser session was exercised. Google OAuth, logout, the UI create flow, and business flows were verified **statically and by unit tests only**, not end-to-end.
- No live provider calls were made.
- Lint could not run (not configured).
- The `E57P01` analysis is inferred from Postgres/Neon/Prisma behavior and the JWT session configuration. It has not been proven against the actual production log stream.

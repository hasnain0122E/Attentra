# Attentra — Phase 3A: Product Experience and Developer Onboarding Audit

**Date:** 2026-11-07
**Commit inspected:** `8e8a334`
**Mode:** read-only.
- No code, data, environment or deployment changes; no provider calls.
- Evidence is from source. Production pages could not be fetched from this machine today: `GET /` returned **403 Vercel Security Checkpoint**, so live rendering, mobile layout and visual polish were **not verified** in this pass.

---

## 1. Executive Assessment

**The product behind the login is credible and demonstrable:**
- the Playground explains routing well;
- History has a real audit trail (routed vs executed model, projected vs actual cost, fallback badge);
- API keys are handled securely;
- the OpenAI-compatible API works with the official SDK.

**The surfaces an investor sees first and last undermine it:**
1. **Login and signup show email/password fields and a "Sign in" button that do nothing.** Only Google works.
2. **The landing page's developer quickstart uses a fictitious `attentra.chat.completions.create(...)` client**, and the **"Docs" nav link is dead**.
3. **There is no in-app "first API call" guidance.** After creating a key, the user is not told the base URL or shown a working snippet.
4. **Several claims overstate the product**: "every time", "best/optimal fit", "the production engine *will* evaluate…", and a pricing/billing model presented as if payments were collected.
5. **The demo guide** points the API demo at `localhost:3000` and describes routing as "cheapest capable model", which is not what the default `balanced` policy does.

All five are **small copy and markup fixes** in existing files.

**Recommendation: GO for the presentation, conditional on P0-1 to P0-5 (§8)**, plus the demo-network plan for the Vercel challenge.

---

## 2. Existing Product Strengths

| Strength | Evidence |
|---|---|
| Clear positioning and narrative | Hero: "Attentra automatically routes every AI request to the model that best fits its complexity, quality requirements, latency, and cost." Problem → how it works → architecture sections (`src/components/sections/Hero.tsx`, `ModelFragmentation.tsx`, `HowItWorks.tsx`) |
| Honest simulation labelling | Landing demo is badged "SIMULATION · SIMULATION MODE · NO API REQUIRED" (`ProductDemo.tsx`) |
| Playground transparency | Shows selected model, candidate ranking, task, complexity, routing score, projected cost, actual cost, tokens, latency. Fallback states are clearly worded: "Primary model execution failed.", "Fallback executed", "Model unavailable at the provider." (`src/components/dashboard/playground/*`) |
| History audit trail | Routed vs executed model, "Fallback used" badge, "Automatic fallback" path, projected and actual cost, tokens, latency (`src/components/dashboard/history/detail/*`, `src/lib/dashboard/request-mapping.ts`) |
| Secure key UX | Keys listed by prefix only; full key shown **once** with copy and a "You won't be able to see it again" warning; revoke through an in-app modal; icon-only revoke button has `aria-label` (`PersonalApiKeysClient.tsx`) |
| API correctness | OpenAI SDK compatible (Phase 1). Clear 400 for `stream=True`, 429 limits, 4,096-token cap (Phases 1, 2B) |
| Images have alt text | Logos in Navbar, AuthShell and both sidebars |

---

## 3. Developer Onboarding Journey (as built)

| Step | What happens | Issues |
|---|---|---|
| 1. Landing | Hero CTAs "Start routing" (`/signup`) and "See how it works". Nav "Docs" plus "Get access" | **"Docs" → `#docs`: no such section (dead).** **No "Log in" link** for returning users |
| 2. Signup / Login | `GoogleButton` → `signIn("google", { callbackUrl: "/dashboard" })` works | **Email, password, name fields and the "Sign in"/submit button are non-functional** (`onSubmit={e => e.preventDefault()}`). `#forgot-password`, `#terms`, `#privacy` are dead |
| 3. Dashboard (new user) | Overview empty state: zero metric cards, "No model usage yet." | **No next step.** No link to create an API key or try the Playground from the empty state; the sidebar is the only path |
| 4. Playground | Prompt → automatic routing → full decision and execution panels | No model/policy selector (auto only), which is fine for the MVP. Rate-limited to 10 requests/min per user (2B) |
| 5. Create API key | Name (+ optional expiry) → one-time key display + copy | **No base URL, no code snippet, no limits** (4,096 tokens, 20/min, no streaming) |
| 6. First API call | User must find the README (GitHub) or guess | **No in-product docs.** README shows only curl, with no SDK quickstart, response shape or limits |
| 7. History | Request appears with key attribution | Good. The explanation shown is the generic concise reason, not the persisted full reason with the fallback chain |

---

## 4. Landing-Page Issues

| ID | Issue | File(s) | Severity |
|---|---|---|---|
| L1 | **Fictitious SDK in the quickstart**: `attentra.chat.completions.create({ messages })`. No such client exists. The real integration is the OpenAI SDK with `baseURL` + `model: "auto"` | `src/components/sections/DeveloperIntegration.tsx:16–25` | **P0** |
| L2 | **Dead "Docs" link** (desktop + mobile) → `#docs` | `src/components/layout/Navbar.tsx:121, 204` | **P0** |
| L3 | **Over-claims**: "One request. The right model. **Every time.**" (FinalCTA). "Best fit", "Optimal" language across sections. The routing is a heuristic, policy-weighted scorer (see `docs/MVP_ROUTING_AND_FALLBACK_AUDIT.md`) | `FinalCTA.tsx`, `HowItWorks.tsx`, `Architecture.tsx` | P0 (copy) |
| L4 | **Outdated simulation note**: "The production engine **will** evaluate real model performance…". The production engine exists and is live in the dashboard Playground. Real latency and quality are estimates, not measured | `src/components/sections/ProductDemo.tsx` | P0 (copy) |
| L5 | **Pricing presented as live billing**: "pay for your model usage plus 10% of the verified savings". No payment collection exists. "PKR 0" also appears | `src/components/sections/Pricing.tsx` | P0 (label as model/preview) |
| L6 | **Placeholder footer links**: `https://github.com`, `https://linkedin.com` (generic sites), `mailto:hello@attentra.ai` (domain ownership unverified) | `src/components/layout/Footer.tsx:120–132` | P1 |
| L7 | No "Log in" for returning users; "Get access" implies a waitlist while signup is instant | `Navbar.tsx` | P1 |
| L8 | Static illustrative numbers ("$0.003", "210ms", latency/cost chips) without an "illustrative" label | `WhyAttentra.tsx`, `DeveloperIntegration.tsx` | P1 |
| L9 | Unused component with strong claims (`RoutingEngine.tsx`: "LIVE", "Optimal match", "+73% Efficiency") is not rendered on the page | `src/components/sections/RoutingEngine.tsx` | P2 (delete or keep unused) |

---

## 5. Playground and History Issues

| ID | Issue | File(s) | Severity |
|---|---|---|---|
| H1 | **Unknown actual cost shows as 0**: `formatDisplayCurrency(execution.actualCost ?? 0)` | `src/components/dashboard/playground/ExecutionSummary.tsx:52–53` | P1 |
| H2 | **Savings compared to an unnamed baseline**: "Baseline spend", "below baseline", "Baseline equivalent" never name the model (consumer baseline = `CONSUMER_BASELINE_MODEL`, e.g. `claude-sonnet-5`) | `src/components/dashboard/overview/CostIntelligence.tsx:234–308`, `src/components/dashboard/billing/BillingClient.tsx:267–333` | P1 (state it verbally in the pitch for P0) |
| H3 | "Verified savings" wording. These are computed comparisons against a configured baseline, not externally verified savings | `Pricing.tsx`, `BillingClient.tsx` | P1 (copy) |
| H4 | History "Decision explanation" uses the generic concise reason. The persisted full reason (fallback chain, Phase 2C cost-ceiling note) is not visible | `src/components/dashboard/history/detail/RequestRoutingOverview.tsx:44` | P2 |
| H5 | **Currency display**: amounts are converted to PKR at a static env rate (`NEXT_PUBLIC_USD_TO_PKR_RATE`). Setting `NEXT_PUBLIC_DISPLAY_CURRENCY=USD` **while the rate is still set would multiply USD by the PKR rate and label it USD** (the config ignores the currency code) | `src/lib/currency/display-currency.ts:36–60` | P1 (config gotcha; decide the pitch currency deliberately) |
| H6 | Empty overview shows a `RoutingHealth` card with `successRate={0}` before any request, which can read as "0% success" | `DashboardOverviewClient.tsx:125–128` | P2 |
| H7 | Revoke failure only logs to the console (no user-visible error) | `PersonalApiKeysClient.tsx` `confirmRevoke` | P2 |
| H8 | No policy selector in the Playground, so the 4 routing policies cannot be demonstrated in the UI (API-only `policy` field) | `PlaygroundClient.tsx` | P2 |

---

## 6. Documentation Problems

| ID | Issue | File | Severity |
|---|---|---|---|
| D1 | **No user-facing API docs.** README API section is a single curl. Missing: OpenAI SDK quickstart (`base_url=https://attentra-nine.vercel.app/api/v1`, `model="auto"`), response fields (`choices`, `usage`, `routing`, `execution`), limits (20 req/min per key, `max_tokens` ≤ 4,096, default 256 output tokens), unsupported features (streaming, tools), error codes (401/400/404/429/502/503) | `README.md:166–195` | **P0** (minimum: in-app snippet + README section) |
| D2 | **Demo guide is out of date**: API demo uses `http://localhost:3000`, not production. The value line says "routes every request to the **cheapest** capable model" (inaccurate). It predates the SDK path, the rate limits, the 403 challenge plan and the fallback record in History | `docs/demo-guide.md` (Acts 0 and 3) | **P0** |
| D3 | README states the UI shows PKR. Fine, but pitch materials should say amounts are converted at a fixed rate | `README.md:240` | P2 |
| D4 | Streaming is correctly **not** advertised anywhere (verified: no landing/README claim). Keep it that way | — | OK |

---

## 7. Security and UX Risks

| Risk | Detail | Severity |
|---|---|---|
| Non-functional credential fields | Users may type a password into a form that silently does nothing. It undermines trust and invites "is my password stored?" questions | **P0** |
| Dead legal links | Terms/Privacy (`#terms`, `#privacy`) are dead while the product stores prompts and responses in plaintext (`Request.prompt/response`). Investors may ask about data handling | P1 (add a short privacy note before broader launch) |
| Key handling | Good: one-time display, prefix-only listing, revoke. Risk: the copy button gives no warning about where the key may be pasted (acceptable) | OK |
| Demo-day network | This machine is **currently** challenged by Vercel's DDoS mitigation (`GET /` → 403 today). Scripted/SDK demo calls need a pre-checked network (hotspot), with the browser Playground as fallback | **P0 (operational)** |
| Rate limits during the demo | The Playground is limited to 10/min per user. Avoid rapid repeat clicks | P1 (operational) |
| Accessibility | ~30 dashboard and ~38 business `<button>`s vs 12/15 `aria-label`s. Most are text buttons. Icon-only controls should be checked post-pitch. Mobile layouts **not visually verified** in this pass | P2 |

---

## 8. P0 Fixes Before the Pitch — the five smallest, highest-impact changes

| # | Change | Files | Effort | Acceptance |
|---|---|---|---|---|
| **P0-1** | **Make auth pages Google-only.** Remove (or hide) the email/password/name fields, their submit button, "Forgot password", and the "OR" divider. Replace Terms/Privacy anchors with plain text or remove them | `src/components/auth/LoginForm.tsx`, `SignupForm.tsx` | S (≈30 min) | No input or button on `/login` or `/signup` that does nothing. Google sign-in unchanged |
| **P0-2** | **Real quickstart and working Docs link.** Replace the `attentra.chat.completions.create` snippet with the real OpenAI SDK form (`baseURL: "https://attentra-nine.vercel.app/api/v1"`, `apiKey: process.env.ATTENTRA_API_KEY`, `model: "auto"`). Point "Docs" to `#developers` (or the README) on desktop and mobile | `src/components/sections/DeveloperIntegration.tsx`, `src/components/layout/Navbar.tsx` | S (≈30 min) | The snippet runs as written against production. No dead nav link |
| **P0-3** | **First-call guidance in the product.** In the "API key created" modal (and/or above the key list) show base URL + a 6-line Python OpenAI SDK snippet + one line of limits: "Non-streaming · max_tokens ≤ 4096 · 20 requests/min". Add two links to the overview empty state: "Create an API key" and "Open the Playground" | `src/components/dashboard/api-keys/PersonalApiKeysClient.tsx` (`CreatedKeyModal`, list header), `src/components/dashboard/overview/DashboardOverviewClient.tsx` (`EmptyState`) | S (≈45 min) | A new user can go from key creation to a successful SDK call using only in-app text |
| **P0-4** | **Claim-accuracy copy pass**: "Every time" → e.g. "for each request". Soften "optimal". Fix the ProductDemo note: simulated here; the live engine runs in the dashboard Playground. Label Pricing as "Pricing model (MVP preview — no charges collected)". Do the same on the Billing pages. Remove placeholder GitHub/LinkedIn/mailto links | `FinalCTA.tsx`, `ProductDemo.tsx`, `Pricing.tsx`, `src/components/dashboard/billing/BillingClient.tsx`, `src/components/layout/Footer.tsx` | S (≈45 min) | Every on-page claim is either true today or explicitly labelled simulated, illustrative or preview |
| **P0-5** | **Update the demo guide** for the real pitch: production URL, the OpenAI SDK snippet, an accurate value line ("routes each request with an explainable cost/latency/capability policy"), the hotspot plan for the Vercel challenge, Playground rate limit, warm-up, the fallback record in History, and naming the savings baseline model verbally | `docs/demo-guide.md` | S (≈30 min) | The script matches the deployed product step by step |

Total: about 3 hours. All copy or markup in existing files. No API, schema or routing changes.

---

## 9. P1 Improvements (only if P0 is done and stable)
1. Show "—" instead of 0 for unknown actual cost (H1).
2. Name the baseline model next to savings (H2). Needs the baseline model identifier in the existing cost-intelligence API response. If that's too large, add static copy "vs your configured baseline model".
3. Add a "Log in" link next to "Get access"; rename "Get access" → "Get started" (L7).
4. Label illustrative numbers on the landing page (L8).
5. Decide the pitch display currency. For USD, remove `NEXT_PUBLIC_USD_TO_PKR_RATE` (or set it to 1) together with `NEXT_PUBLIC_DISPLAY_CURRENCY=USD`, then rebuild (H5, owner env change).
6. README "Using the API" section mirroring P0-3 (D1).
7. A short privacy note (prompts and responses are stored for History) linked from auth pages.

---

## 10. Post-Pitch Backlog
- Real docs page (`/docs`): quickstart (Python/JS/curl), parameters, response, errors, limits, routing policies, model IDs.
- Playground policy selector and explicit-model picker (H8). Show the persisted full routing reason in History (H4).
- `GET /v1/models` for SDK model discovery.
- Accessibility audit (icon-only buttons, focus states, contrast) and mobile QA on real devices.
- Revoke error feedback (H7); empty-state RoutingHealth (H6).
- Terms/Privacy pages and data-retention controls.
- Streaming (Phase 2D plan); payments (Stripe) if the savings fee is pursued.
- Remove the unused `RoutingEngine.tsx` or align its claims (L9).

---

## 11. Source File Index
| Area | Files |
|---|---|
| Landing | `src/app/(marketing)/page.tsx`; `src/components/sections/{Hero,ModelFragmentation,HowItWorks,Architecture,ProductDemo,WhyAttentra,UseCases,CostIntelligence,DeveloperIntegration,Pricing,FinalCTA}.tsx`; `src/components/layout/{Navbar,Footer}.tsx`; unused `RoutingEngine.tsx` |
| Auth | `src/components/auth/{LoginForm,SignupForm,GoogleButton,AuthShell}.tsx`; `src/app/(auth)/{login,signup}/page.tsx` |
| Dashboard | `src/components/dashboard/overview/{DashboardOverviewClient,CostIntelligence,RoutingHealth}.tsx`; `DashboardSidebar.tsx` |
| API keys | `src/components/dashboard/api-keys/PersonalApiKeysClient.tsx` |
| Playground | `src/components/dashboard/playground/{PlaygroundClient,ExecutionSummary,RequestMetadata,…}.tsx` |
| History | `src/components/dashboard/history/detail/{RequestRoutingOverview,RequestMetadataGrid,RequestExecutionPath,RequestDetailHeader}.tsx`; `src/lib/dashboard/request-mapping.ts` |
| Billing | `src/components/dashboard/billing/BillingClient.tsx`; `src/components/business/billing/BusinessBillingClient.tsx` |
| Currency | `src/lib/currency/display-currency.ts` |
| Docs | `README.md`; `docs/demo-guide.md` |

---

## 12. Proposed 5-Minute Investor Demo Script

**Preparation (T−30 min):**
- Signed in with Google in the browser.
- One API key in an env var on the laptop.
- **Probe the venue network once.** If challenged, switch to a hotspot.
- Warm up with one Playground request.
- Optional for the History segment: open the 2026-11-06 20:51 UTC "Fallback used" record in a tab beforehand.

| Time | Segment | Show / Say |
|---|---|---|
| 0:00–0:40 | **Problem → product** | Landing hero: "Teams hard-code one model for every request. Attentra decides per request, based on task, complexity, cost and latency." Scroll to "How it works". Do not dwell on the simulation |
| 0:40–1:50 | **Live routing** (Playground) | Simple prompt → cheap fast model. Point at candidate ranking, why this model, **projected vs actual cost**, and **savings vs the baseline model (say which: e.g. Claude Sonnet 5)** |
| 1:50–2:30 | **Different task, different model** | A rehearsed complex reasoning or coding prompt → a higher-tier model. "Same API, different decision" |
| 2:30–3:15 | **Reliability** (History) | Open a **"Fallback used"** request: routed Gemini → executed GPT-4o. "When a provider fails, Attentra re-routes across providers automatically; cost is recorded on the model that actually ran." |
| 3:15–4:15 | **Developer experience** (terminal) | Six lines of the **official OpenAI Python SDK** with `base_url` = Attentra and `model="auto"` → answer, `r.model`, `r.usage`. Then refresh History: the request appears attributed to the API key |
| 4:15–5:00 | **Trust and business model** | API keys hashed and shown once; per-key rate limits and token caps. "Pricing model: usage plus 10% of savings measured against your baseline, a preview for the MVP." Close |

**Avoid in the demo:**
- clicking email/password fields (until P0-1 ships);
- rapid repeated Playground runs (10/min);
- `stream=True`;
- claims of "optimal", "learned" or "guaranteed" routing.

---

## 13. GO / NO-GO

**GO for the MVP presentation, conditional on:**
- **P0-1** (dead auth form) and **P0-2** (fictitious SDK snippet / dead Docs link): these are visible to anyone who clicks or reads code during the pitch;
- **P0-5** (demo guide);
- the **demo-network plan** for the Vercel challenge.

**P0-3 and P0-4** are strongly recommended (about 1.5 h combined).

**If P0-1/P0-2 cannot ship:** still GO, but present only via the pre-signed-in dashboard and the terminal SDK snippet, and do not show the landing quickstart or auth pages.

**Not verified in this audit:**
- live rendering of production pages and mobile/responsive layouts (production was challenge-blocked from this machine);
- the business workspace UI in depth;
- visual consistency across browsers.

# Attentra — Phase 3B: Landing Page Transformation, Product Clarity & Developer Onboarding

**Date:** 2026-11-07
**Base commit:** `8e8a334`. All changes below are **uncommitted and undeployed**.
**Scope:** marketing page, auth pages, first-use dashboard guidance, billing copy, demo guide.
**Not changed:** routing, orchestrator, provider adapters, API authentication, rate limiting, cost calculations, schema, dependencies.

> **Correction to Phase 3A:** that audit said `RoutingEngine.tsx` was not rendered. It **is** rendered, as the hero's product visual (`Hero.tsx`). Its "LIVE", "Optimal match" and "+73% Efficiency" claims were the first thing visitors saw. They are fixed in this phase.

---

## 1. Content Inventory Before Changes

| # | Section (file) | Purpose | Headline / message | Question answered | Repeated elsewhere? | Accurate? | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Hero (`Hero.tsx`) + `RoutingEngine.tsx` | Identity | "Your AI doesn't need one model." Routes "every request to the model that **best** fits…". Visual: "LIVE", "Optimal match", "+73% Efficiency". Requests and models cycled **independently**, so the shown choice was arbitrary. Primary CTA "Start routing" → `#product` | What is it? | Model cards repeated in 4 sections | ✘ over-claims | **Keep, rewrite** |
| 2 | Problem (`ModelFragmentation.tsx`) | Why | "One model was never meant to do everything." GPT/Claude/Gemini cards (repeat of hero). "Stop choosing a model. Let your infrastructure choose." | Why do I need this? | Model cards; "sits between" sentence | ~ | **Keep, rewrite** |
| 3 | How it works (`HowItWorks.tsx`) | How | "One request. A better decision." 3 steps ending in "Choose the best fit". "ROUTING DECISION ENGINE · ACTIVE". Link to `#architecture` | How does it work? | Steps repeated in Architecture & Developer | ✘ ("best outcome", "Optimized decision") | **Keep, expand to the real 6-step journey** |
| 4 | Architecture (`Architecture.tsx`) | Structure | "One integration. Multiple models." | — | Same message as Hero/WhyAttentra/Developer | ~ | **Remove from page** |
| 5 | Demo (`ProductDemo.tsx`) | Example | "Give it a task. See how it routes." "Best fit selected", "OPTIMIZED", a **QUALITY** number (Gemini 96 > Claude 94 > GPT 91). Generic prompts **rotated** the model on each click. "The production engine **will** evaluate…" | Can I see an example? | — | ✘ | **Keep, fix copy and logic** |
| 6 | Why Attentra (`WhyAttentra.tsx`) | Benefits | "One intelligent layer between you and every model." App→Attentra→models diagram. Cost/latency/**quality "96"** rows. "Build once. Route intelligently." | Why Attentra? | Diagram and taglines repeat Hero/Architecture | ✘ (quality 96) | **Keep, refocus on outcomes** |
| 7 | Use cases (`UseCases.tsx`) | Workloads | "Built for workloads that don't need the same model." Example percentages | — | Repeats Problem + Demo | ~ | **Remove from page** |
| 8 | Cost intelligence (`CostIntelligence.tsx`) | Cost | "Why pay the highest price for every request?" | — | Repeats Problem + Benefits | ~ | **Remove from page** |
| 9 | Developers (`DeveloperIntegration.tsx`) | Try it | "Add intelligent routing without rebuilding your stack." **Fictitious `attentra.chat.completions.create`**. Auto-cycling demo. Value strip "One API / Multiple models / Intelligent routing" | How do I try it? | Value strip = hero tagline | ✘ (fake SDK) | **Keep, rewrite with real SDK** |
| 10 | Pricing (`Pricing.tsx`) | Business model | "We make money when we save you money." "Pay for your model usage plus 10% of the **verified** savings". "RECOMMENDED", "PKR 0". Value strip | How does it make money? | Value strip | ✘ (presented as live billing) | **Keep, reframe as preview** |
| 11 | Final CTA (`FinalCTA.tsx`) | Close | "One request. The right model. **Every time.**" "Start routing" → `#product`. "Model agnostic / API first / Cost aware" | What next? | Taglines | ✘ | **Keep, rewrite** |
| — | Navbar / Footer | Navigation | "Docs" → `#docs` (dead). No Log in. Footer → `#architecture`, `#use-cases`, `#cost-intelligence`. Placeholder GitHub/LinkedIn/mailto | — | — | ✘ | **Fix** |

---

## 2. Sections Retained, Merged, Reordered or Removed

| Action | Sections |
|---|---|
| **Retained & rewritten** | Hero (+ RoutingEngine visual), Problem, How it works, Demo, Benefits, Developers, Pricing, Final CTA |
| **Merged** | Architecture's "one integration" message → How it works step 01 and Benefits #1. Use cases → Problem examples and Demo task selector. Cost intelligence → Problem card 1, Benefits #2, Pricing |
| **Removed from the page** | `Architecture`, `UseCases`, `CostIntelligence`. Component files are kept unused for now (post-pitch cleanup) |
| **Reordered** | Demo now follows How it works directly; Benefits come after the demo |
| **Removed blocks inside sections** | Hero's random cycling; Problem's model cards + "Without/With" strip + slogan; How it works' single-row connector + "ENGINE · ACTIVE"; Benefits' diagram + "Build once…"; Developers' value strip + auto-cycling; Pricing's value strip; Final CTA's principles grid + "READY" pulse |

The page went from **11 to 8 sections**. Net source change across all modified files: **+895 / −1,496 lines**.

---

## 3. Final Narrative: One Job per Section

| # | Section | Answers | Job |
|---|---|---|---|
| 1 | Hero | What is Attentra? | Name it (an OpenAI-compatible gateway), say what it does per request, show one routed request with its reason, and offer **Get started free** |
| 2 | Problem | Why do I need this? | Three relatable requests (classify a ticket, debug an incident, provider outage) with hard-coded vs Attentra outcomes |
| 3 | How it works | How does it work? | One request's 6-step journey (send → analyze → score → execute → fall back → inspect) plus what the router weighs, honestly labelled |
| 4 | Demo | Can I see an example? | In-browser **simulation**: task and priority change the chosen model, with the reason, est. figures and a fallback illustration |
| 5 | Benefits | What changes for my app? | Outcomes: one integration, pay premium only when needed, provider outages handled |
| 6 | Developers | How quickly can I try it? | Real OpenAI SDK code (two settings), how to get a key, current MVP limits |
| 7 | Pricing | How does the business model work? | Free during the MVP; production pricing is a **preview, not yet billed**; savings are measured against a baseline, not guaranteed |
| 8 | Final CTA | What do I do next? | Create account → try Playground → call the API |

---

## 4. Key Headline and Copy Changes

| Where | Before | After |
|---|---|---|
| Hero eyebrow | Intelligent LLM Routing | **OpenAI-compatible AI gateway** |
| Hero H1 | Your AI doesn't need one model. | **One API. Many models. Smarter routing.** |
| Hero body | …routes every AI request to the model that best fits… | Attentra sits between your app and OpenAI, Anthropic and Google. For each request it weighs the task, its complexity and the estimated cost, picks an eligible model, switches provider if one fails — and shows you why. |
| Hero CTA | Start routing → `#product` | **Get started free → `/signup`** + trust line "Sign in with Google · Works with the official OpenAI SDK · Free MVP" |
| Hero visual | LIVE · Best fit · Optimal match · +73% Efficiency | ILLUSTRATIVE EXAMPLE · scenario tabs (Simple task / Writing / Hard reasoning) · Selected · reason · "If it fails → fallback model" |
| Problem H2 | One model was never meant to do everything. | **Different requests need different models.** |
| How it works H2 | One request. A better decision. | **Follow one request through Attentra.** "Six steps happen inside a single API call." |
| Decision panel | Optimized decision — the best available model… | **Four inputs. One explainable choice.** Estimated cost · Latency *estimate* · Capability · Your policy. "Latency and capability are model-profile estimates, not live benchmarks." |
| Demo | Best fit selected · OPTIMIZED · QUALITY 96 | **Selected for this request** · SIMULATED · "Why: …" · PROFILE / EST. LATENCY / EST. COST · fallback line |
| Benefits H2 | One intelligent layer between you and every model. | **What changes for your application.** |
| Developers H2 | Add intelligent routing without rebuilding your stack. | **Two settings to change. Same OpenAI SDK.** |
| Developers code | `attentra.chat.completions.create({ messages })` | `new OpenAI({ apiKey: process.env.ATTENTRA_API_KEY, baseURL: "https://attentra-nine.vercel.app/api/v1" })` → `create({ model: "auto", … })` |
| Pricing H2 | We make money when we save you money. | **We plan to earn only when routing saves you money.** |
| Pricing cards | Free Access PKR 0 · Production API "10% of verified savings" · RECOMMENDED | **MVP access — Free during the MVP** · **Production pricing — PREVIEW · NOT YET BILLED** · "10% of savings" · "Planned, not yet billed…" |
| Final CTA | One request. The right model. Every time. | **Send your first routed request.** |
| Site `<title>` | The routing ledger for enterprise AI spend | **Attentra — One API. Many models. Smarter routing.** (description rewritten without "cut costs significantly") |

---

## 5. How Repetition Was Reduced
- **"One API / multiple models"** now appears once as the hero's identity, once as a step (How it works 01), and once as an outcome (Benefits #1). Each occurrence adds new information. The Architecture section, the Benefits diagram and the two value strips that restated it are gone.
- **"Routing / best model"** is explained once (How it works) and shown once (Demo). The hero visual demonstrates *why* rather than restating *that*.
- **"Cost vs latency"**: Problem shows the consequence (overpaying), How it works shows the inputs, Benefits shows the outcome, Pricing shows the business model. The Cost intelligence and Use cases sections, which restated the same idea, were removed.
- **Model cards** (GPT/Claude/Gemini) previously appeared in 5 places. Now they appear only in the hero visual and the demo, both labelled illustrative.
- **Closing slogans** ("Stop choosing a model…", "Build once. Route intelligently.", "Your application stays simple…") are replaced by links that move the visitor to the next section.

---

## 6. Visual and Responsive Improvements
- **Kept:** the existing design system (tokens, typography, `attentra-*` classes, Phosphor icons, `motion`). **No new dependencies.**
- **Hero visual is interactive and accessible:**
  - scenario tabs are real `<button>`s with `aria-pressed` and a focus-visible outline;
  - auto-advance stops after the visitor picks a tab and **never runs under `prefers-reduced-motion`**;
  - timers are cleaned up on unmount.
- **Auto-cycling removed** in the developer console. Its example rows are click-only.
- **How it works:**
  - six steps in a responsive grid (1 → 2 → 3 columns);
  - mobile arrows only in the single-column layout;
  - the single-row connector line, which didn't fit two rows, was removed.
- **Pricing spacing** tightened after removing the value strip (no empty gap before the final CTA).
- **Hero headline** wraps by phrase on desktop. On mobile the base size is one step smaller and wrapping is allowed (an overflow found during testing was fixed).
- **Local visual checks** (production build via `next start`, Chrome):
  - desktop 1536 px: every section;
  - mobile 390 px (iframe): hero, hero visual, Problem cards, plus an automated scan of all 8 sections for elements overflowing the viewport. **0 overflowing elements** after the fix;
  - `/login` and `/signup` desktop;
  - no console errors; the demo interaction ran without errors.

---

## 7. Phase 3A P0 Issues Resolved

| ID | Resolution | Files |
|---|---|---|
| **P0-1** Dead auth form | Login and signup are **Google-only**. Email/password/name fields, the dead submit buttons, "Forgot password", "OR" divider and dead Terms/Privacy anchors removed. Replaced with honest text: Google-only during the MVP, we never see the Google password, prompts and responses are stored for History. Signup lists next steps. `GoogleButton` unchanged | `src/components/auth/LoginForm.tsx`, `SignupForm.tsx` |
| **P0-2** Fake SDK, dead Docs, no Log in | Real OpenAI JS SDK quickstart. "Docs" → `#developers`. Nav: How it works · Demo · Benefits · Pricing · Docs. **Log in** + **Get started** on desktop **and** mobile | `DeveloperIntegration.tsx`, `Navbar.tsx` |
| **P0-3** No first-call guidance | New `FirstCallGuide`: production base URL (copy), official **Python** SDK example (copy, key read from `ATTENTRA_API_KEY`), secure-key note, `max_tokens` ≤ 4,096 (256 default), ~20 req/min per key (best effort), streaming not supported. Shown in the **key-created modal** and on the API keys page (empty and full states). One-time key display and revoke unchanged. Overview empty state gets **Open the Playground** and **Create an API key** | `src/components/dashboard/api-keys/PersonalApiKeysClient.tsx`, `src/components/dashboard/overview/DashboardOverviewClient.tsx` |
| **P0-4** Over-claims | Removed "Every time", "Optimal match", "+73%", "LIVE", "Best fit selected", QUALITY scores, "production engine will evaluate", "verified savings" (→ "measured savings" vs a baseline), live-billing language (→ preview, no payments collected). Placeholder footer links removed. Simulated and illustrative content labelled | sections, `Footer.tsx`, `Pricing.tsx`, `BillingClient.tsx`, `BusinessBillingClient.tsx`, `PersonalApiKeysClient.tsx` (billing notice) |
| **P0-5** Demo guide | Rewritten: production URL, official SDK `demo.py`, accurate one-liner + "do not claim" list, Vercel checkpoint → hotspot, 10/min Playground and 20/min API limits, no streaming, warm-up, historical "Fallback used" record, naming the savings baseline, backup recording, 5-minute sequence, failure table | `docs/demo-guide.md` |

**Part F (small UX):**
- Unknown actual cost shows **"Not available"** instead of 0 (`ExecutionSummary.tsx`, `RequestMetadata.tsx`).
- "Projected cost" vs "Actual cost" labels kept distinct.
- Illustrative numbers labelled ("Est.", "~", "Example values", "Illustrative figures").
- No dead links or inactive primary CTAs remain (tested).

---

## 8. Source Files Modified

| File | Change |
|---|---|
| `src/app/(marketing)/page.tsx` | 8-section composition |
| `src/app/layout.tsx` | Site title and description |
| `src/components/sections/Hero.tsx` | Copy, CTA → `/signup`, trust line, responsive headline |
| `src/components/sections/RoutingEngine.tsx` | Paired scenarios, tabs, reduced-motion, honest labels |
| `src/components/sections/ModelFragmentation.tsx` | Problem examples, bridge to How it works |
| `src/components/sections/HowItWorks.tsx` | 6-step journey, honest decision inputs, layout |
| `src/components/sections/ProductDemo.tsx` | Reasons, profile, Est. labels, fallback line, no rotation |
| `src/components/sections/WhyAttentra.tsx` | Rewritten as 3 outcome benefits |
| `src/components/sections/DeveloperIntegration.tsx` | Real SDK code, steps, limits, no auto-cycle, no value strip |
| `src/components/sections/Pricing.tsx` | Preview framing, card copy, spacing, no value strip |
| `src/components/sections/FinalCTA.tsx` | Next-step headline and steps |
| `src/components/layout/Navbar.tsx` | Nav items, Docs fix, Log in / Get started |
| `src/components/layout/Footer.tsx` | Real links only, tagline, placeholders removed |
| `src/components/auth/LoginForm.tsx`, `SignupForm.tsx` | Google-only |
| `src/components/dashboard/api-keys/PersonalApiKeysClient.tsx` | `FirstCallGuide`, scrollable modal, billing notice |
| `src/components/dashboard/overview/DashboardOverviewClient.tsx` | Get-started CTAs |
| `src/components/dashboard/playground/ExecutionSummary.tsx`, `RequestMetadata.tsx` | "Not available" for unknown cost |
| `src/components/dashboard/billing/BillingClient.tsx`, `src/components/business/billing/BusinessBillingClient.tsx` | Preview notice, "Measured savings" labels (no calculation changes) |
| `docs/demo-guide.md` | Rewritten |
| `src/__tests__/landing-onboarding-regression.test.ts` | **New**: 20 tests |

---

## 9. Test Results

All commands below were executed in this session.

| Check | Result |
|---|---|
| `npx tsc --noEmit -p .` | ✔ 0 errors |
| `npx vitest run src/__tests__/landing-onboarding-regression.test.ts` | ✔ 20 passed |
| Full safe suite (excluding the 2 DB-writing integration suites; with the official OpenAI Python SDK test enabled) | ✔ **52 files, 1,117 passed, 4 skipped** (live-provider gates), **0 failed** |
| `npx prisma validate` | ✔ valid |
| `npx next build` (final, after all edits) | ✔ compiled successfully; `/` 38.3 kB (175 kB first load) |
| Link and CTA review | ✔ automated: every in-page anchor resolves to a rendered section id; no `#docs`, `#architecture`, `#use-cases`, `#cost-intelligence`, placeholder social links or mailto. Nav has `/login` and `/signup` on desktop + mobile |
| Code-example correctness | ✔ In-app Python snippet and `demo.py` parsed by Python `ast` (venv with official `openai`); landing JS snippet passes `node --check` as ESM. SDK parameter names confirmed against the installed SDKs (Python `base_url`/`api_key`; JS `baseURL`/`apiKey`). Request/response shape already covered by the Phase 1 official-SDK test |
| Responsive visual check | ✔ Local production build: desktop 1536 px all sections; 390 px iframe, 0 overflowing elements after the hero fix; auth pages; no console errors |
| Lint | Not configured |

**Regression coverage:**
- Google auth: `GoogleButton` unchanged.
- Dashboard navigation, API-key management (one-time display, revoke), Playground, History, SDK compatibility, routing and fallback, cost tracking: the existing suites pass unchanged.
- No API, auth, routing or cost code was modified.

---

## 10. Unverified in Production
- Nothing is deployed. **Production rendering has not been verified.** Earlier fetches of production from this machine hit the Vercel Security Checkpoint (403).
- **Authenticated screens not visually verified:** the API-key `FirstCallGuide`, the scrollable created-key modal, the overview get-started panel and the billing notices. They need a signed-in session against the production database. They are covered by type checks and source tests only.
- Google OAuth was not clicked through (the component is unchanged).
- Real mobile devices and Safari/Firefox were not tested (Chrome only; mobile via a 390 px iframe).

---

## 11. Remaining Risks
1. Vercel's DDoS challenge on the demo network (see `docs/demo-guide.md` §2/§6).
2. `Architecture.tsx`, `UseCases.tsx` and `CostIntelligence.tsx` remain in the repo unused and still contain older claims. Delete them post-pitch or keep them unreferenced.
3. Dashboard amounts are still shown in PKR at a fixed env rate (`docs/PHASE_3A_PRODUCT_EXPERIENCE_AUDIT.md` H5).
4. Savings are labelled "measured" against a baseline, but the UI does not yet **name** the baseline model. Say it verbally in the pitch.
5. The landing page's illustrative example figures (costs, latencies, fit scores) are fixed values. They are labelled, but a sharp observer may ask about real numbers; point them to the Playground.

---

## 12. Deployment and Rollback

**Deploy:**
```powershell
git add "src/app/(marketing)/page.tsx" src/app/layout.tsx src/components/sections src/components/layout `
  src/components/auth/LoginForm.tsx src/components/auth/SignupForm.tsx `
  src/components/dashboard/api-keys/PersonalApiKeysClient.tsx `
  src/components/dashboard/overview/DashboardOverviewClient.tsx `
  src/components/dashboard/playground/ExecutionSummary.tsx src/components/dashboard/playground/RequestMetadata.tsx `
  src/components/dashboard/billing/BillingClient.tsx src/components/business/billing/BusinessBillingClient.tsx `
  src/__tests__/landing-onboarding-regression.test.ts docs/demo-guide.md `
  docs/PHASE_3B_LANDING_PAGE_AND_ONBOARDING_IMPLEMENTATION.md
git commit -m "feat(web): clearer landing narrative, Google-only auth, first-call onboarding"
git push
```
- No environment variables, migrations or settings changes.
- **After deploy, check in a browser:**
  - landing page top to bottom;
  - `/login`;
  - create a test key: the modal shows the guide;
  - revoke the test key;
  - Playground: one request;
  - Billing: the preview notice.

**Rollback:** Vercel Instant Rollback to the previous deployment. There is no data impact.

---

## 13. GO / NO-GO for the November 8 Pitch

**GO, deploy this phase.** It removes every visible dead control and over-claim the Phase 3A audit found, adds in-product first-call guidance, and leaves the API, routing and data layers untouched. All tests and the production build pass.

**Condition:** do one post-deploy browser walkthrough (§12). Follow the updated demo guide, including the hotspot plan and backup recording.

---

## How a First-Time Visitor Now Understands Attentra
- **Within the first screen**, a visitor reads that Attentra is an **OpenAI-compatible gateway**. They see **one request** being matched to a model **with the reason**, and that it can **switch provider** if one fails. They get one obvious action: **Get started free**.
- **Scrolling**, each section answers the next natural question exactly once:
  - why it matters, with relatable examples;
  - how a request flows, in six plain steps with honest inputs;
  - what it looks like, in a labelled simulation;
  - what changes for their app, as three outcomes;
  - how to try it, with real SDK code;
  - how it will make money, as a clearly labelled preview;
  - what to do next.
- **Nothing on the page** claims more than the product does today, and every link goes somewhere real.

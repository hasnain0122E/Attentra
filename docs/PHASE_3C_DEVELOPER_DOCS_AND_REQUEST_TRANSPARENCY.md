# Attentra — Phase 3C: Developer Documentation Portal & Request Transparency

**Date:** 2026-11-07
**Base commit:** `4428f32`. All changes are **uncommitted and undeployed**.
**Not changed:** routing, orchestrator, provider adapters, API authentication, rate limiting, cost calculation, Prisma schema, environment variables, dependencies.

> ✅ **Update (2026-11-07): fixed by the P0 hotfix** — see `docs/PHASE_3C_REQUEST_ID_SECURITY_HOTFIX.md`. Original finding:
>
> ⚠️ **Security finding (outside this phase's scope):** `POST /api/v1/chat/completions` accepts an optional client-supplied `requestId` and uses it as the `Request` primary key (`route.ts` §5 `effectiveRequestId = clientRequestId || requestId`). If it matches an existing request belonging to another user or workspace:
> - `persistRoutingDecision` reuses that row and overwrites its RoutingDecision;
> - §7 then **reassigns ownership** (`userId` / `businessId` / `apiKeyId`) to the caller;
> - if the caller's execution then fails, the victim's stored prompt and response remain and become visible in the caller's History.
>
> Exploitation requires knowing a victim's ID (`req_<ms>_<8 base36>`), which isn't exposed publicly. **Recommended fix:** ignore client `requestId` (or reject IDs that already exist / belong to another owner). The docs intentionally do not document `requestId` as a request parameter.

---

## 1. Original Docs / Navigation Assessment

| Area | Before |
|---|---|
| Documentation | None. "Docs" in the landing navbar jumped to the `#developers` quickstart section. |
| Footer | "Quickstart" → `#developers`; no docs link. |
| Dashboard | No docs entry. |
| API reference | Only internal reports in `docs/*.md`; no public description of parameters, errors or limits. |
| Conversation/context guidance | None. Nothing told developers that the API is stateless or that History is not memory. |
| History list | Rendered the full stored prompt (all user messages of the request, joined) as the preview. |
| History detail | Showed tokens with `?? 0` (unknown shown as 0) and token counts that could be routing estimates presented as actual. Invented attempt errors (`EXECUTION_FAILED`, "Primary model execution failed.", `retryable: true`, latency 0) for every fallback/failed request. Unknown cost shown as "—". |

**Source-of-truth facts confirmed before writing docs:**
- Validator: `src/app/api/v1/chat/completions/validation.ts`.
- Policies and weights: `policies.ts`; complexity modifiers: `scorer.ts`.
- Fallback triggers: `orchestrator.ts` and `errors.ts` (`MAX_ORCHESTRATOR_ATTEMPTS = 5`); timeout: `DEFAULT_EXECUTION_TIMEOUT_MS = 30 000`.
- Cost ceiling: `fallback.ts`. Error → status map: `route.ts`. Key format, expiry and revocation: `api-keys`.

**Discrepancies found (documented as actual behavior, not changed):**
1. An unrecognized `policy` silently falls back to `balanced` (no `INVALID_POLICY` error despite the code existing). The docs warn about it.
2. `taskTypeHint` is not validated against the allowed values. The docs list only valid uppercase values.
3. Prompt persistence stores **only user-message text**, joined with `\n`; roles and boundaries are lost (see §8).
4. Request token columns hold routing **estimates** until post-execution cost persistence replaces them (see §10).
5. The cost ceiling is skipped when the primary's projected cost is unknown (operator detail; not in public docs).

## 2. Final `/docs` Architecture and Routes

- **App Router:**
  - `src/app/docs/layout.tsx` — header, sidebar, dark scope;
  - `src/app/docs/[[...slug]]/page.tsx` — one optional catch-all page with `generateStaticParams`, `dynamicParams = false` (unknown slugs → 404) and per-page `generateMetadata`.
- **Rendering:** all 20 pages are **statically prerendered** (SSG; `/docs/[[...slug]]` 3.83 kB, 99.9 kB first load).
- **Registry:** `src/lib/docs/navigation.ts` is the single source for the sidebar, search, breadcrumbs, previous/next and headings.
- **Access:** public. Middleware protects only `/dashboard`, `/history` and `/business`.

| Section | Routes |
|---|---|
| Get started | `/docs`, `/docs/quickstart`, `/docs/authentication` |
| SDKs | `/docs/sdk/python`, `/docs/sdk/javascript`, `/docs/sdk/curl` |
| Core concepts | `/docs/concepts/routing`, `/docs/concepts/policies`, `/docs/concepts/fallback`, `/docs/concepts/models` |
| Guides | `/docs/guides/conversation-history`, `/docs/guides/context-optimization`, `/docs/guides/usage-and-costs`, `/docs/guides/build-a-chatbot` |
| API reference | `/docs/api/chat-completions`, `/docs/api/parameters`, `/docs/api/responses`, `/docs/api/errors`, `/docs/api/rate-limits` |
| More | `/docs/limitations` |

## 3. Documentation Content Inventory

| Page | Key content |
|---|---|
| Introduction | What Attentra is; why routing; request flow diagram; responsibilities table; "routing is a weighted estimate" callout |
| Quickstart | Google sign-in → API keys → one-time key → env var (PowerShell `Read-Host`, bash `read -rs`, `.env`) → SDK install → Python/JS/cURL first request → find it in History |
| Authentication | `Authorization: Bearer`; `atr_` + 64 hex, SHA-256 stored; create / optional expiry / revoke; personal vs business keys; storage; 401 vs 503 |
| Python / JavaScript | Install, client (`max_retries=0` rationale), completion, `model_extra` metadata, `policy` via `extra_body` (Python) / body field (JS), error classes, never-in-browser warning |
| cURL | Request; illustrative response; PowerShell `Invoke-RestMethod` |
| Automatic routing | 8-step pipeline from source; scoring factors; estimates vs measurements; explicit model / `provider/identifier`, no fallback, 404/400 |
| Routing policies | Exact weights (0.33/0.34/0.33, 0.60/0.15/0.25, 0.15/0.15/0.70, 0.15/0.60/0.25); complexity multipliers; usage; caveats |
| Fallback | Provider-diverse ordering; trigger table; 5 attempts / 30 s; selected vs executed; operator settings `ROUTING_EXCLUDED_MODELS`, `ROUTING_MAX_FALLBACK_COST_MULTIPLIER`, soft/strict (disabled unless set; not API parameters) |
| Models & availability | Registry; listed ≠ available; identifiers; no live model list published |
| Conversation history | **Stateless** callout; roles; multi-turn example; context vs History table |
| Context optimization | Token growth table (illustrative); 6-turn sliding window; token-budget trimming; summarization and retrieval; trade-offs; "Attentra does not compress or cache" |
| Usage & costs | Token fields; projected vs actual table; not-an-invoice; "Not available" rule; savings vs baseline (preview, no payments); USD vs display currency |
| Build a chatbot | Complete `chatbot.py` (dotenv, `model="auto"`, 6-turn window, `response.model`, token report, rate-limit and error handling, `exit`); "don't ask the model who it is" |
| Chat completions | Endpoint, headers, compatibility matrix |
| Parameters | Supported / default-only / no-effect / unsupported fields, straight from the validator |
| Response format | OpenAI fields, Attentra fields, illustrative JSON, selected vs executed |
| Errors | Error envelope; status/code table (400–504); Vercel security checkpoint explained without bypass advice |
| Rate limits | 20/min per key, 10/min Playground, 4,096 cap, 256 assumption; behavior; `Retry-After`; SDK retries |
| Limitations | Supported / not supported / not guaranteed |

All examples live in `src/lib/docs/examples.ts`, so the pages and the tests use the same text.

## 4. Dark-Mode Design

- **Scope:** dark treatment is scoped to `/docs`.
  - Background `#0A0C0F`; text `#D5DAE0`/`#BAC2CB`; restrained Attentra orange (`--color-accent` `#d97745`, link tone `#F2A97E`).
  - Existing fonts (Inter body, Space Grotesk headings, JetBrains Mono code); subtle `white/10` borders.
  - No gradients, illustrations or animation beyond hover transitions.
- **Layout:**
  - sticky header (logo inverted for dark, "Docs" badge, search, Home, Dashboard, **Get API key**);
  - sticky left sidebar with active-page highlight (`aria-current`);
  - article column (max-w-3xl) with breadcrumbs, H1, description, previous/next cards;
  - sticky right "On this page" with scroll-spy (xl+).
- **Code blocks:** language label, dependency-free highlighter (comments/strings/keywords/numbers/JSON keys, rendered as text, never HTML), copy button with "Copied" / "Copy failed" feedback, horizontal scroll only inside the block. Python/JavaScript/cURL tabs use ARIA tabs with arrow-key support.
- **Callouts:** note/tip/important. Tables scroll horizontally inside their own container on mobile.
- **Global CSS fix:** `globals.css` sets `overflow-x: hidden` on html/body, which breaks `position: sticky`. The docs layout overrides it with `overflow-x: clip`, scoped via `html:has([data-docs-root])`. Verified: the landing page still computes `overflow-x: hidden`.

## 5. Search and Navigation Behavior

- **Search:** local static index (`buildDocsSearchIndex`) over page titles, descriptions, keywords and every H2. No external service.
  - Every query word must match; title matches rank higher.
  - Opens with the header button, **Ctrl/⌘ K** or **/**.
  - ↑↓ moves through results, Enter opens, **Esc** closes. Empty and "No results" states; listbox ARIA.
  - Body scroll is locked while open and focus returns to the trigger.
- **Mobile:** hamburger opens an accessible drawer (dialog, Esc, overlay click, focus to close button). It closes automatically on navigation.
- **Overlay fix:** the search modal and the drawer are rendered through a React portal. The header's `backdrop-filter` otherwise confines `position: fixed` children to the 64 px header; this was found and fixed during testing.
- **Navigation behavior:**
  - real `Link`s give correct back/forward;
  - every page is a shareable URL;
  - H2s carry `id`s with hover `#` anchors (`scroll-mt-24` clears the header);
  - unknown `/docs/*` paths return 404.

## 6. Landing Navbar and Footer Changes

| Where | Change |
|---|---|
| Navbar (desktop + mobile) | "Docs" → `/docs`. Route items use `next/link`; section anchors keep `<a>`. The landing `#developers` quickstart section is unchanged. |
| Footer | Developers column: **Documentation** `/docs`, **Quickstart** `/docs/quickstart`, **API reference** `/docs/api/chat-completions`, Pricing preview `#pricing`. Route links use `next/link`. |
| Dashboard sidebar | Added **Docs** → `/docs` (BookOpen icon) under Settings. |
| Docs header | Home `/`, Dashboard `/dashboard`, Get API key `/dashboard/api-keys` (middleware sends signed-out users to login). |

## 7. How Context-History Documentation Works

- **Conversation history guide:**
  - States plainly that the endpoint **does not remember conversations**; the developer sends the context.
  - Explains the system/user/assistant roles (`developer` = `system` alias).
  - Shows a multi-turn example that appends the reply.
  - Contrasts model context with the History dashboard: History is never injected into future requests.
- **Context optimization guide:**
  - Explains why input tokens grow, with an illustrative table.
  - Points out that routing analyzes **all** messages, so long context can raise complexity and change model choice.
  - Provides a 6-turn sliding window and token-budget trimming (≈4 chars/token, the same heuristic as routing); notes that a turn limit is not a token limit.
  - Covers summarization and retrieval trade-offs, and states that Attentra does not compress or cache context.
- **Chatbot guide:** applies these practices end to end.

## 8. How History Previews Changed

**Actual storage:**
- `Request.prompt` is the text of the request's **user** messages joined by `"\n"` (`route.ts` §10b).
- No roles, system/assistant messages or boundaries are stored, ever (checked git history: unchanged since `5d0cbba`).
- Persistence is unchanged in this phase.

`src/lib/dashboard/prompt-context.ts`:
- **`interpretStoredPrompt`** returns one of:
  - `empty`;
  - `messages` — only if the stored text is itself a JSON conversation (array of `{role, content}` or `{messages:[…]}`, with at least one recognized role; parsing is capped at 500 kB);
  - `text` — legacy plain text. **Message boundaries are never invented for plain text.**
- **`buildPromptPreview`:**
  - structured → **latest user message** + "N messages in request";
  - plain text → the **end** of the stored text (the newest user message is always last), prefixed "…" when trimmed, with "End of N characters of user text".
  - Missing user message, empty arrays, malformed JSON and very long text are all handled.
- **Where:**
  - consumer History list (`HistoryTable`);
  - business request table (desktop and mobile rows).
- **Unchanged:** search still matches the full stored prompt, and the stored value is never modified.
- **Also preserved in the list:** request ID, timestamp, task, complexity, status, routed/executed model, fallback badge, latency and cost.
- **Changes in the list:**
  - unknown cost → "Not available";
  - failed requests show "Tokens not reported" instead of estimates.

## 9. How the Full-Context Viewer Works

`RequestConversationContext` replaces the old "User prompt" card on the request detail pages (consumer and business):
- **Structured:**
  - "N messages in request"; shows the latest user message (badge "Latest user message") by default.
  - **Show all N messages** lists every message in original order with #index and role label (System/Developer/User/Assistant/Tool/Unknown).
  - Messages over 600 characters are collapsed with "Show full message".
- **Plain text:**
  - Labelled honestly: the user messages combined; system/assistant messages and boundaries not stored; the newest message is at the end.
  - Text over 1,200 characters shows its end, with "Show full stored text"; the box is scrollable.
- **Empty:** "No prompt text is stored for this request."
- **Rendering:** all content is React text (escaped); no `dangerouslySetInnerHTML` (tested). No keys or headers are ever stored or shown.
- **Access:** unchanged. The consumer detail API uses `where: { id, userId }`; the business pages keep their existing workspace checks.

## 10. Selected / Executed Models and Costs

**Request telemetry** (consumer detail) now shows nine tiles:
1. routed model;
2. executed model;
3. **Fallback** ("Fallback used" / "Not used" / "—" for failed requests);
4. input tokens;
5. output tokens;
6. total tokens;
7. projected cost ("Estimated before execution");
8. **Actual calculated cost** ("From reported usage × stored pricing", or "Not available");
9. latency ("Measured execution time" / "includes fallback attempts").

The old duplicated "Total" and "Execution" latency tiles (same value) were merged.

**Token provenance** (`tokenSource`, added to the shared mapper):

| Source | When | Display |
|---|---|---|
| `reported` | Status SUCCESS and actual cost stored | The counts, labelled "Provider-reported usage" |
| `estimated` | Request failed or never executed | **Not available**, with "routing estimate was X in / Y out" |
| `unverified` | SUCCESS but no actual cost | The counts, labelled "may be routing estimates" |

**Other mapper fixes:**
- **Costs:** a stored zero cost stays 0; only null becomes "Not available". Actual cost is never inferred from estimates.
- **Fallback path:** the "Execution path" card no longer invents attempt errors.
  - It is titled "Routed and executed models" and explains that per-attempt results aren't stored and that other fallback attempts may have happened in between.
  - Failed attempts say "Error details are not stored".
  - Operator attempt logs stay server-side.
- **Cost explanations:** an explainer under the tiles defines projected cost, actual calculated cost (may differ from the invoice), savings against a configured baseline, and why long conversations cost more. When the display currency isn't USD it adds "Amounts are shown in PKR, converted from USD at a fixed rate". Conversion still happens once, through `formatDisplayCurrency`.
- **Business telemetry:** uses the same token honesty and "Not available" for cost.

## 11. Files

**New:**
- `src/app/docs/layout.tsx`, `src/app/docs/[[...slug]]/page.tsx`
- `src/components/docs/` — `DocsHeader`, `DocsSidebar`, `DocsSearch`, `DocsTableOfContents`, `DocsCodeBlock`, `DocsCodeTabs`, `DocsPrimitives`
- `src/components/docs/content/` — `GetStarted`, `Sdks`, `Concepts`, `Guides`, `ApiReference`, `index`
- `src/lib/docs/navigation.ts`, `examples.ts`, `highlight.ts`, `search.ts`
- `src/lib/dashboard/prompt-context.ts`, `request-display.ts`
- `src/components/dashboard/history/detail/RequestConversationContext.tsx`
- `src/__tests__/docs-portal.test.ts` (17 tests), `src/__tests__/history-transparency.test.ts` (16 tests)
- `docs/PHASE_3C_DEVELOPER_DOCS_AND_REQUEST_TRANSPARENCY.md`

**Modified:**
- `src/components/layout/Navbar.tsx`, `Footer.tsx`, `src/components/dashboard/DashboardSidebar.tsx`
- `src/lib/dashboard/history-data.ts` (optional `tokenSource`, `attemptsRecorded`), `request-mapping.ts`
- `src/components/dashboard/history/HistoryTable.tsx`
- `src/components/dashboard/history/detail/RequestMetadataGrid.tsx`, `RequestExecutionPath.tsx`, `RequestPromptResponse.tsx`, `RequestRoutingOverview.tsx`
- `src/components/business/requests/BusinessRequestTable.tsx`, `src/components/business/requests/detail/BusinessRequestPromptResponse.tsx`, `BusinessRequestTelemetry.tsx`
- `Tracker.md`

**Not part of this phase:** pre-existing uncommitted `docs/PRODUCTION_AUTHENTICATION_RESOLUTION_REPORT.md`, the untracked audit docs, and a stray untracked file named `tatus` (likely a mistyped `git status`; safe to delete).

## 12. Test Results

All commands below were executed in this session.

| Check | Result |
|---|---|
| `npx tsc --noEmit -p .` | ✔ 0 errors |
| New tests (`docs-portal`, `history-transparency`, with the Python SDK venv gate on) | ✔ 33 passed |
| Full safe suite (excluding the 2 DB-writing integration suites) | ✔ **54 files, 1,150 passed, 4 skipped, 0 failed** |
| `npx prisma validate` | ✔ valid |
| `npx next build` (final) | ✔ compiled; 20 docs pages SSG |

**Example verification:**
- Python examples parsed with `ast` (8 snippets); JS examples pass `node --check` as ESM.
- JSON examples parse.
- No key-like strings; production base URL; correct SDK option names (`base_url`/`api_key` vs `baseURL`/`apiKey`); `model="auto"`; no `stream: true`; no `eval`; `max_tokens` ≤ 4,096.
- Python `model_extra` access and the error classes were checked against the installed `openai` 3.46.0.
- **No live or paid provider calls were made.**

**Browser checks** (local production build, Chrome):
- all 20 pages return 200; every in-page anchor resolves; all internal links resolve (dashboard links redirect to login when signed out);
- search via Ctrl+K → type → ↓↓ → Enter landed on `/docs/concepts/fallback#triggers`; Esc closes;
- sticky header and sidebars hold position after scrolling;
- 390 px iframe scan of all 20 pages: no horizontal overflow, sidebar hidden;
- mobile drawer full height, active item highlighted, link navigates and closes it; mobile search works;
- copy with a real click shows "Copied" for 1.5 s with no scroll jump.

**Defects found and fixed during testing:**
1. Sticky elements broken by the global `overflow-x: hidden`.
2. Drawer and search clipped by the header's `backdrop-filter`.
3. A hanging clipboard promise gave no feedback (added a 1 s timeout, an `execCommand` fallback, and "Copy failed").
4. A copy fallback scroll jump (`preventScroll`).

## 13. Unverified Behavior

- **Signed-in screens:** the History list/detail, business request views and dashboard sidebar were **not visually verified**. A session would need the shared production database; they are covered by type checks and the mapper/parser unit tests only.
- **Production:** nothing is deployed. Earlier production access from this machine hit the Vercel challenge.
- **Other browsers:** Safari/Firefox and real mobile devices were not tested. `:has()` and `overflow: clip` need modern browsers; older ones fall back to the previous behavior (non-sticky header).
- **Clipboard in a normal browser:** not exercised outside the automation profile, where only the success path with a real click was confirmed.

## 14. Known Limitations

1. History cannot show roles, system/assistant messages or exact message boundaries for real API traffic, because they are not stored. A role-aware viewer for real traffic requires persisting structured messages (a new column or JSON storage, plus a privacy decision). **Needs approval.**
2. Per-attempt fallback errors are only in operator logs; History shows the routed and executed models only.
3. "Unverified" token counts can't be resolved for past successful requests without a stored usage flag.
4. There is no live model list; the docs explain availability rather than listing models.
5. Search covers titles, descriptions, keywords and headings, not full body text.
6. The client `requestId` issue above, and the unvalidated `policy` / `taskTypeHint`, remain until approved API changes.

## 15. Production Deployment Steps

```powershell
git add src/app/docs src/components/docs src/lib/docs `
  src/lib/dashboard/prompt-context.ts src/lib/dashboard/request-display.ts `
  src/lib/dashboard/history-data.ts src/lib/dashboard/request-mapping.ts `
  src/components/dashboard/history src/components/dashboard/DashboardSidebar.tsx `
  src/components/business/requests src/components/layout/Navbar.tsx src/components/layout/Footer.tsx `
  src/__tests__/docs-portal.test.ts src/__tests__/history-transparency.test.ts `
  Tracker.md docs/PHASE_3C_DEVELOPER_DOCS_AND_REQUEST_TRANSPARENCY.md
git commit -m "feat(docs): developer documentation portal and request transparency"
git push
```

- No environment variables, migrations or settings changes.
- **After deploy, check:**
  - `/docs` signed out;
  - search; a deep link such as `/docs/api/errors#codes`; the mobile menu;
  - landing "Docs" link;
  - signed in: History list preview, one request detail (context viewer, telemetry tiles, execution path note), and one business request detail.

## 16. Rollback

Use Vercel **Instant Rollback** to the previous deployment. There is no data or schema impact: only presentation code and new static pages changed. To revert locally, `git restore` / remove the files listed in §11.

## 17. GO / NO-GO

**GO** for deploying the docs portal and the History presentation changes, **conditional on** a signed-in walkthrough of History after deploy (§15), since those screens weren't visually verified.

Separately, **fix the client `requestId` ownership issue before broader external API access** (§ top). It predates this phase and is not made worse by it.

---

## Summary

A first-time developer can now open `/docs` without signing in. In under a minute they learn:
- what Attentra is;
- how to create and safely store a key;
- a working Python, JavaScript or cURL example with `model: "auto"`.

They can also read how routing, policies and fallback actually work, with weights and limits taken from the code. They learn that conversations are stateless and that context drives cost, and can copy a complete chatbot that manages its own history. In History they see the newest question first and the context they sent, along with selected and executed models, tokens and costs that never present an estimate or an invented error as fact.

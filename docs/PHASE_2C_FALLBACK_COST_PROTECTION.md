# Attentra — Phase 2C: Cost-Aware Fallback Protection

**Date:** 2026-11-07
**Base commit:** `0d0cfb6` (Phase 2B committed). Phase 2C changes are **uncommitted and undeployed**.
**Constraints honored:**
- No migrations, infrastructure, dependency, environment or production data changes.
- Rate limits and authentication untouched.
- No paid provider calls.

---

## 1. Design

### 1.1 Where it runs
```text
filter → score → select primary → orderFallbacks (provider-diverse)
       → applyFallbackCostCeiling   ← NEW (optional)
       → RoutingDecision (persisted) → explanation → ExecutionPlan → orchestrator
```
- The ceiling acts only on the **already-ordered fallback list**.
- It never changes the primary model, candidate eligibility (active, task capability, context window, pricing), scoring, the four policies or provider-diverse ordering.
- The persisted `RoutingDecision`, its explanation and the `ExecutionPlan` all see the same filtered list.

### 1.2 Configuration
| Variable | Values | Default |
|---|---|---|
| `ROUTING_MAX_FALLBACK_COST_MULTIPLIER` | number ≥ 1 (e.g. `20`) | **unset: disabled, existing behavior** |
| `ROUTING_FALLBACK_COST_MODE` | `soft` or `strict` | `soft` |

Malformed values (`abc`, `0`, `0.5`, negative, `Infinity`) **disable** the ceiling, giving the same behavior as unset. They log one warning per instance:
`[routing] ROUTING_MAX_FALLBACK_COST_MULTIPLIER is not a number >= 1; fallback cost ceiling disabled.`

### 1.3 Rule
```text
threshold = primary.projectedCost × multiplier
keep fallback  ⇔  fallback.projectedCost ≤ threshold          (non-finite cost → not kept)
soft mode:  if NO cross-provider fallback is within threshold,
            also keep the CHEAPEST cross-provider fallback (over threshold)
strict mode: never keep anything over threshold (may leave zero fallbacks)
```
- **Projected cost** is the routing estimate already used for scoring: live pricing snapshot × estimated input/output tokens (`scorer.ts` `calculateProjectedCost`). **It is not a bill.** Actual cost is still computed after execution from provider-reported tokens and the executed model's price (`orchestrator.ts` `computeActualCost`), unchanged.
- **Primary projected cost zero, negative or missing** means no ratio can be formed. The ceiling is **skipped** (fallbacks unchanged), and the explanation says so.
- **Soft mode gives no strict cost guarantee.** Whenever every cross-provider alternative is over the threshold, one over-threshold fallback is intentionally kept, so a provider outage can still be served. Use `strict` only if a hard projected-cost cap matters more than availability.

### 1.4 Explanations (persisted in `RoutingDecision.reason`)
Text is added only when the ceiling is enabled and something happened:
- `| Fallback cost ceiling 20x primary projected cost ($0.006000): excluded 3 fallback(s)`
- `…; kept GPT 4.1 Nano (openai, projected $0.000600) above the ceiling as the cheapest cross-provider fallback (soft limit)`
- `| Fallback cost ceiling not applied: primary projected cost unavailable`

Amounts are labelled "projected". No credentials, keys or prompt content are included.

### 1.5 Explicit model selection
Unchanged: an explicit `model` routes to that single registry model with **no fallbacks**, so the ceiling has nothing to filter and adds no text.

---

## 2. Changes

| File | Change |
|---|---|
| `src/lib/routing/fallback.ts` | `FallbackCostCeiling`, `parseFallbackCostCeiling()`, `resolveFallbackCostCeiling()` (env, malformed warning once), `applyFallbackCostCeiling()` (pure), `describeFallbackCostFilter()` (+165 lines) |
| `src/lib/routing/router.ts` | Pipeline step 8 applies the ceiling after `orderFallbacks`; step 10 appends the explanation (+21 / −4) |
| `src/__tests__/routing/fallback-cost-ceiling.test.ts` | **new**: 31 tests |

Not changed: execution plan builder, orchestrator, cost intelligence, the API route/response, History, attribution, rate limits, auth, schema.

---

## 3. Tests

| Command | Result |
|---|---|
| `npx vitest run src/__tests__/routing/fallback-cost-ceiling.test.ts` | ✔ **31 passed** |
| `npx tsc --noEmit -p .` | ✔ 0 errors |
| Full safe suite, with `ATTENTRA_OPENAI_SDK_PYTHON` set (excluding the 2 DB-writing suites) | ✔ **51 files, 1,097 passed, 4 skipped** (live-provider gates), **0 failed**. Includes the official OpenAI Python SDK test |
| Same suite **before** adding the new tests (env unset) | ✔ 1,065 passed: no existing test changed or broke |
| `npx prisma validate` | ✔ valid |
| `npx next build` | ✔ compiled successfully |
| Lint | not configured |

| Required case | Test(s) |
|---|---|
| Multiplier unset | pure: fallbacks returned unchanged (same array). Pipeline: decision and reason identical to baseline |
| Normal fallback within multiplier | all kept at 1000× |
| Expensive fallback filtered | 60× drops 100× and 200× fallbacks, order preserved. Pipeline at 3× keeps only the 2× fallback, explanation present |
| Cheapest cross-provider retained | soft 1.5× keeps the cheapest cross-provider option (2×), not the first in order (50×). Explanation says "soft limit" |
| Strict mode | 1.5× strict leaves no fallbacks (pure + pipeline; routing still succeeds) |
| No eligible fallback | same-provider-only over ceiling → empty; empty input → empty |
| Primary projected cost zero / NaN / negative | skipped, unchanged, `PRIMARY_COST_UNAVAILABLE` |
| Non-finite fallback cost | never kept |
| Malformed configuration | 6 malformed values → disabled; env warns ≤ once; pipeline identical to unset |
| Explicit model | requested model only, no fallbacks, no ceiling text |
| Executed model and cost attribution | real plan builder + orchestrator: primary fails → executes the retained `o-moderate`; the excluded expensive models are never called; `actualCost` = 1,000 × 0.0002/1k + 500 × 0.0008/1k = **0.0006** (executed model's own price) |
| Four routing policies | for each policy: a non-binding ceiling yields an identical decision and reason; a binding ceiling keeps the same primary and never adds fallbacks |
| Existing behavior (SDK response, History, attribution) | full existing suite unchanged and passing |

**Not run:** DB-writing integration suites; paid live-provider tests; production.

---

## 4. Trade-offs

| | Unset (today) | Soft (recommended when enabled) | Strict |
|---|---|---|---|
| Availability on provider failure | Highest: all fallbacks | High: at least one cross-provider fallback kept whenever one exists | Can drop to **zero fallbacks**, so a primary failure fails the request |
| Spend protection | None | Removes expensive fallbacks *when cheaper cross-provider options exist*; otherwise keeps exactly one over-ceiling fallback | Hard **projected** cap |
| Guarantee | — | **No strict cost guarantee** | Projected-cost cap only; the actual bill depends on real tokens |

Other considerations:
- The ratio uses the **same** token estimate for primary and fallbacks, so it reflects relative pricing, not absolute bills.
- Very cheap primaries make the threshold tight. A small multiplier with a near-free primary can exclude most alternatives; soft mode protects availability in that case.
- The ceiling is evaluated per request. It does not cap total spend; rate limits (Phase 2B) and output-token caps do.

---

## 5. Deployment, Rollback, Recommended Configuration

**Deploy (code only, behavior unchanged while unset):**
```powershell
git add src/lib/routing/fallback.ts src/lib/routing/router.ts `
  src/__tests__/routing/fallback-cost-ceiling.test.ts docs/PHASE_2C_FALLBACK_COST_PROTECTION.md
git commit -m "feat(routing): optional projected-cost ceiling for fallbacks"
git push
```

**Recommended configuration:**
- **Production, through the November 8 pitch: leave `ROUTING_MAX_FALLBACK_COST_MULTIPLIER` unset.**
  - Phase 2A's exclusions already remove the source of the observed expensive fallbacks (retired Gemini models falling through to GPT-4o).
  - Enabling a new routing control the day before the demo adds risk without a demonstrated need.
- **Preview first, then Production after the pitch:** `ROUTING_MAX_FALLBACK_COST_MULTIPLIER=20`, mode left at the soft default. Verify with §6, then promote the same setting to Production.
- **Avoid `strict`** unless a hard projected-cost cap is required and reduced availability is acceptable.

**Rollback:**
- To disable: remove or blank `ROUTING_MAX_FALLBACK_COST_MULTIPLIER` (effective on the next deployment).
- To revert the code: Vercel Instant Rollback.
- No data or schema to roll back.

---

## 6. Production / Preview Verification (after enabling)
1. Set `ROUTING_MAX_FALLBACK_COST_MULTIPLIER=20` on **Preview**, deploy, and send **one** Playground request.
2. History → request detail: the routing explanation either has no ceiling text (nothing excluded) or shows `Fallback cost ceiling 20x primary projected cost … excluded N fallback(s)`.
3. The response and History still show the executed provider, model, tokens and actual cost as before.
4. No `[routing] … fallback cost ceiling disabled` warning appears in Vercel Logs (that warning means the value is malformed).
5. Keep volume low: rate limits and the Vercel DDoS mitigation apply.

---

## 7. GO / NO-GO

**GO to deploy the code.**
- Unset is the default and is verified to leave routing identical.
- The change is isolated to fallback list construction and covered by 31 new tests plus the unchanged suite.

**NO-GO on enabling the multiplier in Production before the pitch**, unless it is first verified on Preview (§6).

**Unverified in production:**
- The ceiling has never run in a deployed environment (it is disabled by default).
- No real fallback has executed under the ceiling. Execution was verified with in-test adapters only.
- The real-world distribution of projected-cost ratios between primaries and fallbacks in the live 55-model pool, and therefore how often a multiplier of 20 would exclude fallbacks, has not been measured.
- Interaction with Phase 2A exclusions in production (both are opt-in environment settings).

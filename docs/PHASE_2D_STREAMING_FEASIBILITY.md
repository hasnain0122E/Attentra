# Attentra — Phase 2D: OpenAI-Compatible Streaming Feasibility

**Date:** 2026-11-07
**Commit inspected:** `8e8a334` (Phase 2C committed)
**Mode:** read-only. No code, dependency, database, environment or deployment changes; no provider calls.

**Evidence labels:**
- **[SRC]**: repository source.
- **[PKG]**: installed package source/version.
- **[DOC]**: vendor documentation fetched 2026-11-07.
- **[ASSUMPTION]**: not verified.

---

## 1. Architecture Findings

| Area | Finding |
|---|---|
| Route | `src/app/api/v1/chat/completions/route.ts`: Node runtime (no `runtime` export), `dynamic = "force-dynamic"`, no `maxDuration`. Always returns a complete JSON body via `NextResponse.json` **[SRC]** |
| Validation | `stream: true` is **explicitly rejected** with 400 `param: "stream"` ("Streaming is not supported yet"). `stream_options` is rejected too (`validation.ts:70, 104, 190`) **[SRC]**. The official Python SDK raises `BadRequestError` for `stream=True`, verified in the Phase 1 SDK test |
| Existing streaming code | **None** anywhere in `src/lib` or `src/app/api` **[SRC]** |
| Provider adapters | `src/lib/providers/{openai,anthropic,google}.ts` call only non-streaming APIs (`chat.completions.create`, `messages.create`, `generateContent`) and return a complete `NormalizedAIResponse` **[SRC]** |
| Installed SDKs | `openai` **4.104.0**, `@anthropic-ai/sdk` **0.39.0**, `@google/generative-ai` **0.24.1**. All support native streaming, so **no dependency change is needed** **[PKG]**. `@google/generative-ai` is Google's legacy SDK [ASSUMPTION: still functional for streaming; already used in production for non-streaming] |
| Execution | `Dispatcher` → `Executor` enforces a **30 s total per attempt** via `Promise.race` (`executor.ts:154–188`). That would truncate any stream longer than 30 s. **No `AbortSignal`** reaches any provider call, so upstream requests cannot be cancelled **[SRC]** |
| Orchestrator | Fallback = run the next target after a *completed* failed attempt (`orchestrator.ts`). It assumes atomic results **[SRC]** |
| Persistence | Before execution: `Request` (PENDING) + `RoutingDecision` (one transaction), then ownership. After execution: cost intelligence (status SUCCESS, real tokens, actual cost, savings), then prompt/response. On failure: status FAILED **[SRC]** |
| `RequestStatus` enum | `PENDING, SUCCESS, FAILED, TIMEOUT_ERROR, PROVIDER_ERROR`. **No `CANCELLED`**: a client disconnect could only be recorded as FAILED without a migration **[SRC]** |
| Rate limiter (2B) | Runs after validation and **before** routing. It would apply unchanged to streaming requests, which are admitted or rejected before any stream opens **[SRC]** |
| Token caps (2B) | 4,096 cap applies unchanged **[SRC]** |
| Playground | Non-streaming; reads `content/routing/execution`. Unaffected by an API-only streaming path **[SRC]** |
| Vercel limits | Hobby with Fluid compute: **300 s default and maximum duration**. Streamed response time counts toward it. `export const maxDuration` is supported in App Router routes **[DOC]** |

### OpenAI Python SDK streaming expectations (from the installed SDK, `openai/_streaming.py`) [PKG]
- `Content-Type: text/event-stream`. Each event is `data: <json>\n\n`. Iteration ends at `data: [DONE]`.
- Each JSON is a `chat.completion.chunk`: `{id, object:"chat.completion.chunk", created, model, choices:[{index:0, delta:{role?, content?}, finish_reason:null|"stop"|"length"|…}]}`.
- With `stream_options={"include_usage": true}`, a final chunk carries `usage` and `choices: []`.
- **Errors before the first byte:** the HTTP status decides the exception (`AuthenticationError`, `RateLimitError`, …), exactly as today.
- **Errors after streaming starts:** any data event whose JSON contains an `"error"` key makes the SDK raise `APIError` mid-iteration (lines 95–106). Mid-stream failures can therefore be reported honestly.

---

## 2. Required Code Changes (if implemented)

| # | Change | Files |
|---|---|---|
| 1 | Provider streaming interface: `generateStream(request, modelId, signal): AsyncIterable<StreamEvent>` with `delta(text)`, `finish(reason)`, `usage(input, output)`. Native SDK streaming plus `AbortSignal`. Reuse each provider's `normalizeError` | `src/lib/providers/{types,openai,anthropic,google}.ts` |
| 2 | Execution adapter passthrough for streams | `src/lib/execution/types.ts`, `providers/*` |
| 3 | **Streaming orchestrator path**: fallback only **before the first content delta**; time-to-first-token and idle timeouts instead of the 30 s total `Promise.race`; abort on client disconnect | `src/lib/execution/orchestrator.ts` (new method) or `stream-orchestrator.ts` |
| 4 | Route branch for `stream: true`. Steps 1–8 unchanged (auth, validation, rate limit, routing, persistence gate, ownership, plan), then `new Response(ReadableStream)` with the SSE encoder, `[DONE]` and mid-stream error events. `export const maxDuration` (≤ 300) | `route.ts`, new `sse.ts` |
| 5 | Validation: allow `stream: true` and `stream_options.include_usage` | `validation.ts` |
| 6 | Post-stream persistence: real usage → cost intelligence, accumulated response, status. Disconnect → FAILED (or a migration adding `CANCELLED`) | `route.ts` (stream completion handler) |
| 7 | Feature flag `STREAMING_ENABLED` (default off), so it can be disabled without a code rollback | `validation.ts`/`route.ts` |

---

## 3. Provider-Specific Streaming Requirements

| Provider | Native API (installed SDK) | Text deltas | Finish reason | Usage while streaming | Notes |
|---|---|---|---|---|---|
| OpenAI (4.104.0) | `chat.completions.create({ stream: true, stream_options: { include_usage: true } })` | `choices[0].delta.content` | `choices[0].finish_reason` on the last content chunk | **Only in the final chunk**, and only when `include_usage` is set. **Absent if the stream is aborted** | Reasoning models: `max_completion_tokens`, no temperature (existing rules) |
| Anthropic (0.39.0) | `messages.create({ stream: true, … })` events | `content_block_delta.delta.text` | `message_delta.delta.stop_reason` | `message_start.usage.input_tokens` (start) plus `message_delta.usage.output_tokens` (end). Output count **missing if aborted** | `max_tokens` required (existing) |
| Google (0.24.1) | `generateContentStream(...)` → `result.stream` | `chunk.text()` | `candidates[0].finishReason` (last chunk) | `usageMetadata` on chunks; totals reliable at the end. **Partial if aborted** [ASSUMPTION: per-chunk cumulative counts] | Retired 2.5-series models are excluded via Phase 2A config |

All three can fail **before** the first token (auth, model unavailable, rate limit) or **during** the stream (overload, safety stop, network). The SSE layer must handle both.

---

## 4. Persistence and Accounting Implications
- **Unchanged before streaming.** Routing persistence, the persistence gate and ownership all complete **before** the first byte, so History and attribution are preserved.
- **Success:** usage arrives only at the end of the stream. Cost intelligence (actual cost, baseline, savings) runs after the last chunk, inside the same invocation, before the stream closes, so the function must not end before persistence finishes.
- **Client disconnect / abort:**
  - Usage is often unavailable (OpenAI's final chunk is never received; Anthropic's output count arrives at the end).
  - Attentra must **not fabricate** tokens or cost. `inputTokens/outputTokens/actualCost` stay null, so **provider spend for partial streams is under-recorded**.
  - Status can only be FAILED without a migration. A `CANCELLED` status needs a schema change.
- **Mid-stream provider error:** partial content was delivered and may be billed upstream; usage is often unknown, with the same accounting gap.
- **The current Request token fields** would hold routing estimates on these failure paths (the existing behavior for FAILED rows). They should be cleared or flagged.

---

## 5. Fallback Restrictions Once Streaming Begins
- **Before the first content delta:** the existing rules apply unchanged. Retryable, `MODEL_UNAVAILABLE` and cross-provider fallback; non-retryable errors stop. The client sees nothing until a target produces content.
- **After the first delta:** **no fallback.** Switching models mid-answer would splice two different responses into one and misreport `model`. A mid-stream failure becomes a terminal SSE `{"error": …}` event; the SDK raises `APIError`.
- **Header commitment:** HTTP status 200 and `model` are sent with the first chunk. Errors after that cannot change the status code.
- Explicit `model` requests have no fallback (unchanged).
- **Recorded latency** must distinguish time-to-first-token from total duration. The current `latencyMs` is final-attempt only.

---

## 6. Security and Cost Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Long-lived connections (up to 300 s each) | More concurrent function time per key; the rate limiter counts requests, not open streams | Keep the 4,096-token cap. Optional per-key concurrent-stream cap (best-effort, like 2B) |
| Disconnect without upstream abort | Provider keeps generating and billing after the client leaves | Mandatory `AbortSignal` plumbing to all SDK calls |
| Unrecorded spend on aborted/failed streams | Cost dashboards under-report | Document. Record status; never fabricate. Consider estimates in a *separate* clearly labelled field (post-MVP) |
| Error text mid-stream | Could leak provider messages | Reuse `sanitizeErrorMessage` + Phase 2A prompt redaction for SSE error events |
| Buffering by intermediaries | Chunks delivered late, which looks like a hang | `Cache-Control: no-cache`, no compression, small chunks; verify on Vercel Preview |
| Vercel DDoS challenge (scripted clients) | Same as non-streaming. The challenge occurs before any stream | No change |
| Timeout semantics change | Replacing the 30 s total timeout affects only the streaming path | A separate code path; non-streaming unchanged |

---

## 7. Testing Strategy
1. **Adapter units (mocked SDK async iterables, no network):** delta mapping, finish-reason mapping, usage extraction per provider, error before the first token vs mid-stream, abort propagation.
2. **Streaming orchestrator:**
   - a failure before the first token falls back cross-provider;
   - a failure after the first token produces no fallback and a terminal error;
   - TTFT and idle timeouts;
   - attempt logging (2A) still emitted.
3. **Route (mocked routing/execution, real auth chain):**
   - SSE framing;
   - `[DONE]`;
   - a `usage` chunk only with `include_usage`;
   - rate limit / token cap / auth errors still return JSON before streaming;
   - persistence after completion (tokens, cost, executed model, ownership);
   - disconnect leads to FAILED and the upstream abort is called.
4. **Official OpenAI Python SDK** via the existing local HTTP harness (Phase 1): `stream=True` iteration, `delta.content` concatenation, `finish_reason`, `stream_options={"include_usage": True}` usage, mid-stream `APIError`, and `BadRequestError` when the flag is disabled.
5. **Regression:** the full safe suite, the Playground non-streaming path, and the SDK non-streaming test unchanged.
6. **Preview verification (owner-approved, paid ≈ $0.001):** one stream per provider and one disconnect test; check History and Vercel Logs.

Fake streaming (completing the response, then slicing it into chunks) is **explicitly rejected**. It would misrepresent time-to-first-token and offer none of streaming's benefits.

---

## 8. Estimated Implementation Complexity

| Option | Scope | Effort | Risk |
|---|---|---|---|
| **A. All three providers** | Items 1–7, three stream adapters, streaming orchestrator with pre-first-token cross-provider fallback, persistence and abort handling, full tests | **LARGE: about 3–4 focused days** incl. Preview verification | Touches the execution core; new timeout semantics; accounting gaps on abort |
| **B. One provider first** (e.g. Google, the provider most often selected by `auto` routing today) | Items 1–7 for one adapter. Streaming requests must be **routed only among that provider's models**, so there is **no cross-provider fallback for streams** and routing differs between stream and non-stream requests | **MEDIUM–LARGE: about 1.5–2 days** | Inconsistent routing semantics; weaker reliability story; most of the infrastructure is still needed |
| **C. Delay until after the pitch** | Keep the explicit 400 (`stream=True` → clear `BadRequestError`) | **None** | No risk to the demo; streaming is a known gap |

---

## 9. GO / NO-GO for November 8

**NO-GO.**
- **Time and risk:** even the narrowest genuine implementation (Option B) needs about 1.5–2 days of work in the execution core, plus Preview verification with paid calls. That doesn't fit before the pitch without risking the stable non-streaming path that is now verified in production.
- **Option B also weakens the product's key differentiator:** no cross-provider fallback for streamed requests.
- **Accounting is not yet sound** for aborted or failed streams. Without a schema change, partial-stream spend cannot be recorded accurately.
- **The current behavior is honest and SDK-correct:** `stream=True` returns a clear 400 that the SDK surfaces as `BadRequestError`.

**Pitch wording:** "Attentra is OpenAI-compatible for chat completions today. Streaming with pre-first-token fallback is the next milestone."

---

## 10. Safest Implementation Plan (after the pitch, if approved)
1. **Day 1. Provider stream adapters** behind a new interface with `AbortSignal`, plus unit tests. No route changes.
2. **Day 2. Streaming orchestrator path**: TTFT/idle timeouts, pre-first-token fallback, terminal mid-stream errors, attempt logging. The non-streaming path is untouched.
3. **Day 3. Route SSE branch** behind `STREAMING_ENABLED` (default off), `export const maxDuration = 300`, post-stream persistence, disconnect handling (FAILED). Decide whether to add `CANCELLED` (a migration, needs approval).
4. **Day 3–4. Tests:** route SSE tests plus the official Python SDK `stream=True` harness. Full safe suite and build.
5. **Rollout:**
   - deploy with the flag off;
   - enable on **Preview** only;
   - one stream per provider plus one disconnect test (owner-approved, paid ≈ $0.001);
   - check History, cost and Vercel Logs;
   - then enable in Production.
6. **Rollback:** unset `STREAMING_ENABLED` (back to the 400) or Vercel Instant Rollback. No data migration is required unless `CANCELLED` is added.

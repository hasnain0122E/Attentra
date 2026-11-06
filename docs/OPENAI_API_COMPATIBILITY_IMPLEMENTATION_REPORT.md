# Attentra — OpenAI-Compatible Chat Completions: Implementation Report

**Date:** 2026-11-06
**Base commit:** `ff72037` (`main`). All changes below are **uncommitted and undeployed**.
**Scope:** non-streaming `POST /api/v1/chat/completions` compatibility with the official OpenAI SDK. No schema, migration, hosting, firewall, auth or dependency changes.

---

## 1. Original Incompatibilities

| # | Area | Before |
|---|---|---|
| 1 | Response envelope | `{success, requestId, content, routing, execution, timestamp}`: no `id`, `object`, `created`, `model`, `choices`, `usage`. The OpenAI SDK returned a `ChatCompletion` with `choices=None`, so `.choices[0]` raised |
| 2 | `finish_reason` | Captured by provider adapters (`finishReason`) but dropped in the execution layer |
| 3 | `model` | Silently ignored; always auto-routed |
| 4 | `max_tokens` / `max_completion_tokens` | Silently ignored (only Attentra `maxTokens` honored) |
| 5 | `temperature` | Silently dropped by the validator; never sent to providers |
| 6 | `stream`, `n`, `tools`, `stop`, `seed`, … | Silently ignored, which gives the wrong behavior without any signal |
| 7 | Message content parts / `developer` role | 400 |
| 8 | Error body | `{success:false, requestId, error:{code, message[, retryable]}}`: no OpenAI `type` / `param` |
| 9 | Provider context-length error | Mapped to 502 (a client problem reported as a server error) |

---

## 2. Files Modified / Created

| File | Change |
|---|---|
| `src/app/api/v1/chat/completions/route.ts` | OpenAI envelope (additive). `toOpenAIFinishReason()`. `openAIErrorType()`. Exported `POST` wrapper adds `error.type`/`error.param` to every error. Forwards `model` (to routing) and `temperature` (to execution). New status mappings: `MODEL_NOT_FOUND`→404, `AMBIGUOUS_MODEL`/`CONTEXT_LENGTH`→400. Explicit-model routing reason |
| `src/app/api/v1/chat/completions/validation.ts` | Accepts `model`, `max_tokens`, `max_completion_tokens`, `temperature`, text content parts, `developer` role. Explicit policy for every other OpenAI parameter (§3). Returns `param` + `code` on failure |
| `src/lib/routing/router.ts` | `model` option on `routeWithDatabase`/`routeAndPersist`. New `resolveExplicitModel()` (`id` or `provider/id`). Explicit routing restricted to that registry model |
| `src/lib/routing/candidates.ts` | `ignoreCapabilities` filter option (explicit models only) |
| `src/lib/routing/types.ts` | `RoutingErrorCode`: `MODEL_NOT_FOUND`, `AMBIGUOUS_MODEL` |
| `src/lib/routing/execution-plan.ts` | `ExecutionResult.finishReason` |
| `src/lib/execution/types.ts` | `SamplingParams`. Adapter wrapper maps provider `finishReason` (`"unknown"` → `undefined`) |
| `src/lib/execution/dispatcher.ts` | `executePlan(..., params?)` → `ExecutionRequest.temperature` |
| `src/lib/execution/orchestrator.ts` | `OrchestratorOptions.temperature` forwarded to every attempt. `finishReason` in the success result |
| `src/lib/providers/openai.ts` | `temperature` not sent to reasoning models (o-series, GPT-5+), which accept only the default |
| `src/lib/providers/anthropic.ts` | `temperature` clamped to Anthropic's 0–1 range |
| `src/__tests__/api/chat-completions-openai-compat.test.ts` | **new**: 51 tests incl. the official Python SDK |
| `src/__tests__/routing/explicit-model.test.ts` | **new**: 11 tests |
| `src/__tests__/execution/sampling-finish-reason.test.ts` | **new**: 7 tests |

Source: 11 files, +546 / −44 lines. Tests: 3 new files, 69 tests.

---

## 3. Implementation Decisions

### Response (success)
```json
{
  "id": "req_…",                 // = Attentra requestId (History lookup key)
  "object": "chat.completion",
  "created": 1793995200,         // provider completion time (unix s)
  "model": "gemini-3.1-flash-lite",  // model that ACTUALLY answered (after any fallback)
  "choices": [{ "index": 0,
                "message": { "role": "assistant", "content": "…", "refusal": null },
                "logprobs": null, "finish_reason": "stop" }],
  "usage": { "prompt_tokens": 9, "completion_tokens": 6, "total_tokens": 15 },
  "system_fingerprint": null,
  "success": true, "requestId": "req_…", "content": "…",
  "routing": { …, "explicitModel": false },
  "execution": { …, "finishReason": "STOP" },
  "timestamp": "…"
}
```
- **`usage`** comes from the provider-reported counts on the execution result. It is **omitted** (not zero-filled) when the execution result has none.
- **`finish_reason`** maps provider-native values:
  - `length`/`max_tokens`/`MAX_TOKENS` → `length`;
  - `SAFETY`/`RECITATION`/`BLOCKLIST`/`PROHIBITED_CONTENT`/`SPII`/`refusal`/`content_filter` → `content_filter`;
  - `tool_use`/`tool_calls` → `tool_calls`;
  - otherwise `stop`.
- The raw provider value is exposed as `execution.finishReason`.

### `model`
- **Absent or `"auto"`** (case-insensitive): existing automatic routing, unchanged.
- **Explicit model**: `"<modelIdentifier>"` or `"<provider>/<modelIdentifier>"`, resolved against **routable registry models** (active, with current pricing; the same set auto-routing uses).
  - Routing runs the normal pipeline over that single candidate, so persistence, plan, pricing, cost and History are identical.
  - Heuristic capability filtering is skipped, because the client's choice wins over keyword task detection. The context-window check is kept.
  - **No cross-model fallback.** Running a model the client did not ask for would misrepresent it.
  - The persisted routing reason and `routing.reason` state that the model was explicitly requested.
- Unknown, inactive or unpriced models → **404** `MODEL_NOT_FOUND`. An identifier offered by more than one provider → **400** `AMBIGUOUS_MODEL` (use `provider/model`).

### Parameters (no silent drops)
| Category | Parameters | Behavior |
|---|---|---|
| Supported | `model`, `messages`, `max_tokens`, `max_completion_tokens`, `temperature` (0–2), Attentra `maxTokens`, `policy`, `taskTypeHint`, `requestId` | Honored |
| Default value only | `stream=false`, `n=1`, `top_p=1`, `frequency_penalty=0`, `presence_penalty=0`, `logprobs=false`, `tool_choice="none"`, `modalities=["text"]`, `response_format={"type":"text"}` | Other values → 400 `param` |
| Accepted, no effect on output | `user`, `metadata`, `store`, `service_tier`, `parallel_tool_calls` | Accepted |
| Unsupported | `tools`, `functions`, `function_call`, `stop`, `seed`, `logit_bias`, `top_logprobs`, `audio`, `prediction`, `reasoning_effort`, `web_search_options`, `stream_options` | Non-empty → 400 `param` |
| Unknown | anything else | 400 "Unrecognized request argument supplied: x" (same as OpenAI) |
| Messages | string content, or an array of **text** parts (joined with `\n`). Roles `system`, `developer` (→ system), `user`, `assistant` | Image/audio parts, `tool`/`function` roles and `tool_calls` → 400 |

### Provider constraints for `temperature`
- **OpenAI reasoning models** (o-series, GPT-5+) are not sent `temperature`. They accept only the default, and auto-routing could otherwise fail non-retryably. This uses the adapter's existing `usesCompletionTokensParam` predicate.
- **Anthropic** values are clamped to its 0–1 range.
- **Google** accepts 0–2 as is.

### Errors
- Every error now carries `error.type` (`invalid_request_error` / `authentication_error` / `permission_error` / `rate_limit_error` / `server_error`, derived from the HTTP status) and `error.param` (the offending field or `null`).
- Attentra's `success`, `requestId`, `error.code`, `error.message` and `error.retryable` are unchanged. The OpenAI SDK raises `AuthenticationError`, `BadRequestError`, `NotFoundError`, `RateLimitError`, `InternalServerError` and so on with the server's message.
- Implemented once in the exported `POST` wrapper, so every existing and future error path is covered. Headers such as `WWW-Authenticate` are preserved.

### Unchanged
- API-key authentication, session precedence, ownership attachment, persistence gate, cost intelligence, History and the routing algorithm for `auto`.

---

## 4. Backward Compatibility Strategy

- **Consumers identified:**
  - `src/components/dashboard/playground/PlaygroundClient.tsx` reads `success`, `content`, `routing.*`, `execution.*` and `error.message`;
  - `scripts/verify-production-api.ps1` reads `success`, `content`, `requestId`, `execution.*`, `error.*`;
  - the README curl example;
  - existing tests.
- **All legacy response fields are kept at the top level, unchanged.** The OpenAI fields are additive. New fields (`routing.explicitModel`, `execution.finishReason`) are additive too.
- **All legacy request fields still work** (`maxTokens`, `policy`, `taskTypeHint`, `requestId`).
- **Proof:** the full pre-existing suite passes **unchanged** (no existing test was edited), including the Playground-shape assertions in `chat-completions.test.ts` and the auth suites.
- **Intentional behavior changes:**
  1. Previously ignored unknown or unsupported parameters now return 400. The Playground sends only `messages`, so it is unaffected.
  2. Provider `CONTEXT_LENGTH` returns 400 instead of 502.
  3. The model-not-found path is new (404).
- **Deprecation (future, not now):** the top-level `content`/`routing`/`execution` could later move under an `attentra` key once the Playground reads `choices`.

---

## 5. Automated Test Results

All commands below were executed in this session.

| Command | Result |
|---|---|
| `npx tsc --noEmit -p .` | ✔ 0 errors |
| `npx vitest run src/__tests__/routing/explicit-model.test.ts` | ✔ 11 passed |
| `npx vitest run src/__tests__/execution/sampling-finish-reason.test.ts` | ✔ 7 passed |
| `ATTENTRA_OPENAI_SDK_PYTHON=<venv python> npx vitest run src/__tests__/api/chat-completions-openai-compat.test.ts` | ✔ **51 passed** (incl. official SDK test, 2.3 s) |
| Same file without `ATTENTRA_OPENAI_SDK_PYTHON` | ✔ 50 passed, 1 skipped (SDK test skips cleanly) |
| Full safe suite (`npx vitest run --exclude …routing-integration… --exclude …execution-plan-integration…`, with SDK env) | ✔ **48 files, 1,013 passed, 4 skipped, 0 failed** (baseline before this change: 45 files, 944 passed) |
| `npx prisma validate` | ✔ valid |
| `npx next build` | ✔ compiled successfully |
| Lint | Not configured (`next lint` prompts for setup); not run |

**Not run:**
- The two DB-writing integration suites, which target the shared Neon DB.
- Live-provider tests (paid, opt-in; the 4 skips).
- Any production request.

**Official OpenAI Python SDK test (controlled local environment).** It used `openai` **3.46.0**, installed into an isolated virtualenv in the session scratchpad, not the repo or system Python. The test starts a local HTTP server around the **real route handler** with the real API-key chain; routing, provider execution and cost persistence are mocked. Then `client.chat.completions.create(...)` was verified to:
- return a `ChatCompletion` with `object="chat.completion"`, `model`, `choices[0].message.content/role`, `finish_reason="stop"`, `usage` 9/6/15 and an integer `created`. The Attentra `routing` data is still available via `model_extra`;
- pass an explicit `model="gpt-4o-mini"` with `max_tokens` and `temperature` and get `model="gpt-4o-mini"` back;
- raise `AuthenticationError` (401, `type=authentication_error`) for a bad key;
- raise `BadRequestError` (400, `param=stream`) for `stream=True`;
- raise `NotFoundError` (404, `code=MODEL_NOT_FOUND`) for an unknown model.

**Coverage by requirement:**

| Requirement | Test |
|---|---|
| Valid personal key | compat §5, auth suite |
| Valid business key | compat §5 |
| Invalid / revoked / expired keys | compat §5 |
| `model: "auto"` | compat §3 (auto, AUTO, absent) |
| Explicit model selection | compat §3, explicit-model suite |
| `choices[0].message.content`, model id, usage | compat §1, SDK test |
| Invalid parameters | compat §4 (12 rejection cases + image/tool) |
| Provider errors | compat §6 (429/504/502/502/400) |
| History & cost attribution | compat §5 (ownership update, executed-model cost, SUCCESS + response persisted) |
| Legacy consumers | compat §2 + unchanged pre-existing suite |
| No browser session | all compat tests (`auth()` → null) |

---

## 6. Remaining Limitations

1. **Not verified against real providers or production.** All tests mock provider execution. A live run is required (§8).
2. **Default output cap (pre-existing behavior, unchanged).** When the client sends no `max_tokens`, the provider receives the routing estimate `DEFAULT_OUTPUT_TOKENS = 256` (`routing/token-estimator.ts`). Longer answers stop with `finish_reason: "length"`, which is now visible to clients. Clients should send `max_tokens`. Raising the default is a product and spend decision.
3. **Streaming** is not implemented (`stream=true` → clear 400).
4. **Tools/function calling, `stop`, `seed`, JSON mode, logprobs, `n>1`, images/audio** are not supported (clear 400).
5. **Usage zeros:** provider adapters convert a *missing* provider usage block into `0` (`?? 0`) before it reaches the route. The route never invents usage, but cannot distinguish "0" from "not reported" for those adapters.
6. **Unrecognized provider finish reasons** map to `"stop"`. The raw value is in `execution.finishReason`.
7. **Explicit models never fall back** to other models (by design), so a failing explicit model returns the provider error.
8. **`error.code`** keeps Attentra's uppercase codes (`INVALID_REQUEST`, `MODEL_NOT_FOUND`, …) rather than OpenAI's lowercase codes. The SDK exposes them as `e.code`.
9. **No `GET /v1/models`.** Clients must take model identifiers from the dashboard or registry.
10. **Strict unknown-parameter rejection** may reject vendor extensions some clients send via `extra_body` (the same behavior as OpenAI).
11. Still open from the MVP audit: no rate limiting/spend cap; OpenAI `-pro` models that may require the Responses API; Vercel DDoS challenge for scripted clients.

---

## 7. Deployment Instructions

1. Review the diff, then commit (not done automatically):
   ```powershell
   git add src/app/api/v1/chat/completions src/lib/routing src/lib/execution `
     src/lib/providers/openai.ts src/lib/providers/anthropic.ts `
     src/__tests__/api/chat-completions-openai-compat.test.ts `
     src/__tests__/execution/sampling-finish-reason.test.ts `
     src/__tests__/routing/explicit-model.test.ts `
     docs/OPENAI_API_COMPATIBILITY_IMPLEMENTATION_REPORT.md
   git commit -m "feat(api): OpenAI-compatible non-streaming chat completions"
   git push
   ```
   The audit docs (`docs/MVP_READINESS_AUDIT_2026-11-08.md`, `docs/ZERO_COST_API_HOSTING_AUDIT.md`) and the edited `docs/PRODUCTION_AUTHENTICATION_RESOLUTION_REPORT.md` are separate. Commit them if wanted.
2. Vercel deploys `main` to `attentra-nine.vercel.app`. Record the previous production deployment for **Instant Rollback**.
3. There are no environment variable, schema, migration or firewall changes.
4. Rollback: Vercel Instant Rollback to the previous deployment. Data is unaffected.

---

## 8. Production Verification Instructions

These run paid provider calls of roughly USD 0.0001 each, from your machine, with low volume because of the Vercel firewall.

Save as `check.py`:
```python
import os
from openai import OpenAI

client = OpenAI(base_url="https://attentra-nine.vercel.app/api/v1",
                api_key=os.environ["ATTENTRA_API_KEY"].strip(), max_retries=1)

r = client.chat.completions.create(model="auto", max_tokens=200,
        messages=[{"role": "user", "content": "Hello, are you working?"}])
print(r.id, r.model, r.choices[0].finish_reason, r.usage)
print(r.choices[0].message.content)
```
Run (PowerShell):
```powershell
python -m pip install openai          # once, in the environment you use
$env:ATTENTRA_API_KEY = Read-Host "Enter your Attentra API key"
python check.py
```

**Pass criteria:**
1. No exception; `r.choices[0].message.content` is non-empty.
2. `r.model` names a real registry model; `r.usage.total_tokens > 0`.
3. Dashboard → History shows request `r.id` with provider, model, tokens and cost.
4. The key's **Last used** updates.
5. Optional explicit check: `model="<an active identifier shown in History>"` returns that same `r.model`.
6. The Playground still renders a response, routing and execution (legacy fields).

**If it fails:**
- **403 HTML**: Vercel challenge (see `docs/ZERO_COST_API_HOSTING_AUDIT.md`).
- **401**: Vercel Logs "Authentication rejected" line for the `requestId`.
- **400 with `param`**: unsupported parameter.

---

## 9. Go / No-Go Recommendation

**GO to deploy.** The changes are additive and isolated to the chat completions path and execution parameter threading. They are fully covered by 69 new tests and the unchanged pre-existing suite (1,013 passing). The official OpenAI Python SDK parses success and error responses end to end over HTTP, and the build passes.

**Mark the feature "verified" only after** the §8 production check passes once with the OpenAI SDK, and the Playground is confirmed unchanged. Until then the status is **implemented and locally verified; production unverified**.

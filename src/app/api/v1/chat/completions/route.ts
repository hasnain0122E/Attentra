/**
 * Attentra — Consumer Chat Completions API
 *
 * Phase 7 / Step 5 — Consumer Execution API
 *
 * POST /api/v1/chat/completions
 *
 * Minimal consumer-facing endpoint that exposes the existing
 * Attentra routing + execution pipeline:
 *
 *   Request
 *     → validation
 *     → authentication
 *     → routeAndPersist()            (Phase 6 routing + persistence)
 *     → VERIFY core persistence      (Phase 12.14.1 reliability gate)
 *     → attach authenticated user ownership
 *     → VERIFY ownership persistence  (Phase 12.14.1 reliability gate)
 *     → prepareExecutionFlow()       (Phase 6→7 boundary)
 *     → ExecutionOrchestrator        (Phase 7 Step 4)
 *     → Dispatcher → ProviderAdapter (Phase 7 Step 2–3)
 *     → persist request cost intelligence
 *     → normalized response
 *
 * Phase 12.14.1 — Core Persistence Reliability Gate:
 *   Provider execution MUST NOT begin unless core persistence
 *   (Request + RoutingDecision + ownership) has succeeded.
 *   If core persistence fails, the route returns a normalized
 *   error WITHOUT calling any provider.
 *
 * This route is an orchestration boundary ONLY. It does not:
 * - Choose models or score candidates
 * - Recalculate projected or actual cost
 * - Implement fallback logic (owned by ExecutionOrchestrator)
 * - Call any provider SDK or API directly
 * - Expose credentials or internal details
 */

import { NextRequest, NextResponse } from "next/server";

import { resolveRequester } from "@/lib/auth/resolve-requester";
import { persistRequestCostIntelligence } from "@/lib/cost-intelligence";
import {
  ExecutionOrchestrator,
  sanitizeErrorMessage,
  type OrchestratorResult,
} from "@/lib/execution";
import { prisma } from "@/lib/prisma";
import { buildConciseRoutingReason } from "@/lib/routing/explanations";
import { prepareExecutionFlow, routeAndPersist } from "@/lib/routing";
import type {
  ExecutionPlan,
  ExecutionResult,
} from "@/lib/routing/execution-plan";

import type { RoutingDecision as RoutingDecisionType } from "@/lib/routing/types";

import { validateChatRequest } from "./validation";

// Force dynamic rendering — this endpoint must never be statically generated.
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

/**
 * Identity of the database this deployment reads API keys from
 * ("<host>/<database>"), plus the deployment environment.
 *
 * Logged on authentication failures so a key that is valid in one
 * database but rejected here can be traced to an environment mismatch.
 * Never includes credentials or the full connection string.
 */
const DATABASE_IDENTITY = (() => {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.hostname || "unset"}${url.pathname || ""}`;
  } catch {
    return "unparseable";
  }
})();

const DEPLOYMENT_ENV =
  process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";

/**
 * Structured authentication-failure log line.
 *
 * Callers pass only safe fields: never the Authorization header,
 * the raw key, its hash, or provider credentials.
 */
function logAuthFailure(fields: {
  requestId: string;
  reason: string;
  keyPrefix?: string;
  tokenLength?: number;
  errorCode?: string;
}) {
  console.warn(
    "[chat-completions] Authentication rejected.",
    "requestId:", fields.requestId,
    "reason:", fields.reason,
    "keyPrefix:", fields.keyPrefix ?? "n/a",
    "tokenLength:", fields.tokenLength ?? "n/a",
    ...(fields.errorCode ? ["errorCode:", fields.errorCode] : []),
    "env:", DEPLOYMENT_ENV,
    "dbHost:", DATABASE_IDENTITY,
  );
}

/** Generate a unique request ID. */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Map an execution or routing error code to an HTTP status code.
 */
function errorToHttpStatus(code: string): number {
  switch (code) {
    // AUTHENTICATION / MISSING_API_KEY here come from the upstream
    // provider (Attentra's server-side provider credentials), not from
    // the caller's Attentra key — they fall through to 502 so clients
    // do not mistake a provider misconfiguration for their own 401.

    case "RATE_LIMIT":
      return 429;

    case "TIMEOUT":
    case "REQUEST_TIMEOUT":
      return 504;

    case "INVALID_REQUEST":
    case "INVALID_RESPONSE":
    case "CONTEXT_LENGTH":
    case "AMBIGUOUS_MODEL":
      return 400;

    case "MODEL_NOT_FOUND":
      return 404;

    case "NO_ACTIVE_MODELS":
    case "NO_COMPATIBLE_MODELS":
    case "ALL_EXCEED_CONTEXT":
    case "NO_PRICING_AVAILABLE":
    case "INVALID_POLICY":
      return 400;

    case "DATABASE_ERROR":
    case "PERSISTENCE_FAILED":
    case "OWNERSHIP_FAILED":
      return 500;

    default:
      return 502;
  }
}

/**
 * Map a provider-native finish reason to the OpenAI vocabulary.
 *
 * OpenAI: stop/length/content_filter/tool_calls (passed through).
 * Anthropic: end_turn/stop_sequence → stop, max_tokens → length,
 *   refusal → content_filter, tool_use → tool_calls.
 * Google: STOP → stop, MAX_TOKENS → length,
 *   SAFETY/RECITATION/BLOCKLIST/PROHIBITED_CONTENT/SPII → content_filter.
 * Missing or unrecognised reasons map to "stop".
 */
function toOpenAIFinishReason(
  raw: string | undefined,
): "stop" | "length" | "content_filter" | "tool_calls" {
  switch ((raw ?? "").toLowerCase()) {
    case "length":
    case "max_tokens":
      return "length";

    case "content_filter":
    case "refusal":
    case "safety":
    case "recitation":
    case "blocklist":
    case "prohibited_content":
    case "spii":
    case "image_safety":
      return "content_filter";

    case "tool_calls":
    case "tool_use":
    case "function_call":
      return "tool_calls";

    default:
      return "stop";
  }
}

/** OpenAI error `type` for an HTTP status. */
function openAIErrorType(status: number): string {
  if (status === 401) return "authentication_error";
  if (status === 403) return "permission_error";
  if (status === 429) return "rate_limit_error";
  if (status >= 500) return "server_error";
  return "invalid_request_error";
}

/**
 * Build a normalized success response.
 *
 * The body is an OpenAI-compatible chat completion (id, object, created,
 * model, choices, usage) with Attentra's original fields kept alongside
 * for existing consumers (Playground, scripts): success, requestId,
 * content, routing, execution, timestamp.
 *
 * Includes routing transparency fields sourced directly
 * from the ExecutionPlan.
 *
 * Routing metadata represents the originally selected model.
 * Execution metadata represents the model that actually executed,
 * which may differ when fallback is used.
 */
function buildSuccessResponse(
  requestId: string,
  result: OrchestratorResult,
  plan: ExecutionPlan,
  routingDecision?: RoutingDecisionType,
  explicitModel = false,
) {
  const successfulAttempt = result.executionAttempts.find(
    (attempt) => attempt.success,
  );

  const executedModelIdentifier =
    successfulAttempt?.modelIdentifier ?? plan.primary.modelIdentifier;
  const createdMs = Date.parse(result.timestamp ?? "");
  const content = result.content ?? "";

  // ── Map routing candidates for playground / history ──
  const candidates = (routingDecision?.candidates ?? []).map(
    (score, index) => ({
      rank: index + 1,
      modelIdentifier: score.candidate.modelIdentifier,
      displayName: score.candidate.displayName,
      provider: score.candidate.providerName ?? score.candidate.providerId,
      score: score.score,
      projectedCost: score.factors.projectedCost,
      selected: score.candidate.modelId === routingDecision?.selected.candidate.modelId,
    }),
  );

  return {
    // ── OpenAI chat.completion envelope ──────────────
    id: requestId,
    object: "chat.completion" as const,
    created: Math.floor(
      (Number.isNaN(createdMs) ? Date.now() : createdMs) / 1000,
    ),
    model: executedModelIdentifier,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant" as const,
          content,
          refusal: null,
        },
        logprobs: null,
        finish_reason: toOpenAIFinishReason(result.finishReason),
      },
    ],
    // Provider-reported counts only; omitted when the provider gave none.
    ...(result.usage && {
      usage: {
        prompt_tokens: result.usage.inputTokens,
        completion_tokens: result.usage.outputTokens,
        total_tokens: result.usage.totalTokens,
      },
    }),
    system_fingerprint: null,

    // ── Attentra fields (kept for existing consumers) ─
    success: true as const,
    requestId,

    content,

    routing: {
      selectedModelId: plan.primary.modelId,
      selectedModelIdentifier: plan.primary.modelIdentifier,
      selectedModelDisplayName: plan.primary.displayName,
      selectedProvider: plan.primary.providerId,
      explicitModel,

      // Concise, stable explanation (shared semantics with consumer/business UI).
      // The full verbose explanation remains persisted internally on the RoutingDecision.
      reason: explicitModel
        ? `${plan.primary.displayName} was explicitly requested by the client.`
        : buildConciseRoutingReason({
            modelDisplayName: plan.primary.displayName,
            complexity: plan.complexity,
            taskType: plan.taskType,
          }),
      taskType: plan.taskType,
      complexity: plan.complexity,
      projectedCost: plan.projectedCost,

      candidates,
    },

    execution: {
      modelId: result.modelId ?? "",
      modelIdentifier: successfulAttempt?.modelIdentifier ?? "",
      provider: result.providerId ?? "",
      finishReason: result.finishReason ?? null,

      fallbackUsed: result.fallback?.used === true,
      attempts: result.attempts,

      usage: result.usage,
      latencyMs: result.latencyMs,
      actualCost: result.actualCost,

      executionAttempts: result.executionAttempts.map((a) => ({
        attempt: a.attemptNumber,
        modelId: a.modelId,
        modelIdentifier: a.modelIdentifier,
        provider: a.providerId,
        success: a.success,
        latencyMs: a.latencyMs,
        retryable: a.error?.retryable,
        errorCode: a.error?.code,
        errorMessage: a.error?.message,
      })),
    },

    timestamp: result.timestamp,
  };
}

/** Build a normalized error response. */
function buildErrorResponse(
  requestId: string,
  error: {
    code: string;
    message: string;
    retryable: boolean;
  },
  fallback?: ExecutionResult["fallback"],
) {
  const response: Record<string, unknown> = {
    success: false,
    requestId,

    error: {
      code: error.code,
      message: sanitizeErrorMessage(error.message),
      retryable: error.retryable,
    },
  };

  if (fallback) {
    response.fallback = fallback;
  }

  return response;
}

// ─────────────────────────────────────────────────────
// POST HANDLER
// ─────────────────────────────────────────────────────

/**
 * POST /api/v1/chat/completions
 *
 * Adds the OpenAI error fields (`error.type`, `error.param`) to every
 * error response produced by the handler, so OpenAI SDK clients receive
 * the error shape they expect. Attentra's `success`, `requestId`,
 * `error.code` and `error.message` are unchanged. Headers are preserved.
 */
export async function POST(request: NextRequest) {
  const response = await handleChatCompletion(request);

  if (response.status < 400) {
    return response;
  }

  const body = (await response.json()) as {
    error?: Record<string, unknown>;
  } & Record<string, unknown>;

  // The body is re-serialized; never forward a stale length.
  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return NextResponse.json(
    {
      ...body,
      error: {
        ...body.error,
        type: openAIErrorType(response.status),
        param: body.error?.param ?? null,
      },
    },
    { status: response.status, headers },
  );
}

async function handleChatCompletion(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // ── 1. Authentication ──────────────────────────────
    //
    // Unified resolver: Auth.js session first, then Bearer API key.
    //
    // A failure to *check* credentials (database or session backend
    // unavailable) is a 503, never a 401 — the key may be valid.
    let requester: Awaited<ReturnType<typeof resolveRequester>>;

    try {
      requester = await resolveRequester(request.headers);
    } catch (authError) {
      const isDatabaseError =
        authError instanceof Error &&
        authError.name.startsWith("PrismaClient");
      const errorCode =
        (authError as { code?: unknown })?.code ??
        (authError instanceof Error ? authError.name : "unknown");

      logAuthFailure({
        requestId,
        reason: isDatabaseError ? "DATABASE_ERROR" : "AUTH_BACKEND_ERROR",
        errorCode: String(errorCode),
      });

      return NextResponse.json(
        buildErrorResponse(requestId, {
          code: "SERVICE_UNAVAILABLE",
          message: "Authentication is temporarily unavailable. Please retry.",
          retryable: true,
        }),
        { status: 503 },
      );
    }

    if (requester.authType === "none") {
      // Log the specific reason server-side (never the full key) so
      // rejected keys can be diagnosed from runtime logs by requestId.
      logAuthFailure({
        requestId,
        reason: requester.reason ?? "unknown",
        keyPrefix: requester.keyPrefix,
        tokenLength: requester.tokenLength,
      });

      // Same code for every reason; the message only separates
      // "no credentials" from "credentials rejected".
      const hasCredentials =
        requester.reason !== undefined &&
        requester.reason !== "NO_CREDENTIALS";

      return NextResponse.json(
        {
          success: false,
          requestId,

          error: {
            code: "AUTHENTICATION",
            message: hasCredentials
              ? "Invalid API key. Send a valid, active key as 'Authorization: Bearer atr_...'"
              : "Authentication required",
          },
        },
        {
          status: 401,
          headers: { "WWW-Authenticate": "Bearer" },
        },
      );
    }

    // ── 2. Content-type guard ─────────────────────────
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          requestId,

          error: {
            code: "INVALID_REQUEST",
            message: "Content-Type must be application/json",
          },
        },
        { status: 400 },
      );
    }

    // ── 3. Parse body ─────────────────────────────────
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          requestId,

          error: {
            code: "INVALID_REQUEST",
            message: "Invalid JSON body",
          },
        },
        { status: 400 },
      );
    }

    // ── 4. Validate ───────────────────────────────────
    const validation = validateChatRequest(body);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          requestId,

          error: {
            code: "INVALID_REQUEST",
            message: validation.errors.join("; "),
            param: validation.param ?? null,
          },
        },
        { status: 400 },
      );
    }

    const {
      messages,
      maxTokens,
      temperature,
      model,
      taskTypeHint,
      policy,
      requestId: clientRequestId,
    } = validation.data;

    // ── 5. Resolve request ID ─────────────────────────
    const effectiveRequestId = clientRequestId || requestId;

    // ── 6. Route through existing pipeline ────────────
    const routingResult = await routeAndPersist(
      {
        messages,
        maxTokens,

        taskTypeHint: taskTypeHint as
          | "GENERAL"
          | "CODING"
          | "REASONING"
          | "WRITING"
          | "SUMMARIZATION"
          | "TRANSLATION"
          | "ANALYSIS"
          | "EXTRACTION"
          | undefined,

        metadata: {
          requestId: effectiveRequestId,
        },
      },

      policy || model
        ? {
            ...(policy && { policy }),
            // Explicit model: restricted to that registry model, no
            // cross-model fallback. Absent / "auto": automatic routing.
            ...(model && { model }),
          }
        : undefined,
    );

    if (!routingResult.success || !routingResult.decision) {
      const errorCode = (
        routingResult.errorCode ?? "NO_COMPATIBLE_MODELS"
      ) as string;

      const status = errorToHttpStatus(errorCode);

      return NextResponse.json(
        buildErrorResponse(effectiveRequestId, {
          code: errorCode,
          message: routingResult.error ?? "Routing failed",
          retryable: false,
        }),
        { status },
      );
    }

    // ── 6a. Core persistence gate ────────────────────
    //
    // Phase 12.14.1 — Reliability gate.
    //
    // Routing succeeded but Request + RoutingDecision persistence
    // did NOT. A provider MUST NOT be called when Attentra cannot
    // establish the authoritative Request record.
    //
    // This prevents:
    // - Untracked/unauditable provider executions
    // - Provider credit consumption without any DB record
    // - Orphaned cost data with no Request to attach to
    if (routingResult.persisted?.success !== true) {
      // Surface the persistence failure internally.
      console.error(
        "[chat-completions] Core persistence failed after successful routing.",
        "requestId:", effectiveRequestId,
        "persistenceError:", routingResult.persistenceError ?? "unknown",
      );

      return NextResponse.json(
        buildErrorResponse(effectiveRequestId, {
          code: "PERSISTENCE_FAILED",
          message: "Attentra could not persist the request. Please retry.",
          retryable: true,
        }),
        { status: 500 },
      );
    }

    // ── 7. Attach request ownership ─────────────────
    //
    // Session requests: owned by the authenticated user.
    // Business API-key requests: owned by the business workspace.
    // Personal API-key requests: owned by the individual user.
    //
    // Phase 12.14.1 — Ownership is core data. If ownership
    // attachment fails, the provider MUST NOT be called.
    // An unowned/misattributed Request is a data integrity
    // violation.
    const ownershipData: Record<string, string | null> = {};

    if (requester.authType === "session") {
      ownershipData.userId = requester.userId;
    } else if (requester.authType === "apiKey") {
      ownershipData.businessId = requester.businessId;
      ownershipData.apiKeyId = requester.apiKeyId;
      ownershipData.userId = null;
    } else if (requester.authType === "personalApiKey") {
      ownershipData.userId = requester.userId;
      ownershipData.businessId = null;
      ownershipData.apiKeyId = requester.apiKeyId;
    }

    try {
      await prisma.request.update({
        where: {
          id: effectiveRequestId,
        },

        data: ownershipData,
      });
    } catch (ownershipError) {
      console.error(
        "[chat-completions] Ownership attachment failed after core persistence.",
        "requestId:", effectiveRequestId,
        "authType:", requester.authType,
        "error:", ownershipError instanceof Error ? ownershipError.message : "unknown",
      );

      return NextResponse.json(
        buildErrorResponse(effectiveRequestId, {
          code: "OWNERSHIP_FAILED",
          message: "Attentra could not establish request ownership. Please retry.",
          retryable: true,
        }),
        { status: 500 },
      );
    }

    // ── 8. Build execution plan ───────────────────────
    const executionFlow = prepareExecutionFlow(
      routingResult,
      effectiveRequestId,
      routingResult.persisted?.decisionId,
    );

    if (
      !executionFlow.plan ||
      executionFlow.status !== "NOT_EXECUTED"
    ) {
      return NextResponse.json(
        buildErrorResponse(effectiveRequestId, {
          code: "ROUTING_FAILED",

          message:
            executionFlow.error ??
            "Failed to prepare execution plan",

          retryable: false,
        }),
        { status: 502 },
      );
    }

    // ── 9. Execute via existing orchestrator ──────────
    const orchestrator = new ExecutionOrchestrator();

    const result = await orchestrator.execute(
      executionFlow.plan,
      messages,

      // Prisma client lets the orchestrator's existing
      // computeActualCost() derive actual cost from real usage
      // × the executed model's pricing.
      {
        prisma,
        ...(temperature !== undefined && { temperature }),
      },
    );

    // ── 10. Successful execution ──────────────────────
    if (result.success) {
      // ── 10a. Persist cost intelligence ─────────────
      //
      // Phase 12.14.1 — Post-execution persistence is SECONDARY.
      // The provider has already executed, so we must NOT return
      // a retryable error that could cause duplicate execution.
      // However, failures must no longer be completely invisible.
      if (result.usage && result.modelId) {
        try {
          const costResult = await persistRequestCostIntelligence(prisma, {
            requestId: effectiveRequestId,
            executedModelId: result.modelId,

            usage: {
              inputTokens: result.usage.inputTokens,
              outputTokens: result.usage.outputTokens,
            },

            actualCost: result.actualCost,
          });

          if (!costResult.persisted) {
            console.error(
              "[chat-completions] Post-execution cost persistence not persisted.",
              "requestId:", effectiveRequestId,
              "reason:", costResult.reason ?? "unknown",
            );
          }
        } catch (costError) {
          console.error(
            "[chat-completions] Post-execution cost persistence threw.",
            "requestId:", effectiveRequestId,
            "error:", costError instanceof Error ? costError.message : "unknown",
          );
        }
      }

      // ── 10b. Persist prompt + response ────────────
      const promptText = messages
        .filter((m: { role: string }) => m.role === "user")
        .map((m: { content: string }) => m.content)
        .join("\n");

      try {
        await prisma.request.update({
          where: { id: effectiveRequestId },
          data: {
            prompt: promptText || null,
            response: result.content ?? null,
            status: "SUCCESS",
            latencyMs: result.latencyMs ?? null,
          },
        });
      } catch (promptError) {
        // Post-execution: provider already consumed credits.
        // Log for observability but do NOT return a retryable error.
        console.error(
          "[chat-completions] Post-execution prompt/response persistence failed.",
          "requestId:", effectiveRequestId,
          "error:", promptError instanceof Error ? promptError.message : "unknown",
        );
      }

      return NextResponse.json(
        buildSuccessResponse(
          effectiveRequestId,
          result,
          executionFlow.plan,
          routingResult.decision,
          model !== undefined,
        ),
      );
    }

    // ── 11. Execution failure ─────────────────────────
    //
    // Phase 12.14.1 — Because core persistence always succeeds
    // before execution, the Request row always exists at this
    // point. Update its status to reflect the failure so that
    // history/auditability is preserved.
    try {
      await prisma.request.update({
        where: { id: effectiveRequestId },
        data: {
          status: "FAILED",
          latencyMs: result.latencyMs ?? null,
        },
      });
    } catch (statusError) {
      console.error(
        "[chat-completions] Failed to persist FAILED status after execution failure.",
        "requestId:", effectiveRequestId,
        "error:", statusError instanceof Error ? statusError.message : "unknown",
      );
    }

    const errorStatus = errorToHttpStatus(
      result.error?.code ?? "UNKNOWN",
    );

    return NextResponse.json(
      buildErrorResponse(
        effectiveRequestId,

        {
          code: result.error?.code ?? "UNKNOWN",

          message:
            result.error?.message ?? "Execution failed",

          retryable:
            result.error?.retryable ?? false,
        },

        result.fallback,
      ),

      {
        status: errorStatus,
      },
    );
  } catch (error) {
    // ── 12. Unexpected failure — never expose internals
    const rawMessage =
      error instanceof Error
        ? error.message
        : "Internal server error";

    return NextResponse.json(
      {
        success: false,
        requestId,

        error: {
          code: "INTERNAL_ERROR",
          message: sanitizeErrorMessage(rawMessage),
        },
      },

      {
        status: 500,
      },
    );
  }
}
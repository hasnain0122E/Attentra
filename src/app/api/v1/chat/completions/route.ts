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
 *     → routeAndPersist()           (Phase 6 routing + persistence)
 *     → prepareExecutionFlow()      (Phase 6→7 boundary)
 *     → ExecutionOrchestrator       (Phase 7 Step 4)
 *     → Dispatcher → ProviderAdapter (Phase 7 Step 2–3)
 *     → normalized response
 *
 * This route is an orchestration boundary ONLY. It does not:
 * - Choose models or score candidates
 * - Recalculate projected or actual cost
 * - Implement fallback logic (owned by ExecutionOrchestrator)
 * - Call any provider SDK or API directly
 * - Expose credentials or internal details
 */

import { NextRequest, NextResponse } from "next/server";
import { routeAndPersist, prepareExecutionFlow } from "@/lib/routing";
import type { RoutingErrorCode } from "@/lib/routing";
import {
  ExecutionOrchestrator,
  sanitizeErrorMessage,
  type OrchestratorResult,
} from "@/lib/execution";
import type { ExecutionPlan, ExecutionResult } from "@/lib/routing/execution-plan";
import { prisma } from "@/lib/prisma";
import { validateChatRequest } from "./validation";

// Force dynamic rendering — this endpoint must never be statically generated
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

/** Generate a unique request ID. */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Map an execution or routing error code to an HTTP status code.
 */
function errorToHttpStatus(code: string): number {
  switch (code) {
    case "AUTHENTICATION":
    case "MISSING_API_KEY":
      return 401;
    case "RATE_LIMIT":
      return 429;
    case "TIMEOUT":
    case "REQUEST_TIMEOUT":
      return 504;
    case "INVALID_REQUEST":
    case "INVALID_RESPONSE":
      return 400;
    case "NO_ACTIVE_MODELS":
    case "NO_COMPATIBLE_MODELS":
    case "ALL_EXCEED_CONTEXT":
    case "NO_PRICING_AVAILABLE":
    case "INVALID_POLICY":
      return 400;
    case "DATABASE_ERROR":
      return 500;
    default:
      return 502;
  }
}

/**
 * Build a normalized success response.
 *
 * Includes routing transparency fields (selected model, logical provider,
 * routing reason, task type, complexity, projected cost) sourced directly
 * from the ExecutionPlan — the route never recomputes any of them.
 */
function buildSuccessResponse(
  requestId: string,
  result: OrchestratorResult,
  plan: ExecutionPlan
) {
  const successfulAttempt =
    result.executionAttempts.find((attempt) => attempt.success);

  return {
    success: true as const,
    requestId,

    content: result.content ?? "",

    routing: {
      selectedModelId: plan.primary.modelId,
      selectedModelIdentifier: plan.primary.modelIdentifier,
      selectedModelDisplayName: plan.primary.displayName,
      selectedProvider: plan.primary.providerId,

      reason: plan.routingExplanation,
      taskType: plan.taskType,
      complexity: plan.complexity,
      projectedCost: plan.projectedCost,
    },

    execution: {
      modelId: result.modelId ?? "",
      modelIdentifier: successfulAttempt?.modelIdentifier ?? "",
      provider: result.providerId ?? "",

      fallbackUsed: result.fallback?.used === true,
      attempts: result.attempts,

      usage: result.usage,
      latencyMs: result.latencyMs,
      actualCost: result.actualCost,
    },

    timestamp: result.timestamp,
  };
}

/** Build a normalized error response. */
function buildErrorResponse(
  requestId: string,
  error: { code: string; message: string; retryable: boolean },
  fallback?: ExecutionResult["fallback"]
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

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // ── 1. Content-type guard ──────────────────────────
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
        { status: 400 }
      );
    }

    // ── 2. Parse body ──────────────────────────────────
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
        { status: 400 }
      );
    }

    // ── 3. Validate ────────────────────────────────────
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: {
            code: "INVALID_REQUEST",
            message: validation.errors.join("; "),
          },
        },
        { status: 400 }
      );
    }

    const { messages, maxTokens, taskTypeHint, policy, requestId: clientRequestId } =
      validation.data;

    // ── 4. Request ID ──────────────────────────────────
    const effectiveRequestId = clientRequestId || requestId;

    // ── 5. Route through existing pipeline ─────────────
    const routingResult = await routeAndPersist(
      {
        messages,
        maxTokens,
        taskTypeHint: taskTypeHint as
          | "GENERAL" | "CODING" | "REASONING" | "WRITING"
          | "SUMMARIZATION" | "TRANSLATION" | "ANALYSIS" | "EXTRACTION"
          | undefined,
        metadata: { requestId: effectiveRequestId },
      },
      policy ? { policy } : undefined
    );

    if (!routingResult.success || !routingResult.decision) {
      const errorCode = (routingResult.errorCode ??
        "NO_COMPATIBLE_MODELS") as string;
      const status = errorToHttpStatus(errorCode);
      return NextResponse.json(
        buildErrorResponse(effectiveRequestId, {
          code: errorCode,
          message: routingResult.error ?? "Routing failed",
          retryable: false,
        }),
        { status }
      );
    }

    // ── 6. Build execution plan ────────────────────────
    const executionFlow = prepareExecutionFlow(
      routingResult,
      effectiveRequestId,
      routingResult.persisted?.decisionId
    );

    if (!executionFlow.plan || executionFlow.status !== "NOT_EXECUTED") {
      return NextResponse.json(
        buildErrorResponse(effectiveRequestId, {
          code: "ROUTING_FAILED",
          message:
            executionFlow.error ??
            "Failed to prepare execution plan",
          retryable: false,
        }),
        { status: 502 }
      );
    }

    // ── 7. Execute via existing orchestrator ───────────
    const orchestrator = new ExecutionOrchestrator();
    const result = await orchestrator.execute(
      executionFlow.plan,
      messages,
      // Prisma client lets the orchestrator's existing computeActualCost()
      // derive actual cost from real usage × the model's active pricing.
      { prisma }
    );

    // ── 8. Return normalized response ──────────────────
    if (result.success) {
      return NextResponse.json(
        buildSuccessResponse(effectiveRequestId, result, executionFlow.plan)
      );
    }

    const errorStatus = errorToHttpStatus(result.error?.code ?? "UNKNOWN");
    return NextResponse.json(
      buildErrorResponse(
        effectiveRequestId,
        {
          code: result.error?.code ?? "UNKNOWN",
          message: result.error?.message ?? "Execution failed",
          retryable: result.error?.retryable ?? false,
        },
        result.fallback
      ),
      { status: errorStatus }
    );
  } catch (error) {
    // ── 9. Unexpected failure — never expose internals ──
    const rawMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        success: false,
        requestId,
        error: {
          code: "INTERNAL_ERROR",
          message: sanitizeErrorMessage(rawMessage),
        },
      },
      { status: 500 }
    );
  }
}

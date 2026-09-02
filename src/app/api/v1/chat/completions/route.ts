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
 *     → attach authenticated user ownership
 *     → prepareExecutionFlow()       (Phase 6→7 boundary)
 *     → ExecutionOrchestrator        (Phase 7 Step 4)
 *     → Dispatcher → ProviderAdapter (Phase 7 Step 2–3)
 *     → persist request cost intelligence
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

import { resolveRequester } from "@/lib/auth/resolve-requester";
import { persistRequestCostIntelligence } from "@/lib/cost-intelligence";
import {
  ExecutionOrchestrator,
  sanitizeErrorMessage,
  type OrchestratorResult,
} from "@/lib/execution";
import { prisma } from "@/lib/prisma";
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
) {
  const successfulAttempt = result.executionAttempts.find(
    (attempt) => attempt.success,
  );

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

      candidates,
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

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // ── 1. Authentication ──────────────────────────────
    //
    // Unified resolver: Auth.js session first, then Bearer API key.
    const requester = await resolveRequester(request.headers);

    if (requester.authType === "none") {
      return NextResponse.json(
        {
          success: false,
          requestId,

          error: {
            code: "AUTHENTICATION",
            message: "Authentication required",
          },
        },
        { status: 401 },
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
          },
        },
        { status: 400 },
      );
    }

    const {
      messages,
      maxTokens,
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

      policy
        ? {
            policy,
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

    // ── 7. Attach request ownership ─────────────────
    //
    // Session requests: owned by the authenticated user.
    // API-key requests: owned by the business workspace.
    //
    // routeAndPersist() owns routing persistence and intentionally
    // does not depend on authentication. The API attaches trusted
    // ownership after routing succeeds.
    if (routingResult.persisted?.decisionId) {
      const ownershipData: Record<string, string | null> = {};

      if (requester.authType === "session") {
        ownershipData.userId = requester.userId;
      } else if (requester.authType === "apiKey") {
        ownershipData.businessId = requester.businessId;
        ownershipData.apiKeyId = requester.apiKeyId;
        ownershipData.userId = null;
      }

      await prisma.request.update({
        where: {
          id: effectiveRequestId,
        },

        data: ownershipData,
      });
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
      },
    );

    // ── 10. Successful execution ──────────────────────
    if (result.success) {
      if (result.usage && result.modelId) {
        await persistRequestCostIntelligence(prisma, {
          requestId: effectiveRequestId,
          executedModelId: result.modelId,

          usage: {
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          },

          actualCost: result.actualCost,
        });
      }

      // ── 10a. Persist prompt + response ────────────
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
      } catch {
        // Best-effort — prompt/response/latency persistence must not
        // fail the overall request.
      }

      return NextResponse.json(
        buildSuccessResponse(
          effectiveRequestId,
          result,
          executionFlow.plan,
          routingResult.decision,
        ),
      );
    }

    // ── 11. Execution failure ─────────────────────────
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
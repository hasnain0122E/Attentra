/**
 * Attentra — Consumer Request Query Helpers
 *
 * Phase 12.5 — Real Consumer History
 *
 * Shared server-side query logic for the consumer history API routes.
 * Maps Prisma Request + RoutingDecision data to the existing
 * RequestHistoryItem contract used by the history UI components.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import type {
  HistoryExecutionAttempt,
  RequestHistoryItem,
  RequestComplexity,
  RequestStatus,
} from "@/lib/dashboard/history-data";

import type { PersistedCandidateData } from "@/lib/routing/persistence";

/** Request with the relations we include in history queries. */
type RequestWithRelations = Prisma.RequestGetPayload<{
  include: {
    routingDecision: true;
    selectedModel: { include: { provider: true } };
  };
}>;

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

/**
 * Parse the candidateModels JSON from a RoutingDecision.
 *
 * Returns the scored candidates array, or an empty array if the JSON
 * is null, malformed, or has no scored entries.
 */
function parseCandidateModels(
  candidateModelsJson: unknown
): PersistedCandidateData[] {
  if (!candidateModelsJson) return [];

  try {
    const parsed =
      typeof candidateModelsJson === "string"
        ? JSON.parse(candidateModelsJson)
        : candidateModelsJson;

    if (parsed?.scored && Array.isArray(parsed.scored)) {
      return parsed.scored as PersistedCandidateData[];
    }

    return [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────

/**
 * Fetch all requests owned by a user, mapped to the history UI contract.
 *
 * Ordered by creation date (newest first).
 */
export async function fetchUserRequests(userId: string): Promise<RequestHistoryItem[]> {
  const requests = await prisma.request.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      routingDecision: true,
      selectedModel: {
        include: { provider: true },
      },
    },
  });

  return requests.map(mapRequestToHistoryItem);
}

// ─────────────────────────────────────────────────────
// DETAIL
// ─────────────────────────────────────────────────────

/**
 * Fetch a single request owned by a user.
 *
 * Returns null if the request does not exist or is not owned by the user.
 */
export async function fetchUserRequest(
  userId: string,
  requestId: string
): Promise<RequestHistoryItem | null> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, userId },
    include: {
      routingDecision: true,
      selectedModel: {
        include: { provider: true },
      },
    },
  });

  if (!request) return null;

  return mapRequestToHistoryItem(request);
}

// ─────────────────────────────────────────────────────
// MAPPING
// ─────────────────────────────────────────────────────

/**
 * Map a Prisma Request (with relations) to the history UI contract.
 *
 * Key decisions:
 *   - Routed model comes from RoutingDecision.selectedModelId
 *   - Executed model comes from Request.selectedModelId
 *   - fallbackUsed is inferred: routed model ≠ executed model
 *   - Attempts are synthesised (no per-attempt persistence yet)
 */
function mapRequestToHistoryItem(
  request: RequestWithRelations
): RequestHistoryItem {
  const rd = request.routingDecision;
  const executedModel = request.selectedModel;

  // ── Resolve routed model details ──────────────────
  // Parse candidateModels JSON to find the selected candidate.
  // This gives us displayName, modelIdentifier, providerName, projectedCost.
  const routedModelId = rd?.selectedModelId ?? null;
  const executedModelId = request.selectedModelId ?? null;

  const candidates = parseCandidateModels(rd?.candidateModels);
  const selectedCandidate = candidates.find(
    (c: PersistedCandidateData) => c.modelId === routedModelId
  );

  let routedModelName = routedModelId ?? "Unknown";
  let routedModelIdentifier = "";
  let routedProvider = "";
  let projectedCost: number | undefined;

  if (selectedCandidate) {
    routedModelName = selectedCandidate.displayName;
    routedModelIdentifier = selectedCandidate.modelIdentifier;
    routedProvider = selectedCandidate.providerName;
    projectedCost = selectedCandidate.projectedCost;
  } else if (routedModelId === executedModelId && executedModel) {
    // Selected candidate not in JSON (edge case) — fall back to executed model relation
    routedModelName = executedModel.displayName;
    routedModelIdentifier = executedModel.modelIdentifier;
    routedProvider = executedModel.provider.name;
  }

  // ── Executed model details ────────────────────────
  const executedModelName = executedModel?.displayName ?? undefined;
  const executedModelIdentifier = executedModel?.modelIdentifier ?? undefined;
  const executedProvider = executedModel?.provider.name ?? undefined;

  // ── Fallback inference ────────────────────────────
  const fallbackUsed =
    routedModelId !== null &&
    executedModelId !== null &&
    routedModelId !== executedModelId;

  // ── Status ────────────────────────────────────────
  let status: RequestStatus;
  if (request.status === "SUCCESS") {
    status = fallbackUsed ? "FALLBACK" : "SUCCESS";
  } else {
    status = "FAILED";
  }

  // ── Synthesise attempts ───────────────────────────
  const attempts: HistoryExecutionAttempt[] = [];

  if (fallbackUsed) {
    attempts.push({
      attempt: 1,
      model: routedModelName,
      modelIdentifier: routedModelIdentifier,
      provider: routedProvider,
      success: false,
      latencyMs: 0,
      retryable: true,
      errorCode: "EXECUTION_FAILED",
      errorMessage: "Primary model execution failed.",
    });

    attempts.push({
      attempt: 2,
      model: executedModelName ?? "Unknown",
      modelIdentifier: executedModelIdentifier ?? "",
      provider: executedProvider ?? "",
      success: true,
      latencyMs: request.latencyMs ?? 0,
    });
  } else if (request.status === "SUCCESS") {
    attempts.push({
      attempt: 1,
      model: executedModelName ?? routedModelName,
      modelIdentifier: executedModelIdentifier ?? routedModelIdentifier,
      provider: executedProvider ?? routedProvider,
      success: true,
      latencyMs: request.latencyMs ?? 0,
    });
  } else {
    attempts.push({
      attempt: 1,
      model: routedModelName,
      modelIdentifier: routedModelIdentifier,
      provider: routedProvider,
      success: false,
      latencyMs: request.latencyMs ?? 0,
      retryable: false,
      errorCode: "EXECUTION_FAILED",
      errorMessage: "The provider did not return a successful completion.",
    });
  }

  // ── Costs ─────────────────────────────────────────
  // Projected cost comes from the selected candidate in candidateModels JSON.
  // Actual cost comes from the executed Request data.
  const actualCost = request.actualCost
    ? Number(request.actualCost)
    : undefined;

  return {
    id: request.id,
    prompt: request.prompt ?? "",
    response: request.response ?? undefined,

    status,
    taskType: rd?.taskType ?? request.taskType ?? "GENERAL",
    complexity: (rd?.complexity ?? request.complexity ?? "LOW") as RequestComplexity,

    routedModel: routedModelName,
    routedModelIdentifier,
    routedProvider,

    executedModel: executedModelName,
    executedModelIdentifier,
    executedProvider,

    fallbackUsed,

    routingReason: rd?.reason ?? "",
    routingScore: rd?.score ? Number(rd.score) : 0,

    projectedCost,
    actualCost,

    inputTokens: request.inputTokens ?? 0,
    outputTokens: request.outputTokens ?? 0,
    totalTokens: (request.inputTokens ?? 0) + (request.outputTokens ?? 0),

    routingLatencyMs: 0,
    executionLatencyMs: request.latencyMs ?? 0,
    latencyMs: request.latencyMs ?? 0,

    attempts,

    createdAt: request.createdAt.toISOString(),
  };
}

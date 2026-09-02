/**
 * Attentra — Consumer Overview Query Helpers
 *
 * Phase 12.6 — Real Consumer Overview
 *
 * Server-side query logic for the consumer dashboard overview.
 * Aggregates request metrics, model usage, and routing health
 * scoped to a single authenticated user.
 */

import { prisma } from "@/lib/prisma";

import type { PersistedCandidateData } from "@/lib/routing/persistence";

// ─────────────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────────────

export interface OverviewMetrics {
  totalRequests: number;
  avgLatencyMs: number | null;
  fallbackRate: number;
}

export interface OverviewModelUsage {
  modelId: string;
  displayName: string;
  provider: string;
  requests: number;
  share: number;
}

export interface OverviewRecentRequest {
  id: string;
  prompt: string;
  taskType: string;
  complexity: string;
  routedModel: string;
  routedProvider: string;
  executedModel: string | null;
  executedProvider: string | null;
  fallbackUsed: boolean;
  latencyMs: number;
  status: string;
  createdAt: string;
}

export interface OverviewData {
  metrics: OverviewMetrics;
  recentRequests: OverviewRecentRequest[];
  modelUsage: OverviewModelUsage[];
  routingHealth: {
    successRate: number;
    fallbackRate: number;
    avgDecisionTimeMs: number;
  };
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

/**
 * Parse the candidateModels JSON from a RoutingDecision.
 * Returns the scored candidates array, or empty if null/malformed.
 */
function parseCandidateModels(
  candidateModelsJson: unknown,
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

/**
 * Format a Date into a human-friendly relative time string.
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

// ─────────────────────────────────────────────────────
// MAIN QUERY
// ─────────────────────────────────────────────────────

/**
 * Fetch all overview data for a consumer dashboard.
 *
 * Scoped to userId. Returns metrics, recent requests,
 * model usage breakdown, and routing health indicators.
 */
export async function fetchOverviewData(
  userId: string,
): Promise<OverviewData> {
  // ── Total requests ──────────────────────────────
  const totalRequests = await prisma.request.count({
    where: { userId },
  });

  // ── Aggregate metrics (single query) ────────────
  const agg = await prisma.request.aggregate({
    where: { userId, latencyMs: { not: null } },
    _avg: { latencyMs: true },
  });

  const avgLatencyMs = agg._avg.latencyMs !== null
    ? Math.round(agg._avg.latencyMs)
    : null;

  // ── Requests with routing decisions ─────────────
  // Needed for fallback rate, recent requests, and model usage.
  const requestsWithRouting = await prisma.request.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      routingDecision: true,
      selectedModel: {
        include: { provider: true },
      },
    },
  });

  // ── Fallback rate ───────────────────────────────
  let fallbackCount = 0;
  for (const req of requestsWithRouting) {
    if (
      req.routingDecision?.selectedModelId &&
      req.selectedModelId &&
      req.routingDecision.selectedModelId !== req.selectedModelId
    ) {
      fallbackCount++;
    }
  }

  const fallbackRate = totalRequests > 0
    ? (fallbackCount / totalRequests) * 100
    : 0;

  // ── Routing health ──────────────────────────────
  const successCount = requestsWithRouting.filter(
    (r) => r.status === "SUCCESS",
  ).length;

  const successRate = totalRequests > 0
    ? (successCount / totalRequests) * 100
    : 0;

  // Average routing decision time:
  // RoutingDecision doesn't have its own latency field.
  // We approximate using requests that have latency data.
  const requestsWithLatency = requestsWithRouting.filter(
    (r) => r.latencyMs !== null && r.latencyMs > 0,
  );

  const avgDecisionTimeMs = requestsWithLatency.length > 0
    ? Math.round(
        requestsWithLatency.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) /
          requestsWithLatency.length,
      )
    : 0;

  // ── Recent requests (last 5) ────────────────────
  const recentRaw = requestsWithRouting.slice(0, 5);

  const recentRequests: OverviewRecentRequest[] = recentRaw.map((req) => {
    const rd = req.routingDecision;
    const executedModel = req.selectedModel;
    const routedModelId = rd?.selectedModelId ?? null;
    const executedModelId = req.selectedModelId ?? null;

    // Resolve routed model from candidateModels JSON
    const candidates = parseCandidateModels(rd?.candidateModels);
    const selectedCandidate = candidates.find(
      (c: PersistedCandidateData) => c.modelId === routedModelId,
    );

    let routedModel = routedModelId ?? "Unknown";
    let routedProvider = "";

    if (selectedCandidate) {
      routedModel = selectedCandidate.displayName;
      routedProvider = selectedCandidate.providerName;
    } else if (routedModelId === executedModelId && executedModel) {
      routedModel = executedModel.displayName;
      routedProvider = executedModel.provider.name;
    }

    const fallbackUsed =
      routedModelId !== null &&
      executedModelId !== null &&
      routedModelId !== executedModelId;

    let statusLabel: string;
    if (req.status === "SUCCESS" && !fallbackUsed) {
      statusLabel = "Success";
    } else if (req.status === "SUCCESS" && fallbackUsed) {
      statusLabel = "Fallback";
    } else {
      statusLabel = "Failed";
    }

    return {
      id: req.id,
      prompt: req.prompt ?? "",
      taskType: rd?.taskType ?? req.taskType ?? "GENERAL",
      complexity: rd?.complexity ?? req.complexity ?? "LOW",
      routedModel,
      routedProvider,
      executedModel: executedModel?.displayName ?? null,
      executedProvider: executedModel?.provider.name ?? null,
      fallbackUsed,
      latencyMs: req.latencyMs ?? 0,
      status: statusLabel,
      createdAt: formatRelativeTime(req.createdAt),
    };
  });

  // ── Model usage (by executed model) ─────────────
  const modelCountMap = new Map<
    string,
    { displayName: string; provider: string; count: number }
  >();

  for (const req of requestsWithRouting) {
    if (!req.selectedModel) continue;

    const modelId = req.selectedModel.id;
    const existing = modelCountMap.get(modelId);

    if (existing) {
      existing.count++;
    } else {
      modelCountMap.set(modelId, {
        displayName: req.selectedModel.displayName,
        provider: req.selectedModel.provider.name,
        count: 1,
      });
    }
  }

  const totalModelRequests = Array.from(modelCountMap.values()).reduce(
    (sum, m) => sum + m.count,
    0,
  );

  const modelUsage: OverviewModelUsage[] = Array.from(modelCountMap.entries())
    .map(([modelId, data]) => ({
      modelId,
      displayName: data.displayName,
      provider: data.provider,
      requests: data.count,
      share:
        totalModelRequests > 0
          ? Math.round((data.count / totalModelRequests) * 100)
          : 0,
    }))
    .sort((a, b) => b.requests - a.requests);

  return {
    metrics: {
      totalRequests,
      avgLatencyMs,
      fallbackRate,
    },
    recentRequests,
    modelUsage,
    routingHealth: {
      successRate,
      fallbackRate,
      avgDecisionTimeMs,
    },
  };
}

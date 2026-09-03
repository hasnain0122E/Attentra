/**
 * Attentra — Business Overview Query Helpers
 *
 * Phase 12.9 — Real Business Dashboard
 *
 * Server-side query logic for the business workspace overview.
 * Aggregates request metrics, model usage, routing health,
 * and API key stats scoped to a single businessId.
 *
 * Business requests include:
 *   - API-key requests: Request.businessId set, Request.userId = null
 *   - Dashboard-user requests: Request.businessId set, Request.userId set
 */

import { prisma } from "@/lib/prisma";

import type { PersistedCandidateData } from "@/lib/routing/persistence";

// ─────────────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────────────

export interface BusinessOverviewMetrics {
  totalRequests: number;
  actualSpend: number;
  savings: number;
  savingsPercentage: number;
  avgLatencyMs: number | null;
  successRate: number;
  fallbackRate: number;
}

export interface BusinessOverviewModelUsage {
  modelId: string;
  displayName: string;
  provider: string;
  requests: number;
  share: number;
}

export interface BusinessOverviewRecentRequest {
  id: string;
  requesterName: string;
  requesterInitials: string;
  taskType: string;
  routedModel: string;
  routedProvider: string;
  executedModel: string | null;
  executedProvider: string | null;
  fallbackUsed: boolean;
  status: "SUCCESS" | "FALLBACK" | "FAILED";
  latencyMs: number;
  createdAt: string;
}

export interface BusinessOverviewApiKeyStats {
  totalKeys: number;
  activeKeys: number;
}

export interface BusinessOverviewData {
  metrics: BusinessOverviewMetrics;
  modelUsage: BusinessOverviewModelUsage[];
  recentRequests: BusinessOverviewRecentRequest[];
  routingHealth: {
    successRate: number;
    fallbackRate: number;
    avgDecisionTimeMs: number;
    failedCount: number;
  };
  apiKeyStats: BusinessOverviewApiKeyStats;
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

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

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

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

export async function fetchBusinessOverviewData(
  businessId: string,
): Promise<BusinessOverviewData> {
  // ── Total requests ──────────────────────────────
  const totalRequests = await prisma.request.count({
    where: { businessId },
  });

  // ── Aggregate spend + latency (single query) ────
  const agg = await prisma.request.aggregate({
    where: { businessId },
    _sum: {
      actualCost: true,
      savings: true,
    },
    _avg: {
      latencyMs: true,
      savingsPercentage: true,
    },
  });

  const actualSpend = agg._sum.actualCost
    ? Number(agg._sum.actualCost)
    : 0;

  const savings = agg._sum.savings
    ? Number(agg._sum.savings)
    : 0;

  const savingsPercentage = agg._avg.savingsPercentage
    ? Number(agg._avg.savingsPercentage)
    : 0;

  const avgLatencyMs = agg._avg.latencyMs !== null
    ? Math.round(agg._avg.latencyMs)
    : null;

  // ── Requests with routing decisions ─────────────
  const requestsWithRouting = await prisma.request.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: {
      routingDecision: true,
      selectedModel: {
        include: { provider: true },
      },
      user: true,
      apiKey: true,
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

  // ── Success rate ────────────────────────────────
  const successCount = requestsWithRouting.filter(
    (r) => r.status === "SUCCESS",
  ).length;

  const successRate = totalRequests > 0
    ? (successCount / totalRequests) * 100
    : 0;

  // ── Failed count ────────────────────────────────
  const failedCount = requestsWithRouting.filter(
    (r) => r.status === "FAILED",
  ).length;

  // ── Average end-to-end request latency ──────────
  // Routing latency is not separately measured; use Request.latencyMs.
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

  const recentRequests: BusinessOverviewRecentRequest[] = recentRaw.map((req) => {
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

    let statusLabel: "SUCCESS" | "FALLBACK" | "FAILED";
    if (req.status === "SUCCESS" && !fallbackUsed) {
      statusLabel = "SUCCESS";
    } else if (req.status === "SUCCESS" && fallbackUsed) {
      statusLabel = "FALLBACK";
    } else {
      statusLabel = "FAILED";
    }

    // Resolve requester: API key name or user name/email
    let requesterName = "API key";
    if (req.apiKey) {
      requesterName = req.apiKey.name;
    } else if (req.user) {
      requesterName = req.user.name ?? req.user.email;
    }

    return {
      id: req.id,
      requesterName,
      requesterInitials: buildInitials(requesterName),
      taskType: rd?.taskType ?? req.taskType ?? "GENERAL",
      routedModel,
      routedProvider,
      executedModel: executedModel?.displayName ?? null,
      executedProvider: executedModel?.provider.name ?? null,
      fallbackUsed,
      status: statusLabel,
      latencyMs: req.latencyMs ?? 0,
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

  const modelUsage: BusinessOverviewModelUsage[] = Array.from(modelCountMap.entries())
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

  // ── API key stats ───────────────────────────────
  const totalKeys = await prisma.apiKey.count({
    where: { businessId },
  });

  const activeKeys = await prisma.apiKey.count({
    where: {
      businessId,
      revokedAt: null,
    },
  });

  return {
    metrics: {
      totalRequests,
      actualSpend,
      savings,
      savingsPercentage,
      avgLatencyMs,
      successRate,
      fallbackRate,
    },
    modelUsage,
    recentRequests,
    routingHealth: {
      successRate,
      fallbackRate,
      avgDecisionTimeMs,
      failedCount,
    },
    apiKeyStats: {
      totalKeys,
      activeKeys,
    },
  };
}

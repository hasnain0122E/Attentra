/**
 * Attentra — Business Request Query Helpers
 *
 * Phase 12.14 — Real Business Request History
 *
 * Server-side query logic for business request history API routes.
 * Reuses the shared request-to-history mapping from request-mapping.ts
 * and adds business-specific requester attribution via API key name.
 *
 * Requester attribution (per constraint #6):
 *   - Business API key requests have userId = null
 *   - The requester is identified by the API key name
 *   - Fallback: "API key" if no key name is available
 */

import { prisma } from "@/lib/prisma";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

import { mapRequestToHistoryItem, type RequestWithRelations } from "./request-mapping";

/** Business request item with requester attribution. */
export interface BusinessRequestHistoryItem extends RequestHistoryItem {
  requester: string;
  apiKeyName: string;
  apiKeyPrefix: string;
}

/** Request with API key relation for business queries. */
type BusinessRequestWithRelations = Prisma.RequestGetPayload<{
  include: {
    routingDecision: true;
    selectedModel: { include: { provider: true } };
    apiKey: true;
  };
}>;

import type { Prisma } from "@prisma/client";

/**
 * Resolve the requester name from a business request.
 *
 * Per constraint #6: API key authentication belongs to the organization,
 * not an individual member. The requester is the API key name.
 */
function resolveRequester(request: BusinessRequestWithRelations): string {
  return request.apiKey?.name ?? "API key";
}

/**
 * Map a business Prisma Request to the business history contract.
 */
function mapBusinessRequest(
  request: BusinessRequestWithRelations
): BusinessRequestHistoryItem {
  const base = mapRequestToHistoryItem(request as RequestWithRelations);

  return {
    ...base,
    requester: resolveRequester(request),
    apiKeyName: request.apiKey?.name ?? "API key",
    apiKeyPrefix: request.apiKey?.keyPrefix ?? "",
  };
}

// ─────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────

/**
 * Fetch all requests for a business, mapped to the business history contract.
 *
 * Scoped by businessId. Ordered by creation date (newest first).
 */
export async function fetchBusinessRequests(
  businessId: string
): Promise<BusinessRequestHistoryItem[]> {
  const requests = await prisma.request.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: {
      routingDecision: true,
      selectedModel: {
        include: { provider: true },
      },
      apiKey: true,
    },
  });

  return requests.map(mapBusinessRequest);
}

// ─────────────────────────────────────────────────────
// DETAIL
// ─────────────────────────────────────────────────────

/**
 * Fetch a single request scoped by BOTH requestId and businessId.
 *
 * Per constraint #10: query-level tenant scoping is preferred over
 * fetch-then-compare.
 *
 * Returns null if the request does not exist or does not belong to the business.
 */
export async function fetchBusinessRequest(
  businessId: string,
  requestId: string
): Promise<BusinessRequestHistoryItem | null> {
  const request = await prisma.request.findFirst({
    where: { id: requestId, businessId },
    include: {
      routingDecision: true,
      selectedModel: {
        include: { provider: true },
      },
      apiKey: true,
    },
  });

  if (!request) return null;

  return mapBusinessRequest(request);
}

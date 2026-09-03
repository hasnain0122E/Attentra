/**
 * Attentra — Consumer Request Query Helpers
 *
 * Phase 12.5 — Real Consumer History
 *
 * Shared server-side query logic for the consumer history API routes.
 * Reuses the shared request-to-history mapping from request-mapping.ts.
 */

import { prisma } from "@/lib/prisma";

import type { RequestHistoryItem } from "@/lib/dashboard/history-data";

import { mapRequestToHistoryItem } from "./request-mapping";

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

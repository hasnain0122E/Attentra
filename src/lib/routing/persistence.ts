/**
 * Attentra — Routing Decision Persistence
 *
 * Phase 6 / Step 3 — Production Routing Validation + Decision Persistence
 *
 * Persists routing decisions to PostgreSQL via Prisma.
 * This is the persistence boundary — only this module and database.ts
 * import Prisma within the routing module.
 *
 * Architecture:
 *   PURE ROUTING LOGIC (router.ts, scorer.ts, etc.)
 *     ↑
 *   DATABASE INTEGRATION (database.ts)
 *     ↑
 *   PERSISTENCE (this file)
 *     ↑
 *   Prisma (schema.prisma)
 *
 * Responsibilities:
 * - Persist RoutingDecision records linked to Request records
 * - Ensure Request records exist before creating decisions
 * - Prevent duplicate decisions via unique constraint (requestId)
 * - Use Prisma transactions for atomic writes
 * - Handle failures gracefully with structured errors
 * - Never crash the application on persistence failure
 */

import { prisma } from "@/lib/prisma";
import { Decimal, type InputJsonValue } from "@prisma/client/runtime/library";
import type { RoutingDecision, RejectedCandidate } from "./types";

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

/**
 * Result of persisting a routing decision.
 */
export interface PersistenceResult {
  /** Whether persistence succeeded */
  success: boolean;

  /** Database ID of the persisted RoutingDecision */
  decisionId?: string;

  /** Error message if persistence failed */
  error?: string;
}

/**
 * Serializable candidate data stored in RoutingDecision.candidateModels JSON.
 * Contains enough information to understand why the selected model won.
 */
export interface PersistedCandidateData {
  modelId: string;
  providerId: string;
  providerName: string;
  modelIdentifier: string;
  displayName: string;
  score: number;
  projectedCost: number;
  factors: {
    costScore: number;
    latencyScore: number;
    capabilityScore: number;
  };
}

/**
 * Serializable rejection data stored in RoutingDecision.candidateModels JSON.
 */
export interface PersistedRejectionData {
  modelId: string;
  displayName: string;
  providerId: string;
  reason: string;
  details: string;
}

// ─────────────────────────────────────────────────────
// PERSISTENCE FUNCTION
// ─────────────────────────────────────────────────────

/**
 * Persist a routing decision to the database.
 *
 * Creates or updates a RoutingDecision record linked to the given Request.
 * Uses a Prisma transaction to:
 * 1. Ensure the associated Request record exists (creates if missing)
 * 2. Upsert the RoutingDecision (handles duplicate protection via requestId @unique)
 *
 * Immutability / Auditability:
 *   A persisted RoutingDecision represents a point-in-time routing snapshot.
 *   The candidateModels JSON captures the COMPLETE decision state at routing
 *   time — all scored candidates with scores, projected costs, factors, and
 *   all rejected candidates with reasons. This snapshot preserves the full
 *   audit trail even if pricing changes later.
 *
 *   The upsert pattern provides idempotent persistence. Re-routing the same
 *   requestId intentionally overwrites the previous decision — this represents
 *   an explicit new routing decision, NOT an automatic pricing update.
 *   Pricing changes from Phase 5 sync do NOT trigger re-routing; only an
 *   explicit call to routeAndPersist() creates or updates a decision.
 *
 *   Historical pricing is preserved in PricingSnapshot.effectiveTo records,
 *   ensuring that past pricing remains available for audit even when active
 *   pricing has changed.
 *
 * @param requestId  The Request ID to associate the decision with
 * @param decision   The routing decision to persist
 * @returns          Structured result with success/failure and decisionId
 */
export async function persistRoutingDecision(
  requestId: string,
  decision: RoutingDecision
): Promise<PersistenceResult> {
  try {
    if (!requestId || requestId.trim() === "") {
      return { success: false, error: "requestId is required" };
    }

    const candidateData = buildCandidateData(decision);

    await prisma.$transaction(async (tx) => {
      // 1. Ensure Request exists
      const existing = await tx.request.findUnique({ where: { id: requestId } });
      if (!existing) {
        await tx.request.create({
          data: {
            id: requestId,
            status: "PENDING",
            taskType: decision.taskType,
            complexity: decision.complexity.complexity as "LOW" | "MEDIUM" | "HIGH",
            inputTokens: decision.tokenEstimate.inputTokens,
            outputTokens: decision.tokenEstimate.outputTokens,
            selectedModelId: decision.selected.candidate.modelId,
            selectedProviderId: decision.selected.candidate.providerId,
          },
        });
      }

      // 2. Create or update RoutingDecision (upsert handles duplicate requestId)
      await tx.routingDecision.upsert({
        where: { requestId },
        create: {
          requestId,
          taskType: decision.taskType,
          complexity: decision.complexity.complexity as "LOW" | "MEDIUM" | "HIGH",
          candidateModels: candidateData,
          selectedModelId: decision.selected.candidate.modelId,
          score: new Decimal(decision.selected.score.toFixed(4)),
          reason: decision.reason,
        },
        update: {
          taskType: decision.taskType,
          complexity: decision.complexity.complexity as "LOW" | "MEDIUM" | "HIGH",
          candidateModels: candidateData,
          selectedModelId: decision.selected.candidate.modelId,
          score: new Decimal(decision.selected.score.toFixed(4)),
          reason: decision.reason,
        },
      });
    });

    // Query the created/updated decision to return its ID
    const saved = await prisma.routingDecision.findUnique({
      where: { requestId },
      select: { id: true },
    });

    return {
      success: true,
      decisionId: saved?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? `Persistence failed: ${error.message}`
        : "Persistence failed: Unknown error",
    };
  }
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Build the JSON payload for RoutingDecision.candidateModels.
 *
 * Includes:
 * - All scored candidates with scores, factors, and projected cost
 * - Rejected candidates with reasons
 */
function buildCandidateData(decision: RoutingDecision): InputJsonValue {
  const scored = decision.candidates.map((s) => ({
    modelId: s.candidate.modelId,
    providerId: s.candidate.providerId,
    providerName: s.candidate.providerName ?? s.candidate.providerId,
    modelIdentifier: s.candidate.modelIdentifier,
    displayName: s.candidate.displayName,
    score: s.score,
    projectedCost: s.factors.projectedCost,
    factors: {
      costScore: s.factors.costScore,
      latencyScore: s.factors.latencyScore,
      capabilityScore: s.factors.capabilityScore,
    },
  }));

  const rejected = (decision.rejected ?? []).map((r) => ({
    modelId: r.candidate.modelId,
    displayName: r.candidate.displayName,
    providerId: r.candidate.providerId,
    reason: r.reason,
    details: r.details,
  }));

  return { scored, rejected };
}

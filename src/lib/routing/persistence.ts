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
 * Creates a NEW Request and its RoutingDecision in one transaction.
 * The requestId must be server-generated and unused: an existing id is a
 * hard failure (never reused or overwritten) — see the P0 request-ID
 * ownership hotfix (docs/PHASE_3C_REQUEST_ID_SECURITY_HOTFIX.md).
 *
 * Immutability / Auditability:
 *   A persisted RoutingDecision represents a point-in-time routing snapshot.
 *   The candidateModels JSON captures the COMPLETE decision state at routing
 *   time — all scored candidates with scores, projected costs, factors, and
 *   all rejected candidates with reasons. This snapshot preserves the full
 *   audit trail even if pricing changes later.
 *
 *   Decisions are write-once: re-using a requestId fails instead of
 *   overwriting. Pricing changes from Phase 5 sync do NOT trigger
 *   re-routing; only an explicit call to routeAndPersist() creates a decision.
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

    // Create-only (P0 hotfix). The Request and its RoutingDecision are
    // always NEW rows. An existing Request is never looked up, reused or
    // overwritten: a duplicate id fails atomically on the primary key /
    // requestId unique constraint (P2002) and the transaction rolls back,
    // so another request's ownership, prompt, response, usage or routing
    // decision can never be modified here. No check-then-write race.
    const decisionId = await prisma.$transaction(async (tx) => {
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

      const created = await tx.routingDecision.create({
        data: {
          requestId,
          taskType: decision.taskType,
          complexity: decision.complexity.complexity as "LOW" | "MEDIUM" | "HIGH",
          candidateModels: candidateData,
          selectedModelId: decision.selected.candidate.modelId,
          score: new Decimal(decision.selected.score.toFixed(4)),
          reason: decision.reason,
        },
        select: { id: true },
      });

      return created.id;
    });

    return {
      success: true,
      decisionId,
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

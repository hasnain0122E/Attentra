/**
 * Attentra — Routing Engine Types
 *
 * Architecture.md v2.0 §8 — Routing Engine
 * Phase 6 / Step 1–2 — Foundational Contracts + Database-Backed Routing
 *
 * Provider-agnostic types for the routing pipeline.
 * These types never reference specific provider names (OpenAI, Anthropic, etc.)
 * and are designed to work with any provider registered in the system.
 *
 * The routing engine obtains model and pricing data through existing
 * abstractions (provider registry, database Model/PricingSnapshot records).
 */

// ─────────────────────────────────────────────────────
// TASK TYPES
// ─────────────────────────────────────────────────────

/**
 * Task types recognized by the routing analyzer.
 *
 * These represent the analyzer's classification output.
 * They map to model capabilities for candidate filtering.
 */
export type RoutingTaskType =
  | "GENERAL"
  | "CODING"
  | "REASONING"
  | "WRITING"
  | "SUMMARIZATION"
  | "TRANSLATION"
  | "ANALYSIS"
  | "EXTRACTION";

/**
 * All supported routing task types (for iteration and validation).
 */
export const ROUTING_TASK_TYPES: readonly RoutingTaskType[] = [
  "GENERAL",
  "CODING",
  "REASONING",
  "WRITING",
  "SUMMARIZATION",
  "TRANSLATION",
  "ANALYSIS",
  "EXTRACTION",
] as const;

// ─────────────────────────────────────────────────────
// TASK TYPE → MODEL CAPABILITY MAPPING
// ─────────────────────────────────────────────────────

/**
 * Maps routing analyzer task types to model capability strings.
 *
 * Models declare capabilities using provider types (e.g. "chat", "creative_writing").
 * The analyzer classifies into RoutingTaskType (e.g. "GENERAL", "WRITING").
 * This mapping bridges the two namespaces for candidate filtering.
 *
 * A single routing task type can map to multiple model capabilities,
 * and multiple routing task types can share capabilities.
 */
export const TASK_TYPE_TO_CAPABILITIES: Record<RoutingTaskType, string[]> = {
  GENERAL: ["chat"],
  CODING: ["coding"],
  REASONING: ["reasoning"],
  WRITING: ["creative_writing"],
  SUMMARIZATION: ["summarization"],
  TRANSLATION: ["translation"],
  ANALYSIS: ["classification", "extraction"],
  EXTRACTION: ["extraction"],
};

// ─────────────────────────────────────────────────────
// COMPLEXITY
// ─────────────────────────────────────────────────────

/**
 * Request complexity levels.
 * Aligned with Prisma Complexity enum (LOW, MEDIUM, HIGH).
 */
export type ComplexityLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Result of complexity classification.
 * Includes a confidence value between 0 and 1.
 */
export interface ComplexityResult {
  /** Classified complexity level */
  complexity: ComplexityLevel;

  /** Confidence of the classification (0.0–1.0) */
  confidence: number;

  /** Factor contributions to the final score (for debugging/auditing) */
  signals: {
    contentScore: number;
    messageCountScore: number;
    taskScore: number;
    outputScore: number;
  };
}

// ─────────────────────────────────────────────────────
// TOKEN ESTIMATION
// ─────────────────────────────────────────────────────

/**
 * Result of provider-neutral token estimation.
 *
 * IMPORTANT: This is an estimate using characters/4 approximation.
 * It is NOT provider-specific tokenization. Actual token counts
 * vary by provider and model tokenizer (BPE, SentencePiece, etc.).
 *
 * This estimate is suitable for:
 * - Routing decisions (relative comparison)
 * - Approximate cost estimation
 * - Context window fit checking
 */
export interface TokenEstimate {
  /** Estimated input tokens (from message content) */
  inputTokens: number;

  /** Estimated output tokens (from maxTokens or default heuristic) */
  outputTokens: number;

  /** Total estimated tokens (input + output) */
  totalTokens: number;
}

// ─────────────────────────────────────────────────────
// ROUTING REQUEST
// ─────────────────────────────────────────────────────

/**
 * Input to the routing engine.
 *
 * Contains the normalized request, optional hints,
 * and constraints that influence routing decisions.
 */
export interface RoutingRequest {
  /** Conversation messages forming the request context */
  messages: Array<{ role: string; content: string }>;

  /** Optional task type hint (overrides analyzer if provided) */
  taskTypeHint?: RoutingTaskType;

  /** Maximum output tokens requested */
  maxTokens?: number;

  /** Sampling temperature (0.0–2.0) */
  temperature?: number;

  /** Optional request metadata (request ID, user context, etc.) */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────
// ROUTING POLICY
// ─────────────────────────────────────────────────────

/**
 * Weight configuration for routing decisions.
 * All weights are non-negative numbers; higher = more influence.
 */
export interface RoutingPolicy {
  /** Policy name (e.g. "balanced", "cost_optimized", "quality_first", "speed_first") */
  name: string;

  /** Weight for cost optimization (lower cost preferred) */
  costWeight: number;

  /** Weight for latency (lower latency preferred) */
  latencyWeight: number;

  /** Weight for capability/quality match */
  capabilityWeight: number;
}

// ─────────────────────────────────────────────────────
// MODEL CANDIDATE
// ─────────────────────────────────────────────────────

/**
 * A model under consideration for routing.
 * Contains only provider-agnostic data obtained from the database
 * or provider registry — never provider SDK types.
 */
export interface ModelCandidate {
  /** Internal database model ID */
  modelId: string;

  /** Provider ID (e.g. "openai", "anthropic") */
  providerId: string;

  /** Provider display name (from database Provider.name, optional for testing) */
  providerName?: string;

  /** Provider's native model identifier */
  modelIdentifier: string;

  /** Human-readable display name */
  displayName: string;

  /** Task capabilities this model supports */
  capabilities: string[];

  /** Model tier from database (LIGHT, MID, HEAVY) */
  tier?: string;

  /** Context window in tokens */
  contextWindow?: number;

  /** Current input price per 1K tokens (USD, from active PricingSnapshot) */
  inputPricePer1k: number;

  /** Current output price per 1K tokens (USD, from active PricingSnapshot) */
  outputPricePer1k: number;

  /** Expected latency in milliseconds */
  expectedLatencyMs?: number;

  /** Whether the model is currently active */
  active: boolean;
}

// ─────────────────────────────────────────────────────
// MODEL SCORE
// ─────────────────────────────────────────────────────

/**
 * Score assigned to a candidate model during evaluation.
 */
export interface ModelScore {
  /** The candidate being scored */
  candidate: ModelCandidate;

  /** Overall score (0.0–1.0, higher is better) */
  score: number;

  /** Individual scoring factors (for debugging/auditing) */
  factors: {
    costScore: number;
    latencyScore: number;
    capabilityScore: number;
    /** Projected request cost in USD (from token estimates × active pricing) */
    projectedCost: number;
  };

  /** Human-readable explanation of why this score was assigned */
  explanation: string;
}

// ─────────────────────────────────────────────────────
// REJECTION TRACKING
// ─────────────────────────────────────────────────────

/**
 * Reasons a candidate can be rejected from routing.
 */
export type RejectionReason =
  | "INACTIVE_MODEL"
  | "INACTIVE_PROVIDER"
  | "MISSING_CAPABILITY"
  | "REJECTED_CONTEXT_LIMIT"
  | "UNKNOWN_CONTEXT_WINDOW"
  | "MISSING_PRICING";

/**
 * A candidate that was considered but rejected during filtering.
 * Includes the rejection reason for debugging and explanation.
 */
export interface RejectedCandidate {
  /** The rejected candidate */
  candidate: ModelCandidate;

  /** Why this candidate was rejected */
  reason: RejectionReason;

  /** Human-readable explanation */
  details: string;
}

// ─────────────────────────────────────────────────────
// ROUTING DECISION
// ─────────────────────────────────────────────────────

/**
 * Final output of the routing engine.
 * Contains the selected candidate, reasoning, and fallback ordering.
 */
export interface RoutingDecision {
  /** Classified task type */
  taskType: RoutingTaskType;

  /** Classified complexity */
  complexity: ComplexityResult;

  /** Token estimation */
  tokenEstimate: TokenEstimate;

  /** All evaluated candidates with scores (sorted by score descending) */
  candidates: ModelScore[];

  /** The selected (best) candidate */
  selected: ModelScore;

  /** Ordered fallback candidates (excluding selected, best-first) */
  fallbacks: ModelScore[];

  /** Candidates rejected during filtering (with reasons) */
  rejected: RejectedCandidate[];

  /** Human-readable explanation of the routing decision */
  reason: string;

  /** Timestamp of the decision */
  timestamp: Date;
}

// ─────────────────────────────────────────────────────
// ROUTING RESULT
// ─────────────────────────────────────────────────────

/**
 * Top-level result wrapping the routing decision.
 */
export interface RoutingResult {
  /** Whether routing succeeded */
  success: boolean;

  /** The routing decision (present on success) */
  decision?: RoutingDecision;

  /** Error message (present on failure) */
  error?: string;

  /** Structured error code (present on failure) */
  errorCode?: RoutingErrorCode;

  /** Rejected candidates for debugging (present on both success and failure) */
  rejected?: RejectedCandidate[];

  /** Persistence result when routeAndPersist is used */
  persisted?: { success: boolean; decisionId?: string };

  /** Persistence error (present when persistence failed but routing succeeded) */
  persistenceError?: string;
}

/**
 * Structured error codes for routing failures.
 */
export type RoutingErrorCode =
  | "NO_ACTIVE_MODELS"
  | "NO_COMPATIBLE_MODELS"
  | "ALL_EXCEED_CONTEXT"
  | "NO_PRICING_AVAILABLE"
  | "DATABASE_ERROR"
  | "INVALID_POLICY";

// ─────────────────────────────────────────────────────
// PROJECTED COST
// ─────────────────────────────────────────────────────

/**
 * Projected request cost for a candidate model.
 * Calculated from token estimates × active PricingSnapshot prices.
 * All values in USD. PKR conversion belongs to Phase 10.
 */
export interface ProjectedCost {
  /** Estimated input cost: (inputTokens / 1000) × inputPricePer1k */
  inputCost: number;

  /** Estimated output cost: (outputTokens / 1000) × outputPricePer1k */
  outputCost: number;

  /** Total projected cost: inputCost + outputCost */
  totalCost: number;
}

/**
 * Attentra — Provider Abstraction Types
 *
 * Architecture.md v2.0 §6 — Provider Abstraction
 *
 * These types define the provider-neutral contract that every
 * provider adapter must satisfy. The routing engine (Phase 6)
 * consumes only these types — never provider SDK types directly.
 */

// ─────────────────────────────────────────────────────
// TASK TYPES
// ─────────────────────────────────────────────────────

/**
 * Task types used for model capability matching.
 * Architecture.md §8 — Routing Engine task types.
 */
export type TaskType =
  | "chat"
  | "summarization"
  | "classification"
  | "extraction"
  | "coding"
  | "reasoning"
  | "creative_writing"
  | "translation";

// ─────────────────────────────────────────────────────
// MESSAGE FORMAT
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral message format.
 * Each adapter converts this to the provider's native message structure.
 */
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─────────────────────────────────────────────────────
// NORMALIZED REQUEST
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral request sent to adapters.
 * The routing engine constructs this; adapters translate it.
 */
export interface NormalizedAIRequest {
  /** Array of messages forming the conversation context */
  messages: Message[];

  /** Task classification (used for capability matching) */
  taskType?: TaskType;

  /** Maximum tokens in the response */
  maxTokens?: number;

  /** Sampling temperature (0.0–2.0) */
  temperature?: number;

  /** Optional metadata (request ID, user context, etc.) */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────
// NORMALIZED RESPONSE
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral response returned by adapters.
 * Adapters must translate provider-specific responses into this shape.
 */
export interface NormalizedAIResponse {
  /** Unique response identifier (from provider or generated) */
  id: string;

  /** Generated text content */
  content: string;

  /** Model identifier that produced the response */
  model: string;

  /** Provider ID (e.g. "openai", "anthropic", "google") */
  provider: string;

  /** Token usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };

  /** Reason the generation stopped (e.g. "stop", "length", "content_filter") */
  finishReason: string;

  /** Response latency in milliseconds */
  latencyMs: number;

  /** Optional raw provider response for debugging */
  raw?: unknown;
}

// ─────────────────────────────────────────────────────
// MODEL DEFINITION
// ─────────────────────────────────────────────────────

/**
 * Static model metadata that adapters declare at registration time.
 * This complements the database Model table (source of truth for pricing).
 */
export interface ModelDefinition {
  /** Internal model ID (may differ from provider's identifier) */
  id: string;

  /** Provider this model belongs to */
  providerId: string;

  /** Provider's native model identifier (e.g. "gpt-4o", "claude-sonnet-4-20250514") */
  modelIdentifier: string;

  /** Human-readable display name */
  displayName: string;

  /** Task types this model supports */
  capabilities: TaskType[];

  /** Input price per 1,000 tokens (USD, provider-canonical) */
  inputPricePer1k: number;

  /** Output price per 1,000 tokens (USD, provider-canonical) */
  outputPricePer1k: number;

  /** Expected latency in milliseconds (approximate) */
  expectedLatencyMs?: number;

  /** Whether this model is available for routing */
  active: boolean;
}

// ─────────────────────────────────────────────────────
// PROVIDER INTERFACE
// ─────────────────────────────────────────────────────

/**
 * The core provider adapter contract.
 *
 * Every provider adapter (OpenAI, Anthropic, Google, etc.) must
 * implement this interface. The registry stores adapters and the
 * routing engine resolves them by provider ID.
 */
export interface AIProvider {
  /** Unique provider identifier (e.g. "openai", "anthropic", "google") */
  readonly id: string;

  /** Human-readable provider name */
  readonly name: string;

  /**
   * Returns the list of models this adapter supports.
   * Used for initial database seeding and capability discovery.
   */
  listModels(): ModelDefinition[];

  /**
   * Execute a text generation request using the specified model.
   *
   * @param request  Provider-neutral request
   * @param modelId  Provider-native model identifier (e.g. "gpt-4o")
   * @returns        Provider-neutral response
   * @throws {AttentraProviderError} On any provider failure error
   */
  generate(
    request: NormalizedAIRequest,
    modelId: string
  ): Promise<NormalizedAIResponse>;

  /**
   * Whether this provider is configured and ready.
   * Returns false if required credentials are missing.
   */
  isAvailable(): boolean;
}

// ─────────────────────────────────────────────────────
// ERROR TYPES
// ─────────────────────────────────────────────────────

/**
 * Normalized error codes covering all provider failure modes.
 * Every provider-specific error must map to one of these.
 */
export type ErrorCode =
  | "AUTHENTICATION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "INVALID_REQUEST_ERROR"
  | "MODEL_NOT_FOUND"
  | "CONTEXT_LENGTH_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT_ERROR"
  | "PROVIDER_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Normalized provider error.
 * All adapter errors must be instances of this class so the
 * routing engine can handle failures uniformly.
 */
export class AttentraProviderError extends Error {
  /** Normalized error code */
  readonly code: ErrorCode;

  /** Provider that produced the error */
  readonly provider: string;

  /** Provider's original error code (if available) */
  readonly providerCode?: string;

  /** Provider's original error message (if available) */
  readonly providerMessage?: string;

  /** Whether the routing engine should attempt fallback */
  readonly retryable: boolean;

  constructor(
    code: ErrorCode,
    provider: string,
    message: string,
    options?: {
      providerCode?: string;
      providerMessage?: string;
      retryable?: boolean;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "AttentraProviderError";
    this.code = code;
    this.provider = provider;
    this.providerCode = options?.providerCode;
    this.providerMessage = options?.providerMessage;
    this.retryable = options?.retryable ?? false;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Attentra — Execution Layer Types
 *
 * Phase 7 / Step 1 — Provider Adapter Foundation
 *
 * Provider-neutral types for the execution boundary.
 * This layer sits between the routing engine's ExecutionPlan
 * and the provider-specific API calls.
 *
 * Architecture:
 *   ExecutionPlan (routing)
 *     → ExecutionRequest (this file)
 *     → ProviderAdapter.execute()
 *     → ExecutionResult (from routing/execution-plan.ts)
 *
 * The execution layer MUST NOT:
 * - Import provider SDKs directly
 * - Contain provider-specific API logic
 * - Duplicate routing/scoring logic
 * - Implement automatic fallback execution
 */

import type { AIProvider } from "@/lib/providers";
import type { ExecutionResult } from "@/lib/routing/execution-plan";
import { NormalizedExecutionError, mapProviderErrorCode } from "./errors";

// ─────────────────────────────────────────────────────
// EXECUTION REQUEST
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral execution request.
 *
 * Contains everything a provider adapter needs to execute an LLM
 * request — without exposing provider-specific request objects.
 *
 * Constructed from an ExecutionPlan's primary or fallback target.
 */
export interface ExecutionRequest {
  /** Internal database model ID */
  modelId: string;

  /** Provider ID (e.g., "openai", "anthropic", "google") */
  providerId: string;

  /** Provider's native model identifier (e.g., "gpt-4o", "claude-sonnet-4-20250514") */
  modelIdentifier: string;

  /** Conversation messages */
  messages: Array<{ role: string; content: string }>;

  /** Optional system message (separated for providers like Anthropic) */
  systemMessage?: string;

  /** Maximum output tokens */
  maxTokens?: number;

  /** Sampling temperature (0.0–2.0) */
  temperature?: number;

  /** Unique request identifier for correlation */
  requestId: string;

  /** Optional metadata (user context, business context, etc.) */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────
// EXECUTION CONFIGURATION
// ─────────────────────────────────────────────────────

/**
 * Configuration for the execution boundary.
 * Controls timeout and future execution behavior.
 */
export interface ExecutionConfig {
  /** Execution timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/** Default execution timeout: 30 seconds */
export const DEFAULT_EXECUTION_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────────────
// PROVIDER ADAPTER INTERFACE
// ─────────────────────────────────────────────────────

/**
 * The execution-layer provider adapter contract.
 *
 * Each provider (OpenAI, Anthropic, Google, Mock) implements this
 * interface. The executor interacts ONLY with this interface —
 * never with provider-specific API code.
 *
 * This is distinct from the Phase 4 `AIProvider` interface:
 * - AIProvider: model discovery + text generation (Phase 4)
 * - ProviderAdapter: execution boundary for the routing pipeline (Phase 7)
 *
 * An adapter typically wraps an AIProvider instance and bridges
 * between ExecutionRequest ↔ NormalizedAIRequest.
 */
export interface ProviderAdapter {
  /** Provider identifier (must match database Provider.id prefix) */
  readonly providerId: string;

  /** Human-readable provider name */
  readonly providerName: string;

  /**
   * Check whether this adapter supports the given model.
   *
   * @param modelId  Internal database model ID
   * @returns        True if this adapter can execute requests for the model
   */
  supports(modelId: string): boolean;

  /**
   * Execute an LLM request through this provider.
   *
   * @param request  Provider-neutral execution request
   * @returns        Normalized execution result
   * @throws         On provider failure (executor normalizes unexpected errors)
   */
  execute(request: ExecutionRequest): Promise<ExecutionResult>;

  /**
   * Normalize a raw error into a structured execution error.
   *
   * @param error  Raw error from the provider or runtime
   * @returns      Normalized execution error
   */
  normalizeError(error: unknown): import("./errors").NormalizedExecutionError;
}

// ─────────────────────────────────────────────────────
// ADAPTER WRAPPER (shared implementation)
// ─────────────────────────────────────────────────────

/**
 * Base execution adapter that wraps an existing Phase 4 AIProvider.
 *
 * Bridges between the execution layer (ExecutionRequest/ExecutionResult)
 * and the provider layer (NormalizedAIRequest/NormalizedAIResponse).
 *
 * Provider-specific adapters (openai.ts, anthropic.ts, google.ts)
 * instantiate this with their respective AIProvider.
 */
export class BaseExecutionAdapter implements ProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;

  private readonly provider: AIProvider;
  private readonly modelIds: Set<string>;

  constructor(provider: AIProvider) {
    this.provider = provider;
    this.providerId = provider.id;
    this.providerName = provider.name;
    this.modelIds = new Set(provider.listModels().map((m) => m.id));
  }

  supports(modelId: string): boolean {
    return this.modelIds.has(modelId);
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Convert ExecutionRequest → NormalizedAIRequest
      const messages = buildMessages(request);

      const normalizedRequest = {
        messages,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        metadata: {
          ...request.metadata,
          requestId: request.requestId,
          modelId: request.modelId,
        },
      };

      // Delegate to the Phase 4 AIProvider
      const response = await this.provider.generate(
        normalizedRequest,
        request.modelIdentifier
      );

      const latencyMs = Date.now() - startTime;

      // Convert NormalizedAIResponse → ExecutionResult
      return {
        success: true,
        providerId: this.providerId,
        modelId: request.modelId,
        providerRequestId: response.id,
        content: response.content,
        usage: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.inputTokens + response.usage.outputTokens,
        },
        latencyMs: response.latencyMs || latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const normalized = this.normalizeError(error);

      return {
        success: false,
        providerId: this.providerId,
        modelId: request.modelId,
        error: {
          code: normalized.code,
          message: normalized.message,
          retryable: normalized.retryable,
        },
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  normalizeError(error: unknown): NormalizedExecutionError {
    // If it's an AttentraProviderError, map its code
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      "provider" in error
    ) {
      const providerError = error as {
        code: string;
        message: string;
        retryable: boolean;
        provider: string;
        providerCode?: string;
        providerMessage?: string;
      };

      return new NormalizedExecutionError(
        mapProviderErrorCode(providerError.code),
        sanitizeMessage(providerError.message),
        {
          retryable: providerError.retryable,
          provider: this.providerId,
          cause: error,
        }
      );
    }

    // Generic/unknown error
    return new NormalizedExecutionError(
      "UNKNOWN",
      sanitizeMessage(error instanceof Error ? error.message : "Unknown execution error"),
      { retryable: false, provider: this.providerId, cause: error }
    );
  }
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Build provider-neutral messages from an ExecutionRequest.
 * Separates system messages into the messages array with "system" role.
 */
function buildMessages(
  request: ExecutionRequest
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];

  // Add system message first if present
  if (request.systemMessage) {
    messages.push({ role: "system", content: request.systemMessage });
  }

  // Add conversation messages
  for (const msg of request.messages) {
    const role =
      msg.role === "system" || msg.role === "user" || msg.role === "assistant"
        ? msg.role
        : "user";
    messages.push({ role, content: msg.content });
  }

  return messages;
}

/**
 * Sanitize error messages to prevent secret leakage.
 * Strips common patterns that might contain API keys or tokens.
 */
function sanitizeMessage(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED]")
    .replace(/key[=:]\s*\S+/gi, "key=[REDACTED]")
    .replace(/token[=:]\s*\S+/gi, "token=[REDACTED]")
    .replace(/authorization[=:]\s*\S+/gi, "authorization=[REDACTED]");
}

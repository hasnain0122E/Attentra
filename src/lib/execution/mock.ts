/**
 * Attentra — Mock Provider Adapter
 *
 * Phase 7 / Step 1 — Provider Adapter Foundation
 *
 * Deterministic test adapter that simulates provider behavior
 * without making network calls. Supports configurable scenarios:
 *
 * - Success: returns a simulated response
 * - Timeout: simulates execution timeout
 * - Rate limit: simulates rate limit error
 * - Authentication: simulates authentication failure
 * - Invalid request: simulates malformed request error
 * - Model unavailable: simulates model not found error
 *
 * The mock adapter supports ANY modelId by default, making it
 * suitable for executor and registry tests without requiring
 * specific model registration.
 */

import type { ProviderAdapter, ExecutionRequest } from "./types";
import type { ExecutionResult } from "@/lib/routing/execution-plan";
import { NormalizedExecutionError, type ExecutionErrorCode } from "./errors";

/**
 * Configurable mock behavior.
 */
export type MockBehavior =
  | "success"
  | "timeout"
  | "rate_limit"
  | "authentication"
  | "invalid_request"
  | "model_unavailable"
  | "server_error"
  | "network_error"
  | "context_length";

/**
 * Mock provider adapter for testing.
 *
 * Does NOT make any network calls.
 * All responses are deterministic based on the configured behavior.
 */
export class MockProviderAdapter implements ProviderAdapter {
  readonly providerId = "mock";
  readonly providerName = "Mock Provider";

  private behavior: MockBehavior;
  private supportedModels: Set<string>;
  private latencyMs: number;

  constructor(options?: {
    behavior?: MockBehavior;
    supportedModels?: string[];
    latencyMs?: number;
  }) {
    this.behavior = options?.behavior ?? "success";
    this.supportedModels = new Set(options?.supportedModels ?? []);
    this.latencyMs = options?.latencyMs ?? 50;
  }

  /**
   * Change the mock behavior at runtime (for testing different scenarios).
   */
  setBehavior(behavior: MockBehavior): void {
    this.behavior = behavior;
  }

  /**
   * Add a model ID to the supported set.
   */
  addModel(modelId: string): void {
    this.supportedModels.add(modelId);
  }

  supports(modelId: string): boolean {
    // If no specific models configured, support everything
    if (this.supportedModels.size === 0) return true;
    return this.supportedModels.has(modelId);
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // Simulate network latency
    await delay(this.latencyMs);

    const timestamp = new Date().toISOString();

    switch (this.behavior) {
      case "success":
        return {
          success: true,
          providerId: this.providerId,
          modelId: request.modelId,
          providerRequestId: `mock-${Date.now()}`,
          content: `Mock response for ${request.modelIdentifier}`,
          usage: {
            inputTokens: estimateTokens(request.messages),
            outputTokens: 100,
            totalTokens: estimateTokens(request.messages) + 100,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      case "timeout":
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "TIMEOUT",
            message: "Mock execution timed out",
            retryable: true,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      case "rate_limit":
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "RATE_LIMIT",
            message: "Mock rate limit exceeded",
            retryable: true,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      case "authentication":
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "AUTHENTICATION",
            message: "Mock authentication failed",
            retryable: false,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      case "invalid_request":
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "INVALID_REQUEST",
            message: "Mock invalid request",
            retryable: false,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      case "model_unavailable":
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "MODEL_UNAVAILABLE",
            message: `Mock model "${request.modelIdentifier}" is unavailable`,
            retryable: false,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      case "server_error":
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "SERVER_ERROR",
            message: "Mock server error (5xx)",
            retryable: true,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      case "network_error":
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "NETWORK_ERROR",
            message: "Mock network connectivity failure",
            retryable: true,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      case "context_length":
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "CONTEXT_LENGTH",
            message: "Mock context length exceeded",
            retryable: false,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };

      default:
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "UNKNOWN",
            message: `Unknown mock behavior: ${this.behavior}`,
            retryable: false,
          },
          latencyMs: this.latencyMs,
          timestamp,
        };
    }
  }

  normalizeError(error: unknown): NormalizedExecutionError {
    if (error instanceof NormalizedExecutionError) {
      return error;
    }
    return new NormalizedExecutionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Mock error",
      { retryable: false, provider: this.providerId, cause: error }
    );
  }
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Simple delay utility for simulating latency.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rough token estimation for mock responses.
 * Uses characters/4 approximation (same as routing token estimator).
 */
function estimateTokens(
  messages: Array<{ role: string; content: string }>
): number {
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.ceil(totalChars / 4);
}

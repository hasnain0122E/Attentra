/**
 * Attentra — Provider-Neutral Executor
 *
 * Phase 7 / Step 1 — Provider Adapter Foundation
 *
 * The executor is the single entry point for executing LLM requests
 * through provider adapters. It:
 *
 * 1. Receives an ExecutionRequest
 * 2. Resolves the provider adapter from the registry
 * 3. Validates adapter availability
 * 4. Calls the adapter with timeout protection
 * 5. Returns a normalized ExecutionResult
 * 6. Normalizes unexpected failures
 * 7. Measures latency at the execution boundary
 *
 * The executor MUST NOT:
 * - Choose models or score candidates (routing responsibility)
 * - Implement automatic fallback (Phase 7 Step 3)
 * - Call multiple providers automatically
 * - Contain provider-specific API code
 *
 * One execution request → one adapter → one normalized result.
 */

import type { ExecutionRequest, ExecutionConfig, ProviderAdapter } from "./types";
import { DEFAULT_EXECUTION_TIMEOUT_MS } from "./types";
import type { ExecutionResult } from "@/lib/routing/execution-plan";
import { ExecutionAdapterRegistry } from "./registry";
import {
  NormalizedExecutionError,
  normalizeAnyError,
} from "./errors";

// ─────────────────────────────────────────────────────
// EXECUTOR
// ─────────────────────────────────────────────────────

/**
 * Provider-neutral execution service.
 *
 * Executes a single request through the appropriate provider adapter,
 * with timeout protection and error normalization.
 */
export class Executor {
  private readonly registry: ExecutionAdapterRegistry;
  private readonly defaultTimeoutMs: number;

  constructor(
    registry: ExecutionAdapterRegistry,
    config?: ExecutionConfig
  ) {
    this.registry = registry;
    this.defaultTimeoutMs =
      config?.timeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;
  }

  /**
   * Execute a request through the appropriate provider adapter.
   *
   * @param request  Provider-neutral execution request
   * @param config   Optional per-request execution config override
   * @returns        Normalized execution result
   */
  async execute(
    request: ExecutionRequest,
    config?: ExecutionConfig
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeoutMs = config?.timeoutMs ?? this.defaultTimeoutMs;

    try {
      // 1. Resolve the adapter
      const adapter = this.registry.getAdapter(request.providerId);

      // 2. Validate model support
      if (!adapter.supports(request.modelId)) {
        return buildFailureResult(
          request,
          new NormalizedExecutionError(
            "MODEL_UNAVAILABLE",
            `Provider "${request.providerId}" does not support model "${request.modelId}"`,
            { retryable: false, provider: request.providerId }
          ),
          Date.now() - startTime
        );
      }

      // 3. Execute with timeout protection
      const result = await executeWithTimeout(
        adapter,
        request,
        timeoutMs
      );

      return result;
    } catch (error) {
      // Normalize any error (including timeout — normalizeAnyError detects timeout patterns)
      const normalized = normalizeAnyError(error, request.providerId);

      return buildFailureResult(
        request,
        normalized,
        Date.now() - startTime
      );
    }
  }
}

// ─────────────────────────────────────────────────────
// CONVENIENCE FUNCTION
// ─────────────────────────────────────────────────────

/**
 * Execute a request using a registry and optional config.
 *
 * Convenience wrapper around Executor for simple use cases.
 *
 * @param request   Provider-neutral execution request
 * @param registry  Execution adapter registry
 * @param config    Optional execution configuration
 * @returns         Normalized execution result
 */
export async function executeRequest(
  request: ExecutionRequest,
  registry: ExecutionAdapterRegistry,
  config?: ExecutionConfig
): Promise<ExecutionResult> {
  const executor = new Executor(registry, config);
  return executor.execute(request, config);
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Execute an adapter call with timeout protection.
 *
 * Uses Promise.race() to enforce the timeout boundary.
 * If the adapter doesn't complete within timeoutMs, a
 * TIMEOUT error is returned.
 */
async function executeWithTimeout(
  adapter: ProviderAdapter,
  request: ExecutionRequest,
  timeoutMs: number
): Promise<ExecutionResult> {
  const executionPromise = adapter.execute(request);

  const timeoutPromise = new Promise<ExecutionResult>((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        success: false,
        providerId: request.providerId,
        modelId: request.modelId,
        error: {
          code: "TIMEOUT",
          message: `Execution timed out after ${timeoutMs}ms`,
          retryable: true,
        },
        timestamp: new Date().toISOString(),
      });
    }, timeoutMs);

    // Prevent the timer from keeping the process alive
    if (typeof timer === "object" && "unref" in timer) {
      (timer as NodeJS.Timeout).unref();
    }
  });

  return Promise.race([executionPromise, timeoutPromise]);
}

/**
 * Build a failure ExecutionResult from a NormalizedExecutionError.
 */
function buildFailureResult(
  request: ExecutionRequest,
  error: NormalizedExecutionError,
  latencyMs: number
): ExecutionResult {
  return {
    success: false,
    providerId: request.providerId,
    modelId: request.modelId,
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    },
    latencyMs,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Attentra — OpenRouter Execution Adapter
 *
 * Phase 8 / Step 1 — OpenRouter Provider Adapter
 *
 * Native HTTP adapter that executes requests against the OpenRouter
 * OpenAI-compatible chat completion API using native fetch.
 *
 * OpenRouter API:
 *   POST ${OPENROUTER_BASE_URL}/chat/completions
 *   Authorization: Bearer ${OPENROUTER_API_KEY}
 *
 * Architecture:
 *   ExecutionPlan → ExecutionRequest
 *     → OpenRouterExecutionAdapter.execute()
 *     → fetch(OPENROUTER_BASE_URL/chat/completions)
 *     → ExecutionResult
 *
 * Key design decisions:
 *   - Uses native fetch (no SDK dependency)
 *   - AbortController for timeout handling
 *   - API key read from environment at execution time (not import time)
 *   - Model ID comes from ExecutionPlan — no hardcoded model names
 *   - Supports any model the router selects (no model allowlist)
 *   - actualCost is left undefined (belongs to billing step)
 *   - No OpenRouter Auto Router — Attentra is the intelligent router
 *
 * Security:
 *   - OPENROUTER_API_KEY is server-side only (no NEXT_PUBLIC_)
 *   - API key never appears in error messages or logs
 *   - Error messages are sanitized to strip credentials
 */

import type {
  ProviderAdapter,
  ExecutionRequest,
  ExecutionOptions,
} from "../types";
import type {
  ExecutionResult,
  ExecutionTarget,
} from "@/lib/routing/execution-plan";
import {
  NormalizedExecutionError,
  type ExecutionErrorCode,
  sanitizeErrorMessage,
} from "../errors";

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

/** Internal provider identifier for OpenRouter */
export const OPENROUTER_PROVIDER_ID = "openrouter";

/** Human-readable provider name */
export const OPENROUTER_PROVIDER_NAME = "OpenRouter";

/** Default OpenRouter API base URL */
export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Default OpenRouter timeout: 30 seconds */
export const DEFAULT_OPENROUTER_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────

/**
 * OpenRouter adapter configuration.
 *
 * Values are read from environment variables when not explicitly provided.
 * The API key is validated at execution time, not at construction time,
 * so the adapter can be instantiated without a key for testing.
 */
export interface OpenRouterConfig {
  /** OpenRouter API key (server-side only, never NEXT_PUBLIC_) */
  apiKey?: string;

  /** API base URL (default: https://openrouter.ai/api/v1) */
  baseUrl?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Resolve OpenRouter configuration from explicit values, per-request options,
 * and environment (highest precedence first):
 *
 *   per-request options.timeoutMs
 *   → constructor config
 *   → OPENROUTER_API_KEY / OPENROUTER_BASE_URL / OPENROUTER_TIMEOUT_MS
 *   → safe defaults
 */
function resolveConfig(
  config?: OpenRouterConfig,
  options?: ExecutionOptions
): {
  apiKey: string | undefined;
  baseUrl: string;
  timeoutMs: number;
} {
  return {
    apiKey: config?.apiKey ?? process.env.OPENROUTER_API_KEY,
    baseUrl:
      config?.baseUrl ??
      process.env.OPENROUTER_BASE_URL ??
      DEFAULT_OPENROUTER_BASE_URL,
    timeoutMs:
      options?.timeoutMs ??
      config?.timeoutMs ??
      (process.env.OPENROUTER_TIMEOUT_MS
        ? parseInt(process.env.OPENROUTER_TIMEOUT_MS, 10)
        : DEFAULT_OPENROUTER_TIMEOUT_MS),
  };
}

// ─────────────────────────────────────────────────────
// OPENROUTER EXECUTION ADAPTER
// ─────────────────────────────────────────────────────

/**
 * OpenRouter provider execution adapter.
 *
 * Implements the ProviderAdapter interface using native fetch against
 * the OpenRouter OpenAI-compatible chat completion endpoint.
 *
 * Supports any model — the model ID comes from the ExecutionPlan,
 * not from a hardcoded list. Attentra selects the model; this adapter
 * executes it. OpenRouter's Auto Router is NOT used.
 */
export class OpenRouterExecutionAdapter implements ProviderAdapter {
  readonly providerId = OPENROUTER_PROVIDER_ID;
  readonly providerName = OPENROUTER_PROVIDER_NAME;

  /** Capability metadata (informational only — model selection stays in routing) */
  readonly capabilities: readonly string[] = ["chat", "openai-compatible"];

  private readonly config: OpenRouterConfig;

  constructor(config?: OpenRouterConfig) {
    this.config = config ?? {};
  }

  /**
   * OpenRouter supports any model — the router selects the model,
   * and this adapter executes it without a hardcoded allowlist.
   */
  supports(_modelId: string): boolean {
    return true;
  }

  /**
   * Execute a request against the OpenRouter chat completion API.
   *
   * Flow:
   * 1. Resolve and validate configuration (env vars + explicit config
   *    + per-request options override)
   * 2. Build OpenAI-compatible request body
   * 3. Set up AbortController for timeout
   * 4. POST to OpenRouter
   * 5. Parse and normalize response
   * 6. Return ExecutionResult
   *
   * @param request  Provider-neutral execution request
   * @param _target  Optional ExecutionPlan target context
   * @param options  Optional per-request execution options (timeoutMs)
   */
  async execute(
    request: ExecutionRequest,
    _target?: ExecutionTarget,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const resolved = resolveConfig(this.config, options);

    // 1. Validate API key
    if (!resolved.apiKey) {
      return buildFailureResult(
        request,
        new NormalizedExecutionError(
          "MISSING_API_KEY",
          "OpenRouter API key is not configured. " +
            "Set the OPENROUTER_API_KEY environment variable.",
          { retryable: false, provider: this.providerId }
        ),
        Date.now() - startTime
      );
    }

    // 2. Build request body
    const body = buildRequestBody(request);

    // 3. Set up timeout with AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), resolved.timeoutMs);

    // Prevent timer from keeping the process alive
    if (typeof timer === "object" && "unref" in timer) {
      (timer as NodeJS.Timeout).unref();
    }

    try {
      const url = `${resolved.baseUrl}/chat/completions`;

      // 4. Execute the request
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolved.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // 5. Handle non-OK responses
      if (!response.ok) {
        return await handleErrorResponse(
          response,
          request,
          this.providerId
        );
      }

      // 6. Parse and normalize successful response
      let data: Record<string, unknown>;
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        return {
          success: false,
          providerId: this.providerId,
          modelId: request.modelId,
          error: {
            code: "INVALID_RESPONSE",
            message: "OpenRouter returned a non-JSON response",
            retryable: false,
          },
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }
      const latencyMs = Date.now() - startTime;

      return normalizeResponse(data, request, this.providerId, latencyMs);
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;

      // AbortController timeout
      if (
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.includes("aborted") ||
          error.message.includes("abort"))
      ) {
        return buildFailureResult(
          request,
          new NormalizedExecutionError(
            "REQUEST_TIMEOUT",
            `OpenRouter request timed out after ${resolved.timeoutMs}ms`,
            { retryable: true, provider: this.providerId, cause: error }
          ),
          latencyMs
        );
      }

      // Network errors (DNS, connection refused, etc.)
      if (
        error instanceof Error &&
        (error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("network"))
      ) {
        return buildFailureResult(
          request,
          new NormalizedExecutionError(
            "NETWORK_ERROR",
            sanitizeErrorMessage(error.message),
            { retryable: true, provider: this.providerId, cause: error }
          ),
          latencyMs
        );
      }

      // Unexpected error
      return buildFailureResult(
        request,
        new NormalizedExecutionError(
          "UNKNOWN",
          sanitizeErrorMessage(
            error instanceof Error ? error.message : "Unknown OpenRouter error"
          ),
          { retryable: false, provider: this.providerId, cause: error }
        ),
        latencyMs
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Normalize a raw error into a structured execution error.
   */
  normalizeError(error: unknown): NormalizedExecutionError {
    if (error instanceof NormalizedExecutionError) {
      return error;
    }
    return new NormalizedExecutionError(
      "UNKNOWN",
      sanitizeErrorMessage(
        error instanceof Error ? error.message : "Unknown OpenRouter error"
      ),
      { retryable: false, provider: this.providerId, cause: error }
    );
  }
}

// ─────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────

/**
 * Create an OpenRouter execution adapter with optional configuration.
 *
 * @param config  Optional configuration override (env vars used as fallback)
 * @returns       OpenRouter execution adapter
 */
export function createOpenRouterAdapter(
  config?: OpenRouterConfig
): OpenRouterExecutionAdapter {
  return new OpenRouterExecutionAdapter(config);
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Build the OpenAI-compatible request body for OpenRouter.
 *
 * Maps ExecutionRequest fields to the OpenRouter API format.
 * Only sends optional parameters when they are present.
 */
function buildRequestBody(
  request: ExecutionRequest
): Record<string, unknown> {
  const messages: Array<{ role: string; content: string }> = [];

  // System message first
  if (request.systemMessage) {
    messages.push({ role: "system", content: request.systemMessage });
  }

  // Conversation messages (preserve order)
  for (const msg of request.messages) {
    messages.push({
      role: msg.role || "user",
      content: msg.content,
    });
  }

  const body: Record<string, unknown> = {
    model: request.modelIdentifier,
    messages,
  };

  // Only include max_tokens when specified
  if (request.maxTokens !== undefined) {
    body.max_tokens = request.maxTokens;
  }

  // Only include temperature when specified
  if (request.temperature !== undefined) {
    body.temperature = request.temperature;
  }

  return body;
}

/**
 * Handle a non-OK HTTP response from OpenRouter.
 *
 * Maps HTTP status codes to structured execution errors:
 *   400 → INVALID_REQUEST
 *   401 → AUTHENTICATION
 *   403 → AUTHENTICATION
 *   404 → MODEL_UNAVAILABLE
 *   408 → REQUEST_TIMEOUT
 *   429 → RATE_LIMIT
 *   5xx → SERVER_ERROR
 */
async function handleErrorResponse(
  response: Response,
  request: ExecutionRequest,
  providerId: string
): Promise<ExecutionResult> {
  let errorMessage = `OpenRouter returned HTTP ${response.status}`;
  try {
    const errorBody = await response.json();
    if (errorBody?.error?.message) {
      errorMessage = sanitizeErrorMessage(errorBody.error.message);
    } else if (typeof errorBody?.message === "string") {
      errorMessage = sanitizeErrorMessage(errorBody.message);
    }
  } catch {
    // Response body is not valid JSON — use status text
    if (response.statusText) {
      errorMessage = `OpenRouter returned HTTP ${response.status}: ${response.statusText}`;
    }
  }

  const code = mapHttpStatusToErrorCode(response.status);
  const retryable = isHttpStatusRetryable(response.status);

  return {
    success: false,
    providerId,
    modelId: request.modelId,
    error: {
      code,
      message: errorMessage,
      retryable,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Map HTTP status code to an ExecutionErrorCode.
 */
function mapHttpStatusToErrorCode(status: number): ExecutionErrorCode {
  switch (status) {
    case 400:
      return "INVALID_REQUEST";
    case 401:
      return "AUTHENTICATION";
    case 403:
      return "AUTHENTICATION";
    case 404:
      return "MODEL_UNAVAILABLE";
    case 408:
      return "REQUEST_TIMEOUT";
    case 429:
      return "RATE_LIMIT";
    default:
      if (status >= 500) return "SERVER_ERROR";
      if (status >= 400) return "INVALID_REQUEST";
      return "UNKNOWN";
  }
}

/**
 * Determine if an HTTP status code is retryable.
 */
function isHttpStatusRetryable(status: number): boolean {
  if (status === 408 || status === 429) return true;
  if (status >= 500) return true;
  return false;
}

/**
 * Normalize a successful OpenRouter response into an ExecutionResult.
 *
 * OpenRouter returns OpenAI-compatible format:
 *   {
 *     id: "...",
 *     model: "...",
 *     choices: [{ message: { role, content } }],
 *     usage: { prompt_tokens, completion_tokens, total_tokens }
 *   }
 *
 * actualCost is intentionally left undefined — it belongs to the
 * billing/cost step, not the execution adapter.
 */
function normalizeResponse(
  data: Record<string, unknown>,
  request: ExecutionRequest,
  providerId: string,
  latencyMs: number
): ExecutionResult {
  // Validate response structure
  if (!data || typeof data !== "object") {
    return {
      success: false,
      providerId,
      modelId: request.modelId,
      error: {
        code: "INVALID_RESPONSE",
        message: "OpenRouter returned a malformed response",
        retryable: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  const choices = data.choices as
    | Array<{ message?: { content?: string } }>
    | undefined;

  if (!Array.isArray(choices) || choices.length === 0) {
    return {
      success: false,
      providerId,
      modelId: request.modelId,
      error: {
        code: "INVALID_RESPONSE",
        message: "OpenRouter response has no choices",
        retryable: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  const firstChoice = choices[0];
  const content = firstChoice?.message?.content ?? undefined;

  // Extract usage
  const usageData = data.usage as
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      }
    | undefined;

  const usage = usageData
    ? {
        inputTokens: usageData.prompt_tokens ?? 0,
        outputTokens: usageData.completion_tokens ?? 0,
        totalTokens:
          usageData.total_tokens ??
          (usageData.prompt_tokens ?? 0) +
            (usageData.completion_tokens ?? 0),
      }
    : undefined;

  return {
    success: true,
    providerId,
    modelId: request.modelId,
    providerRequestId: typeof data.id === "string" ? data.id : undefined,
    content: content ?? undefined,
    usage,
    latencyMs,
    // actualCost is intentionally undefined — populated by billing step
    timestamp: new Date().toISOString(),
  };
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
    providerId: request.providerId || error.provider,
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

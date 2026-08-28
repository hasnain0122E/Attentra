/**
 * Attentra — BlueMinds Execution Adapter
 *
 * Phase 7 / Step 2 — Provider Execution Abstraction + BlueMinds Adapter
 *
 * Native HTTP adapter that executes requests against the BlueMinds
 * OpenAI-compatible chat completion API using native fetch.
 *
 * BlueMinds API:
 *   POST ${BLUEMINDS_BASE_URL}/chat/completions
 *   Authorization: Bearer ${BLUEMINDS_API_KEY}
 *
 * Architecture:
 *   ExecutionPlan → ExecutionRequest
 *     → BlueMindsExecutionAdapter.execute()
 *     → fetch(BLUEMINDS_BASE_URL/chat/completions)
 *     → ExecutionResult
 *
 * Key design decisions:
 *   - Uses native fetch (no SDK dependency)
 *   - AbortController for timeout handling
 *   - API key read from environment at execution time (not import time)
 *   - Model ID comes from ExecutionPlan — no hardcoded model names
 *   - Supports any model the router selects (no model allowlist)
 *   - actualCost is left undefined (belongs to billing step)
 *
 * Security:
 *   - BLUEMINDS_API_KEY is server-side only (no NEXT_PUBLIC_)
 *   - API key never appears in error messages or logs
 *   - Error messages are sanitized to strip credentials
 */

import type { ProviderAdapter, ExecutionRequest } from "../types";
import type { ExecutionResult } from "@/lib/routing/execution-plan";
import {
  NormalizedExecutionError,
  type ExecutionErrorCode,
  sanitizeErrorMessage,
} from "../errors";

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

/** Internal provider identifier for BlueMinds */
export const BLUEMINDS_PROVIDER_ID = "blueminds";

/** Human-readable provider name */
export const BLUEMINDS_PROVIDER_NAME = "BlueMinds";

/** Default BlueMinds API base URL */
export const DEFAULT_BLUEMINDS_BASE_URL = "https://api.bluesminds.com/v1";

/** Default BlueMinds timeout: 30 seconds */
export const DEFAULT_BLUEMINDS_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────

/**
 * BlueMinds adapter configuration.
 *
 * Values are read from environment variables when not explicitly provided.
 * The API key is validated at execution time, not at construction time,
 * so the adapter can be instantiated without a key for testing.
 */
export interface BlueMindsConfig {
  /** BlueMinds API key (server-side only, never NEXT_PUBLIC_) */
  apiKey?: string;

  /** API base URL (default: https://api.bluesminds.com/v1) */
  baseUrl?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Resolve BlueMinds configuration from explicit values and environment.
 *
 * Environment variables:
 *   BLUEMINDS_API_KEY      — API key
 *   BLUEMINDS_BASE_URL     — Base URL override
 *   BLUEMINDS_TIMEOUT_MS   — Timeout override
 */
function resolveConfig(config?: BlueMindsConfig): {
  apiKey: string | undefined;
  baseUrl: string;
  timeoutMs: number;
} {
  return {
    apiKey: config?.apiKey ?? process.env.BLUEMINDS_API_KEY,
    baseUrl:
      config?.baseUrl ??
      process.env.BLUEMINDS_BASE_URL ??
      DEFAULT_BLUEMINDS_BASE_URL,
    timeoutMs:
      config?.timeoutMs ??
      (process.env.BLUEMINDS_TIMEOUT_MS
        ? parseInt(process.env.BLUEMINDS_TIMEOUT_MS, 10)
        : DEFAULT_BLUEMINDS_TIMEOUT_MS),
  };
}

// ─────────────────────────────────────────────────────
// BLUEMINDS EXECUTION ADAPTER
// ─────────────────────────────────────────────────────

/**
 * BlueMinds provider execution adapter.
 *
 * Implements the ProviderAdapter interface using native fetch against
 * the BlueMinds OpenAI-compatible chat completion endpoint.
 *
 * Supports any model — the model ID comes from the ExecutionPlan,
 * not from a hardcoded list. This allows the router to select any
 * BlueMinds model without adapter changes.
 */
export class BlueMindsExecutionAdapter implements ProviderAdapter {
  readonly providerId = BLUEMINDS_PROVIDER_ID;
  readonly providerName = BLUEMINDS_PROVIDER_NAME;

  private readonly config: BlueMindsConfig;

  constructor(config?: BlueMindsConfig) {
    this.config = config ?? {};
  }

  /**
   * BlueMinds supports any model — the router selects the model,
   * and this adapter executes it without a hardcoded allowlist.
   */
  supports(_modelId: string): boolean {
    return true;
  }

  /**
   * Execute a request against the BlueMinds chat completion API.
   *
   * Flow:
   * 1. Resolve and validate configuration (env vars + explicit config)
   * 2. Build OpenAI-compatible request body
   * 3. Set up AbortController for timeout
   * 4. POST to BlueMinds
   * 5. Parse and normalize response
   * 6. Return ExecutionResult
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const resolved = resolveConfig(this.config);

    // 1. Validate API key
    if (!resolved.apiKey) {
      return buildFailureResult(
        request,
        new NormalizedExecutionError(
          "MISSING_API_KEY",
          "BlueMinds API key is not configured. " +
            "Set the BLUEMINDS_API_KEY environment variable.",
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
        const errorResult = await handleErrorResponse(
          response,
          request,
          this.providerId
        );
        return errorResult;
      }

      // 6. Parse and normalize successful response
      const data = await response.json();
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
            `BlueMinds request timed out after ${resolved.timeoutMs}ms`,
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
            error instanceof Error ? error.message : "Unknown BlueMinds error"
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
        error instanceof Error ? error.message : "Unknown BlueMinds error"
      ),
      { retryable: false, provider: this.providerId, cause: error }
    );
  }
}

// ─────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────

/**
 * Create a BlueMinds execution adapter with optional configuration.
 *
 * @param config  Optional configuration override (env vars used as fallback)
 * @returns       BlueMinds execution adapter
 */
export function createBlueMindsAdapter(
  config?: BlueMindsConfig
): BlueMindsExecutionAdapter {
  return new BlueMindsExecutionAdapter(config);
}

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Build the OpenAI-compatible request body for BlueMinds.
 *
 * Maps ExecutionRequest fields to the BlueMinds API format.
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
 * Handle a non-OK HTTP response from BlueMinds.
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
  let errorMessage = `BlueMinds returned HTTP ${response.status}`;
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
      errorMessage = `BlueMinds returned HTTP ${response.status}: ${response.statusText}`;
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
  // Retryable: 408 timeout, 429 rate limit, 5xx server errors
  if (status === 408 || status === 429) return true;
  if (status >= 500) return true;
  return false;
}

/**
 * Normalize a successful BlueMinds response into an ExecutionResult.
 *
 * BlueMinds returns OpenAI-compatible format:
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
        message: "BlueMinds returned a malformed response",
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
        message: "BlueMinds response has no choices",
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

  // Model: prefer provider-returned model, fallback to requested
  const responseModelId =
    typeof data.model === "string" ? data.model : request.modelId;

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

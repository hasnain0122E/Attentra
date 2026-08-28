/**
 * Attentra — Execution Error Normalization
 *
 * Phase 7 / Step 1–2 — Provider Adapter Foundation + Execution Abstraction
 *
 * Defines the provider-neutral error contract for the execution layer.
 * Converts provider-specific errors into a normalized representation
 * that the executor and fallback logic can consume uniformly.
 *
 * Error codes:
 *   AUTHENTICATION        — Invalid API credentials (not retryable)
 *   RATE_LIMIT            — Provider rate limit exceeded (retryable)
 *   TIMEOUT               — Execution exceeded configured timeout (retryable)
 *   REQUEST_TIMEOUT       — HTTP-level request timeout / AbortController (retryable)
 *   INVALID_REQUEST       — Malformed request (not retryable)
 *   MODEL_UNAVAILABLE     — Model not found or unavailable (not retryable)
 *   CONTEXT_LENGTH        — Input exceeds model context window (not retryable)
 *   SERVER_ERROR          — Provider server error (retryable)
 *   NETWORK_ERROR         — Network connectivity failure (retryable)
 *   MISSING_API_KEY       — Provider API key not configured (not retryable)
 *   INVALID_CONFIGURATION — Invalid execution configuration (not retryable)
 *   INVALID_RESPONSE      — Malformed provider response (not retryable)
 *   INVALID_EXECUTION_PLAN — Malformed execution plan (not retryable)
 *   UNKNOWN               — Unclassified error (not retryable)
 *
 * Security:
 *   Error messages are sanitized to prevent leakage of API keys,
 *   authorization tokens, or other sensitive values.
 */

// ─────────────────────────────────────────────────────
// ERROR CODES
// ─────────────────────────────────────────────────────

/**
 * Normalized execution error codes.
 * Every provider-specific error must map to one of these.
 */
export type ExecutionErrorCode =
  | "AUTHENTICATION"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "REQUEST_TIMEOUT"
  | "INVALID_REQUEST"
  | "MODEL_UNAVAILABLE"
  | "CONTEXT_LENGTH"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "MISSING_API_KEY"
  | "INVALID_CONFIGURATION"
  | "INVALID_RESPONSE"
  | "INVALID_EXECUTION_PLAN"
  | "UNKNOWN";

// ─────────────────────────────────────────────────────
// RETRYABILITY MAP
// ─────────────────────────────────────────────────────

/**
 * Default retryability for each error code.
 * Determines whether the executor should consider fallback.
 */
const RETRYABLE_MAP: Record<ExecutionErrorCode, boolean> = {
  AUTHENTICATION: false,
  RATE_LIMIT: true,
  TIMEOUT: true,
  REQUEST_TIMEOUT: true,
  INVALID_REQUEST: false,
  MODEL_UNAVAILABLE: false,
  CONTEXT_LENGTH: false,
  SERVER_ERROR: true,
  NETWORK_ERROR: true,
  MISSING_API_KEY: false,
  INVALID_CONFIGURATION: false,
  INVALID_RESPONSE: false,
  INVALID_EXECUTION_PLAN: false,
  UNKNOWN: false,
};

/**
 * Check whether an error code is retryable by default.
 */
export function isRetryable(code: ExecutionErrorCode): boolean {
  return RETRYABLE_MAP[code] ?? false;
}

// ─────────────────────────────────────────────────────
// NORMALIZED EXECUTION ERROR
// ─────────────────────────────────────────────────────

/**
 * Normalized execution error.
 *
 * All provider-specific errors are converted to this class so the
 * executor can handle failures uniformly without provider-specific
 * branching.
 */
export class NormalizedExecutionError extends Error {
  /** Normalized error code */
  readonly code: ExecutionErrorCode;

  /** Whether this error is retryable (suitable for fallback) */
  readonly retryable: boolean;

  /** Provider that produced the error */
  readonly provider?: string;

  /** Original error (for debugging — never exposed to consumers) */
  readonly cause?: unknown;

  constructor(
    code: ExecutionErrorCode,
    message: string,
    options?: {
      retryable?: boolean;
      provider?: string;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "NormalizedExecutionError";
    this.code = code;
    this.retryable = options?.retryable ?? isRetryable(code);
    this.provider = options?.provider;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

// ─────────────────────────────────────────────────────
// PROVIDER ERROR CODE MAPPING
// ─────────────────────────────────────────────────────

/**
 * Map a Phase 4 AttentraProviderError code to an execution error code.
 *
 * The Phase 4 error codes (from src/lib/providers/types.ts) use
 * slightly different naming. This function bridges the two namespaces.
 */
export function mapProviderErrorCode(providerCode: string): ExecutionErrorCode {
  switch (providerCode) {
    case "AUTHENTICATION_ERROR":
      return "AUTHENTICATION";
    case "RATE_LIMIT_ERROR":
      return "RATE_LIMIT";
    case "TIMEOUT_ERROR":
      return "TIMEOUT";
    case "INVALID_REQUEST_ERROR":
      return "INVALID_REQUEST";
    case "MODEL_NOT_FOUND":
      return "MODEL_UNAVAILABLE";
    case "CONTEXT_LENGTH_ERROR":
      return "CONTEXT_LENGTH";
    case "PROVIDER_UNAVAILABLE":
      return "SERVER_ERROR";
    case "PROVIDER_ERROR":
      return "SERVER_ERROR";
    default:
      return "UNKNOWN";
  }
}

// ─────────────────────────────────────────────────────
// ERROR FACTORY
// ─────────────────────────────────────────────────────

/**
 * Create a NormalizedExecutionError from any error value.
 *
 * Handles:
 * - Existing NormalizedExecutionError (pass-through)
 * - AttentraProviderError (maps code and sanitizes message)
 * - Standard Error objects
 * - Unknown values (string coercion)
 *
 * Messages are sanitized to prevent secret leakage.
 */
export function normalizeAnyError(
  error: unknown,
  providerId?: string
): NormalizedExecutionError {
  // Already normalized — return as-is
  if (error instanceof NormalizedExecutionError) {
    return error;
  }

  // AttentraProviderError from Phase 4
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "provider" in error
  ) {
    const pe = error as {
      code: string;
      message: string;
      retryable: boolean;
      provider: string;
    };
    return new NormalizedExecutionError(
      mapProviderErrorCode(pe.code),
      sanitizeErrorMessage(pe.message),
      {
        retryable: pe.retryable,
        provider: pe.provider,
        cause: error,
      }
    );
  }

  // Timeout detection from AbortController / AbortSignal
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted")) {
      return new NormalizedExecutionError(
        "TIMEOUT",
        sanitizeErrorMessage(error.message),
        { retryable: true, provider: providerId, cause: error }
      );
    }
    if (
      msg.includes("econnrefused") ||
      msg.includes("enotfound") ||
      msg.includes("network") ||
      msg.includes("fetch failed")
    ) {
      return new NormalizedExecutionError(
        "NETWORK_ERROR",
        sanitizeErrorMessage(error.message),
        { retryable: true, provider: providerId, cause: error }
      );
    }
    return new NormalizedExecutionError(
      "UNKNOWN",
      sanitizeErrorMessage(error.message),
      { retryable: false, provider: providerId, cause: error }
    );
  }

  // Completely unknown error
  return new NormalizedExecutionError(
    "UNKNOWN",
    "An unknown execution error occurred",
    { retryable: false, provider: providerId, cause: error }
  );
}

// ─────────────────────────────────────────────────────
// MESSAGE SANITIZATION
// ─────────────────────────────────────────────────────

/**
 * Sanitize an error message to prevent secret leakage.
 *
 * Strips patterns that commonly contain:
 * - API keys (sk-...)
 * - Bearer tokens
 * - Authorization headers
 * - Key=value credential pairs
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return "Unknown error";

  return message
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/key[=:]\s*\S+/gi, "key=[REDACTED]")
    .replace(/token[=:]\s*\S+/gi, "token=[REDACTED]")
    .replace(/authorization[=:]\s*\S+/gi, "authorization=[REDACTED]")
    .replace(/secret[=:]\s*\S+/gi, "secret=[REDACTED]")
    .replace(/password[=:]\s*\S+/gi, "password=[REDACTED]");
}

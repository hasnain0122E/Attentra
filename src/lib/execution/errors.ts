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
 * - API keys (sk-..., incl. sk-ant-/sk-proj-; Google AIza...; Attentra atr_...)
 * - Bearer tokens
 * - Authorization headers
 * - Key=value credential pairs
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return "Unknown error";

  return message
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, "[REDACTED]")
    .replace(/atr_[0-9a-f]{16,}/gi, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/key[=:]\s*\S+/gi, "key=[REDACTED]")
    .replace(/token[=:]\s*\S+/gi, "token=[REDACTED]")
    .replace(/authorization[=:]\s*\S+/gi, "authorization=[REDACTED]")
    .replace(/secret[=:]\s*\S+/gi, "secret=[REDACTED]")
    .replace(/password[=:]\s*\S+/gi, "password=[REDACTED]");
}

// ─────────────────────────────────────────────────────
// ATTEMPT FAILURE CLASSIFICATION (diagnostics only)
// ─────────────────────────────────────────────────────

/**
 * Diagnostic category for a failed provider attempt.
 *
 * Finer-grained than ExecutionErrorCode so logs distinguish, e.g., a
 * model retired for the provider account from a transient rate limit.
 * Used for logging only — fallback decisions still use the error code.
 */
export type AttemptFailureCategory =
  | "model_unavailable_for_account"
  | "model_not_found"
  | "quota_exhausted"
  | "rate_limited"
  | "permission_denied"
  | "auth_failed"
  | "timeout"
  | "provider_unavailable"
  | "network"
  | "invalid_request"
  | "context_length"
  | "other";

/**
 * Classify a failed attempt from its normalized code and provider message.
 * Provider-neutral: matches common wording, never provider names.
 */
export function classifyAttemptFailure(
  code: string,
  message: string
): AttemptFailureCategory {
  const m = message.toLowerCase();

  switch (code) {
    case "MODEL_UNAVAILABLE":
      return /no longer available|not available to|not have access|does not have access|deprecat|retired/.test(m)
        ? "model_unavailable_for_account"
        : "model_not_found";
    case "RATE_LIMIT":
      return /quota|resource_exhausted|limit:\s*0|billing|insufficient/.test(m)
        ? "quota_exhausted"
        : "rate_limited";
    case "AUTHENTICATION":
    case "MISSING_API_KEY":
      return /permission|forbidden|403|not authorized|not allowed/.test(m)
        ? "permission_denied"
        : "auth_failed";
    case "TIMEOUT":
    case "REQUEST_TIMEOUT":
      return "timeout";
    case "SERVER_ERROR":
      return "provider_unavailable";
    case "NETWORK_ERROR":
      return "network";
    case "INVALID_REQUEST":
      return "invalid_request";
    case "CONTEXT_LENGTH":
      return "context_length";
    default:
      return "other";
  }
}

/** Minimum length of message text treated as prompt content for redaction. */
const PROMPT_REDACTION_MIN_LENGTH = 12;

/**
 * Remove request message content that a provider may echo in an error
 * (best effort: whole messages and individual lines ≥ 12 characters).
 */
export function redactPromptContent(
  text: string,
  messages: Array<{ content: string }>
): string {
  let out = text;

  for (const { content } of messages) {
    const fragments = [content, ...content.split(/\r?\n/)]
      .map((f) => f.trim())
      .filter((f) => f.length >= PROMPT_REDACTION_MIN_LENGTH)
      .sort((a, b) => b.length - a.length);

    for (const fragment of fragments) {
      out = out.split(fragment).join("[PROMPT]");
    }
  }

  return out;
}

/**
 * Attentra — Chat Completions Request Validation
 *
 * Phase 7 / Step 5 — Consumer Execution API
 * OpenAI compatibility — accepts the OpenAI Chat Completions request shape
 *
 * Lightweight validation for POST /api/v1/chat/completions.
 * No external validation framework — uses plain TypeScript checks.
 *
 * Parameter policy (no silent drops):
 *   - Supported:      model, messages, max_tokens / max_completion_tokens,
 *                     temperature, plus Attentra fields (maxTokens,
 *                     taskTypeHint, policy, requestId)
 *   - Default-only:   stream=false, n=1, top_p=1, frequency_penalty=0,
 *                     presence_penalty=0, logprobs=false, tool_choice="none",
 *                     modalities=["text"], response_format={type:"text"}
 *                     — any other value is rejected as unsupported
 *   - Accepted, no effect on generation: user, metadata, store,
 *                     service_tier, parallel_tool_calls
 *   - Unsupported:    tools, functions, function_call, stop, seed,
 *                     logit_bias, top_logprobs, audio, prediction,
 *                     reasoning_effort, web_search_options, stream_options
 *   - Unknown fields are rejected (matches OpenAI behavior).
 */

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

/** Validated chat completion request body. */
export interface ChatCompletionRequest {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  /** Explicit model identifier; undefined means automatic routing ("auto"). */
  model?: string;
  taskTypeHint?: string;
  policy?: string;
  requestId?: string;
}

/** Machine-readable validation failure category. */
export type ValidationErrorCode =
  | "invalid_value"
  | "missing_required_parameter"
  | "unsupported_parameter"
  | "unsupported_value"
  | "unrecognized_parameter";

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

const VALID_ROLES = new Set(["system", "user", "assistant"]);

/** OpenAI "developer" messages carry system instructions for newer models. */
const ROLE_ALIASES: Record<string, string> = { developer: "system" };

/** Models value that selects Attentra's automatic routing. */
export const AUTO_MODEL = "auto";

const MAX_TOKENS_LIMIT = 256_000;

/** Parameters accepted only at their default (no-op) value. */
const DEFAULT_ONLY: Record<string, (v: unknown) => boolean> = {
  stream: (v) => v === false,
  n: (v) => v === 1,
  top_p: (v) => v === 1,
  frequency_penalty: (v) => v === 0,
  presence_penalty: (v) => v === 0,
  logprobs: (v) => v === false,
  tool_choice: (v) => v === "none",
  modalities: (v) => Array.isArray(v) && v.length === 1 && v[0] === "text",
  response_format: (v) =>
    !!v && typeof v === "object" && (v as { type?: unknown }).type === "text",
};

/** Parameters accepted and ignored because they do not affect generation. */
const ACCEPTED_NO_EFFECT = new Set([
  "user",
  "metadata",
  "store",
  "service_tier",
  "parallel_tool_calls",
]);

/** Parameters Attentra does not support in any non-null form. */
const UNSUPPORTED = new Set([
  "tools",
  "functions",
  "function_call",
  "stop",
  "seed",
  "logit_bias",
  "top_logprobs",
  "audio",
  "prediction",
  "reasoning_effort",
  "web_search_options",
  "stream_options",
]);

/** Fields handled explicitly below. */
const HANDLED = new Set([
  "messages",
  "model",
  "max_tokens",
  "max_completion_tokens",
  "maxTokens",
  "temperature",
  "taskTypeHint",
  "policy",
  "requestId",
]);

// ─────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────

type ValidationFailure = {
  valid: false;
  errors: string[];
  /** First offending request parameter, when attributable. */
  param?: string;
  code?: ValidationErrorCode;
};

function fail(
  message: string,
  param?: string,
  code: ValidationErrorCode = "invalid_value"
): ValidationFailure {
  return { valid: false, errors: [message], param, code };
}

/**
 * Normalize OpenAI message content: a string, or an array of text parts.
 * Returns null when the content is not representable as text.
 */
function normalizeContent(content: unknown): string | null {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const part of content) {
      if (
        !part ||
        typeof part !== "object" ||
        (part as { type?: unknown }).type !== "text" ||
        typeof (part as { text?: unknown }).text !== "string"
      ) {
        return null;
      }
      texts.push((part as { text: string }).text);
    }
    return texts.join("\n");
  }

  return null;
}

/**
 * Validate a parsed chat-completion request body.
 *
 * Returns either `{ valid: true, data }` or `{ valid: false, errors }`.
 */
export function validateChatRequest(body: unknown):
  | { valid: true; data: ChatCompletionRequest }
  | ValidationFailure {
  const errors: string[] = [];

  // 1. Body must be a non-null object
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("Request body must be a JSON object");
  }

  const b = body as Record<string, unknown>;

  // 2. Unsupported / default-only / unknown parameters — never silently drop
  for (const [key, value] of Object.entries(b)) {
    if (HANDLED.has(key) || ACCEPTED_NO_EFFECT.has(key)) continue;

    if (key in DEFAULT_ONLY) {
      if (value != null && !DEFAULT_ONLY[key](value)) {
        return fail(
          key === "stream"
            ? "Streaming is not supported yet. Set 'stream' to false or omit it."
            : `'${key}' is only supported at its default value.`,
          key,
          "unsupported_value"
        );
      }
      continue;
    }

    if (UNSUPPORTED.has(key)) {
      const isEmpty =
        value == null ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" &&
          !Array.isArray(value) &&
          Object.keys(value as object).length === 0) ||
        (key === "function_call" && value === "none");
      if (!isEmpty) {
        return fail(
          `'${key}' is not supported by Attentra.`,
          key,
          "unsupported_parameter"
        );
      }
      continue;
    }

    return fail(
      `Unrecognized request argument supplied: ${key}`,
      key,
      "unrecognized_parameter"
    );
  }

  // 3. messages must exist and be an array
  if (!("messages" in b)) {
    return fail("'messages' field is required", "messages", "missing_required_parameter");
  }
  if (!Array.isArray(b.messages)) {
    return fail("'messages' must be an array", "messages");
  }

  // 4. messages must not be empty
  if (b.messages.length === 0) {
    return fail("'messages' must not be empty", "messages");
  }

  // 5–6. Every message must have a valid role and non-empty text content
  const messages: Array<{ role: string; content: string }> = [];
  for (let i = 0; i < b.messages.length; i++) {
    const msg = b.messages[i];
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      errors.push(`messages[${i}] must be an object`);
      continue;
    }
    const m = msg as Record<string, unknown>;

    const role =
      typeof m.role === "string" ? ROLE_ALIASES[m.role] ?? m.role : undefined;

    if (role === undefined || !VALID_ROLES.has(role)) {
      errors.push(
        `messages[${i}].role must be one of: system, developer, user, assistant`
      );
    }

    if (m.tool_calls != null || m.function_call != null) {
      errors.push(`messages[${i}] tool/function calls are not supported`);
    }

    const content = normalizeContent(m.content);
    if (content === null || content.trim().length === 0) {
      errors.push(
        `messages[${i}].content must be a non-empty string or an array of text parts`
      );
    }

    if (errors.length === 0) {
      messages.push({ role: role as string, content: content as string });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, param: "messages", code: "invalid_value" };
  }

  // 7. model — "auto" (or absent) routes automatically; otherwise explicit
  let model: string | undefined;
  if ("model" in b && b.model != null) {
    if (typeof b.model !== "string" || b.model.trim().length === 0) {
      return fail("'model' must be a non-empty string", "model");
    }
    const trimmed = b.model.trim();
    model = trimmed.toLowerCase() === AUTO_MODEL ? undefined : trimmed;
  }

  // 8. Output token limit — maxTokens, max_tokens, max_completion_tokens
  let maxTokens: number | undefined;
  for (const field of ["maxTokens", "max_tokens", "max_completion_tokens"]) {
    const mt = b[field];
    if (mt == null) continue;

    if (
      typeof mt !== "number" ||
      !Number.isInteger(mt) ||
      mt <= 0 ||
      mt > MAX_TOKENS_LIMIT
    ) {
      return fail(
        `'${field}' must be a positive integer (max ${MAX_TOKENS_LIMIT})`,
        field
      );
    }
    if (maxTokens !== undefined && maxTokens !== mt) {
      return fail(
        "Conflicting output token limits; send only one of maxTokens, max_tokens, max_completion_tokens",
        field
      );
    }
    maxTokens = mt;
  }

  // 9. temperature — OpenAI range 0–2
  let temperature: number | undefined;
  if ("temperature" in b && b.temperature != null) {
    const t = b.temperature;
    if (typeof t !== "number" || !Number.isFinite(t) || t < 0 || t > 2) {
      return fail("'temperature' must be a number between 0 and 2", "temperature");
    }
    temperature = t;
  }

  // 10. Optional Attentra fields must be strings when present (never crash)
  let taskTypeHint: string | undefined;
  if ("taskTypeHint" in b && b.taskTypeHint != null) {
    if (typeof b.taskTypeHint !== "string") {
      errors.push("'taskTypeHint' must be a string");
    } else {
      taskTypeHint = b.taskTypeHint;
    }
  }

  let policy: string | undefined;
  if ("policy" in b && b.policy != null) {
    if (typeof b.policy !== "string") {
      errors.push("'policy' must be a string");
    } else {
      policy = b.policy;
    }
  }

  let requestId: string | undefined;
  if ("requestId" in b && b.requestId != null) {
    if (typeof b.requestId !== "string") {
      errors.push("'requestId' must be a string");
    } else {
      requestId = b.requestId;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, code: "invalid_value" };
  }

  return {
    valid: true,
    data: {
      messages,
      maxTokens,
      temperature,
      model,
      taskTypeHint,
      policy,
      requestId,
    },
  };
}

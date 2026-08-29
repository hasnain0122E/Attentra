/**
 * Attentra — Chat Completions Request Validation
 *
 * Phase 7 / Step 5 — Consumer Execution API
 *
 * Lightweight validation for POST /api/v1/chat/completions.
 * No external validation framework — uses plain TypeScript checks.
 */

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

/** Validated chat completion request body. */
export interface ChatCompletionRequest {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  taskTypeHint?: string;
  policy?: string;
  requestId?: string;
}

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

const VALID_ROLES = new Set(["system", "user", "assistant"]);

// ─────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────

/**
 * Validate a parsed chat-completion request body.
 *
 * Returns either `{ valid: true, data }` or `{ valid: false, errors }`.
 */
export function validateChatRequest(body: unknown):
  | { valid: true; data: ChatCompletionRequest }
  | { valid: false; errors: string[] } {
  const errors: string[] = [];

  // 1. Body must be a non-null object
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, errors: ["Request body must be a JSON object"] };
  }

  const b = body as Record<string, unknown>;

  // 2. messages must exist and be an array
  if (!("messages" in b)) {
    return { valid: false, errors: ["'messages' field is required"] };
  }
  if (!Array.isArray(b.messages)) {
    return { valid: false, errors: ["'messages' must be an array"] };
  }

  // 3. messages must not be empty
  if (b.messages.length === 0) {
    return { valid: false, errors: ["'messages' must not be empty"] };
  }

  // 4–5. Every message must have a valid role and non-empty content
  const messages: Array<{ role: string; content: string }> = [];
  for (let i = 0; i < b.messages.length; i++) {
    const msg = b.messages[i];
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      errors.push(`messages[${i}] must be an object`);
      continue;
    }
    const m = msg as Record<string, unknown>;

    if (typeof m.role !== "string" || !VALID_ROLES.has(m.role)) {
      errors.push(
        `messages[${i}].role must be one of: system, user, assistant`
      );
    }

    if (typeof m.content !== "string" || m.content.trim().length === 0) {
      errors.push(`messages[${i}].content must be a non-empty string`);
    }

    if (errors.length === 0) {
      messages.push({ role: m.role as string, content: m.content as string });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 6. maxTokens — when supplied, must be a positive reasonable integer
  let maxTokens: number | undefined;
  if ("maxTokens" in b && b.maxTokens != null) {
    const mt = b.maxTokens;
    if (
      typeof mt !== "number" ||
      !Number.isInteger(mt) ||
      mt <= 0 ||
      mt > 256_000
    ) {
      errors.push("'maxTokens' must be a positive integer (max 256000)");
    } else {
      maxTokens = mt;
    }
  }

  // 7. Optional fields must be strings when present (never crash)
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
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { messages, maxTokens, taskTypeHint, policy, requestId },
  };
}

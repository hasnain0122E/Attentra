/**
 * Attentra — Stored prompt interpretation (presentation only)
 *
 * The chat-completions route stores `Request.prompt` as the text of the
 * request's USER messages joined with "\n" (see route.ts §10b). Roles,
 * system/assistant messages and message boundaries are not stored.
 *
 * Some prompts may nevertheless contain a serialized conversation (e.g. a
 * client that put a JSON messages array into a single user message). This
 * module recognizes that case and otherwise treats the prompt as plain
 * text — it never invents message boundaries for plain text.
 *
 * Pure functions; never mutates or discards the stored value.
 */

export type ContextRole = "system" | "developer" | "user" | "assistant" | "tool" | "unknown";

export interface ContextMessage {
  role: ContextRole;
  content: string;
}

export type StoredPromptContext =
  | { kind: "empty" }
  | {
      kind: "messages";
      messages: ContextMessage[];
      messageCount: number;
      /** Index of the latest user message, or -1 if there is none. */
      latestUserIndex: number;
      latestUserMessage: string | null;
    }
  | {
      kind: "text";
      text: string;
      /** Number of non-empty lines (not a message count). */
      lineCount: number;
    };

/** Upper bound on characters inspected as JSON (avoid parsing huge blobs). */
const MAX_JSON_PARSE_LENGTH = 500_000;

const KNOWN_ROLES = new Set<ContextRole>(["system", "developer", "user", "assistant", "tool"]);

function normalizeRole(value: unknown): ContextRole {
  if (typeof value !== "string") return "unknown";
  const role = value.trim().toLowerCase() as ContextRole;
  return KNOWN_ROLES.has(role) ? role : "unknown";
}

/** String content, or OpenAI-style text parts joined with newlines. */
function normalizeContent(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (const part of value) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        parts.push((part as { text: string }).text);
      } else {
        return null;
      }
    }
    return parts.join("\n");
  }
  return null;
}

/** Parse a JSON messages array (or { messages: [...] }); null if not one. */
function tryParseMessages(raw: string): ContextMessage[] | null {
  const trimmed = raw.trim();
  if (trimmed.length > MAX_JSON_PARSE_LENGTH) return null;
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const list =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { messages?: unknown }).messages)
        ? (parsed as { messages: unknown[] }).messages
        : null;

  if (!list || list.length === 0) return null;

  const messages: ContextMessage[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    if (!("role" in record) || !("content" in record)) return null;
    const content = normalizeContent(record.content);
    if (content === null) return null;
    messages.push({ role: normalizeRole(record.role), content });
  }

  // Require at least one recognized role so arbitrary JSON isn't misread.
  return messages.some((m) => m.role !== "unknown") ? messages : null;
}

export function interpretStoredPrompt(prompt: string | null | undefined): StoredPromptContext {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return { kind: "empty" };
  }

  const messages = tryParseMessages(prompt);
  if (messages) {
    let latestUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user" && messages[i].content.trim().length > 0) {
        latestUserIndex = i;
        break;
      }
    }
    return {
      kind: "messages",
      messages,
      messageCount: messages.length,
      latestUserIndex,
      latestUserMessage: latestUserIndex >= 0 ? messages[latestUserIndex].content : null,
    };
  }

  return {
    kind: "text",
    text: prompt,
    lineCount: prompt.split("\n").filter((line) => line.trim().length > 0).length,
  };
}

export interface PromptPreview {
  /** Primary one-line-ish text for list rows. */
  text: string;
  /** Short supporting caption, or null. */
  caption: string | null;
  /** True when `text` is a trimmed tail of a longer prompt. */
  truncated: boolean;
}

export const PREVIEW_MAX_CHARS = 180;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): { text: string; truncated: boolean } {
  const collapsed = collapseWhitespace(value);
  if (collapsed.length <= max) return { text: collapsed, truncated: false };
  return { text: `${collapsed.slice(0, max - 1).trimEnd()}…`, truncated: true };
}

/**
 * Preview for the History list.
 *
 * - Structured conversation → the latest user message + message count.
 * - Plain text → the END of the stored text. Because user messages are
 *   stored in order, the newest one is always at the end; showing the tail
 *   surfaces it without claiming where the message begins.
 */
export function buildPromptPreview(
  context: StoredPromptContext,
  maxChars: number = PREVIEW_MAX_CHARS,
): PromptPreview {
  if (context.kind === "empty") {
    return { text: "No prompt stored", caption: null, truncated: false };
  }

  if (context.kind === "messages") {
    const count = `${context.messageCount} message${context.messageCount === 1 ? "" : "s"} in request`;
    if (context.latestUserMessage === null) {
      return { text: "No user message in this request", caption: count, truncated: false };
    }
    const { text, truncated } = clip(context.latestUserMessage, maxChars);
    return { text, caption: count, truncated };
  }

  const collapsed = collapseWhitespace(context.text);
  if (collapsed.length <= maxChars) {
    return {
      text: collapsed,
      caption: context.lineCount > 1 ? `${context.lineCount} lines of user text` : null,
      truncated: false,
    };
  }

  return {
    text: `…${collapsed.slice(collapsed.length - (maxChars - 1)).trimStart()}`,
    caption: `End of ${collapsed.length.toLocaleString("en")} characters of user text`,
    truncated: true,
  };
}

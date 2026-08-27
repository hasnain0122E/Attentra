/**
 * Attentra — Request Analyzer
 *
 * Phase 6 / Step 1 — Task Type Classification
 *
 * Deterministic rule-based task type classification for routing requests.
 * Does NOT use ML or another LLM to classify.
 *
 * The architecture allows future replacement with a learned classifier
 * without changing the routing engine contract — the analyzer returns
 * a RoutingTaskType regardless of internal implementation.
 *
 * Classification strategy:
 * - Score each task type based on keyword frequency in request content
 * - Weight by task-specific keyword matches
 * - Apply tie-breaking rules for ambiguous cases
 * - Default to GENERAL when no strong signal is detected
 */

import type { RoutingTaskType, TokenEstimate } from "./types";
import { classifyComplexity } from "./complexity";
import type { ComplexityResult } from "./types";
import { estimateTokens } from "./token-estimator";

// ─────────────────────────────────────────────────────
// KEYWORD DICTIONARIES
// ─────────────────────────────────────────────────────

/**
 * Keywords associated with each task type.
 * Matching is case-insensitive with word boundary detection.
 */
const TASK_KEYWORDS: Record<RoutingTaskType, string[]> = {
  CODING: [
    "code", "function", "debug", "error", "syntax", "compile",
    "algorithm", "implement", "refactor", "typescript", "javascript",
    "python", "java", "css", "html", "api endpoint", "endpoint",
    "database", "query", "sql", "regex", "class", "module",
    "import", "export", "variable", "array", "object",
  ],
  REASONING: [
    "explain", "why", "how does", "analyze", "logic", "deduce",
    "prove", "theorem", "mathematical", "calculate", "solve",
    "step by step", "reasoning", "evaluate", "compare and contrast",
    "pros and cons", "implications", "derive", "hypothesis",
  ],
  WRITING: [
    "write", "essay", "story", "creative", "blog", "article",
    "poem", "script", "narrative", "compose", "draft",
    "rewrite", "paragraph", "novel", "fiction", "tone",
    "copywriting", "content", "headlines", "slogan",
  ],
  SUMMARIZATION: [
    "summarize", "summary", "tldr", "brief", "key points",
    "condense", "overview", "recap", "main points", "bullet points",
    "shorten", "abbreviate", "in brief",
  ],
  TRANSLATION: [
    "translate", "translation", "language", "spanish", "french",
    "german", "chinese", "japanese", "korean", "arabic",
    "portuguese", "italian", "hindi", "convert to", "localize",
  ],
  ANALYSIS: [
    "analyze", "classify", "categorize", "sentiment", "detect",
    "identify", "assess", "examine", "review", "diagnose",
    "pattern", "trend", "insight", "evaluate", "audit",
  ],
  EXTRACTION: [
    "extract", "pull out", "find all", "parse", "structured",
    "json", "csv", "table", "entities", "names", "dates",
    "fields", "key-value", "data points", "scrape",
  ],
  GENERAL: [
    "hello", "hi", "help", "what is", "tell me",
    "chat", "talk", "question", "can you",
  ],
};

/**
 * Boost keywords that amplify specific task signals regardless of base match.
 */
const CODING_SIGNALS = [
  "bug", "error", "fix", "deploy", "npm", "git", "terminal",
  "console", "stack trace", "traceback", "warning", "exception",
];
const REASONING_SIGNALS = [
  "think", "logic", "argument", "conclusion", "premise",
  "assumption", "inference", "deduction", "therefore",
];

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Extract plain text from all messages for analysis.
 * Joins all message content with spaces.
 */
function extractFullText(messages: Array<{ role: string; content: string }>): string {
  return messages.map((m) => m.content).join(" ");
}

/**
 * Count keyword matches in text with word boundary awareness.
 */
function countKeywordMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const keyword of keywords) {
    // Use word boundary matching for more precise matching
    const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${pattern}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Classify task type from request content using keyword scoring.
 *
 * @param messages  Request messages to analyze
 * @returns         The classified task type
 */
function classifyTaskType(
  messages: Array<{ role: string; content: string }>
): RoutingTaskType {
  const text = extractFullText(messages);
  if (!text || text.trim().length === 0) return "GENERAL";

  const scores: Record<RoutingTaskType, number> = {
    GENERAL: 0,
    CODING: 0,
    REASONING: 0,
    WRITING: 0,
    SUMMARIZATION: 0,
    TRANSLATION: 0,
    ANALYSIS: 0,
    EXTRACTION: 0,
  };

  // Score each task type by keyword matches
  for (const [taskType, keywords] of Object.entries(TASK_KEYWORDS)) {
    scores[taskType as RoutingTaskType] = countKeywordMatches(text, keywords);
  }

  // Boost for strong coding/reasoning signals
  for (const signal of CODING_SIGNALS) {
    if (text.toLowerCase().includes(signal)) scores.CODING += 2;
  }
  for (const signal of REASONING_SIGNALS) {
    if (text.toLowerCase().includes(signal)) scores.REASONING += 2;
  }

  // System message with instructions boosts GENERAL slightly
  const hasSystemMessage = messages.some((m) => m.role === "system");
  if (hasSystemMessage) scores.GENERAL += 1;

  // Find the top-scoring task type
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const [topType, topScore] = sorted[0] as [RoutingTaskType, number];

  // If no keyword matches at all, default to GENERAL
  if (topScore === 0) return "GENERAL";

  return topType;
}

// ─────────────────────────────────────────────────────
// REQUEST ANALYSIS
// ─────────────────────────────────────────────────────

/**
 * Complete request analysis result.
 */
export interface RequestAnalysis {
  /** Classified task type */
  taskType: RoutingTaskType;

  /** Complexity classification with confidence */
  complexity: ComplexityResult;

  /** Token estimation (input + output) */
  tokenEstimate: TokenEstimate;

  /** Total character count across all messages */
  totalCharacters: number;

  /** Number of messages in the request */
  messageCount: number;
}

/**
 * Analyze a routing request deterministically.
 *
 * Produces:
 * - Task type classification (rule-based keyword matching)
 * - Complexity assessment (multi-signal scoring)
 * - Token estimation (characters / 4 approximation)
 *
 * @param messages    Request messages to analyze
 * @param taskHint    Optional task type hint (overrides classification)
 * @param maxTokens   Optional maximum output tokens
 * @returns           Complete analysis result
 */
export function analyzeRequest(
  messages: Array<{ role: string; content: string }>,
  taskHint?: RoutingTaskType,
  maxTokens?: number
): RequestAnalysis {
  const text = extractFullText(messages);
  const totalCharacters = text.length;
  const messageCount = messages.length;

  // 1. Task type: use hint or classify from content
  const taskType = taskHint ?? classifyTaskType(messages);

  // 2. Complexity: deterministic multi-signal classification
  const complexity = classifyComplexity(
    totalCharacters,
    messageCount,
    taskType,
    maxTokens
  );

  // 3. Token estimation: characters / 4 approximation
  const tokenEstimate = estimateTokens(totalCharacters, maxTokens);

  return {
    taskType,
    complexity,
    tokenEstimate,
    totalCharacters,
    messageCount,
  };
}

/**
 * Attentra — Token Estimator
 *
 * Phase 6 / Step 1 — Token Estimation
 *
 * Provider-neutral token estimation using the standard approximation:
 *   estimatedTokens ≈ characters / 4
 *
 * IMPORTANT:
 * - This is NOT provider-specific tokenization.
 * - Actual token counts vary by provider and model tokenizer.
 * - OpenAI uses BPE (cl100k_base, o200k_base) with varying ratios.
 * - Anthropic and Google use different tokenizers entirely.
 * - This estimate is suitable for routing decisions and cost approximation,
 *   NOT for precise billing or context window enforcement.
 *
 * Future phases may add provider-specific tokenizers for precision.
 */

import type { TokenEstimate } from "./types";

/**
 * Divisor for character-to-token approximation.
 * Common heuristic: ~4 characters per token on average.
 */
const CHARS_PER_TOKEN = 4;

/**
 * Default estimated output tokens when maxTokens is not specified.
 * Conservative estimate suitable for typical chat responses.
 */
const DEFAULT_OUTPUT_TOKENS = 256;

/**
 * Estimate token counts for a routing request.
 *
 * Input tokens are estimated from total character count / 4.
 * Output tokens use the provided maxTokens, or a default estimate.
 *
 * @param totalCharacters  Total character count across all message content
 * @param maxTokens        Maximum output tokens requested (optional)
 * @returns                Token estimate with input, output, and total
 */
export function estimateTokens(
  totalCharacters: number,
  maxTokens?: number
): TokenEstimate {
  const inputTokens = Math.max(1, Math.ceil(totalCharacters / CHARS_PER_TOKEN));
  const outputTokens = maxTokens ?? DEFAULT_OUTPUT_TOKENS;
  const totalTokens = inputTokens + outputTokens;

  return { inputTokens, outputTokens, totalTokens };
}

/**
 * Estimate token count from a text string.
 * Convenience wrapper around the characters/4 formula.
 *
 * @param text  Input text
 * @returns     Estimated token count (minimum 1)
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 1;
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
}

/**
 * Attentra — Complexity Analyzer
 *
 * Phase 6 / Step 1 — Complexity Classification
 *
 * Deterministic rule-based complexity classification.
 * Returns LOW, MEDIUM, or HIGH with a confidence value.
 *
 * Signals considered:
 * - Total content length (characters)
 * - Number of messages in the request
 * - Task type inherent complexity
 * - Requested output size (maxTokens)
 *
 * This module is fully deterministic and does not use ML or LLMs.
 * The architecture allows future replacement with a learned classifier
 * without changing the RoutingEngine contract.
 */

import type { ComplexityResult, ComplexityLevel, RoutingTaskType } from "./types";

// ─────────────────────────────────────────────────────
// CONTENT LENGTH THRESHOLDS
// ─────────────────────────────────────────────────────

/** Short content threshold (characters) */
const SHORT_CONTENT = 200;

/** Medium content threshold (characters) */
const MEDIUM_CONTENT = 1000;

/** Long content threshold (characters) */
const LONG_CONTENT = 4000;

// ─────────────────────────────────────────────────────
// TASK TYPE BASE COMPLEXITY
// ─────────────────────────────────────────────────────

/**
 * Base complexity and confidence for each task type.
 * Some tasks are inherently more complex than others.
 */
const TASK_BASE_COMPLEXITY: Record<RoutingTaskType, {
  complexity: ComplexityLevel;
  baseConfidence: number;
  baseScore: number;
}> = {
  GENERAL:        { complexity: "LOW",    baseConfidence: 0.80, baseScore: 0.15 },
  SUMMARIZATION:  { complexity: "LOW",    baseConfidence: 0.75, baseScore: 0.25 },
  TRANSLATION:    { complexity: "MEDIUM", baseConfidence: 0.70, baseScore: 0.40 },
  EXTRACTION:     { complexity: "MEDIUM", baseConfidence: 0.70, baseScore: 0.45 },
  ANALYSIS:       { complexity: "MEDIUM", baseConfidence: 0.65, baseScore: 0.50 },
  WRITING:        { complexity: "MEDIUM", baseConfidence: 0.65, baseScore: 0.50 },
  CODING:         { complexity: "MEDIUM", baseConfidence: 0.65, baseScore: 0.55 },
  REASONING:      { complexity: "HIGH",   baseConfidence: 0.70, baseScore: 0.70 },
};

// ─────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────

/**
 * Score content length on a 0–1 scale.
 */
function contentLengthScore(charCount: number): number {
  if (charCount <= SHORT_CONTENT) return 0.1;
  if (charCount <= MEDIUM_CONTENT) return 0.4;
  if (charCount <= LONG_CONTENT) return 0.7;
  return 1.0;
}

/**
 * Score message count on a 0–1 scale.
 */
function messageCountScore(messageCount: number): number {
  if (messageCount <= 1) return 0.1;
  if (messageCount <= 3) return 0.3;
  if (messageCount <= 8) return 0.6;
  return 0.9;
}

/**
 * Score requested output size on a 0–1 scale.
 */
function outputSizeScore(maxTokens?: number): number {
  if (!maxTokens) return 0.3;
  if (maxTokens <= 256) return 0.2;
  if (maxTokens <= 1024) return 0.5;
  if (maxTokens <= 4096) return 0.8;
  return 1.0;
}

/**
 * Classify a numeric score into a complexity level.
 */
function scoreToLevel(score: number): ComplexityLevel {
  if (score < 0.35) return "LOW";
  if (score < 0.65) return "MEDIUM";
  return "HIGH";
}

/**
 * Calculate confidence based on how clearly the score falls into its level.
 * Scores near thresholds have lower confidence; scores far from thresholds
 * have higher confidence.
 */
function calculateConfidence(score: number, taskConfidence: number): number {
  const distanceFromThreshold = Math.min(
    Math.abs(score - 0.35),
    Math.abs(score - 0.65)
  );
  const clarityBoost = Math.min(distanceFromThreshold / 0.3, 0.15);
  return Math.round((taskConfidence + clarityBoost) * 100) / 100;
}

// ─────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────

/**
 * Classify request complexity deterministically.
 *
 * Combines multiple signals with equal weight (0.25 each):
 * 1. Content length
 * 2. Message count
 * 3. Task type base complexity
 * 4. Requested output size
 *
 * @param totalCharacters  Total character count across all messages
 * @param messageCount     Number of messages in the request
 * @param taskType         Classified task type
 * @param maxTokens        Requested maximum output tokens
 */
export function classifyComplexity(
  totalCharacters: number,
  messageCount: number,
  taskType: RoutingTaskType,
  maxTokens?: number
): ComplexityResult {
  const cScore = contentLengthScore(totalCharacters);
  const mScore = messageCountScore(messageCount);
  const tBase = TASK_BASE_COMPLEXITY[taskType];
  const oScore = outputSizeScore(maxTokens);

  // Weighted combination (equal weights)
  const score = (cScore + mScore + tBase.baseScore + oScore) / 4;
  const complexity = scoreToLevel(score);
  const confidence = calculateConfidence(score, tBase.baseConfidence);

  return {
    complexity,
    confidence,
    signals: {
      contentScore: cScore,
      messageCountScore: mScore,
      taskScore: tBase.baseScore,
      outputScore: oScore,
    },
  };
}

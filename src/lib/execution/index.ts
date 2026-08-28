/**
 * Attentra — Execution Layer Public API
 *
 * Phase 7 / Step 1–2 — Provider Adapter Foundation + Execution Abstraction
 *
 * Barrel export for the execution module. Other application modules
 * consume the execution layer through these exports only.
 *
 * Usage:
 *   // Execute a request
 *   import { executeRequest, ExecutionAdapterRegistry } from "@/lib/execution";
 *
 *   // Dispatch an ExecutionPlan
 *   import { Dispatcher, executeExecutionPlan } from "@/lib/execution";
 *
 *   // Create provider adapters
 *   import { createOpenAIAdapter, createAnthropicAdapter, createGoogleAdapter } from "@/lib/execution";
 *   import { createBlueMindsAdapter } from "@/lib/execution";
 *
 *   // Error handling
 *   import { NormalizedExecutionError, type ExecutionErrorCode } from "@/lib/execution";
 *
 * Architecture:
 *   REQUEST → ROUTING → PERSISTENCE → EXECUTION PLAN
 *     → DISPATCHER (this module)
 *     → PROVIDER ADAPTER (this module)
 *     → EXECUTION RESULT (this module)
 */

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

export type {
  ExecutionRequest,
  ExecutionConfig,
  ProviderAdapter,
} from "./types";

export { BaseExecutionAdapter, DEFAULT_EXECUTION_TIMEOUT_MS } from "./types";

// ─────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────

export type { ExecutionErrorCode } from "./errors";

export {
  NormalizedExecutionError,
  isRetryable,
  mapProviderErrorCode,
  normalizeAnyError,
  sanitizeErrorMessage,
} from "./errors";

// ─────────────────────────────────────────────────────
// REGISTRY
// ─────────────────────────────────────────────────────

export { ExecutionAdapterRegistry } from "./registry";

// ─────────────────────────────────────────────────────
// PROVIDER ADAPTERS
// ─────────────────────────────────────────────────────

export {
  createOpenAIAdapter,
  OpenAIExecutionAdapter,
} from "./providers/openai";

export {
  createAnthropicAdapter,
  AnthropicExecutionAdapter,
} from "./providers/anthropic";

export {
  createGoogleAdapter,
  GoogleExecutionAdapter,
} from "./providers/google";

// ─────────────────────────────────────────────────────
// BLUEMINDS ADAPTER (Step 2)
// ─────────────────────────────────────────────────────

export {
  createBlueMindsAdapter,
  BlueMindsExecutionAdapter,
  BLUEMINDS_PROVIDER_ID,
  BLUEMINDS_PROVIDER_NAME,
  DEFAULT_BLUEMINDS_BASE_URL,
  DEFAULT_BLUEMINDS_TIMEOUT_MS,
} from "./providers/blueminds";

export type { BlueMindsConfig } from "./providers/blueminds";

// ─────────────────────────────────────────────────────
// MOCK ADAPTER
// ─────────────────────────────────────────────────────

export { MockProviderAdapter } from "./mock";
export type { MockBehavior } from "./mock";

// ─────────────────────────────────────────────────────
// EXECUTOR
// ─────────────────────────────────────────────────────

export { Executor, executeRequest } from "./executor";

// ─────────────────────────────────────────────────────
// DISPATCHER (Step 2)
// ─────────────────────────────────────────────────────

export { Dispatcher, executeExecutionPlan } from "./dispatcher";

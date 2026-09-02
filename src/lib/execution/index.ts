/**
 * Attentra — Execution Layer Public API
 *
 * Phase 7 / Step 1–4 — Provider Adapter Foundation + Production Execution + Orchestration
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
  ExecutionOptions,
  ProviderAdapter,
  ExecutionProvider,
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

// ─────────────────────────────────────────────────────
// PROVIDER REGISTRY (Step 3)
// ─────────────────────────────────────────────────────

export {
  ProviderRegistry,
  createDefaultProviderRegistry,
  getProviderRegistry,
} from "./provider-registry";

// ─────────────────────────────────────────────────────
// EXECUTION SERVICE (Step 3)
// ─────────────────────────────────────────────────────

export { ExecutionService, getExecutionService } from "./execution-service";

// ─────────────────────────────────────────────────────
// ORCHESTRATOR (Step 4)
// ─────────────────────────────────────────────────────

export type {
  ExecutionAttempt,
  OrchestratorOptions,
  OrchestratorResult,
} from "./orchestrator";

export {
  ExecutionOrchestrator,
  orchestrateExecution,
  computeActualCost,
  MAX_ORCHESTRATOR_ATTEMPTS,
} from "./orchestrator";

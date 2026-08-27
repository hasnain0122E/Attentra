/**
 * Attentra — Provider Abstraction Public API
 *
 * Architecture.md v2.0 §6 — Provider Abstraction
 *
 * This barrel export is the only entry point the rest of the
 * application should use to access provider types, adapters,
 * the registry, and error types.
 *
 * Usage:
 *   import { providerRegistry, type AIProvider, AttentraProviderError } from "@/lib/providers";
 *
 * The routing engine (Phase 6) resolves providers via providerRegistry.getProvider("openai")
 * and never imports provider SDKs directly.
 */

// Types
export type {
  TaskType,
  Message,
  NormalizedAIRequest,
  NormalizedAIResponse,
  ModelDefinition,
  AIProvider,
  ErrorCode,
} from "./types";

// Error class
export { AttentraProviderError } from "./types";

// Registry (singleton with default providers registered)
export { providerRegistry } from "./registry";

// Individual adapters (for direct import in tests or advanced usage)
export { OpenAIProvider } from "./openai";
export { AnthropicProvider } from "./anthropic";
export { GoogleProvider } from "./google";

/**
 * Attentra — Provider Registry
 *
 * Phase 7 / Step 3 — Production Provider Execution
 *
 * Resolves providerId → ExecutionProvider for the execution layer:
 *
 *   "blueminds"  → BlueMinds execution provider   (operational, Step 2)
 *   "openai"     → OpenAI execution provider      (Step 1)
 *   "anthropic"  → Anthropic execution provider   (Step 1)
 *   "google"     → Google execution provider      (Step 1)
 *
 * The registry contains NO routing logic: the router has already selected
 * the provider/model; this layer only resolves the provider that executes
 * the already-selected target. Future providers (e.g., a dedicated
 * OpenAI-compatible gateway) can be added here without touching the
 * routing engine.
 *
 * Built on the Step 1 ExecutionAdapterRegistry (single source of truth for
 * provider storage) and exposed with the Step 3 ExecutionProvider naming.
 */

import { ExecutionAdapterRegistry } from "./registry";
import type { ExecutionProvider } from "./types";
import { createBlueMindsAdapter } from "./providers/blueminds";
import { createOpenAIAdapter } from "./providers/openai";
import { createAnthropicAdapter } from "./providers/anthropic";
import { createGoogleAdapter } from "./providers/google";
import { createOpenRouterAdapter } from "./providers/openrouter";

export class ProviderRegistry {
  private readonly adapters: ExecutionAdapterRegistry;

  constructor(adapters?: ExecutionAdapterRegistry) {
    this.adapters = adapters ?? new ExecutionAdapterRegistry();
  }

  /**
   * Register an execution provider under its providerId.
   *
   * @throws NormalizedExecutionError if the providerId is already registered
   */
  register(provider: ExecutionProvider): void {
    this.adapters.register(provider);
  }

  /** Remove a provider registration. Returns true if it existed. */
  unregister(providerId: string): boolean {
    return this.adapters.unregister(providerId);
  }

  /** Check whether a provider is registered under the given providerId. */
  has(providerId: string): boolean {
    return this.adapters.has(providerId);
  }

  /** List all registered provider IDs. */
  listProviderIds(): string[] {
    return this.adapters.listProviderIds();
  }

  /** List all registered providers. */
  listProviders(): ExecutionProvider[] {
    return this.adapters.listAdapters();
  }

  /**
   * Resolve a provider by its providerId.
   *
   * @throws NormalizedExecutionError (MODEL_UNAVAILABLE) if no provider
   *         is registered under the given providerId
   */
  resolve(providerId: string): ExecutionProvider {
    return this.adapters.getAdapter(providerId);
  }

  /**
   * Expose the underlying Step 1 adapter registry for interop with the
   * Dispatcher/Executor (which accept ExecutionAdapterRegistry).
   */
  asAdapterRegistry(): ExecutionAdapterRegistry {
    return this.adapters;
  }
}

/**
 * Create the default production provider registry.
 *
 * Registers every provider adapter that exists from earlier Phase 7 work:
 * BlueMinds (operational execution backend) plus the OpenAI, Anthropic,
 * and Google adapters from Step 1. Adapters are safe to construct without
 * credentials — they only fail (with structured errors) at execution time.
 */
export function createDefaultProviderRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  registry.register(createBlueMindsAdapter());
  registry.register(createOpenAIAdapter());
  registry.register(createAnthropicAdapter());
  registry.register(createGoogleAdapter());
  registry.register(createOpenRouterAdapter());

  return registry;
}

let defaultRegistry: ProviderRegistry | undefined;

/** Get the shared default provider registry (lazy singleton). */
export function getProviderRegistry(): ProviderRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createDefaultProviderRegistry();
  }
  return defaultRegistry;
}

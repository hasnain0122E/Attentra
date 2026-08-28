/**
 * Attentra — Execution Adapter Registry
 *
 * Phase 7 / Step 1 — Provider Adapter Foundation
 *
 * Central registry for provider execution adapters.
 * The executor resolves adapters through this registry —
 * it never imports provider-specific modules directly.
 *
 * Architecture:
 *   ExecutionAdapterRegistry
 *     ├── OpenAIExecutionAdapter
 *     ├── AnthropicExecutionAdapter
 *     ├── GoogleExecutionAdapter
 *     └── (future: DeepSeek, Mistral, Groq, etc.)
 *
 * The registry:
 * - Stores adapters by providerId
 * - Rejects duplicate registrations
 * - Returns structured errors for unknown providers
 * - Allows future providers without modifying the executor
 */

import type { ProviderAdapter } from "./types";
import { NormalizedExecutionError } from "./errors";

/**
 * Execution adapter registry.
 *
 * Unlike the Phase 4 ProviderRegistry (which stores AIProvider instances),
 * this registry stores ProviderAdapter instances that implement the
 * execution boundary contract.
 */
export class ExecutionAdapterRegistry {
  private adapters = new Map<string, ProviderAdapter>();

  /**
   * Register a provider execution adapter.
   *
   * @param adapter  The adapter to register
   * @throws {NormalizedExecutionError} if providerId is already registered
   */
  register(adapter: ProviderAdapter): void {
    if (this.adapters.has(adapter.providerId)) {
      throw new NormalizedExecutionError(
        "INVALID_REQUEST",
        `Provider adapter "${adapter.providerId}" is already registered. ` +
          `Unregister it first if you need to replace it.`,
        { retryable: false }
      );
    }
    this.adapters.set(adapter.providerId, adapter);
  }

  /**
   * Unregister a provider adapter (for testing or reconfiguration).
   *
   * @param providerId  Provider ID to remove
   * @returns           True if the adapter was found and removed
   */
  unregister(providerId: string): boolean {
    return this.adapters.delete(providerId);
  }

  /**
   * Resolve a provider adapter by its ID.
   *
   * @param providerId  Provider ID (e.g., "openai", "anthropic", "google")
   * @returns           The registered ProviderAdapter
   * @throws {NormalizedExecutionError} if provider is not registered
   */
  getAdapter(providerId: string): ProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      const available = Array.from(this.adapters.keys()).join(", ");
      throw new NormalizedExecutionError(
        "MODEL_UNAVAILABLE",
        `No execution adapter registered for provider "${providerId}". ` +
          `Available: [${available}]`,
        { retryable: false, provider: providerId }
      );
    }
    return adapter;
  }

  /**
   * Check if a provider adapter is registered.
   */
  has(providerId: string): boolean {
    return this.adapters.has(providerId);
  }

  /**
   * List all registered provider IDs.
   */
  listProviderIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * List all registered adapters.
   */
  listAdapters(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Remove all registered adapters (for testing).
   */
  clear(): void {
    this.adapters.clear();
  }
}

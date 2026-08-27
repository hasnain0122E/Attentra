/**
 * Attentra — Provider Registry
 *
 * Architecture.md v2.0 §6 — Provider Abstraction
 *
 * The registry is the single point of access for resolving provider
 * adapters by ID. The routing engine (Phase 6) resolves providers
 * through this registry — it never instantiates SDK clients directly.
 *
 * Adding a new provider requires:
 * 1. Create a new adapter implementing AIProvider
 * 2. Register it via providerRegistry.register()
 * 3. Configure credentials in environment variables
 * 4. Add provider/model metadata to the database (Phase 5)
 */

import type { AIProvider, ModelDefinition } from "./types";
import { AttentraProviderError } from "./types";

import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";

/**
 * Provider registry — stores and resolves provider adapters.
 */
class ProviderRegistry {
  private providers = new Map<string, AIProvider>();

  /**
   * Register a provider adapter.
   * Throws if a provider with the same ID is already registered.
   */
  register(provider: AIProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(
        `Provider "${provider.id}" is already registered. ` +
        `Use unregister() first if you need to replace it.`
      );
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a provider adapter (for testing or dynamic reconfiguration).
   */
  unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  /**
   * Resolve a provider by its ID.
   *
   * @param providerId  e.g. "openai", "anthropic", "google"
   * @returns           The registered AIProvider instance
   * @throws {AttentraProviderError} if the provider is not registered
   */
  getProvider(providerId: string): AIProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new AttentraProviderError(
        "PROVIDER_UNAVAILABLE",
        providerId,
        `Provider "${providerId}" is not registered. ` +
        `Available: [${this.listProviderIds().join(", ")}]`,
        { retryable: false }
      );
    }
    return provider;
  }

  /**
   * Check if a provider is registered.
   */
  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * List all registered provider IDs.
   */
  listProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * List all registered providers that are available (configured).
   */
  listAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isAvailable());
  }

  /**
   * List all registered providers (available or not).
   */
  listAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Collect all model definitions from all registered providers.
   */
  listAllModels(): ModelDefinition[] {
    const models: ModelDefinition[] = [];
    for (const provider of this.providers.values()) {
      models.push(...provider.listModels());
    }
    return models;
  }

  /**
   * Collect model definitions from all available (configured) providers.
   */
  listAvailableModels(): ModelDefinition[] {
    const models: ModelDefinition[] = [];
    for (const provider of this.providers.values()) {
      if (provider.isAvailable()) {
        models.push(...provider.listModels());
      }
    }
    return models;
  }

  /**
   * Get the count of registered providers.
   */
  get size(): number {
    return this.providers.size;
  }

  /**
   * Clear all registered providers (for testing).
   */
  clear(): void {
    this.providers.clear();
  }
}

/**
 * Singleton provider registry instance.
 *
 * Default providers (OpenAI, Anthropic, Google) are registered at startup.
 * Additional providers can be registered dynamically.
 */
export const providerRegistry = new ProviderRegistry();

// Register default providers
providerRegistry.register(new OpenAIProvider());
providerRegistry.register(new AnthropicProvider());
providerRegistry.register(new GoogleProvider());

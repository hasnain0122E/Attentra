/**
 * Attentra — OpenAI Execution Adapter
 *
 * Phase 7 / Step 1 — Provider Adapter Foundation
 *
 * Wraps the Phase 4 OpenAIProvider to implement the execution-layer
 * ProviderAdapter interface. Delegates model support and request
 * execution to the underlying AIProvider.
 *
 * Real API calls occur only when execute() is called with valid
 * credentials — this module does not make network calls at import
 * time or during adapter construction.
 */

import { OpenAIProvider } from "@/lib/providers";
import { BaseExecutionAdapter } from "../types";

/**
 * Create the OpenAI execution adapter.
 *
 * @returns  BaseExecutionAdapter wrapping the Phase 4 OpenAIProvider
 */
export function createOpenAIAdapter(): BaseExecutionAdapter {
  return new OpenAIExecutionAdapter();
}

/**
 * OpenAI execution adapter class (for direct instantiation in tests).
 *
 * Model support is decided by the dynamic model catalog and the routing
 * engine (Phase 8): candidates are loaded from the database per provider,
 * so the adapter executes any model the router selects for this provider
 * and forwards the provider-native identifier to the underlying provider.
 */
export class OpenAIExecutionAdapter extends BaseExecutionAdapter {
  constructor() {
    super(new OpenAIProvider());
  }

  supports(_modelId: string): boolean {
    return true;
  }
}

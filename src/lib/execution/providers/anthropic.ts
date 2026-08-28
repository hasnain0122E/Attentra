/**
 * Attentra — Anthropic Execution Adapter
 *
 * Phase 7 / Step 1 — Provider Adapter Foundation
 *
 * Wraps the Phase 4 AnthropicProvider to implement the execution-layer
 * ProviderAdapter interface. Delegates model support and request
 * execution to the underlying AIProvider.
 *
 * Real API calls occur only when execute() is called with valid
 * credentials — this module does not make network calls at import
 * time or during adapter construction.
 */

import { AnthropicProvider } from "@/lib/providers";
import { BaseExecutionAdapter } from "../types";

/**
 * Create the Anthropic execution adapter.
 *
 * @returns  BaseExecutionAdapter wrapping the Phase 4 AnthropicProvider
 */
export function createAnthropicAdapter(): BaseExecutionAdapter {
  return new BaseExecutionAdapter(new AnthropicProvider());
}

/**
 * Anthropic execution adapter class (for direct instantiation in tests).
 */
export class AnthropicExecutionAdapter extends BaseExecutionAdapter {
  constructor() {
    super(new AnthropicProvider());
  }
}

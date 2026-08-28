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
  return new BaseExecutionAdapter(new OpenAIProvider());
}

/**
 * OpenAI execution adapter class (for direct instantiation in tests).
 */
export class OpenAIExecutionAdapter extends BaseExecutionAdapter {
  constructor() {
    super(new OpenAIProvider());
  }
}

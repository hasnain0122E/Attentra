/**
 * Attentra — Google (Gemini) Execution Adapter
 *
 * Phase 7 / Step 1 — Provider Adapter Foundation
 *
 * Wraps the Phase 4 GoogleProvider to implement the execution-layer
 * ProviderAdapter interface. Delegates model support and request
 * execution to the underlying AIProvider.
 *
 * Real API calls occur only when execute() is called with valid
 * credentials — this module does not make network calls at import
 * time or during adapter construction.
 */

import { GoogleProvider } from "@/lib/providers";
import { BaseExecutionAdapter } from "../types";

/**
 * Create the Google execution adapter.
 *
 * @returns  BaseExecutionAdapter wrapping the Phase 4 GoogleProvider
 */
export function createGoogleAdapter(): BaseExecutionAdapter {
  return new GoogleExecutionAdapter();
}

/**
 * Google execution adapter class (for direct instantiation in tests).
 *
 * Model support is decided by the dynamic model catalog and the routing
 * engine (Phase 8): candidates are loaded from the database per provider,
 * so the adapter executes any model the router selects for this provider
 * and forwards the provider-native identifier to the underlying provider.
 */
export class GoogleExecutionAdapter extends BaseExecutionAdapter {
  constructor() {
    super(new GoogleProvider());
  }

  supports(_modelId: string): boolean {
    return true;
  }
}

export type RequestStatus =
  | "SUCCESS"
  | "FALLBACK"
  | "FAILED";

export type RequestComplexity =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface HistoryExecutionAttempt {
  attempt: number;
  model: string;
  modelIdentifier: string;
  provider: string;
  success: boolean;
  latencyMs: number;
  retryable?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface RequestHistoryItem {
  id: string;

  prompt: string;
  response?: string;

  status: RequestStatus;
  taskType: string;
  complexity: RequestComplexity;

  routedModel: string;
  routedModelIdentifier: string;
  routedProvider: string;

  executedModel?: string;
  executedModelIdentifier?: string;
  executedProvider?: string;

  fallbackUsed: boolean;

  routingReason: string;
  routingScore: number;

  projectedCost?: number;
  actualCost?: number;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  /**
   * Where the stored token counts come from:
   * - "reported":   provider-reported usage (successful execution with a calculated cost)
   * - "estimated":  routing-time estimate (request failed or never executed)
   * - "unverified": successful request without a calculated cost — the counts
   *                 may be provider-reported or the routing estimate
   * Optional for backward compatibility with older fixtures.
   */
  tokenSource?: "reported" | "estimated" | "unverified";

  routingLatencyMs: number;
  executionLatencyMs: number;
  latencyMs: number;

  attempts: HistoryExecutionAttempt[];

  /**
   * False when `attempts` is reconstructed from the routed and executed
   * models only (per-attempt results are not persisted). Intermediate
   * fallback attempts and their errors are then unknown.
   */
  attemptsRecorded?: boolean;

  createdAt: string;
}

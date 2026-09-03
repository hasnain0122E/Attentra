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

  routingLatencyMs: number;
  executionLatencyMs: number;
  latencyMs: number;

  attempts: HistoryExecutionAttempt[];

  createdAt: string;
}

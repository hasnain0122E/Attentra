export type DashboardComplexity = "LOW" | "MEDIUM" | "HIGH";

export interface ExecutionAttemptDisplayData {
  attempt: number;
  modelId: string;
  modelIdentifier: string;
  displayName: string;
  provider: string;
  success: boolean;
  latencyMs: number;
  retryable?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface RoutingCandidateDisplayData {
  rank: number;
  modelIdentifier: string;
  displayName: string;
  provider: string;
  score: number;
  projectedCost: number;
  selected: boolean;
}

export interface RoutingDisplayData {
  selectedModelId: string;
  selectedModelIdentifier: string;
  selectedModelDisplayName: string;
  selectedProvider: string;
  reason: string;
  taskType: string;
  complexity: DashboardComplexity;
  projectedCost: number;
  candidates: RoutingCandidateDisplayData[];
}

export interface ExecutionDisplayData {
  modelId: string;
  modelIdentifier: string;
  displayName: string;
  provider: string;
  fallbackUsed: boolean;

  attempts: ExecutionAttemptDisplayData[];

  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  latencyMs: number;
  actualCost?: number;
}

export interface PlaygroundResultData {
  content: string;
  routing: RoutingDisplayData;
  execution: ExecutionDisplayData;
  timestamp: string;
}

export type RequestHistoryStatus =
  | "SUCCESS"
  | "FALLBACK"
  | "FAILED";

export interface RequestHistoryItem {
  id: string;
  prompt: string;
  taskType: string;
  complexity: DashboardComplexity;

  routedModel: string;
  routedProvider: string;

  executedModel?: string;
  executedProvider?: string;

  fallbackUsed: boolean;
  status: RequestHistoryStatus;

  latencyMs: number;
  actualCost?: number;

  timestamp: string;
}
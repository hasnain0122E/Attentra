export interface RoutingMetric {
  label: string;
  value: string;
  detail: string;
  change?: string;
  accent?: boolean;
}

export interface TaskDistributionItem {
  taskType: string;
  requestCount: number;
  percentage: number;
}

export interface ModelRoutingItem {
  model: string;
  provider: string;

  routedCount: number;
  executedCount: number;

  routedPercentage: number;
  executedPercentage: number;
}

export interface FallbackPathItem {
  fromModel: string;
  fromProvider: string;

  toModel: string;
  toProvider: string;

  count: number;
  percentage: number;
}

export interface ProviderDistributionItem {
  provider: string;
  routedCount: number;
  executedCount: number;

  routedPercentage: number;
  executedPercentage: number;
}

export interface RoutingLatencyBucket {
  label: string;
  valueMs: number;
  percentage: number;
}

export const routingMetrics: RoutingMetric[] = [
  {
    label: "Routing decisions",
    value: "12,842",
    detail: "organization requests · last 30 days",
  },
  {
    label: "Avg. decision time",
    value: "41ms",
    detail: "routing decision latency",
  },
  {
    label: "Fallback rate",
    value: "5.9%",
    detail: "requests requiring fallback execution",
  },
  {
    label: "Primary success",
    value: "94.1%",
    detail: "requests completed by selected primary",
    accent: true,
  },
];

export const taskDistribution: TaskDistributionItem[] = [
  {
    taskType: "CODING",
    requestCount: 3082,
    percentage: 24,
  },
  {
    taskType: "REASONING",
    requestCount: 2697,
    percentage: 21,
  },
  {
    taskType: "ANALYSIS",
    requestCount: 2183,
    percentage: 17,
  },
  {
    taskType: "SUMMARIZATION",
    requestCount: 1926,
    percentage: 15,
  },
  {
    taskType: "WRITING",
    requestCount: 1284,
    percentage: 10,
  },
  {
    taskType: "EXTRACTION",
    requestCount: 899,
    percentage: 7,
  },
  {
    taskType: "TRANSLATION",
    requestCount: 514,
    percentage: 4,
  },
  {
    taskType: "GENERAL",
    requestCount: 257,
    percentage: 2,
  },
];

export const modelRoutingDistribution: ModelRoutingItem[] = [
  {
    model: "Gemini 2.5 Flash",
    provider: "Google",
    routedCount: 6036,
    executedCount: 5488,
    routedPercentage: 47,
    executedPercentage: 42.7,
  },
  {
    model: "Claude Sonnet 5",
    provider: "Anthropic",
    routedCount: 3981,
    executedCount: 4529,
    routedPercentage: 31,
    executedPercentage: 35.3,
  },
  {
    model: "GPT-5 Nano",
    provider: "OpenAI",
    routedCount: 1926,
    executedCount: 1918,
    routedPercentage: 15,
    executedPercentage: 14.9,
  },
  {
    model: "Gemini 2.5 Pro",
    provider: "Google",
    routedCount: 899,
    executedCount: 907,
    routedPercentage: 7,
    executedPercentage: 7.1,
  },
];

export const fallbackPaths: FallbackPathItem[] = [
  {
    fromModel: "Gemini 2.5 Flash",
    fromProvider: "Google",
    toModel: "Claude Sonnet 5",
    toProvider: "Anthropic",
    count: 548,
    percentage: 72.3,
  },
  {
    fromModel: "Gemini 2.5 Pro",
    fromProvider: "Google",
    toModel: "Claude Sonnet 5",
    toProvider: "Anthropic",
    count: 96,
    percentage: 12.7,
  },
  {
    fromModel: "Claude Sonnet 5",
    fromProvider: "Anthropic",
    toModel: "GPT-5 Nano",
    toProvider: "OpenAI",
    count: 61,
    percentage: 8.0,
  },
  {
    fromModel: "GPT-5 Nano",
    fromProvider: "OpenAI",
    toModel: "Gemini 2.5 Flash",
    toProvider: "Google",
    count: 53,
    percentage: 7.0,
  },
];

export const providerDistribution: ProviderDistributionItem[] = [
  {
    provider: "Google",
    routedCount: 6935,
    executedCount: 6395,
    routedPercentage: 54,
    executedPercentage: 49.8,
  },
  {
    provider: "Anthropic",
    routedCount: 3981,
    executedCount: 4529,
    routedPercentage: 31,
    executedPercentage: 35.3,
  },
  {
    provider: "OpenAI",
    routedCount: 1926,
    executedCount: 1918,
    routedPercentage: 15,
    executedPercentage: 14.9,
  },
];

export const routingLatencyBuckets: RoutingLatencyBucket[] = [
  {
    label: "< 25ms",
    valueMs: 22,
    percentage: 18,
  },
  {
    label: "25–40ms",
    valueMs: 34,
    percentage: 39,
  },
  {
    label: "41–60ms",
    valueMs: 49,
    percentage: 31,
  },
  {
    label: "61–100ms",
    valueMs: 74,
    percentage: 10,
  },
  {
    label: "> 100ms",
    valueMs: 128,
    percentage: 2,
  },
];
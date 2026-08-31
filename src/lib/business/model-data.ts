export type BusinessModelHealth =
  | "HEALTHY"
  | "DEGRADED"
  | "UNAVAILABLE";

export interface BusinessModelMetric {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}

export interface BusinessModelUsageItem {
  id: string;

  model: string;
  identifier: string;
  provider: string;

  health: BusinessModelHealth;

  routedCount: number;
  executedCount: number;

  routedPercentage: number;
  executedPercentage: number;

  fallbackInCount: number;
  fallbackOutCount: number;

  avgLatencyMs: number;

  taskAffinity: string[];

  capabilityTier: string;
}

export interface TaskAffinityItem {
  taskType: string;
  primaryModel: string;
  provider: string;
  requestCount: number;
  percentage: number;
}

export const modelMetrics: BusinessModelMetric[] = [
  {
    label: "Active models",
    value: "4",
    detail: "models currently carrying organization traffic",
  },
  {
    label: "Providers",
    value: "3",
    detail: "Google · Anthropic · OpenAI",
  },
  {
    label: "Primary leader",
    value: "47%",
    detail: "Gemini 2.5 Flash routed workload",
    accent: true,
  },
  {
    label: "Fallback traffic",
    value: "758",
    detail: "requests involving fallback execution",
  },
];

export const businessModelUsage: BusinessModelUsageItem[] = [
  {
    id: "google-gemini-2.5-flash",

    model: "Gemini 2.5 Flash",
    identifier: "gemini-2.5-flash",
    provider: "Google",

    health: "HEALTHY",

    routedCount: 6036,
    executedCount: 5488,

    routedPercentage: 47,
    executedPercentage: 42.7,

    fallbackInCount: 53,
    fallbackOutCount: 548,

    avgLatencyMs: 842,

    taskAffinity: [
      "SUMMARIZATION",
      "TRANSLATION",
      "GENERAL",
      "REASONING",
    ],

    capabilityTier: "Fast general-purpose",
  },

  {
    id: "anthropic-claude-sonnet-5",

    model: "Claude Sonnet 5",
    identifier: "claude-sonnet-5",
    provider: "Anthropic",

    health: "HEALTHY",

    routedCount: 3981,
    executedCount: 4529,

    routedPercentage: 31,
    executedPercentage: 35.3,

    fallbackInCount: 644,
    fallbackOutCount: 61,

    avgLatencyMs: 1768,

    taskAffinity: [
      "CODING",
      "REASONING",
      "ANALYSIS",
      "WRITING",
    ],

    capabilityTier: "High-capability reasoning",
  },

  {
    id: "openai-gpt-5-nano",

    model: "GPT-5 Nano",
    identifier: "gpt-5-nano",
    provider: "OpenAI",

    health: "HEALTHY",

    routedCount: 1926,
    executedCount: 1918,

    routedPercentage: 15,
    executedPercentage: 14.9,

    fallbackInCount: 61,
    fallbackOutCount: 53,

    avgLatencyMs: 913,

    taskAffinity: [
      "EXTRACTION",
      "GENERAL",
      "CLASSIFICATION",
    ],

    capabilityTier: "Lightweight structured tasks",
  },

  {
    id: "google-gemini-2.5-pro",

    model: "Gemini 2.5 Pro",
    identifier: "gemini-2.5-pro",
    provider: "Google",

    health: "DEGRADED",

    routedCount: 899,
    executedCount: 907,

    routedPercentage: 7,
    executedPercentage: 7.1,

    fallbackInCount: 8,
    fallbackOutCount: 96,

    avgLatencyMs: 1438,

    taskAffinity: [
      "ANALYSIS",
      "REASONING",
      "WRITING",
    ],

    capabilityTier: "Advanced reasoning",
  },
];

export const taskAffinityData: TaskAffinityItem[] = [
  {
    taskType: "CODING",
    primaryModel: "Claude Sonnet 5",
    provider: "Anthropic",
    requestCount: 2184,
    percentage: 71,
  },
  {
    taskType: "REASONING",
    primaryModel: "Claude Sonnet 5",
    provider: "Anthropic",
    requestCount: 1618,
    percentage: 60,
  },
  {
    taskType: "ANALYSIS",
    primaryModel: "Gemini 2.5 Pro",
    provider: "Google",
    requestCount: 1056,
    percentage: 48,
  },
  {
    taskType: "SUMMARIZATION",
    primaryModel: "Gemini 2.5 Flash",
    provider: "Google",
    requestCount: 1482,
    percentage: 77,
  },
  {
    taskType: "TRANSLATION",
    primaryModel: "Gemini 2.5 Flash",
    provider: "Google",
    requestCount: 411,
    percentage: 80,
  },
  {
    taskType: "EXTRACTION",
    primaryModel: "GPT-5 Nano",
    provider: "OpenAI",
    requestCount: 683,
    percentage: 76,
  },
];
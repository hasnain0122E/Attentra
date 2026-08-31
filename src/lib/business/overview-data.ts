export interface BusinessMetric {
  label: string;
  value: string;
  change?: string;
  detail: string;
  accent?: boolean;
}

export interface BusinessModelUsage {
  model: string;
  provider: string;
  requestCount: number;
  percentage: number;
}

export interface BusinessMemberUsage {
  id: string;
  name: string;
  role: string;
  initials: string;
  requestCount: number;
  percentage: number;
}

export type BusinessRequestStatus =
  | "SUCCESS"
  | "FALLBACK"
  | "FAILED";

export interface BusinessRecentRequest {
  id: string;
  member: string;
  memberInitials: string;

  taskType: string;

  routedModel: string;
  routedProvider: string;

  executedModel: string;
  executedProvider: string;

  fallbackUsed: boolean;

  status: BusinessRequestStatus;

  latencyMs: number;

  createdAt: string;
}

export const businessMetrics: BusinessMetric[] = [
  {
    label: "Requests",
    value: "12,842",
    change: "+14.7%",
    detail: "organization requests · last 30 days",
  },
  {
    label: "Active members",
    value: "18",
    change: "+2",
    detail: "members with recent activity",
  },
  {
    label: "Fallback rate",
    value: "5.9%",
    change: "-0.8%",
    detail: "requests requiring fallback execution",
  },
  {
    label: "Routing success",
    value: "94.1%",
    change: "+0.6%",
    detail: "requests completed successfully",
    accent: true,
  },
];

export const businessModelUsage: BusinessModelUsage[] = [
  {
    model: "Gemini 2.5 Flash",
    provider: "Google",
    requestCount: 6036,
    percentage: 47,
  },
  {
    model: "Claude Sonnet 5",
    provider: "Anthropic",
    requestCount: 3981,
    percentage: 31,
  },
  {
    model: "GPT-5 Nano",
    provider: "OpenAI",
    requestCount: 1926,
    percentage: 15,
  },
  {
    model: "Gemini 2.5 Pro",
    provider: "Google",
    requestCount: 899,
    percentage: 7,
  },
];

export const businessMemberUsage: BusinessMemberUsage[] = [
  {
    id: "member_ali",
    name: "Hasnain Ali",
    role: "Owner",
    initials: "HA",
    requestCount: 4210,
    percentage: 33,
  },
  {
    id: "member_sara",
    name: "Sara Khan",
    role: "Developer",
    initials: "SK",
    requestCount: 3184,
    percentage: 25,
  },
  {
    id: "member_ahmed",
    name: "Ahmed Raza",
    role: "Developer",
    initials: "AR",
    requestCount: 2542,
    percentage: 20,
  },
  {
    id: "member_hamza",
    name: "Hamza Noor",
    role: "Engineer",
    initials: "HN",
    requestCount: 1748,
    percentage: 14,
  },
  {
    id: "member_other",
    name: "Other members",
    role: "8 members",
    initials: "+8",
    requestCount: 1158,
    percentage: 8,
  },
];

export const businessRecentRequests: BusinessRecentRequest[] = [
  {
    id: "req_business_001",
    member: "Hasnain Ali",
    memberInitials: "HA",

    taskType: "REASONING",

    routedModel: "Gemini 2.5 Flash",
    routedProvider: "Google",

    executedModel: "Claude Sonnet 5",
    executedProvider: "Anthropic",

    fallbackUsed: true,

    status: "FALLBACK",

    latencyMs: 2112,

    createdAt: "2026-08-31T11:28:00.000Z",
  },
  {
    id: "req_business_002",
    member: "Sara Khan",
    memberInitials: "SK",

    taskType: "CODING",

    routedModel: "Claude Sonnet 5",
    routedProvider: "Anthropic",

    executedModel: "Claude Sonnet 5",
    executedProvider: "Anthropic",

    fallbackUsed: false,

    status: "SUCCESS",

    latencyMs: 1842,

    createdAt: "2026-08-31T10:54:00.000Z",
  },
  {
    id: "req_business_003",
    member: "Ahmed Raza",
    memberInitials: "AR",

    taskType: "SUMMARIZATION",

    routedModel: "Gemini 2.5 Flash",
    routedProvider: "Google",

    executedModel: "Gemini 2.5 Flash",
    executedProvider: "Google",

    fallbackUsed: false,

    status: "SUCCESS",

    latencyMs: 846,

    createdAt: "2026-08-31T10:31:00.000Z",
  },
  {
    id: "req_business_004",
    member: "Hamza Noor",
    memberInitials: "HN",

    taskType: "ANALYSIS",

    routedModel: "Gemini 2.5 Pro",
    routedProvider: "Google",

    executedModel: "Gemini 2.5 Pro",
    executedProvider: "Google",

    fallbackUsed: false,

    status: "FAILED",

    latencyMs: 1438,

    createdAt: "2026-08-31T09:47:00.000Z",
  },
];
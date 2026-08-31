export type BusinessRequestStatus =
  | "SUCCESS"
  | "FALLBACK"
  | "FAILED";

export type BusinessRequestComplexity =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface BusinessExecutionAttempt {
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

export interface BusinessRequestItem {
  id: string;

  member: {
    name: string;
    initials: string;
    role: string;
  };

  apiKey: {
    name: string;
    prefix: string;
  };

  prompt: string;
  response?: string;

  taskType: string;
  complexity: BusinessRequestComplexity;

  status: BusinessRequestStatus;

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

  attempts: BusinessExecutionAttempt[];

  createdAt: string;
}

export const businessRequests: BusinessRequestItem[] = [
  {
    id: "biz_req_01J8V2D4N9K7F1A3",

    member: {
      name: "Hasnain Ali",
      initials: "HA",
      role: "Owner",
    },

    apiKey: {
      name: "Production API",
      prefix: "attentra_demo_ACME01",
    },

    prompt:
      "Explain why caching improves web application performance in two short sentences.",

    response:
      "Caching improves web application performance by storing frequently requested data closer to where it is needed, reducing repeated computation and network access.\n\nThis lowers response time, reduces backend load, and allows applications to serve more users efficiently.",

    taskType: "REASONING",
    complexity: "LOW",

    status: "FALLBACK",

    routedModel: "Gemini 2.5 Flash",
    routedModelIdentifier: "gemini-2.5-flash",
    routedProvider: "Google",

    executedModel: "Claude Sonnet 5",
    executedModelIdentifier: "claude-sonnet-5",
    executedProvider: "Anthropic",

    fallbackUsed: true,

    routingReason:
      "Selected for strong reasoning capability, suitable context capacity, low projected cost, and a high routing score for this low-complexity request.",

    routingScore: 0.9997,

    projectedCost: 0.000646,
    actualCost: 0.00098,

    inputTokens: 25,
    outputTokens: 89,
    totalTokens: 114,

    routingLatencyMs: 38,
    executionLatencyMs: 2074,
    latencyMs: 2112,

    attempts: [
      {
        attempt: 1,
        model: "Gemini 2.5 Flash",
        modelIdentifier: "gemini-2.5-flash",
        provider: "Google",
        success: false,
        latencyMs: 418,
        retryable: true,
        errorCode: "MODEL_UNAVAILABLE",
        errorMessage:
          "The selected model was unavailable for execution.",
      },
      {
        attempt: 2,
        model: "Claude Sonnet 5",
        modelIdentifier: "claude-sonnet-5",
        provider: "Anthropic",
        success: true,
        latencyMs: 1656,
      },
    ],

    createdAt: "2026-08-31T11:28:00.000Z",
  },

  {
    id: "biz_req_01J8V1Q6M3S9C8P2",

    member: {
      name: "Sara Khan",
      initials: "SK",
      role: "Developer",
    },

    apiKey: {
      name: "Backend service",
      prefix: "attentra_demo_ACME02",
    },

    prompt:
      "Review this TypeScript authentication middleware and identify possible security issues.",

    response:
      "The middleware should be reviewed for token validation, authorization boundaries, cookie configuration, error leakage, session fixation, and privilege escalation risks.",

    taskType: "CODING",
    complexity: "HIGH",

    status: "SUCCESS",

    routedModel: "Claude Sonnet 5",
    routedModelIdentifier: "claude-sonnet-5",
    routedProvider: "Anthropic",

    executedModel: "Claude Sonnet 5",
    executedModelIdentifier: "claude-sonnet-5",
    executedProvider: "Anthropic",

    fallbackUsed: false,

    routingReason:
      "The request was classified as high-complexity code analysis and prioritized stronger reasoning and code-review capability.",

    routingScore: 0.9731,

    projectedCost: 0.00642,
    actualCost: 0.00642,

    inputTokens: 874,
    outputTokens: 582,
    totalTokens: 1456,

    routingLatencyMs: 44,
    executionLatencyMs: 1798,
    latencyMs: 1842,

    attempts: [
      {
        attempt: 1,
        model: "Claude Sonnet 5",
        modelIdentifier: "claude-sonnet-5",
        provider: "Anthropic",
        success: true,
        latencyMs: 1798,
      },
    ],

    createdAt: "2026-08-31T10:54:00.000Z",
  },

  {
    id: "biz_req_01J8UZR8W7M5K4T9",

    member: {
      name: "Ahmed Raza",
      initials: "AR",
      role: "Developer",
    },

    apiKey: {
      name: "Internal tools",
      prefix: "attentra_demo_ACME03",
    },

    prompt:
      "Summarize the following product release notes for a non-technical customer.",

    response:
      "The latest release improves performance, simplifies several workflows, and introduces reliability improvements that make the product faster and easier to use.",

    taskType: "SUMMARIZATION",
    complexity: "LOW",

    status: "SUCCESS",

    routedModel: "Gemini 2.5 Flash",
    routedModelIdentifier: "gemini-2.5-flash",
    routedProvider: "Google",

    executedModel: "Gemini 2.5 Flash",
    executedModelIdentifier: "gemini-2.5-flash",
    executedProvider: "Google",

    fallbackUsed: false,

    routingReason:
      "The request required concise summarization with low complexity, making Gemini 2.5 Flash the strongest cost-capability match.",

    routingScore: 0.9824,

    projectedCost: 0.00041,
    actualCost: 0.00041,

    inputTokens: 281,
    outputTokens: 105,
    totalTokens: 386,

    routingLatencyMs: 31,
    executionLatencyMs: 815,
    latencyMs: 846,

    attempts: [
      {
        attempt: 1,
        model: "Gemini 2.5 Flash",
        modelIdentifier: "gemini-2.5-flash",
        provider: "Google",
        success: true,
        latencyMs: 815,
      },
    ],

    createdAt: "2026-08-31T10:31:00.000Z",
  },

  {
    id: "biz_req_01J8UYD5Q2V8H6L1",

    member: {
      name: "Hamza Noor",
      initials: "HN",
      role: "Engineer",
    },

    apiKey: {
      name: "Data pipeline",
      prefix: "attentra_demo_ACME04",
    },

    prompt:
      "Compare event-driven architecture and request-response architecture for a high-volume notification system.",

    taskType: "ANALYSIS",
    complexity: "MEDIUM",

    status: "FAILED",

    routedModel: "Gemini 2.5 Pro",
    routedModelIdentifier: "gemini-2.5-pro",
    routedProvider: "Google",

    fallbackUsed: false,

    routingReason:
      "The request required architectural comparison and moderate reasoning depth, resulting in selection of a higher-capability model.",

    routingScore: 0.9344,

    projectedCost: 0.00214,

    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,

    routingLatencyMs: 35,
    executionLatencyMs: 1403,
    latencyMs: 1438,

    attempts: [
      {
        attempt: 1,
        model: "Gemini 2.5 Pro",
        modelIdentifier: "gemini-2.5-pro",
        provider: "Google",
        success: false,
        latencyMs: 1403,
        retryable: false,
        errorCode: "EXECUTION_FAILED",
        errorMessage:
          "The provider did not return a successful completion.",
      },
    ],

    createdAt: "2026-08-31T09:47:00.000Z",
  },

  {
    id: "biz_req_01J8UXH9C6B4N2R7",

    member: {
      name: "Sara Khan",
      initials: "SK",
      role: "Developer",
    },

    apiKey: {
      name: "Backend service",
      prefix: "attentra_demo_ACME02",
    },

    prompt:
      "Extract the customer name, invoice number, due date, and total amount from this invoice text.",

    response:
      "Customer: Aster Labs\nInvoice: INV-2048\nDue date: September 14, 2026\nTotal: $4,820.00",

    taskType: "EXTRACTION",
    complexity: "LOW",

    status: "SUCCESS",

    routedModel: "GPT-5 Nano",
    routedModelIdentifier: "gpt-5-nano",
    routedProvider: "OpenAI",

    executedModel: "GPT-5 Nano",
    executedModelIdentifier: "gpt-5-nano",
    executedProvider: "OpenAI",

    fallbackUsed: false,

    routingReason:
      "The task required structured extraction with low reasoning complexity, favoring a lightweight model.",

    routingScore: 0.9618,

    projectedCost: 0.00029,
    actualCost: 0.00029,

    inputTokens: 176,
    outputTokens: 72,
    totalTokens: 248,

    routingLatencyMs: 27,
    executionLatencyMs: 784,
    latencyMs: 811,

    attempts: [
      {
        attempt: 1,
        model: "GPT-5 Nano",
        modelIdentifier: "gpt-5-nano",
        provider: "OpenAI",
        success: true,
        latencyMs: 784,
      },
    ],

    createdAt: "2026-08-30T16:31:00.000Z",
  },

  {
    id: "biz_req_01J8USN3X5P1M8D4",

    member: {
      name: "Hasnain Ali",
      initials: "HA",
      role: "Owner",
    },

    apiKey: {
      name: "Production API",
      prefix: "attentra_demo_ACME01",
    },

    prompt:
      "Translate this customer support response into professional Spanish.",

    response:
      "Gracias por ponerse en contacto con nuestro equipo de soporte. Hemos recibido su solicitud y uno de nuestros especialistas la revisará en breve.",

    taskType: "TRANSLATION",
    complexity: "LOW",

    status: "SUCCESS",

    routedModel: "Gemini 2.5 Flash",
    routedModelIdentifier: "gemini-2.5-flash",
    routedProvider: "Google",

    executedModel: "Gemini 2.5 Flash",
    executedModelIdentifier: "gemini-2.5-flash",
    executedProvider: "Google",

    fallbackUsed: false,

    routingReason:
      "The request was a straightforward translation task with low complexity and modest context requirements.",

    routingScore: 0.9688,

    projectedCost: 0.00022,
    actualCost: 0.00022,

    inputTokens: 126,
    outputTokens: 69,
    totalTokens: 195,

    routingLatencyMs: 29,
    executionLatencyMs: 704,
    latencyMs: 733,

    attempts: [
      {
        attempt: 1,
        model: "Gemini 2.5 Flash",
        modelIdentifier: "gemini-2.5-flash",
        provider: "Google",
        success: true,
        latencyMs: 704,
      },
    ],

    createdAt: "2026-08-30T12:44:00.000Z",
  },

  {
    id: "biz_req_01J8UNF7R4A9Z3K6",

    member: {
      name: "Ahmed Raza",
      initials: "AR",
      role: "Developer",
    },

    apiKey: {
      name: "Internal tools",
      prefix: "attentra_demo_ACME03",
    },

    prompt:
      "Generate a concise executive summary of our quarterly infrastructure report.",

    response:
      "The quarter showed stable infrastructure growth, improved service reliability, and increased utilization across core workloads while operational efficiency remained within target ranges.",

    taskType: "WRITING",
    complexity: "MEDIUM",

    status: "SUCCESS",

    routedModel: "Claude Sonnet 5",
    routedModelIdentifier: "claude-sonnet-5",
    routedProvider: "Anthropic",

    executedModel: "Claude Sonnet 5",
    executedModelIdentifier: "claude-sonnet-5",
    executedProvider: "Anthropic",

    fallbackUsed: false,

    routingReason:
      "The request required structured business writing with moderate reasoning depth.",

    routingScore: 0.9482,

    projectedCost: 0.00312,
    actualCost: 0.00312,

    inputTokens: 488,
    outputTokens: 311,
    totalTokens: 799,

    routingLatencyMs: 42,
    executionLatencyMs: 1698,
    latencyMs: 1740,

    attempts: [
      {
        attempt: 1,
        model: "Claude Sonnet 5",
        modelIdentifier: "claude-sonnet-5",
        provider: "Anthropic",
        success: true,
        latencyMs: 1698,
      },
    ],

    createdAt: "2026-08-30T08:22:00.000Z",
  },

  {
    id: "biz_req_01J8UHJ2T6Y5E7W8",

    member: {
      name: "Hamza Noor",
      initials: "HN",
      role: "Engineer",
    },

    apiKey: {
      name: "Data pipeline",
      prefix: "attentra_demo_ACME04",
    },

    prompt:
      "Explain the difference between horizontal and vertical database scaling.",

    response:
      "Vertical scaling increases resources on a single server, while horizontal scaling distributes workload across multiple servers. Vertical scaling is simpler but limited by hardware; horizontal scaling offers greater long-term scalability with more distributed-system complexity.",

    taskType: "GENERAL",
    complexity: "LOW",

    status: "SUCCESS",

    routedModel: "GPT-5 Nano",
    routedModelIdentifier: "gpt-5-nano",
    routedProvider: "OpenAI",

    executedModel: "GPT-5 Nano",
    executedModelIdentifier: "gpt-5-nano",
    executedProvider: "OpenAI",

    fallbackUsed: false,

    routingReason:
      "The request was a low-complexity explanatory task suitable for a lightweight general-purpose model.",

    routingScore: 0.9476,

    projectedCost: 0.00036,
    actualCost: 0.00036,

    inputTokens: 112,
    outputTokens: 215,
    totalTokens: 327,

    routingLatencyMs: 30,
    executionLatencyMs: 956,
    latencyMs: 986,

    attempts: [
      {
        attempt: 1,
        model: "GPT-5 Nano",
        modelIdentifier: "gpt-5-nano",
        provider: "OpenAI",
        success: true,
        latencyMs: 956,
      },
    ],

    createdAt: "2026-08-29T19:07:00.000Z",
  },
];

export function getBusinessRequest(
  requestId: string,
) {
  return businessRequests.find(
    (request) => request.id === requestId,
  );
}
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

export const requestHistory: RequestHistoryItem[] = [
  {
    id: "req_01J8V2D4N9K7F1A3",

    prompt:
      "Explain why caching improves web application performance in two short sentences.",

    response:
      "Caching improves web application performance by storing frequently requested data closer to where it is needed, reducing repeated computation and database or network access.\n\nThis lowers response time, reduces backend load, and allows the application to serve more users efficiently.",

    status: "FALLBACK",
    taskType: "REASONING",
    complexity: "LOW",

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
          "The selected model was temporarily unavailable for execution.",
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

    createdAt: "2026-08-31T10:42:00.000Z",
  },

  {
    id: "req_01J8V1Q6M3S9C8P2",

    prompt:
      "Summarize the following product update for a non-technical customer.",

    response:
      "The latest update improves performance, simplifies several workflows, and introduces reliability improvements designed to make the product faster and easier to use.",

    status: "SUCCESS",
    taskType: "SUMMARIZATION",
    complexity: "LOW",

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
    executionLatencyMs: 893,
    latencyMs: 924,

    attempts: [
      {
        attempt: 1,
        model: "Gemini 2.5 Flash",
        modelIdentifier: "gemini-2.5-flash",
        provider: "Google",
        success: true,
        latencyMs: 893,
      },
    ],

    createdAt: "2026-08-31T09:18:00.000Z",
  },

  {
    id: "req_01J8UZR8W7M5K4T9",

    prompt:
      "Review this TypeScript authentication middleware and identify possible security issues.",

    response:
      "The middleware should be reviewed for token validation, authorization boundaries, cookie configuration, error leakage, request origin validation, and protection against session fixation or privilege escalation.",

    status: "SUCCESS",
    taskType: "CODING",
    complexity: "HIGH",

    routedModel: "Claude Sonnet 5",
    routedModelIdentifier: "claude-sonnet-5",
    routedProvider: "Anthropic",

    executedModel: "Claude Sonnet 5",
    executedModelIdentifier: "claude-sonnet-5",
    executedProvider: "Anthropic",

    fallbackUsed: false,

    routingReason:
      "The request was classified as high-complexity coding analysis and prioritized stronger reasoning and code-review capability.",

    routingScore: 0.9731,

    projectedCost: 0.00642,
    actualCost: 0.00642,

    inputTokens: 874,
    outputTokens: 582,
    totalTokens: 1456,

    routingLatencyMs: 44,
    executionLatencyMs: 2796,
    latencyMs: 2840,

    attempts: [
      {
        attempt: 1,
        model: "Claude Sonnet 5",
        modelIdentifier: "claude-sonnet-5",
        provider: "Anthropic",
        success: true,
        latencyMs: 2796,
      },
    ],

    createdAt: "2026-08-30T18:54:00.000Z",
  },

  {
    id: "req_01J8UYD5Q2V8H6L1",

    prompt:
      "Extract the customer name, invoice number, due date, and total amount from this text.",

    response:
      "Customer: Aster Labs\nInvoice: INV-2048\nDue date: September 14, 2026\nTotal: $4,820.00",

    status: "SUCCESS",
    taskType: "EXTRACTION",
    complexity: "LOW",

    routedModel: "GPT-5 Nano",
    routedModelIdentifier: "gpt-5-nano",
    routedProvider: "OpenAI",

    executedModel: "GPT-5 Nano",
    executedModelIdentifier: "gpt-5-nano",
    executedProvider: "OpenAI",

    fallbackUsed: false,

    routingReason:
      "The task required structured extraction with low reasoning complexity, favoring a lightweight model with low projected cost.",

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
    id: "req_01J8UXH9C6B4N2R7",

    prompt:
      "Compare event-driven architecture and request-response architecture for a high-volume notification system.",

    response:
      "Event-driven architecture is generally better suited to high-volume notification systems because producers and consumers remain loosely coupled and workloads can be processed asynchronously. Request-response remains useful where immediate confirmation or synchronous coordination is required.",

    status: "SUCCESS",
    taskType: "ANALYSIS",
    complexity: "MEDIUM",

    routedModel: "Claude Sonnet 5",
    routedModelIdentifier: "claude-sonnet-5",
    routedProvider: "Anthropic",

    executedModel: "Claude Sonnet 5",
    executedModelIdentifier: "claude-sonnet-5",
    executedProvider: "Anthropic",

    fallbackUsed: false,

    routingReason:
      "The request required architectural comparison and trade-off analysis, favoring a reasoning-oriented model.",

    routingScore: 0.9527,

    projectedCost: 0.00487,
    actualCost: 0.00487,

    inputTokens: 552,
    outputTokens: 466,
    totalTokens: 1018,

    routingLatencyMs: 36,
    executionLatencyMs: 2340,
    latencyMs: 2376,

    attempts: [
      {
        attempt: 1,
        model: "Claude Sonnet 5",
        modelIdentifier: "claude-sonnet-5",
        provider: "Anthropic",
        success: true,
        latencyMs: 2340,
      },
    ],

    createdAt: "2026-08-30T14:06:00.000Z",
  },

  {
    id: "req_01J8USN3X5P1M8D4",

    prompt:
      "Translate this customer support message into professional Spanish.",

    response:
      "Gracias por ponerse en contacto con nuestro equipo de soporte. Hemos recibido su solicitud y uno de nuestros especialistas la revisará en breve.",

    status: "SUCCESS",
    taskType: "TRANSLATION",
    complexity: "LOW",

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

    createdAt: "2026-08-29T12:44:00.000Z",
  },

  {
    id: "req_01J8UNF7R4A9Z3K6",

    prompt:
      "Generate a concise executive summary of our quarterly infrastructure spending.",

    status: "FAILED",
    taskType: "WRITING",
    complexity: "MEDIUM",

    routedModel: "Gemini 2.5 Pro",
    routedModelIdentifier: "gemini-2.5-pro",
    routedProvider: "Google",

    fallbackUsed: false,

    routingReason:
      "The request required structured executive writing with moderate reasoning depth and context handling.",

    routingScore: 0.9344,

    projectedCost: 0.00214,

    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,

    routingLatencyMs: 35,
    executionLatencyMs: 1427,
    latencyMs: 1462,

    attempts: [
      {
        attempt: 1,
        model: "Gemini 2.5 Pro",
        modelIdentifier: "gemini-2.5-pro",
        provider: "Google",
        success: false,
        latencyMs: 1427,
        retryable: false,
        errorCode: "EXECUTION_FAILED",
        errorMessage:
          "The provider did not return a successful completion for this request.",
      },
    ],

    createdAt: "2026-08-29T08:22:00.000Z",
  },

  {
    id: "req_01J8UHJ2T6Y5E7W8",

    prompt:
      "Explain the difference between horizontal and vertical database scaling.",

    response:
      "Vertical scaling increases the resources available to a single database server, while horizontal scaling distributes workload across multiple servers. Vertical scaling is simpler but has hardware limits; horizontal scaling offers greater long-term scalability but requires distributed-system coordination.",

    status: "SUCCESS",
    taskType: "GENERAL",
    complexity: "LOW",

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

    createdAt: "2026-08-28T19:07:00.000Z",
  },
];

export function getRequestHistoryItem(
  requestId: string,
) {
  return requestHistory.find(
    (request) => request.id === requestId,
  );
}
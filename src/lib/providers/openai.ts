/**
 * Attentra — OpenAI Provider Adapter
 *
 * Architecture.md v2.0 §6 — Provider Abstraction
 *
 * Converts NormalizedAIRequest → OpenAI chat completion,
 * then normalizes the response into NormalizedAIResponse.
 *
 * Provider-specific code is fully isolated inside this module.
 */

import OpenAI from "openai";
import type {
  AIProvider,
  Message,
  ModelDefinition,
  NormalizedAIRequest,
  NormalizedAIResponse,
} from "./types";
import { AttentraProviderError } from "./types";

const PROVIDER_ID = "openai";

/**
 * Convert Attentra message roles to OpenAI roles.
 * OpenAI supports: system, user, assistant (plus tool/function roles we don't use).
 */
function toOpenAIMessages(
  messages: Message[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

/**
 * Translate OpenAI SDK errors into normalized AttentraProviderError.
 */
function normalizeError(error: unknown): AttentraProviderError {
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    const providerCode = String(error.code ?? status ?? "unknown");

    if (status === 401 || status === 403) {
      return new AttentraProviderError(
        "AUTHENTICATION_ERROR",
        PROVIDER_ID,
        `OpenAI authentication failed: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: false, cause: error }
      );
    }
    if (status === 429) {
      return new AttentraProviderError(
        "RATE_LIMIT_ERROR",
        PROVIDER_ID,
        `OpenAI rate limit exceeded: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: true, cause: error }
      );
    }
    if (status === 400 && error.message?.includes("context_length")) {
      return new AttentraProviderError(
        "CONTEXT_LENGTH_ERROR",
        PROVIDER_ID,
        `OpenAI context length exceeded: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: false, cause: error }
      );
    }
    if (status === 404) {
      return new AttentraProviderError(
        "MODEL_NOT_FOUND",
        PROVIDER_ID,
        `OpenAI model not found: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: false, cause: error }
      );
    }
    if (status === 400) {
      return new AttentraProviderError(
        "INVALID_REQUEST_ERROR",
        PROVIDER_ID,
        `OpenAI invalid request: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: false, cause: error }
      );
    }
    if (status >= 500) {
      return new AttentraProviderError(
        "PROVIDER_UNAVAILABLE",
        PROVIDER_ID,
        `OpenAI server error: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: true, cause: error }
      );
    }
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new AttentraProviderError(
      "TIMEOUT_ERROR",
      PROVIDER_ID,
      "OpenAI request timed out",
      { retryable: true, cause: error }
    );
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return new AttentraProviderError(
      "PROVIDER_UNAVAILABLE",
      PROVIDER_ID,
      `OpenAI connection failed: ${error.message}`,
      { retryable: true, cause: error }
    );
  }

  return new AttentraProviderError(
    "UNKNOWN_ERROR",
    PROVIDER_ID,
    `OpenAI unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    { retryable: false, cause: error }
  );
}

/**
 * OpenAI provider adapter.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = PROVIDER_ID;
  readonly name = "OpenAI";

  private client: OpenAI | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? "";
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.apiKey.length > 0;
  }

  listModels(): ModelDefinition[] {
    return [
      {
        id: "openai-gpt-4o",
        providerId: PROVIDER_ID,
        modelIdentifier: "gpt-4o",
        displayName: "GPT-4o",
        capabilities: ["chat", "reasoning", "coding", "extraction", "translation", "summarization"],
        inputPricePer1k: 0.0025,
        outputPricePer1k: 0.01,
        expectedLatencyMs: 800,
        active: true,
      },
      {
        id: "openai-gpt-4o-mini",
        providerId: PROVIDER_ID,
        modelIdentifier: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        capabilities: ["chat", "classification", "summarization", "extraction", "translation"],
        inputPricePer1k: 0.00015,
        outputPricePer1k: 0.0006,
        expectedLatencyMs: 400,
        active: true,
      },
      {
        id: "openai-gpt-4.1",
        providerId: PROVIDER_ID,
        modelIdentifier: "gpt-4.1",
        displayName: "GPT-4.1",
        capabilities: ["chat", "reasoning", "coding", "extraction", "creative_writing"],
        inputPricePer1k: 0.002,
        outputPricePer1k: 0.008,
        expectedLatencyMs: 900,
        active: true,
      },
      {
        id: "openai-gpt-4.1-mini",
        providerId: PROVIDER_ID,
        modelIdentifier: "gpt-4.1-mini",
        displayName: "GPT-4.1 Mini",
        capabilities: ["chat", "classification", "summarization", "extraction"],
        inputPricePer1k: 0.0004,
        outputPricePer1k: 0.0016,
        expectedLatencyMs: 500,
        active: true,
      },
      {
        id: "openai-o3-mini",
        providerId: PROVIDER_ID,
        modelIdentifier: "o3-mini",
        displayName: "o3-mini",
        capabilities: ["reasoning", "coding", "classification"],
        inputPricePer1k: 0.00115,
        outputPricePer1k: 0.0044,
        expectedLatencyMs: 2000,
        active: true,
      },
    ];
  }

  async generate(
    request: NormalizedAIRequest,
    modelId: string
  ): Promise<NormalizedAIResponse> {
    if (!this.client) {
      throw new AttentraProviderError(
        "AUTHENTICATION_ERROR",
        PROVIDER_ID,
        "OpenAI API key is not configured. Set OPENAI_API_KEY in environment.",
        { retryable: false }
      );
    }

    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: modelId,
        messages: toOpenAIMessages(request.messages),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      });

      const latencyMs = Date.now() - startTime;
      const choice = response.choices[0];

      return {
        id: response.id,
        content: choice?.message?.content ?? "",
        model: response.model,
        provider: PROVIDER_ID,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
        finishReason: choice?.finish_reason ?? "unknown",
        latencyMs,
        raw: response,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }
}

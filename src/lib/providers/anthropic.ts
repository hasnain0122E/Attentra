/**
 * Attentra — Anthropic Provider Adapter
 *
 * Architecture.md v2.0 §6 — Provider Abstraction
 *
 * Converts NormalizedAIRequest → Anthropic Messages API,
 * then normalizes the response into NormalizedAIResponse.
 *
 * Key differences from OpenAI:
 * - System message is a top-level parameter, not in the messages array
 * - Only "user" and "assistant" roles allowed in messages
 * - max_tokens is required
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  Message,
  ModelDefinition,
  NormalizedAIRequest,
  NormalizedAIResponse,
} from "./types";
import { AttentraProviderError } from "./types";

const PROVIDER_ID = "anthropic";
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Separate system messages and convert to Anthropic format.
 * Anthropic requires system prompt as a separate string parameter.
 */
function toAnthropicFormat(messages: Message[]): {
  system?: string;
  messages: Anthropic.MessageParam[];
} {
  const systemMessages: string[] = [];
  const conversationMessages: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessages.push(msg.content);
    } else {
      conversationMessages.push({
        role: msg.role, // "user" | "assistant"
        content: msg.content,
      });
    }
  }

  return {
    system: systemMessages.length > 0 ? systemMessages.join("\n\n") : undefined,
    messages: conversationMessages,
  };
}

/**
 * Translate Anthropic SDK errors into normalized AttentraProviderError.
 */
function normalizeError(error: unknown): AttentraProviderError {
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    const providerCode = String((error.error as any)?.type ?? status ?? "unknown");

    if (status === 401 || status === 403) {
      return new AttentraProviderError(
        "AUTHENTICATION_ERROR",
        PROVIDER_ID,
        `Anthropic authentication failed: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: false, cause: error }
      );
    }
    if (status === 429) {
      return new AttentraProviderError(
        "RATE_LIMIT_ERROR",
        PROVIDER_ID,
        `Anthropic rate limit exceeded: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: true, cause: error }
      );
    }
    if (status === 400 && error.message?.includes("context")) {
      return new AttentraProviderError(
        "CONTEXT_LENGTH_ERROR",
        PROVIDER_ID,
        `Anthropic context length exceeded: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: false, cause: error }
      );
    }
    if (status === 404) {
      return new AttentraProviderError(
        "MODEL_NOT_FOUND",
        PROVIDER_ID,
        `Anthropic model not found: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: false, cause: error }
      );
    }
    if (status === 400) {
      return new AttentraProviderError(
        "INVALID_REQUEST_ERROR",
        PROVIDER_ID,
        `Anthropic invalid request: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: false, cause: error }
      );
    }
    if (status >= 500) {
      return new AttentraProviderError(
        "PROVIDER_UNAVAILABLE",
        PROVIDER_ID,
        `Anthropic server error: ${error.message}`,
        { providerCode, providerMessage: error.message, retryable: true, cause: error }
      );
    }
  }

  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AttentraProviderError(
      "TIMEOUT_ERROR",
      PROVIDER_ID,
      "Anthropic request timed out",
      { retryable: true, cause: error }
    );
  }

  return new AttentraProviderError(
    "UNKNOWN_ERROR",
    PROVIDER_ID,
    `Anthropic unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    { retryable: false, cause: error }
  );
}

/**
 * Anthropic provider adapter.
 */
export class AnthropicProvider implements AIProvider {
  readonly id = PROVIDER_ID;
  readonly name = "Anthropic";

  private client: Anthropic | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.apiKey.length > 0;
  }

  listModels(): ModelDefinition[] {
    return [
      {
        id: "anthropic-claude-sonnet-4",
        providerId: PROVIDER_ID,
        modelIdentifier: "claude-sonnet-4-20250514",
        displayName: "Claude Sonnet 4",
        capabilities: ["chat", "reasoning", "coding", "extraction", "creative_writing", "translation"],
        inputPricePer1k: 0.003,
        outputPricePer1k: 0.015,
        expectedLatencyMs: 1000,
        active: true,
      },
      {
        id: "anthropic-claude-opus-4",
        providerId: PROVIDER_ID,
        modelIdentifier: "claude-opus-4-20250514",
        displayName: "Claude Opus 4",
        capabilities: ["chat", "reasoning", "coding", "extraction", "creative_writing", "summarization"],
        inputPricePer1k: 0.015,
        outputPricePer1k: 0.075,
        expectedLatencyMs: 1500,
        active: true,
      },
      {
        id: "anthropic-claude-haiku-3-5",
        providerId: PROVIDER_ID,
        modelIdentifier: "claude-3-5-haiku-20241022",
        displayName: "Claude 3.5 Haiku",
        capabilities: ["chat", "classification", "summarization", "extraction", "translation"],
        inputPricePer1k: 0.0008,
        outputPricePer1k: 0.004,
        expectedLatencyMs: 500,
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
        "Anthropic API key is not configured. Set ANTHROPIC_API_KEY in environment.",
        { retryable: false }
      );
    }

    const { system, messages } = toAnthropicFormat(request.messages);
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: modelId,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages,
        ...(system && { system }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
      });

      const latencyMs = Date.now() - startTime;

      // Extract text content from the response blocks
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      return {
        id: response.id,
        content: textContent,
        model: response.model,
        provider: PROVIDER_ID,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        finishReason: response.stop_reason ?? "unknown",
        latencyMs,
        raw: response,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }
}

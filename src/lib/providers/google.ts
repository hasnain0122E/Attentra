/**
 * Attentra — Google (Gemini) Provider Adapter
 *
 * Architecture.md v2.0 §6 — Provider Abstraction
 *
 * Converts NormalizedAIRequest → Google Generative AI generateContent,
 * then normalizes the response into NormalizedAIResponse.
 *
 * Key differences from OpenAI/Anthropic:
 * - Roles are "user" and "model" (not "assistant")
 * - System instruction is a separate parameter
 * - Token usage comes from response.usageMetadata
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AIProvider,
  Message,
  ModelDefinition,
  NormalizedAIRequest,
  NormalizedAIResponse,
} from "./types";
import { AttentraProviderError } from "./types";

const PROVIDER_ID = "google";
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Convert Attentra messages to Google's content format.
 * - System messages become systemInstruction
 * - "assistant" becomes "model" role
 * - "user" stays "user" role
 */
function toGoogleFormat(messages: Message[]): {
  systemInstruction?: string;
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
} {
  const systemParts: string[] = [];
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
  }

  return {
    systemInstruction: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    contents,
  };
}

/**
 * Translate Google SDK errors into normalized AttentraProviderError.
 *
 * The Google Generative AI SDK throws generic errors with message text
 * rather than typed error classes, so we parse error messages.
 */
function normalizeError(error: unknown): AttentraProviderError {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMsg = message.toLowerCase();

  // Authentication errors
  if (
    lowerMsg.includes("api key not valid") ||
    lowerMsg.includes("invalid api key") ||
    lowerMsg.includes("401") ||
    lowerMsg.includes("403")
  ) {
    return new AttentraProviderError(
      "AUTHENTICATION_ERROR",
      PROVIDER_ID,
      `Google authentication failed: ${message}`,
      { providerMessage: message, retryable: false, cause: error }
    );
  }

  // Rate limit errors
  if (lowerMsg.includes("429") || lowerMsg.includes("quota") || lowerMsg.includes("rate limit")) {
    return new AttentraProviderError(
      "RATE_LIMIT_ERROR",
      PROVIDER_ID,
      `Google rate limit exceeded: ${message}`,
      { providerMessage: message, retryable: true, cause: error }
    );
  }

  // Context length errors
  if (
    lowerMsg.includes("token") && lowerMsg.includes("exceed") ||
    lowerMsg.includes("too long") ||
    lowerMsg.includes("context length")
  ) {
    return new AttentraProviderError(
      "CONTEXT_LENGTH_ERROR",
      PROVIDER_ID,
      `Google context length exceeded: ${message}`,
      { providerMessage: message, retryable: false, cause: error }
    );
  }

  // Model not found
  if (lowerMsg.includes("404") || lowerMsg.includes("not found") || lowerMsg.includes("model")) {
    if (lowerMsg.includes("model") && lowerMsg.includes("not found")) {
      return new AttentraProviderError(
        "MODEL_NOT_FOUND",
        PROVIDER_ID,
        `Google model not found: ${message}`,
        { providerMessage: message, retryable: false, cause: error }
      );
    }
  }

  // Invalid request
  if (lowerMsg.includes("400") || lowerMsg.includes("invalid argument") || lowerMsg.includes("invalid request")) {
    return new AttentraProviderError(
      "INVALID_REQUEST_ERROR",
      PROVIDER_ID,
      `Google invalid request: ${message}`,
      { providerMessage: message, retryable: false, cause: error }
    );
  }

  // Timeout
  if (lowerMsg.includes("timeout") || lowerMsg.includes("deadline")) {
    return new AttentraProviderError(
      "TIMEOUT_ERROR",
      PROVIDER_ID,
      `Google request timed out: ${message}`,
      { providerMessage: message, retryable: true, cause: error }
    );
  }

  // Server errors
  if (lowerMsg.includes("500") || lowerMsg.includes("502") || lowerMsg.includes("503") || lowerMsg.includes("internal")) {
    return new AttentraProviderError(
      "PROVIDER_UNAVAILABLE",
      PROVIDER_ID,
      `Google server error: ${message}`,
      { providerMessage: message, retryable: true, cause: error }
    );
  }

  return new AttentraProviderError(
    "UNKNOWN_ERROR",
    PROVIDER_ID,
    `Google unexpected error: ${message}`,
    { providerMessage: message, retryable: false, cause: error }
  );
}

/**
 * Google (Gemini) provider adapter.
 */
export class GoogleProvider implements AIProvider {
  readonly id = PROVIDER_ID;
  readonly name = "Google";

  private client: GoogleGenerativeAI | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY ?? "";
    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.apiKey.length > 0;
  }

  listModels(): ModelDefinition[] {
    return [
      {
        id: "google-gemini-2.5-flash",
        providerId: PROVIDER_ID,
        modelIdentifier: "gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        capabilities: ["chat", "reasoning", "coding", "extraction", "summarization", "translation"],
        inputPricePer1k: 0.000075,
        outputPricePer1k: 0.0003,
        expectedLatencyMs: 500,
        active: true,
      },
      {
        id: "google-gemini-2.5-pro",
        providerId: PROVIDER_ID,
        modelIdentifier: "gemini-2.5-pro",
        displayName: "Gemini 2.5 Pro",
        capabilities: ["chat", "reasoning", "coding", "extraction", "creative_writing", "summarization"],
        inputPricePer1k: 0.00125,
        outputPricePer1k: 0.005,
        expectedLatencyMs: 1000,
        active: true,
      },
      {
        id: "google-gemini-2.0-flash",
        providerId: PROVIDER_ID,
        modelIdentifier: "gemini-2.0-flash",
        displayName: "Gemini 2.0 Flash",
        capabilities: ["chat", "classification", "summarization", "extraction", "translation"],
        inputPricePer1k: 0.0001,
        outputPricePer1k: 0.0004,
        expectedLatencyMs: 400,
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
        "Google AI API key is not configured. Set GOOGLE_AI_API_KEY in environment.",
        { retryable: false }
      );
    }

    const { systemInstruction, contents } = toGoogleFormat(request.messages);
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: modelId,
        ...(systemInstruction && { systemInstruction }),
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(request.temperature !== undefined && { temperature: request.temperature }),
        },
      });

      const result = await model.generateContent({ contents });
      const latencyMs = Date.now() - startTime;

      const response = result.response;
      const text = response.text();
      const usageMetadata = response.usageMetadata;

      return {
        id: `google-${Date.now()}`,
        content: text,
        model: modelId,
        provider: PROVIDER_ID,
        usage: {
          inputTokens: usageMetadata?.promptTokenCount ?? 0,
          outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
        },
        finishReason: response.candidates?.[0]?.finishReason ?? "unknown",
        latencyMs,
        raw: result,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }
}

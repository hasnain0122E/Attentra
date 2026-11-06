/**
 * Attentra — Sampling parameters & finish reason through execution
 *
 * OpenAI compatibility:
 *   - client `temperature` reaches the provider SDK via
 *     ExecutionOrchestrator → Dispatcher → ExecutionRequest → adapter
 *   - provider-specific constraints (OpenAI reasoning models, Anthropic 0–1)
 *   - the provider's finish reason survives to the OrchestratorResult
 *
 * Real execution adapters; provider SDK clients are mocked (no network).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExecutionPlan } from "@/lib/routing/execution-plan";

const { mockOpenAICreate, mockAnthropicCreate } = vi.hoisted(() => ({
  mockOpenAICreate: vi.fn(),
  mockAnthropicCreate: vi.fn(),
}));

vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  class MockOpenAIClient {
    static readonly APIError = actual.APIError;
    static readonly APIConnectionError = actual.APIConnectionError;
    static readonly APIConnectionTimeoutError = actual.APIConnectionTimeoutError;
    chat = { completions: { create: mockOpenAICreate } };
  }
  return { ...actual, default: MockOpenAIClient } as unknown as typeof actual;
});

vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class MockAnthropicClient {
    static readonly APIError = actual.APIError;
    static readonly APIConnectionError = actual.APIConnectionError;
    static readonly APIConnectionTimeoutError = actual.APIConnectionTimeoutError;
    messages = { create: mockAnthropicCreate };
  }
  return { ...actual, default: MockAnthropicClient } as unknown as typeof actual;
});

import { ExecutionOrchestrator } from "@/lib/execution/orchestrator";
import { ProviderRegistry } from "@/lib/execution/provider-registry";
import { ExecutionAdapterRegistry } from "@/lib/execution/registry";
import { createOpenAIAdapter } from "@/lib/execution/providers/openai";
import { createAnthropicAdapter } from "@/lib/execution/providers/anthropic";

const MESSAGES = [{ role: "user", content: "Hello" }];

function plan(providerId: string, modelIdentifier: string): ExecutionPlan {
  return {
    requestId: "req-sampling-1",
    taskType: "GENERAL",
    complexity: "LOW",
    primary: {
      entryId: "primary",
      modelId: `db-${modelIdentifier}`,
      providerId,
      providerName: providerId,
      modelIdentifier,
      displayName: modelIdentifier,
      projectedCost: 0.001,
      routingScore: 0.9,
    },
    fallbacks: [],
    estimatedInputTokens: 10,
    estimatedOutputTokens: 64,
    projectedCost: 0.001,
    routingScore: 0.9,
    routingExplanation: "test",
    status: "NOT_EXECUTED",
    createdAt: new Date(),
  };
}

function orchestrator() {
  const registry = new ProviderRegistry(new ExecutionAdapterRegistry());
  registry.register(createOpenAIAdapter());
  registry.register(createAnthropicAdapter());
  return new ExecutionOrchestrator(registry);
}

function openAIResponse(finish_reason: string | null) {
  return {
    id: "chatcmpl-1",
    choices: [{ message: { role: "assistant", content: "Hi" }, finish_reason }],
    model: "x",
    usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
  };
}

function anthropicResponse(stop_reason: string) {
  return {
    id: "msg_1",
    content: [{ type: "text", text: "Hi" }],
    model: "x",
    usage: { input_tokens: 5, output_tokens: 2 },
    stop_reason,
  };
}

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "sk-unit-test-mock-key-000000000000");
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-unit-test-mock-key-000000000000");
  mockOpenAICreate.mockReset();
  mockAnthropicCreate.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("temperature reaches the provider", () => {
  it("OpenAI chat model receives the client temperature and plan max tokens", async () => {
    mockOpenAICreate.mockResolvedValue(openAIResponse("stop"));

    await orchestrator().execute(plan("openai", "gpt-4o-mini"), MESSAGES, {
      temperature: 0.3,
    });

    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o-mini", temperature: 0.3, max_tokens: 64 }),
    );
  });

  it("OpenAI reasoning model does not receive a temperature", async () => {
    mockOpenAICreate.mockResolvedValue(openAIResponse("stop"));

    await orchestrator().execute(plan("openai", "gpt-5-mini"), MESSAGES, {
      temperature: 0.3,
    });

    const args = mockOpenAICreate.mock.calls[0][0];
    expect(args).not.toHaveProperty("temperature");
    expect(args.max_completion_tokens).toBe(64);
  });

  it("Anthropic temperature is clamped to its 0–1 range", async () => {
    mockAnthropicCreate.mockResolvedValue(anthropicResponse("end_turn"));

    await orchestrator().execute(plan("anthropic", "claude-haiku-4-5"), MESSAGES, {
      temperature: 1.6,
    });

    expect(mockAnthropicCreate.mock.calls[0][0].temperature).toBe(1);
  });

  it("no temperature is sent when the client did not supply one", async () => {
    mockAnthropicCreate.mockResolvedValue(anthropicResponse("end_turn"));

    await orchestrator().execute(plan("anthropic", "claude-haiku-4-5"), MESSAGES);

    expect(mockAnthropicCreate.mock.calls[0][0]).not.toHaveProperty("temperature");
  });
});

describe("finish reason survives execution", () => {
  it("OpenAI 'length'", async () => {
    mockOpenAICreate.mockResolvedValue(openAIResponse("length"));

    const result = await orchestrator().execute(plan("openai", "gpt-4o-mini"), MESSAGES);

    expect(result.success).toBe(true);
    expect(result.finishReason).toBe("length");
  });

  it("Anthropic 'max_tokens'", async () => {
    mockAnthropicCreate.mockResolvedValue(anthropicResponse("max_tokens"));

    const result = await orchestrator().execute(plan("anthropic", "claude-haiku-4-5"), MESSAGES);

    expect(result.finishReason).toBe("max_tokens");
  });

  it("missing provider reason is undefined, not 'unknown'", async () => {
    mockOpenAICreate.mockResolvedValue(openAIResponse(null));

    const result = await orchestrator().execute(plan("openai", "gpt-4o-mini"), MESSAGES);

    expect(result.finishReason).toBeUndefined();
  });
});

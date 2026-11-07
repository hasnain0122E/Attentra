/**
 * Phase 3C — History preview, context interpretation and cost transparency.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { describeTokens, formatRequestCost } from "@/lib/dashboard/request-display";
import {
  PREVIEW_MAX_CHARS,
  buildPromptPreview,
  interpretStoredPrompt,
} from "@/lib/dashboard/prompt-context";
import { mapRequestToHistoryItem, type RequestWithRelations } from "@/lib/dashboard/request-mapping";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("interpretStoredPrompt", () => {
  it("treats legacy plain text as text (no invented turns)", () => {
    const ctx = interpretStoredPrompt("hello\nexplain routing");
    expect(ctx.kind).toBe("text");
    if (ctx.kind === "text") {
      expect(ctx.text).toBe("hello\nexplain routing");
      expect(ctx.lineCount).toBe(2);
    }
  });

  it("parses a structured conversation and finds the latest user message", () => {
    const ctx = interpretStoredPrompt(
      JSON.stringify([
        { role: "system", content: "be brief" },
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
        { role: "user", content: "explain routing" },
        { role: "assistant", content: "sure" },
      ]),
    );
    expect(ctx.kind).toBe("messages");
    if (ctx.kind === "messages") {
      expect(ctx.messageCount).toBe(5);
      expect(ctx.latestUserIndex).toBe(3);
      expect(ctx.latestUserMessage).toBe("explain routing");
    }
    expect(buildPromptPreview(ctx)).toEqual({
      text: "explain routing",
      caption: "5 messages in request",
      truncated: false,
    });
  });

  it("supports { messages: [...] } and text-part content", () => {
    const ctx = interpretStoredPrompt(
      JSON.stringify({ messages: [{ role: "user", content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }] }),
    );
    expect(ctx.kind === "messages" && ctx.latestUserMessage).toBe("a\nb");
  });

  it("falls back to text for malformed or non-conversation JSON", () => {
    expect(interpretStoredPrompt('[{"role":"user","content":"x"').kind).toBe("text");
    expect(interpretStoredPrompt('{"foo":1}').kind).toBe("text");
    expect(interpretStoredPrompt("[1,2,3]").kind).toBe("text");
    expect(interpretStoredPrompt('[{"name":"x","content":"y"}]').kind).toBe("text");
  });

  it("handles empty arrays, empty and missing prompts", () => {
    expect(interpretStoredPrompt("[]").kind).toBe("text");
    expect(interpretStoredPrompt("").kind).toBe("empty");
    expect(interpretStoredPrompt("   ").kind).toBe("empty");
    expect(interpretStoredPrompt(null).kind).toBe("empty");
    expect(buildPromptPreview(interpretStoredPrompt("")).text).toBe("No prompt stored");
  });

  it("handles conversations with no user message", () => {
    const ctx = interpretStoredPrompt(JSON.stringify([{ role: "system", content: "rules" }]));
    expect(ctx.kind === "messages" && ctx.latestUserIndex).toBe(-1);
    expect(buildPromptPreview(ctx).text).toBe("No user message in this request");
  });

  it("previews the END of long plain text (where the newest message is)", () => {
    const long = `${"old context ".repeat(100)}\nwhat is the latest question?`;
    const preview = buildPromptPreview(interpretStoredPrompt(long));
    expect(preview.truncated).toBe(true);
    expect(preview.text.startsWith("…")).toBe(true);
    expect(preview.text.endsWith("what is the latest question?")).toBe(true);
    expect(preview.text.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
  });

  it("clips long structured messages", () => {
    const ctx = interpretStoredPrompt(JSON.stringify([{ role: "user", content: "x".repeat(5000) }]));
    const preview = buildPromptPreview(ctx);
    expect(preview.truncated).toBe(true);
    expect(preview.text.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
  });

  it("does not interpret HTML (content stays as text)", () => {
    const ctx = interpretStoredPrompt("<script>alert(1)</script>");
    expect(ctx.kind === "text" && ctx.text).toBe("<script>alert(1)</script>");
    expect(read("src/components/dashboard/history/detail/RequestConversationContext.tsx")).not.toContain(
      "dangerouslySetInnerHTML",
    );
  });
});

function makeRequest(overrides: Partial<Record<string, unknown>> = {}): RequestWithRelations {
  const provider = { id: "p1", name: "openai" };
  return {
    id: "req_1",
    prompt: "hello",
    response: "hi",
    status: "SUCCESS",
    taskType: "GENERAL",
    complexity: "LOW",
    selectedModelId: "m1",
    inputTokens: 10,
    outputTokens: 5,
    latencyMs: 800,
    actualCost: 0.001,
    createdAt: new Date("2026-11-07T10:00:00Z"),
    selectedModel: { id: "m1", displayName: "Model One", modelIdentifier: "model-one", provider },
    routingDecision: {
      selectedModelId: "m1",
      taskType: "GENERAL",
      complexity: "LOW",
      reason: "r",
      score: 0.8,
      candidateModels: { scored: [] },
    },
    ...overrides,
  } as unknown as RequestWithRelations;
}

describe("mapRequestToHistoryItem transparency", () => {
  it("successful request: reported tokens, accurate totals, actual cost", () => {
    const item = mapRequestToHistoryItem(makeRequest());
    expect(item.tokenSource).toBe("reported");
    expect(item.totalTokens).toBe(15);
    expect(item.actualCost).toBe(0.001);
    expect(item.fallbackUsed).toBe(false);
    expect(item.status).toBe("SUCCESS");
    expect(item.attemptsRecorded).toBe(false);
  });

  it("a stored zero cost stays zero; null cost is unknown", () => {
    expect(mapRequestToHistoryItem(makeRequest({ actualCost: 0 })).actualCost).toBe(0);
    const unknown = mapRequestToHistoryItem(makeRequest({ actualCost: null }));
    expect(unknown.actualCost).toBeUndefined();
    expect(unknown.tokenSource).toBe("unverified");
    expect(formatRequestCost(unknown.actualCost)).toBe("Not available");
  });

  it("failed request: tokens are routing estimates and shown as not available", () => {
    const item = mapRequestToHistoryItem(makeRequest({ status: "FAILED", actualCost: null, response: null }));
    expect(item.status).toBe("FAILED");
    expect(item.tokenSource).toBe("estimated");
    const tokens = describeTokens(item);
    expect(tokens.total).toBe("Not available");
    expect(tokens.detail).toContain("routing estimate");
    expect(item.attempts[0].errorCode).toBeUndefined();
    expect(item.attempts[0].errorMessage).toBeUndefined();
  });

  it("selected vs executed model and fallback indicator, without invented errors", () => {
    const item = mapRequestToHistoryItem(
      makeRequest({
        selectedModelId: "m2",
        selectedModel: {
          id: "m2",
          displayName: "Model Two",
          modelIdentifier: "model-two",
          provider: { id: "p2", name: "anthropic" },
        },
      }),
    );
    expect(item.fallbackUsed).toBe(true);
    expect(item.status).toBe("FALLBACK");
    expect(item.executedModel).toBe("Model Two");
    expect(item.executedProvider).toBe("anthropic");
    expect(item.attempts).toHaveLength(2);
    expect(item.attempts[0].success).toBe(false);
    expect(item.attempts[0].errorCode).toBeUndefined();
    expect(item.attempts[0].retryable).toBeUndefined();
    expect(item.attempts[1].success).toBe(true);
  });

  it("keeps the original stored prompt unchanged", () => {
    const prompt = '[{"role":"user","content":"a"}]';
    expect(mapRequestToHistoryItem(makeRequest({ prompt })).prompt).toBe(prompt);
  });
});

describe("ownership and presentation guards", () => {
  it("history queries still scope by user", () => {
    const q = read("src/lib/dashboard/request-queries.ts");
    expect(q).toContain("where: { id: requestId, userId }");
    expect(q).toContain("where: { userId }");
  });

  it("list and detail render the preview and context viewer", () => {
    expect(read("src/components/dashboard/history/HistoryTable.tsx")).toContain("buildPromptPreview");
    expect(read("src/components/dashboard/history/HistoryTable.tsx")).not.toMatch(/<p[^>]*>\s*\{request\.prompt\}/);
    expect(read("src/components/dashboard/history/detail/RequestPromptResponse.tsx")).toContain(
      "<RequestConversationContext",
    );
    expect(read("src/lib/dashboard/request-mapping.ts")).not.toContain("EXECUTION_FAILED");
  });
});

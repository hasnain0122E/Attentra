"use client";

import { useState } from "react";

import PromptComposer from "./PromptComposer";
import RoutingDecision from "./RoutingDecision";
import ExecutionResult from "./ExecutionResult";
import ResponsePanel from "./ResponsePanel";
import RequestMetadata from "./RequestMetadata";
import RoutingFlow from "./RoutingFlow";
import CandidateRanking from "./CandidateRanking";
import DecisionDetail from "./DecisionDetail";
import ExecutionTimeline from "./ExecutionTimeline";
import ExecutionSummary from "./ExecutionSummary";

import type { PlaygroundResultData } from "@/types/dashboard";

const initialPrompt =
  "Explain why caching improves web application performance in two short sentences.";

const mockResult: PlaygroundResultData = {
  content:
    "Caching improves web application performance by storing frequently requested data closer to where it is needed, reducing repeated computation and database or network access.\n\nThis lowers response time, reduces backend load, and allows the application to serve more users efficiently.",

  routing: {
    selectedModelId: "google-gemini-2.5-flash",
    selectedModelIdentifier: "gemini-2.5-flash",
    selectedModelDisplayName: "Gemini 2.5 Flash",
    selectedProvider: "Google",
    reason:
      "Selected for strong reasoning support, suitable context capacity, low projected cost, and a high routing score for this low-complexity request.",
    taskType: "REASONING",
    complexity: "LOW",
    projectedCost: 0.000646,

    candidates: [
      {
        rank: 1,
        modelIdentifier: "gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        provider: "Google",
        score: 0.9997,
        projectedCost: 0.000646,
        selected: true,
      },
      {
        rank: 2,
        modelIdentifier: "claude-sonnet-5",
        displayName: "Claude Sonnet 5",
        provider: "Anthropic",
        score: 0.9421,
        projectedCost: 0.00112,
        selected: false,
      },
      {
        rank: 3,
        modelIdentifier: "gpt-5-nano",
        displayName: "GPT-5 Nano",
        provider: "OpenAI",
        score: 0.9014,
        projectedCost: 0.00084,
        selected: false,
      },
      {
        rank: 4,
        modelIdentifier: "gemini-2.5-pro",
        displayName: "Gemini 2.5 Pro",
        provider: "Google",
        score: 0.8672,
        projectedCost: 0.00214,
        selected: false,
      },
      {
        rank: 5,
        modelIdentifier: "claude-haiku-4-5",
        displayName: "Claude Haiku 4.5",
        provider: "Anthropic",
        score: 0.8216,
        projectedCost: 0.00071,
        selected: false,
      },
    ],
  },

  execution: {
    modelId: "anthropic-claude-sonnet-5",
    modelIdentifier: "claude-sonnet-5",
    displayName: "Claude Sonnet 5",
    provider: "Anthropic",
    fallbackUsed: true,

    attempts: [
      {
        attempt: 1,
        modelId: "google-gemini-2.5-flash",
        modelIdentifier: "gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
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
        modelId: "anthropic-claude-sonnet-5",
        modelIdentifier: "claude-sonnet-5",
        displayName: "Claude Sonnet 5",
        provider: "Anthropic",
        success: true,
        latencyMs: 1694,
      },
    ],

    usage: {
      inputTokens: 25,
      outputTokens: 89,
      totalTokens: 114,
    },

    latencyMs: 2112,
    actualCost: 0.00098,
  },

  timestamp: "2026-08-30T12:00:00.000Z",
};

export default function PlaygroundClient() {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<PlaygroundResultData | null>(mockResult);

  function handleSubmit() {
    if (!prompt.trim() || loading) {
      return;
    }

    setLoading(true);
    setResult(null);

    window.setTimeout(() => {
      setResult(mockResult);
      setLoading(false);
    }, 1200);
  }

  return (
    <div className="space-y-5">
      <PromptComposer
        value={prompt}
        loading={loading}
        onChange={setPrompt}
        onSubmit={handleSubmit}
      />

      {loading && (
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent)]" />

            <div>
              <div className="text-[12px] font-medium text-[var(--color-foreground)]">
                Attentra is analyzing your request
              </div>

              <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--color-foreground-muted)]">
                Analyze → score → route → execute
              </div>
            </div>
          </div>

          <div className="mt-5 h-1 overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--color-accent)]" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["Analyze", "Score", "Route", "Execute"].map((step, index) => (
              <div
                key={step}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2"
              >
                <div className="font-mono text-[7px] text-[var(--color-foreground-muted)]">
                  0{index + 1}
                </div>

                <div className="mt-1 text-[9px] font-medium text-[var(--color-foreground-secondary)]">
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* High-level routing trace */}
          <RoutingFlow result={result} />

          {/* Generated response — intentionally kept near the top */}
          <ResponsePanel content={result.content} />

          {/* Core routing + execution summary */}
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr_0.8fr]">
            <RoutingDecision routing={result.routing} />

            <ExecutionResult execution={result.execution} />

            <RequestMetadata result={result} />
          </div>

          {/* Compact execution metrics */}
          <ExecutionSummary execution={result.execution} />

          {/* Full execution path */}
          <ExecutionTimeline attempts={result.execution.attempts} />

          {/* Candidate intelligence */}
          <CandidateRanking candidates={result.routing.candidates} />

          {/* Detailed decision explanation */}
          <DecisionDetail routing={result.routing} />
        </>
      )}
    </div>
  );
}

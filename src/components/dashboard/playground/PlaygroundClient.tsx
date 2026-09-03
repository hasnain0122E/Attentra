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

import type {
  ExecutionAttemptDisplayData,
  PlaygroundResultData,
} from "@/types/dashboard";

const initialPrompt =
  "Explain why caching improves web application performance in two short sentences.";

// ─────────────────────────────────────────────────────
// API RESPONSE MAPPING
// ─────────────────────────────────────────────────────

/**
 * Shape of the POST /api/v1/chat/completions success response.
 *
 * Only the fields we consume are typed here — the full
 * response contract is defined by buildSuccessResponse() in the route.
 */
interface ChatCompletionsResponse {
  success: boolean;
  requestId: string;
  content: string;
  routing: {
    selectedModelId: string;
    selectedModelIdentifier: string;
    selectedModelDisplayName: string;
    selectedProvider: string;
    reason: string;
    taskType: string;
    complexity: string;
    projectedCost: number;
    candidates?: {
      rank: number;
      modelIdentifier: string;
      displayName: string;
      provider: string;
      score: number;
      projectedCost: number;
      selected: boolean;
    }[];
  };
  execution: {
    modelId: string;
    modelIdentifier: string;
    provider: string;
    fallbackUsed: boolean;
    attempts: number;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    latencyMs: number;
    actualCost: number;
    executionAttempts?: {
      attempt: number;
      modelId: string;
      modelIdentifier: string;
      provider: string;
      success: boolean;
      latencyMs: number;
      retryable?: boolean;
      errorCode?: string;
      errorMessage?: string;
    }[];
  };
  timestamp: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Concise user-facing attempt message.
 *
 * The API's per-attempt error message is a sanitized-but-verbose provider
 * diagnostic; History detail renders concise wording for the same failures,
 * so the playground reuses those semantics here. Failure code, retryability,
 * fallback visibility, and provider/model identity are all preserved by the
 * surrounding timeline UI.
 */
function userFacingAttemptMessage(
  attempt: { attempt: number; success: boolean; errorCode?: string },
  fallbackUsed: boolean,
): string {
  if (!attempt.success && fallbackUsed && attempt.attempt === 1) {
    // Same wording History detail synthesizes for a failed primary model.
    return "Primary model execution failed.";
  }

  switch (attempt.errorCode) {
    case "AUTHENTICATION":
      return "Provider rejected the configured credentials.";
    case "RATE_LIMIT":
      return "Provider rate limit exceeded.";
    case "TIMEOUT":
    case "REQUEST_TIMEOUT":
      return "Provider request timed out.";
    case "INVALID_REQUEST":
      return "Provider rejected the request as invalid.";
    case "MODEL_UNAVAILABLE":
      return "Model unavailable at the provider.";
    case "CONTEXT_LENGTH":
      return "Input exceeded the model's context window.";
    case "SERVER_ERROR":
      return "Provider server error.";
    case "NETWORK_ERROR":
      return "Network error reaching the provider.";
    case "MISSING_API_KEY":
      return "Provider API key not configured.";
    case "INVALID_RESPONSE":
      return "Provider returned a malformed response.";
    default:
      return "The provider did not return a successful completion.";
  }
}

/**
 * Map the real API response into PlaygroundResultData.
 *
 * Uses real per-attempt data from the orchestrator when available,
 * falling back to synthesised entries only if the API omits them.
 */
function mapApiResponse(data: ChatCompletionsResponse): PlaygroundResultData {
  const {
    routing: r,
    execution: e,
  } = data;

  // ── Map execution attempts ─────────────────────────
  //
  // The API returns real per-attempt data from the orchestrator
  // including actual latency, error codes, and success status.
  const attempts: ExecutionAttemptDisplayData[] = (e.executionAttempts ?? []).map(
    (a) => ({
      attempt: a.attempt,
      modelId: a.modelId,
      modelIdentifier: a.modelIdentifier,
      displayName: a.modelIdentifier,
      provider: a.provider,
      success: a.success,
      latencyMs: a.latencyMs,
      retryable: a.retryable,
      errorCode: a.errorCode,
      errorMessage: a.success
        ? undefined
        : userFacingAttemptMessage(a, e.fallbackUsed),
    }),
  );

  // Fallback: if the API did not include attempt details (older response),
  // synthesise a minimal single-attempt entry from execution metadata.
  if (attempts.length === 0) {
    attempts.push({
      attempt: 1,
      modelId: e.modelId,
      modelIdentifier: e.modelIdentifier,
      displayName: e.modelIdentifier,
      provider: e.provider,
      success: !e.fallbackUsed,
      latencyMs: e.latencyMs,
    });
  }

  return {
    content: data.content,

    routing: {
      selectedModelId: r.selectedModelId,
      selectedModelIdentifier: r.selectedModelIdentifier,
      selectedModelDisplayName: r.selectedModelDisplayName,
      selectedProvider: r.selectedProvider,
      reason: r.reason,
      taskType: r.taskType,
      complexity: r.complexity as PlaygroundResultData["routing"]["complexity"],
      projectedCost: r.projectedCost,
      candidates: r.candidates ?? [],
    },

    execution: {
      modelId: e.modelId,
      modelIdentifier: e.modelIdentifier,
      displayName: e.modelIdentifier,
      provider: e.provider,
      fallbackUsed: e.fallbackUsed,
      attempts,
      usage: e.usage,
      latencyMs: e.latencyMs,
      actualCost: e.actualCost,
    },

    timestamp: data.timestamp,
  };
}

export default function PlaygroundClient() {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<PlaygroundResultData | null>(null);

  async function handleSubmit() {
    if (!prompt.trim() || loading) {
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt.trim() }],
        }),
      });

      const data: ChatCompletionsResponse = await response.json();

      if (!response.ok || !data.success) {
        const message =
          data.error?.message ?? `Request failed (${response.status})`;
        setError(message);
        setLoading(false);
        return;
      }

      setResult(mapApiResponse(data));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error — please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
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

      {error && !loading && (
        <div className="rounded-[24px] border border-[var(--color-accent)]/25 bg-[var(--color-surface)] p-5">
          <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--color-accent)]">
            Request failed
          </div>

          <p className="mt-2 text-[12px] leading-5 text-[var(--color-foreground-secondary)]">
            {error}
          </p>
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

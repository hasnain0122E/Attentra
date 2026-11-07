/**
 * Attentra — Documentation code examples.
 *
 * Kept in one module so the docs pages and the syntax tests
 * (src/__tests__/docs-portal.test.ts) use exactly the same text.
 * No example contains a real key: keys are read from ATTENTRA_API_KEY.
 */

import { PRODUCTION_BASE_URL } from "./navigation";

const BASE = PRODUCTION_BASE_URL;
const ENDPOINT = `${BASE}/chat/completions`;

// ── Environment variables ───────────────────────────

export const ENV_POWERSHELL = `# Current PowerShell window only. Read-Host keeps the key out of
# your command history; paste the key when prompted.
$env:ATTENTRA_API_KEY = Read-Host "Attentra API key"`;

export const ENV_BASH = `# macOS / Linux (bash or zsh), current terminal only.
# read -s hides the input and keeps the key out of shell history.
read -rs ATTENTRA_API_KEY && export ATTENTRA_API_KEY`;

export const ENV_DOTENV = `# .env — add this file to .gitignore. Never commit it.
ATTENTRA_API_KEY=paste-your-key-here`;

// ── Quickstart ──────────────────────────────────────

export const PY_INSTALL = `pip install openai`;
export const JS_INSTALL = `npm install openai`;

export const PY_QUICKSTART = `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["ATTENTRA_API_KEY"],
    base_url="${BASE}",
    max_retries=0,  # see "Rate limits" before enabling automatic retries
)

response = client.chat.completions.create(
    model="auto",
    messages=[
        {"role": "user", "content": "Explain APIs in one sentence."}
    ],
    max_tokens=200,
)

print(response.choices[0].message.content)
print("Executed model:", response.model)
print("Usage:", response.usage)
`;

export const JS_QUICKSTART = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.ATTENTRA_API_KEY,
  baseURL: "${BASE}",
  maxRetries: 0,
});

const response = await client.chat.completions.create({
  model: "auto",
  messages: [{ role: "user", content: "Hello from Attentra!" }],
  max_tokens: 200,
});

console.log(response.choices[0].message.content);
console.log("Executed model:", response.model);
console.log("Usage:", response.usage);
`;

export const CURL_REQUEST = `curl ${ENDPOINT} \\
  -H "Authorization: Bearer $ATTENTRA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto",
    "messages": [
      { "role": "user", "content": "Explain APIs in one sentence." }
    ],
    "max_tokens": 200
  }'`;

export const POWERSHELL_REQUEST = `$body = @{
  model      = "auto"
  messages   = @(@{ role = "user"; content = "Explain APIs in one sentence." })
  max_tokens = 200
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod -Method Post \`
  -Uri "${ENDPOINT}" \`
  -Headers @{ Authorization = "Bearer $env:ATTENTRA_API_KEY" } \`
  -ContentType "application/json" \`
  -Body $body

$response.choices[0].message.content
$response.model`;

// ── SDK details ─────────────────────────────────────

export const PY_METADATA = `# Attentra adds "routing" and "execution" objects to each response.
# The OpenAI SDK keeps unknown fields in model_extra.
extra = response.model_extra or {}
routing = extra.get("routing", {})
execution = extra.get("execution", {})

print("Selected model:", routing.get("selectedModelIdentifier"))
print("Executed model:", response.model)
print("Fallback used:", execution.get("fallbackUsed"))
print("Actual cost (USD):", execution.get("actualCost"))  # None if unknown
`;

export const PY_POLICY = `response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Classify this ticket: refund request"}],
    max_tokens=50,
    # Attentra-specific fields go in extra_body.
    extra_body={"policy": "cost_optimized"},
)
`;

export const JS_POLICY = `const response = await client.chat.completions.create({
  model: "auto",
  messages: [{ role: "user", content: "Classify this ticket: refund request" }],
  max_tokens: 50,
  // Attentra-specific field. In TypeScript, the OpenAI types don't
  // include it: add // @ts-expect-error on the line above.
  policy: "cost_optimized",
});

// Attentra metadata is present at runtime (not in the SDK's types).
console.log(response.routing?.selectedModelIdentifier, response.execution?.fallbackUsed);
`;

export const PY_ERRORS = `import openai

try:
    response = client.chat.completions.create(
        model="auto",
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=100,
    )
except openai.AuthenticationError:
    print("401: the API key is missing, invalid or revoked.")
except openai.RateLimitError as error:
    retry_after = error.response.headers.get("retry-after")
    print("429: rate limited. Retry after", retry_after, "seconds.")
except openai.APIStatusError as error:
    # Attentra's error body includes a machine-readable code.
    body = error.body if isinstance(error.body, dict) else {}
    code = body.get("code") or body.get("error", {}).get("code")
    print(f"{error.status_code} {code}: {error.message}")
except openai.APIConnectionError:
    print("Could not reach Attentra. Check your network and the base URL.")
`;

export const JS_ERRORS = `import OpenAI from "openai";

try {
  const response = await client.chat.completions.create({
    model: "auto",
    messages: [{ role: "user", content: "Hello" }],
    max_tokens: 100,
  });
  console.log(response.choices[0].message.content);
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    // error.status: HTTP status; error.code: Attentra error code
    console.error(error.status, error.code, error.message);
    if (error.status === 429) {
      console.error("Retry after", error.headers?.get?.("retry-after"), "seconds");
    }
  } else {
    throw error;
  }
}
`;

// ── Responses ───────────────────────────────────────

export const RESPONSE_EXAMPLE = `{
  "id": "req_1762509600000_k3x9m2qa",
  "object": "chat.completion",
  "created": 1762509600,
  "model": "gpt-4.1-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "An API is a contract that lets one program request data or actions from another.",
        "refusal": null
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 14,
    "completion_tokens": 18,
    "total_tokens": 32
  },
  "system_fingerprint": null,
  "success": true,
  "requestId": "req_1762509600000_k3x9m2qa",
  "content": "An API is a contract that lets one program request data or actions from another.",
  "routing": {
    "selectedModelIdentifier": "gpt-4.1-mini",
    "selectedModelDisplayName": "GPT-4.1 mini",
    "selectedProvider": "openai",
    "explicitModel": false,
    "reason": "GPT-4.1 mini selected for a low-complexity general request based on capability, projected cost, and latency.",
    "taskType": "GENERAL",
    "complexity": "LOW",
    "projectedCost": 0.000068,
    "candidates": [
      { "rank": 1, "modelIdentifier": "gpt-4.1-mini", "provider": "openai", "score": 0.81, "projectedCost": 0.000068, "selected": true }
    ]
  },
  "execution": {
    "modelIdentifier": "gpt-4.1-mini",
    "provider": "openai",
    "finishReason": "stop",
    "fallbackUsed": false,
    "attempts": 1,
    "usage": { "inputTokens": 14, "outputTokens": 18, "totalTokens": 32 },
    "latencyMs": 812,
    "actualCost": 0.0000344,
    "executionAttempts": [
      { "attempt": 1, "modelIdentifier": "gpt-4.1-mini", "provider": "openai", "success": true, "latencyMs": 812 }
    ]
  },
  "timestamp": "2026-11-07T10:00:00.000Z"
}`;

export const ERROR_EXAMPLE = `{
  "success": false,
  "requestId": "req_1762509601000_p7d2w8ne",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Streaming is not supported yet. Set 'stream' to false or omit it.",
    "param": "stream",
    "type": "invalid_request_error"
  }
}`;

export const RATE_LIMIT_EXAMPLE = `HTTP/1.1 429 Too Many Requests
Retry-After: 37
X-RateLimit-Limit: 20

{
  "success": false,
  "requestId": "req_1762509602000_b4t6y1rz",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: 20 requests per 60 seconds per API key. Retry after 37 seconds.",
    "retryable": true,
    "param": null,
    "type": "rate_limit_error"
  }
}`;

// ── Conversation history ────────────────────────────

export const PY_MULTI_TURN = `messages = [
    {"role": "system", "content": "You are a concise support assistant."},
    {"role": "user", "content": "My order hasn't arrived."},
    {"role": "assistant", "content": "Sorry about that. What is your order number?"},
    {"role": "user", "content": "It's 4417."},  # the newest question goes last
]

response = client.chat.completions.create(
    model="auto",
    messages=messages,
    max_tokens=300,
)

# Keep the reply so the next request includes it.
messages.append({"role": "assistant", "content": response.choices[0].message.content})
`;

export const PY_SLIDING_WINDOW = `MAX_TURNS = 6  # one turn = one user message + one assistant reply


def build_context(system_message, history):
    """System message + the most recent MAX_TURNS turns."""
    recent = history[-MAX_TURNS * 2:]
    return [system_message] + recent


system_message = {"role": "system", "content": "You are a helpful assistant."}
history = []  # every user and assistant message, oldest first

history.append({"role": "user", "content": "What is a load balancer?"})
response = client.chat.completions.create(
    model="auto",
    messages=build_context(system_message, history),
    max_tokens=300,
)
history.append({"role": "assistant", "content": response.choices[0].message.content})
`;

export const PY_TOKEN_BUDGET = `def estimate_tokens(text):
    """Rough estimate (about 4 characters per token). Real counts vary by model."""
    return max(1, len(text) // 4)


def trim_to_budget(system_message, history, max_input_tokens=3000):
    """Keep the newest messages that fit inside an approximate token budget."""
    budget = max_input_tokens - estimate_tokens(system_message["content"])
    kept = []
    for message in reversed(history):
        cost = estimate_tokens(message["content"])
        if cost > budget:
            break
        kept.append(message)
        budget -= cost
    kept.reverse()
    # Don't start the window with an orphaned assistant reply.
    while kept and kept[0]["role"] == "assistant":
        kept.pop(0)
    return [system_message] + kept
`;

// ── Chatbot ─────────────────────────────────────────

export const CHATBOT_INSTALL = `pip install openai python-dotenv`;

export const CHATBOT_ENV = `# .env (in the same folder as chatbot.py). Add .env to .gitignore.
ATTENTRA_API_KEY=paste-your-key-here`;

export const CHATBOT_PY = `"""Terminal chatbot using Attentra automatic routing (no streaming)."""

import os
import sys

import openai
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # reads ATTENTRA_API_KEY from .env

API_KEY = os.getenv("ATTENTRA_API_KEY")
if not API_KEY:
    sys.exit("Set ATTENTRA_API_KEY in your environment or a .env file.")

client = OpenAI(
    api_key=API_KEY,
    base_url="${BASE}",
    max_retries=0,
)

SYSTEM_MESSAGE = {"role": "system", "content": "You are a helpful, concise assistant."}
MAX_TURNS = 6        # keep the last 6 user/assistant exchanges
MAX_OUTPUT_TOKENS = 500


def build_context(history):
    return [SYSTEM_MESSAGE] + history[-MAX_TURNS * 2:]


def main():
    history = []
    print("Attentra chatbot. Type 'exit' to quit.")

    while True:
        try:
            user_text = input("\\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if user_text.lower() in {"exit", "quit"}:
            break
        if not user_text:
            continue

        history.append({"role": "user", "content": user_text})

        try:
            response = client.chat.completions.create(
                model="auto",
                messages=build_context(history),
                max_tokens=MAX_OUTPUT_TOKENS,
            )
        except openai.RateLimitError as error:
            history.pop()  # the message was not answered
            wait = error.response.headers.get("retry-after", "a few")
            print(f"[Rate limited. Try again in {wait} seconds.]")
            continue
        except openai.APIStatusError as error:
            history.pop()
            print(f"[Request failed: {error.status_code} {error.message}]")
            continue
        except openai.APIConnectionError:
            history.pop()
            print("[Could not reach Attentra. Check your connection.]")
            continue

        answer = response.choices[0].message.content or ""
        history.append({"role": "assistant", "content": answer})

        print(f"\\nAssistant: {answer}")

        usage = response.usage
        tokens = (
            f"{usage.prompt_tokens} in / {usage.completion_tokens} out"
            if usage
            else "usage not reported"
        )
        print(f"[model: {response.model} | tokens: {tokens}]")


if __name__ == "__main__":
    main()
`;

export const CHATBOT_RUN = `python chatbot.py`;

/** Every example, by language, for syntax tests. */
export const PYTHON_EXAMPLES = {
  PY_QUICKSTART,
  PY_METADATA,
  PY_POLICY,
  PY_ERRORS,
  PY_MULTI_TURN,
  PY_SLIDING_WINDOW,
  PY_TOKEN_BUDGET,
  CHATBOT_PY,
};

export const JAVASCRIPT_EXAMPLES = { JS_QUICKSTART, JS_POLICY, JS_ERRORS };

export const JSON_EXAMPLES = { RESPONSE_EXAMPLE, ERROR_EXAMPLE };

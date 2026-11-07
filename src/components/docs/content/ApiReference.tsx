import DocsCodeBlock from "../DocsCodeBlock";
import DocsCodeTabs from "../DocsCodeTabs";
import { C, DocsCallout, DocsH2, DocsLink, DocsList, DocsP, DocsTable } from "../DocsPrimitives";
import {
  CURL_REQUEST,
  ERROR_EXAMPLE,
  JS_QUICKSTART,
  PY_QUICKSTART,
  RATE_LIMIT_EXAMPLE,
  RESPONSE_EXAMPLE,
} from "@/lib/docs/examples";

export function ApiChatCompletions() {
  return (
    <>
      <DocsH2 id="endpoint">Endpoint</DocsH2>
      <DocsCodeBlock language="text" title="HTTP" code="POST https://attentra-nine.vercel.app/api/v1/chat/completions" />
      <DocsTable
        head={["Header", "Value"]}
        rows={[
          [<C key="a">Authorization</C>, <span key="b"><C>Bearer</C> + your Attentra API key (required)</span>],
          [<C key="c">Content-Type</C>, <span key="d"><C>application/json</C> (required)</span>],
        ]}
      />
      <DocsP>
        This is the only public Attentra API endpoint. There is no <C>/v1/responses</C>,{" "}
        <C>/v1/embeddings</C> or <C>/v1/models</C> endpoint.
      </DocsP>

      <DocsH2 id="example">Example</DocsH2>
      <DocsCodeTabs
        tabs={[
          { label: "Python", language: "python", code: PY_QUICKSTART },
          { label: "JavaScript", language: "javascript", code: JS_QUICKSTART },
          { label: "cURL", language: "bash", code: CURL_REQUEST },
        ]}
      />
      <DocsList>
        <li>
          Request body: <DocsLink href="/docs/api/parameters">Parameters</DocsLink>
        </li>
        <li>
          Response body: <DocsLink href="/docs/api/responses">Response format</DocsLink>
        </li>
        <li>
          Failures: <DocsLink href="/docs/api/errors">Errors</DocsLink> ·{" "}
          <DocsLink href="/docs/api/rate-limits">Rate limits</DocsLink>
        </li>
      </DocsList>

      <DocsH2 id="compatibility">OpenAI compatibility</DocsH2>
      <DocsTable
        head={["Feature", "Status"]}
        rows={[
          ["Text chat completions (system / developer / user / assistant)", "Supported"],
          ["model: \"auto\" and explicit model identifiers", "Supported"],
          ["max_tokens, max_completion_tokens, temperature", "Supported"],
          ["Official OpenAI Python and Node.js SDKs", "Supported (chat.completions.create)"],
          ["stream: true", "Not supported — returns 400"],
          ["Tools / function calling", "Not supported — returns 400"],
          ["Images, audio, files in messages", "Not supported — returns 400"],
          ["n > 1, stop sequences, seed, logprobs", "Not supported — returns 400"],
        ]}
      />
      <DocsP>
        Attentra rejects fields it can&apos;t honor instead of silently ignoring them, so a request either
        behaves as written or fails with a clear <C>400</C>.
      </DocsP>
    </>
  );
}

export function ApiParameters() {
  return (
    <>
      <DocsH2 id="supported">Supported parameters</DocsH2>
      <DocsTable
        head={["Parameter", "Type", "Required", "Default", "Constraints"]}
        rows={[
          [<C key="1">messages</C>, "array", "Yes", "—", "Non-empty. See below."],
          [<C key="2">model</C>, "string", "No", <C key="2d">&quot;auto&quot;</C>, <span key="2c"><C>&quot;auto&quot;</C> (any case) routes automatically; any other value must be a registry model identifier, optionally <C>provider/identifier</C>.</span>],
          [<C key="3">max_tokens</C>, "integer", "No", "none (routing assumes 256)", "1 – 4,096"],
          [<C key="4">max_completion_tokens</C>, "integer", "No", "none", <span key="4c">1 – 4,096. Same as <C>max_tokens</C>; if both are sent they must be equal.</span>],
          [<C key="5">temperature</C>, "number", "No", "provider default", "0 – 2"],
          [<C key="6">policy</C>, "string", "No", <C key="6d">balanced</C>, <span key="6c"><C>balanced</C>, <C>cost_optimized</C>, <C>quality_first</C>, <C>speed_first</C>. Attentra-specific.</span>],
          [<C key="7">taskTypeHint</C>, "string", "No", "inferred", <span key="7c">Overrides task classification. One of <C>GENERAL</C>, <C>CODING</C>, <C>REASONING</C>, <C>WRITING</C>, <C>SUMMARIZATION</C>, <C>TRANSLATION</C>, <C>ANALYSIS</C>, <C>EXTRACTION</C> (uppercase). Attentra-specific.</span>],
        ]}
      />
      <DocsCallout type="note" title="Output tokens">
        When you don&apos;t set an output limit, routing estimates 256 output tokens and the provider uses its
        own default limit, so answers may be longer than 256 tokens. Set <C>max_tokens</C> explicitly to
        control length and cost. <C>maxTokens</C> (camelCase) is also accepted for older Attentra clients.
      </DocsCallout>

      <DocsH2 id="messages">messages</DocsH2>
      <DocsList>
        <li>
          Each message is an object with <C>role</C> and <C>content</C>.
        </li>
        <li>
          <C>role</C>: <C>system</C>, <C>developer</C> (treated as <C>system</C>), <C>user</C> or{" "}
          <C>assistant</C>.
        </li>
        <li>
          <C>content</C>: a non-empty string, or an array of <C>{`{ "type": "text", "text": "…" }`}</C> parts
          (joined with newlines).
        </li>
        <li>
          Messages with <C>tool_calls</C> or <C>function_call</C> are rejected.
        </li>
      </DocsList>
      <DocsP>
        Send the full context the model needs — see{" "}
        <DocsLink href="/docs/guides/conversation-history">Conversation history</DocsLink>.
      </DocsP>

      <DocsH2 id="defaults-only">Accepted only at their default value</DocsH2>
      <DocsP>These OpenAI fields are accepted only when set to the default; any other value returns 400.</DocsP>
      <DocsTable
        head={["Parameter", "Allowed value"]}
        rows={[
          [<C key="a">stream</C>, <C key="av">false</C>],
          [<C key="b">n</C>, <C key="bv">1</C>],
          [<C key="c">top_p</C>, <C key="cv">1</C>],
          [<C key="d">frequency_penalty</C>, <C key="dv">0</C>],
          [<C key="e">presence_penalty</C>, <C key="ev">0</C>],
          [<C key="f">logprobs</C>, <C key="fv">false</C>],
          [<C key="g">tool_choice</C>, <C key="gv">&quot;none&quot;</C>],
          [<C key="h">modalities</C>, <C key="hv">[&quot;text&quot;]</C>],
          [<C key="i">response_format</C>, <C key="iv">{`{ "type": "text" }`}</C>],
        ]}
      />

      <DocsH2 id="ignored">Accepted with no effect</DocsH2>
      <DocsP>
        <C>user</C>, <C>metadata</C>, <C>store</C>, <C>service_tier</C> and <C>parallel_tool_calls</C> are
        accepted so existing code keeps working, but they don&apos;t change generation.
      </DocsP>

      <DocsH2 id="unsupported">Not supported</DocsH2>
      <DocsP>
        Any non-empty value for these returns <C>400</C> with <C>param</C> naming the field:
      </DocsP>
      <DocsP>
        <C>tools</C>, <C>functions</C>, <C>function_call</C>, <C>stop</C>, <C>seed</C>, <C>logit_bias</C>,{" "}
        <C>top_logprobs</C>, <C>audio</C>, <C>prediction</C>, <C>reasoning_effort</C>,{" "}
        <C>web_search_options</C>, <C>stream_options</C>.
      </DocsP>
      <DocsP>
        Any other unknown field is rejected with <C>Unrecognized request argument supplied</C>.
      </DocsP>
    </>
  );
}

export function ApiResponses() {
  return (
    <>
      <DocsH2 id="envelope">OpenAI fields</DocsH2>
      <DocsTable
        head={["Field", "Description"]}
        rows={[
          [<C key="1">id</C>, "Attentra request ID (also in requestId). Quote it when reporting a problem."],
          [<C key="2">object</C>, <C key="2v">&quot;chat.completion&quot;</C>],
          [<C key="3">created</C>, "Unix timestamp (seconds)."],
          [<C key="4">model</C>, "Identifier of the model that executed the request."],
          [<C key="5">choices[0].message.content</C>, "The answer text. There is always exactly one choice."],
          [<C key="6">choices[0].finish_reason</C>, <span key="6v"><C>stop</C>, <C>length</C> (hit the output limit) or <C>content_filter</C>, normalized across providers.</span>],
          [<C key="7">usage</C>, "prompt_tokens, completion_tokens, total_tokens as reported by the provider. Omitted if the provider reported none."],
        ]}
      />

      <DocsH2 id="attentra">Attentra fields</DocsH2>
      <DocsTable
        head={["Field", "Description"]}
        rows={[
          [<C key="a">routing.selectedModelIdentifier</C>, "The model the router chose first."],
          [<C key="b">routing.explicitModel</C>, "true if you requested a specific model."],
          [<C key="c">routing.reason</C>, "A short explanation of the choice."],
          [<C key="d">routing.taskType / complexity</C>, "What the router inferred about the request."],
          [<C key="e">routing.projectedCost</C>, "Estimated cost in USD before execution."],
          [<C key="f">routing.candidates</C>, "Ranked models considered, with scores and projected costs."],
          [<C key="g">execution.modelIdentifier / provider</C>, "The model and provider that executed."],
          [<C key="h">execution.fallbackUsed</C>, "true if a fallback model answered."],
          [<C key="i">execution.executionAttempts</C>, "Every attempt, in order, with success and error code."],
          [<C key="j">execution.usage</C>, "inputTokens, outputTokens, totalTokens."],
          [<C key="k">execution.latencyMs</C>, "Measured execution time in milliseconds."],
          [<C key="l">execution.actualCost</C>, "Calculated cost in USD after execution; absent if it couldn't be calculated."],
          [<C key="m">content, success, requestId, timestamp</C>, "Kept for earlier Attentra clients."],
        ]}
      />
      <DocsCallout type="note" title="SDKs may hide these fields">
        The OpenAI SDKs don&apos;t declare Attentra&apos;s fields. In Python read them from{" "}
        <C>response.model_extra</C>; in JavaScript they are present on the response object at runtime. See{" "}
        <DocsLink href="/docs/sdk/python#attentra-fields">Python SDK</DocsLink>.
      </DocsCallout>

      <DocsH2 id="example">Full example</DocsH2>
      <DocsP>Illustrative values; some internal ID fields are omitted.</DocsP>
      <DocsCodeBlock language="json" code={RESPONSE_EXAMPLE} />

      <DocsH2 id="selected-executed">Selected vs executed model</DocsH2>
      <DocsP>
        <C>routing.selectedModelIdentifier</C> is the router&apos;s first choice. <C>model</C> is what actually
        answered. They differ only when a fallback was used, in which case{" "}
        <C>execution.fallbackUsed</C> is <C>true</C> and <C>execution.executionAttempts</C> shows the failed
        attempt(s) first.
      </DocsP>
    </>
  );
}

export function ApiErrors() {
  return (
    <>
      <DocsH2 id="format">Error format</DocsH2>
      <DocsP>
        Errors use the OpenAI shape (<C>error.message</C>, <C>error.type</C>, <C>error.param</C>) plus
        Attentra&apos;s machine-readable <C>error.code</C> and the <C>requestId</C>:
      </DocsP>
      <DocsCodeBlock language="json" code={ERROR_EXAMPLE} />

      <DocsH2 id="codes">Status codes</DocsH2>
      <DocsTable
        head={["Status", "Code", "Cause", "What to do"]}
        rows={[
          ["400", <C key="1">INVALID_REQUEST</C>, "Malformed JSON, wrong Content-Type, invalid or unsupported parameter (error.param names it), e.g. stream: true.", "Fix the request. Don't retry unchanged."],
          ["400", <C key="2">AMBIGUOUS_MODEL</C>, "The explicit model identifier exists at several providers.", "Use provider/identifier."],
          ["400", <C key="3">NO_COMPATIBLE_MODELS</C>, "No model is eligible for this request (capability, pricing or exclusions).", "Simplify the request or try another policy."],
          ["400", <C key="4">CONTEXT_LENGTH / ALL_EXCEED_CONTEXT</C>, "The request is too long for the model(s).", "Trim the conversation context."],
          ["401", <C key="5">AUTHENTICATION</C>, "Missing, invalid, revoked or expired API key.", "Check the key and the Authorization header."],
          ["404", <C key="6">MODEL_NOT_FOUND</C>, "The explicit model isn't available for routing.", "Use \"auto\" or another identifier."],
          ["429", <C key="7">RATE_LIMIT_EXCEEDED</C>, "Attentra's per-key or per-user limit was reached.", "Wait for Retry-After seconds."],
          ["429", <C key="8">RATE_LIMIT</C>, "The provider rate-limited the request and fallbacks were exhausted.", "Retry later with backoff."],
          ["500", <C key="9">PERSISTENCE_FAILED / OWNERSHIP_FAILED / INTERNAL_ERROR</C>, "Attentra couldn't record the request before execution (the provider was not called), or hit an unexpected error.", "Retry shortly; quote the requestId if it persists."],
          ["502", "provider error code", "Execution failed on every attempted model (e.g. SERVER_ERROR, MODEL_UNAVAILABLE).", "Retry later; check status of providers."],
          ["503", <C key="10">SERVICE_UNAVAILABLE</C>, "Authentication or usage limits couldn't be checked. The provider was not called.", "Retry shortly."],
          ["504", <C key="11">TIMEOUT</C>, "The provider didn't respond in time on every attempt.", "Retry, or lower max_tokens."],
        ]}
      />
      <DocsCallout type="tip">
        <C>error.retryable</C>, when present, tells you whether retrying the same request may succeed.
      </DocsCallout>

      <DocsH2 id="vercel">Hosting security checkpoint</DocsH2>
      <DocsP>
        Attentra is hosted on Vercel. Vercel&apos;s platform protection can occasionally answer a request
        with <C>403</C> and an HTML &quot;Security Checkpoint&quot; page (response header{" "}
        <C>x-vercel-mitigated: challenge</C>) before it reaches Attentra. This is a hosting-level response, not
        an Attentra error: the body is not JSON, the request was not processed, and nothing was charged.
      </DocsP>
      <DocsList>
        <li>It usually affects specific networks or IP addresses with unusual traffic patterns.</li>
        <li>Wait and retry, or try from a different network.</li>
        <li>Don&apos;t attempt to bypass the challenge.</li>
      </DocsList>
    </>
  );
}

export function ApiRateLimits() {
  return (
    <>
      <DocsH2 id="limits">Current limits</DocsH2>
      <DocsTable
        head={["Limit", "Default", "Scope"]}
        rows={[
          ["API requests", "20 per minute", "Per API key"],
          ["Playground requests", "10 per minute", "Per signed-in user"],
          ["Requested output tokens", "4,096 maximum", "Per request (max_tokens / max_completion_tokens)"],
          ["Assumed output tokens when unset", "256", "Used for routing and cost estimates only"],
        ]}
      />
      <DocsP>
        The deployment operator can change the per-minute limits. There are no hard dollar spending budgets.
      </DocsP>

      <DocsH2 id="behavior">How limits behave</DocsH2>
      <DocsList>
        <li>Requests are counted over a rolling 60-second window.</li>
        <li>Each key has its own limit; one busy key doesn&apos;t slow down another.</li>
        <li>
          Limits are enforced across server instances on a best-effort basis: under bursts of simultaneous
          requests a few extra may be accepted.
        </li>
        <li>Rejected requests never reach a provider and cost nothing.</li>
      </DocsList>

      <DocsH2 id="retry">Handling 429</DocsH2>
      <DocsCodeBlock language="text" code={RATE_LIMIT_EXAMPLE} />
      <DocsList>
        <li>
          Wait for the number of seconds in <C>Retry-After</C> before retrying.
        </li>
        <li>
          A <C>429</C> with code <C>RATE_LIMIT</C> (not <C>RATE_LIMIT_EXCEEDED</C>) came from the provider; it
          may not include <C>Retry-After</C>. Use exponential backoff.
        </li>
        <li>
          The OpenAI SDKs retry 429s automatically by default (<C>max_retries</C> / <C>maxRetries</C>). Each
          retry is a new request against your limit; set the value deliberately.
        </li>
      </DocsList>
    </>
  );
}

export function Limitations() {
  return (
    <>
      <DocsH2 id="supported">Supported today</DocsH2>
      <DocsList>
        <li>Non-streaming text chat completions at one endpoint.</li>
        <li>Automatic routing (<C>model: &quot;auto&quot;</C>) and explicit model selection.</li>
        <li>OpenAI, Anthropic and Google provider adapters, with cross-provider fallback.</li>
        <li>Four routing policies.</li>
        <li>API-key authentication with revocation and optional expiry.</li>
        <li>Basic per-key and per-user rate limits and a 4,096 output-token cap.</li>
        <li>Request History with routed/executed model, tokens, latency and calculated cost.</li>
      </DocsList>

      <DocsH2 id="not-supported">Not supported yet</DocsH2>
      <DocsList>
        <li>Streaming responses (<C>stream: true</C>).</li>
        <li>Tools / function calling and structured JSON output modes.</li>
        <li>Images, audio, files and other multimodal input.</li>
        <li>Server-managed conversation memory — you send the context each time.</li>
        <li>Endpoints other than chat completions (embeddings, models list, Responses API).</li>
        <li>Customer payment processing — no payments are collected during the MVP.</li>
        <li>Hard dollar budgets or spend caps per key.</li>
      </DocsList>
      <DocsP>Items here may be considered for future work; none are committed features.</DocsP>

      <DocsH2 id="not-guaranteed">Not guaranteed</DocsH2>
      <DocsList>
        <li>The lowest-cost, fastest or highest-quality model for every request — routing is a weighted estimate.</li>
        <li>Access to every model a provider lists — availability depends on provider accounts and retirement.</li>
        <li>That calculated cost equals the provider&apos;s invoice.</li>
        <li>That calculated savings are realized — they compare against a configured baseline model.</li>
        <li>Uptime or latency targets — Attentra is an MVP running on shared hosting.</li>
      </DocsList>
    </>
  );
}

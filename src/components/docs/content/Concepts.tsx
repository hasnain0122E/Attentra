import DocsCodeTabs from "../DocsCodeTabs";
import { C, DocsCallout, DocsH2, DocsH3, DocsLink, DocsList, DocsP, DocsTable } from "../DocsPrimitives";
import { JS_POLICY, PY_POLICY } from "@/lib/docs/examples";

export function ConceptRouting() {
  return (
    <>
      <DocsH2 id="auto">Using model: &quot;auto&quot;</DocsH2>
      <DocsP>
        Send <C>model: &quot;auto&quot;</C> (or omit <C>model</C>) and Attentra chooses the model. Send a
        specific model identifier instead and Attentra uses only that model — see{" "}
        <a href="#explicit" className="text-[#F2A97E] underline decoration-[#F2A97E]/30 underline-offset-4">
          Choosing a model explicitly
        </a>
        .
      </DocsP>

      <DocsH2 id="pipeline">The routing pipeline</DocsH2>
      <DocsP>For every automatic request, Attentra runs these steps before calling any provider:</DocsP>
      <DocsList ordered>
        <li>
          <strong className="text-white">Classify the task</strong> — keyword and signal matching over the
          text of <em>all</em> messages assigns one of: <C>GENERAL</C>, <C>CODING</C>, <C>REASONING</C>,{" "}
          <C>WRITING</C>, <C>SUMMARIZATION</C>, <C>TRANSLATION</C>, <C>ANALYSIS</C>, <C>EXTRACTION</C>.
        </li>
        <li>
          <strong className="text-white">Estimate complexity</strong> — <C>LOW</C>, <C>MEDIUM</C> or{" "}
          <C>HIGH</C>, from four equally weighted signals: content length, number of messages, the task
          type&apos;s baseline, and the requested output size.
        </li>
        <li>
          <strong className="text-white">Estimate tokens</strong> — input ≈ total characters ÷ 4; output ={" "}
          your <C>max_tokens</C>, or 256 if you didn&apos;t set one.
        </li>
        <li>
          <strong className="text-white">Filter eligible models</strong> — a model is excluded if it is
          inactive, lacks a capability the task needs, has a context window smaller than the estimated total
          tokens (or an unknown one), has no usable pricing when the policy weighs cost heavily, or is
          excluded by the deployment operator.
        </li>
        <li>
          <strong className="text-white">Score</strong> each eligible model on projected cost, latency and
          capability, weighted by the <DocsLink href="/docs/concepts/policies">routing policy</DocsLink>.
        </li>
        <li>
          <strong className="text-white">Select</strong> the highest-scoring model as the primary.
        </li>
        <li>
          <strong className="text-white">Prepare fallbacks</strong> — the remaining models, ordered to try
          other providers first (see <DocsLink href="/docs/concepts/fallback">Fallback</DocsLink>).
        </li>
        <li>
          <strong className="text-white">Record</strong> the decision (task, complexity, candidates, scores,
          reason), then <strong className="text-white">execute</strong> and record tokens, cost and latency.
        </li>
      </DocsList>
      <DocsCallout type="note" title="The whole conversation is analyzed">
        Classification and complexity use every message you send, not only the newest one. A long
        conversation can raise the estimated complexity and change which model is selected. See{" "}
        <DocsLink href="/docs/guides/context-optimization">Context optimization</DocsLink>.
      </DocsCallout>

      <DocsH2 id="scoring">How models are scored</DocsH2>
      <DocsTable
        head={["Factor", "Source"]}
        rows={[
          ["Projected cost", "Live per-token pricing × the request's estimated input and output tokens."],
          ["Latency", "A static latency estimate from the model's profile."],
          ["Capability", "The model's profile for the task, plus a tier bonus for stronger models that grows with complexity."],
        ]}
      />
      <DocsP>
        Complexity also shifts the policy&apos;s weights: at <C>LOW</C> complexity cost and latency count
        for more; at <C>HIGH</C> complexity capability dominates. Details on{" "}
        <DocsLink href="/docs/concepts/policies#complexity">Routing policies</DocsLink>.
      </DocsP>

      <DocsH2 id="estimates">Estimates, not measurements</DocsH2>
      <DocsList>
        <li>
          Latency and capability come from <strong className="text-white">model profiles</strong>, not live
          benchmarks of your traffic. The router does not learn from past results.
        </li>
        <li>
          Projected cost is computed <strong className="text-white">before</strong> execution from estimated
          tokens. Actual cost is computed afterwards from the provider&apos;s reported usage — see{" "}
          <DocsLink href="/docs/guides/usage-and-costs">Usage &amp; costs</DocsLink>.
        </li>
        <li>
          Task classification is heuristic and can be wrong for unusual prompts. Each response&apos;s{" "}
          <C>routing.taskType</C> and <C>routing.complexity</C> show what was inferred.
        </li>
      </DocsList>

      <DocsH2 id="explicit">Choosing a model explicitly</DocsH2>
      <DocsP>
        Set <C>model</C> to a registry model identifier (for example <C>gpt-4.1-mini</C>). If the same
        identifier is offered by more than one provider, prefix the provider:{" "}
        <C>openai/gpt-4.1-mini</C>.
      </DocsP>
      <DocsList>
        <li>Only that model is used. There is no fallback to other models.</li>
        <li>
          An unknown or unavailable identifier returns <C>404 MODEL_NOT_FOUND</C>; an ambiguous one returns{" "}
          <C>400 AMBIGUOUS_MODEL</C>.
        </li>
        <li>
          <C>routing.explicitModel</C> is <C>true</C> in the response.
        </li>
      </DocsList>
    </>
  );
}

export function ConceptPolicies() {
  return (
    <>
      <DocsH2 id="policies">The four policies</DocsH2>
      <DocsP>
        A policy sets how much the router weighs cost, latency and capability. These are the exact base
        weights used by the router:
      </DocsP>
      <DocsTable
        head={["Policy", "Cost", "Latency", "Capability", "Use it when"]}
        rows={[
          [<C key="a">balanced</C>, "0.33", "0.34", "0.33", "You have no strong preference. This is the default."],
          [<C key="b">cost_optimized</C>, "0.60", "0.15", "0.25", "Volume is high and most requests are simple."],
          [<C key="c">quality_first</C>, "0.15", "0.15", "0.70", "Answer quality matters more than price."],
          [<C key="d">speed_first</C>, "0.15", "0.60", "0.25", "Users are waiting on the response."],
        ]}
      />

      <DocsH2 id="complexity">How complexity shifts the weights</DocsH2>
      <DocsP>
        After the policy is chosen, the request&apos;s estimated complexity scales each weight and the result
        is re-normalized:
      </DocsP>
      <DocsTable
        head={["Complexity", "Cost ×", "Latency ×", "Capability ×"]}
        rows={[
          [<C key="l">LOW</C>, "1.3", "1.15", "0.55"],
          [<C key="m">MEDIUM</C>, "0.9", "1.0", "1.3"],
          [<C key="h">HIGH</C>, "0.1", "0.2", "4.0"],
        ]}
      />
      <DocsP>
        So even with <C>cost_optimized</C>, a high-complexity request gives capability most of the weight.
      </DocsP>

      <DocsH2 id="using">Selecting a policy</DocsH2>
      <DocsP>
        Add the Attentra field <C>policy</C> to the request body. Omit it for <C>balanced</C>.
      </DocsP>
      <DocsCodeTabs
        tabs={[
          { label: "Python", language: "python", code: PY_POLICY },
          { label: "JavaScript", language: "javascript", code: JS_POLICY },
        ]}
      />
      <DocsCallout type="warning" title="Check the spelling">
        Policy names are case-insensitive, but an unrecognized name currently falls back to{" "}
        <C>balanced</C> without an error. Use one of the four identifiers above exactly.
      </DocsCallout>

      <DocsH2 id="caveats">What a policy does not guarantee</DocsH2>
      <DocsList>
        <li>
          <C>cost_optimized</C> weights cost heavily; it does not guarantee the lowest possible cost.
          Capability and latency still count, and fallback may use a more expensive model.
        </li>
        <li>
          <C>speed_first</C> uses profile latency estimates, not live measurements.
        </li>
        <li>
          <C>quality_first</C> uses capability profiles; it is not a measured quality score.
        </li>
      </DocsList>
    </>
  );
}

export function ConceptFallback() {
  return (
    <>
      <DocsH2 id="plan">Primary and fallback candidates</DocsH2>
      <DocsP>
        For automatic routing the router selects a <strong className="text-white">primary</strong> model and
        orders the remaining eligible models as <strong className="text-white">fallbacks</strong>. Fallbacks
        are ordered round-robin across providers, with providers <em>other than</em> the primary&apos;s
        first, so a provider-wide outage can still be served.
      </DocsP>
      <DocsP>
        Example: primary is an OpenAI model → the first fallback is the best Anthropic or Google model, then
        the other provider, then other OpenAI models.
      </DocsP>

      <DocsH2 id="triggers">Which errors trigger fallback</DocsH2>
      <DocsTable
        head={["Provider error", "Fallback?", "Why"]}
        rows={[
          ["Timeout", "Yes", "Another model may respond in time."],
          ["Provider rate limit (429)", "Yes", "Another provider has separate limits."],
          ["Provider server error (5xx) or network error", "Yes", "Usually temporary or provider-specific."],
          ["Model unavailable (retired, restricted, no access)", "Yes", "The next candidate is a different model."],
          ["Invalid request, context too long", "No", "The same request would fail elsewhere too."],
          ["Provider authentication or configuration error", "No", "An operator must fix the deployment."],
        ]}
      />

      <DocsH2 id="limits">Attempts and timeouts</DocsH2>
      <DocsList>
        <li>At most <strong className="text-white">5 attempts</strong> per request (primary + up to 4 fallbacks).</li>
        <li>Each attempt times out after <strong className="text-white">30 seconds</strong>.</li>
        <li>
          If every attempt fails, you receive the last error. The response may include a{" "}
          <C>fallback</C> object describing the attempts.
        </li>
        <li>
          Explicit model requests (<C>model</C> ≠ <C>&quot;auto&quot;</C>) never fall back.
        </li>
      </DocsList>
      <DocsCallout type="tip" title="Set client timeouts generously">
        A request that falls back several times takes longer than a single call. Don&apos;t set your HTTP
        client timeout too low, and avoid automatic SDK retries stacking on top of Attentra&apos;s own
        fallback.
      </DocsCallout>

      <DocsH2 id="selected-vs-executed">Selected vs executed model</DocsH2>
      <DocsList>
        <li>
          <C>routing.selectedModelIdentifier</C> — the model the router chose first.
        </li>
        <li>
          <C>model</C> (and <C>execution.modelIdentifier</C>) — the model that actually produced the answer.
        </li>
        <li>
          <C>execution.fallbackUsed</C> — <C>true</C> when they differ. <C>execution.executionAttempts</C>{" "}
          lists every attempt with its outcome.
        </li>
      </DocsList>
      <DocsP>
        In the dashboard, History shows a <strong className="text-white">Fallback used</strong> badge for these
        requests.
      </DocsP>

      <DocsH2 id="operator">Operator settings</DocsH2>
      <DocsCallout type="note" title="Deployment settings, not API parameters">
        The settings below are environment variables configured by whoever operates the Attentra
        deployment. They cannot be set per request or through the API.
      </DocsCallout>
      <DocsH3>ROUTING_EXCLUDED_MODELS</DocsH3>
      <DocsP>
        A comma-separated list of <C>provider/model</C> identifiers that are never routed to, for automatic
        or explicit requests — for example models the operator&apos;s provider account cannot access.
      </DocsP>
      <DocsH3>ROUTING_MAX_FALLBACK_COST_MULTIPLIER</DocsH3>
      <DocsP>
        Optional, <strong className="text-white">disabled unless set</strong>. A number ≥ 1 that limits how much
        more a fallback may be <em>projected</em> to cost than the primary. For example, <C>3</C> drops
        fallbacks projected to cost more than three times the primary.
      </DocsP>
      <DocsList>
        <li>
          <C>ROUTING_FALLBACK_COST_MODE=soft</C> (default) — if <em>every</em> cross-provider fallback is over
          the ceiling, the cheapest one is kept so a provider outage can still be served. This is not a strict
          cost guarantee.
        </li>
        <li>
          <C>ROUTING_FALLBACK_COST_MODE=strict</C> — over-ceiling fallbacks are always removed, even if that
          leaves no cross-provider fallback.
        </li>
      </DocsList>
      <DocsP>
        The ceiling uses projected cost (an estimate), so actual fallback cost can still differ.
      </DocsP>
    </>
  );
}

export function ConceptModels() {
  return (
    <>
      <DocsH2 id="registry">The model registry</DocsH2>
      <DocsP>
        Attentra keeps a registry of OpenAI, Anthropic and Google models with their pricing, context window,
        capabilities and profile. Automatic routing considers only models that are active, have current
        pricing, fit the request and are not excluded by the operator.
      </DocsP>

      <DocsH2 id="availability">Listed is not the same as available</DocsH2>
      <DocsP>A model appearing in a provider&apos;s catalog does not guarantee it can generate a response:</DocsP>
      <DocsList>
        <li>Providers retire models or restrict them to existing customers.</li>
        <li>Access depends on the deployment&apos;s provider account permissions, tier and quota.</li>
        <li>Metadata checks (listing a model, counting tokens) don&apos;t prove generation works.</li>
        <li>The operator may exclude models with <C>ROUTING_EXCLUDED_MODELS</C>.</li>
      </DocsList>
      <DocsP>
        Automatic routing handles this with <DocsLink href="/docs/concepts/fallback">fallback</DocsLink>: if a
        model turns out to be unavailable, the next candidate is tried. For predictable behavior, prefer{" "}
        <C>model: &quot;auto&quot;</C> over hard-coding an identifier.
      </DocsP>

      <DocsH2 id="identifiers">Model identifiers</DocsH2>
      <DocsP>
        The <C>model</C> field in every response is the identifier of the model that executed, and History
        shows both display names and identifiers. If you need a specific model, use an identifier you have
        seen succeed in a response, or prefix the provider (<C>anthropic/…</C>, <C>google/…</C>,{" "}
        <C>openai/…</C>) to avoid ambiguity. Attentra does not currently publish a live list of routable
        models.
      </DocsP>
    </>
  );
}

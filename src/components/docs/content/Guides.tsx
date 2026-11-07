import DocsCodeBlock from "../DocsCodeBlock";
import { C, DocsCallout, DocsH2, DocsLink, DocsList, DocsP, DocsTable } from "../DocsPrimitives";
import {
  CHATBOT_ENV,
  CHATBOT_INSTALL,
  CHATBOT_PY,
  CHATBOT_RUN,
  PY_MULTI_TURN,
  PY_SLIDING_WINDOW,
  PY_TOKEN_BUDGET,
} from "@/lib/docs/examples";

export function GuideConversationHistory() {
  return (
    <>
      <DocsH2 id="stateless">Each request stands alone</DocsH2>
      <DocsCallout type="warning" title="Attentra does not remember conversations">
        The chat-completions endpoint does not keep conversation state between API calls. The model only
        sees the <C>messages</C> you send in that request. To continue a conversation, your application
        sends the earlier turns again.
      </DocsCallout>
      <DocsP>
        This is the same model as the OpenAI chat-completions API: the client owns the conversation. It also
        means that different requests in one conversation may be routed to different models — each request
        is routed on its own.
      </DocsP>

      <DocsH2 id="roles">System, user and assistant messages</DocsH2>
      <DocsTable
        head={["Role", "Purpose"]}
        rows={[
          [<C key="s">system</C>, "Instructions for how the assistant should behave. Usually the first message. developer is accepted as an alias for system."],
          [<C key="u">user</C>, "What the person asked. The newest user message is normally the last message in the array."],
          [<C key="a">assistant</C>, "Earlier replies from the model, sent back so the model knows what it already said."],
        ]}
      />
      <DocsP>
        Each <C>content</C> must be non-empty text: a string, or an array of <C>{`{ "type": "text" }`}</C>{" "}
        parts. Images, audio and tool messages are not supported.
      </DocsP>

      <DocsH2 id="multi-turn">Keeping context across turns</DocsH2>
      <DocsP>
        Keep a list of messages in your app. Append the user&apos;s message, send the list, then append the
        assistant&apos;s reply:
      </DocsP>
      <DocsCodeBlock language="python" code={PY_MULTI_TURN} />
      <DocsP>
        Every turn re-sends the earlier messages, so input tokens grow as the conversation grows. That
        affects cost and latency — see{" "}
        <DocsLink href="/docs/guides/context-optimization">Context optimization</DocsLink>.
      </DocsP>

      <DocsH2 id="history-vs-context">Model context vs. the History dashboard</DocsH2>
      <DocsTable
        head={["", "Chat context", "Attentra History"]}
        rows={[
          ["What it is", "The messages array you send in a request", "A record of past requests for you to inspect"],
          ["Who manages it", "Your application", "Attentra, automatically"],
          ["Seen by the model?", "Yes — this is all the model sees", "No"],
          ["Used in future requests?", "Only if you send it again", "Never injected into new requests"],
        ]}
      />
      <DocsP>
        In <DocsLink href="/dashboard/history">History</DocsLink>, each request shows its latest user message as
        the preview, and the detail page shows the conversation context that was sent with it.
      </DocsP>
    </>
  );
}

export function GuideContextOptimization() {
  return (
    <>
      <DocsH2 id="growth">Why input tokens grow</DocsH2>
      <DocsP>
        Because you re-send the conversation on every turn, turn 10 includes turns 1–9 again. Input tokens —
        and therefore input cost — grow with each turn, even if each new question is short.
      </DocsP>
      <DocsTable
        head={["Turn", "New text", "What's sent", "Input tokens (example)"]}
        rows={[
          ["1", "~50 tokens", "system + 1 message", "~70"],
          ["5", "~50 tokens", "system + 9 messages", "~900"],
          ["20", "~50 tokens", "system + 39 messages", "~4,000"],
        ]}
      />
      <DocsP>
        Illustrative figures. Longer context usually means higher input cost and somewhat higher latency. It
        can also change routing: Attentra estimates complexity from all messages, so a long conversation may
        be routed to a more capable (and more expensive) model.
      </DocsP>

      <DocsH2 id="sliding-window">Sliding window</DocsH2>
      <DocsP>
        The simplest strategy: keep the system message plus the most recent <em>N</em> turns. This example
        keeps the last six turns:
      </DocsP>
      <DocsCodeBlock language="python" code={PY_SLIDING_WINDOW} />
      <DocsCallout type="note" title="A turn limit is not a token limit">
        Six short turns and six long turns can differ by thousands of tokens. If you need a predictable budget,
        trim by tokens instead.
      </DocsCallout>

      <DocsH2 id="token-budget">Token-aware trimming</DocsH2>
      <DocsP>
        Keep the newest messages that fit inside an approximate token budget. The estimate below uses about 4
        characters per token — the same rough rule Attentra uses for routing estimates. Real tokenization
        varies by model and language.
      </DocsP>
      <DocsCodeBlock language="python" code={PY_TOKEN_BUDGET} />

      <DocsH2 id="summarize">Summarization and retrieval</DocsH2>
      <DocsList>
        <li>
          <strong className="text-white">Summarize older turns.</strong> Periodically ask the model to
          summarize the conversation so far, then replace the old messages with one short summary message.
          The summary call itself costs tokens, and details can be lost.
        </li>
        <li>
          <strong className="text-white">Retrieve what&apos;s relevant.</strong> Store past messages or
          documents in your own database or search index and include only the parts relevant to the new
          question.
        </li>
      </DocsList>
      <DocsP>
        Attentra does not compress, summarize or cache your context for you. Whatever you send is what the
        provider receives and charges for.
      </DocsP>

      <DocsH2 id="trade-offs">Trade-offs</DocsH2>
      <DocsList>
        <li>Deleting context blindly can make answers worse — the model forgets names, constraints and decisions.</li>
        <li>Always keep the system message and the newest user message.</li>
        <li>Keep user/assistant pairs together so the conversation still reads correctly.</li>
        <li>
          Watch <C>usage.prompt_tokens</C> in responses (or tokens in History) to see whether a strategy is
          working.
        </li>
      </DocsList>
    </>
  );
}

export function GuideUsageAndCosts() {
  return (
    <>
      <DocsH2 id="tokens">Tokens</DocsH2>
      <DocsTable
        head={["Field", "Meaning"]}
        rows={[
          [<C key="p">usage.prompt_tokens</C>, "Input tokens — every message you sent, including repeated history."],
          [<C key="c">usage.completion_tokens</C>, "Output tokens the model generated. Capped by max_tokens."],
          [<C key="t">usage.total_tokens</C>, "Input + output."],
        ]}
      />
      <DocsP>
        These are the counts reported by the provider that executed the request. If a provider reports no
        usage, <C>usage</C> is omitted rather than filled with estimates.
      </DocsP>

      <DocsH2 id="costs">Projected vs actual cost</DocsH2>
      <DocsTable
        head={["", "Projected cost", "Actual (calculated) cost"]}
        rows={[
          ["When", "Before execution, during routing", "After execution"],
          ["Based on", "Estimated tokens × the model's pricing", "Provider-reported tokens × Attentra's stored pricing for the executed model"],
          ["In the API", <C key="pc">routing.projectedCost</C>, <C key="ac">execution.actualCost</C>],
          ["Unit", "USD", "USD"],
        ]}
      />
      <DocsList>
        <li>
          Actual cost is Attentra&apos;s calculation, not the provider&apos;s invoice. Provider-side discounts,
          cached-input pricing, taxes and price changes can make the invoice differ.
        </li>
        <li>
          If usage or pricing is missing, actual cost is <strong className="text-white">not available</strong>{" "}
          — it is never filled in from estimates. The dashboard shows &quot;Not available&quot;.
        </li>
        <li>
          Cost depends on the model&apos;s rates, the length of your context (input), the length of the answer
          (output), and whether a fallback model was used.
        </li>
      </DocsList>

      <DocsH2 id="savings">Savings</DocsH2>
      <DocsP>
        The billing pages show savings as a <strong className="text-white">calculated comparison</strong>:
        what the same requests would have cost on a configured baseline model versus their calculated actual
        cost. It is not an audited figure and not a guarantee. Attentra does not collect payments during the
        MVP; the optimization fee shown there is a preview.
      </DocsP>

      <DocsH2 id="where">Where to find these numbers</DocsH2>
      <DocsList>
        <li>
          <strong className="text-white">In the response</strong> — <C>usage</C>, <C>routing</C> and{" "}
          <C>execution</C> (<DocsLink href="/docs/api/responses">Response format</DocsLink>).
        </li>
        <li>
          <strong className="text-white">History list</strong> — routed/executed model, latency, actual cost and
          tokens for each request.
        </li>
        <li>
          <strong className="text-white">History detail</strong> — input, output and total tokens, projected and
          actual cost, fallback status, latency and the conversation context you sent.
        </li>
        <li>
          <strong className="text-white">Billing</strong> — totals and calculated savings.
        </li>
      </DocsList>

      <DocsH2 id="currency">Currency</DocsH2>
      <DocsP>
        Pricing and API cost fields are in <strong className="text-white">USD</strong>. The dashboard may show
        amounts in another display currency (for example PKR) converted at a fixed rate configured for the
        deployment. The conversion is for display only; it is not a live exchange rate and does not change the
        USD values in API responses.
      </DocsP>
    </>
  );
}

export function GuideChatbot() {
  return (
    <>
      <DocsP>
        This guide builds a terminal chatbot in Python that keeps its own conversation history, bounds its
        context to the last six turns, and reports which model answered and how many tokens it used. It does
        not stream.
      </DocsP>

      <DocsH2 id="setup">Setup</DocsH2>
      <DocsList ordered>
        <li>
          Create an API key (<DocsLink href="/docs/quickstart#create-key">Quickstart</DocsLink>).
        </li>
        <li>Install the dependencies:</li>
      </DocsList>
      <DocsCodeBlock language="bash" code={CHATBOT_INSTALL} />
      <DocsP>Create a <C>.env</C> file next to your script:</DocsP>
      <DocsCodeBlock language="bash" title=".env" code={CHATBOT_ENV} />

      <DocsH2 id="code">The chatbot</DocsH2>
      <DocsCodeBlock language="python" title="chatbot.py" code={CHATBOT_PY} />
      <DocsCodeBlock language="bash" code={CHATBOT_RUN} />

      <DocsH2 id="how-it-works">How it works</DocsH2>
      <DocsList>
        <li>
          <strong className="text-white">Key loading</strong> — <C>load_dotenv()</C> reads <C>.env</C>; the key
          never appears in the code.
        </li>
        <li>
          <strong className="text-white">History</strong> — <C>history</C> holds every user and assistant
          message. Attentra does not store it for you.
        </li>
        <li>
          <strong className="text-white">Bounded context</strong> — <C>build_context</C> sends the system
          message plus the last 6 turns, so input tokens stop growing after a while. See{" "}
          <DocsLink href="/docs/guides/context-optimization">Context optimization</DocsLink> for token-based
          trimming.
        </li>
        <li>
          <strong className="text-white">Errors</strong> — on failure the unanswered user message is removed
          from history so the conversation stays consistent; rate limits print the server&apos;s{" "}
          <C>Retry-After</C> value.
        </li>
        <li>
          <strong className="text-white">Attribution</strong> — each answer prints <C>response.model</C> and the
          provider-reported token counts.
        </li>
      </DocsList>

      <DocsH2 id="which-model">Which model answered?</DocsH2>
      <DocsCallout type="warning" title="Don't ask the model who it is">
        Asking “Which model are you?” is not a reliable way to identify the model — models often answer
        incorrectly or describe a different model family. Use the response metadata: <C>response.model</C> is
        the executed model, and History shows both the routed and executed model for every request.
      </DocsCallout>
      <DocsP>
        Because each request is routed independently, consecutive answers in one conversation can come from
        different models. That&apos;s expected with <C>model=&quot;auto&quot;</C>; if you need one model for
        the whole conversation, pass an explicit model identifier.
      </DocsP>
    </>
  );
}

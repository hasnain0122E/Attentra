import DocsCodeBlock from "../DocsCodeBlock";
import DocsCodeTabs from "../DocsCodeTabs";
import { C, DocsCallout, DocsFlow, DocsH2, DocsLink, DocsList, DocsP, DocsTable } from "../DocsPrimitives";
import {
  CURL_REQUEST,
  ENV_BASH,
  ENV_DOTENV,
  ENV_POWERSHELL,
  JS_INSTALL,
  JS_QUICKSTART,
  PY_INSTALL,
  PY_QUICKSTART,
} from "@/lib/docs/examples";
import { PRODUCTION_BASE_URL } from "@/lib/docs/navigation";

export function Introduction() {
  return (
    <>
      <DocsH2 id="what-is-attentra">What is Attentra?</DocsH2>
      <DocsP>
        Attentra is an OpenAI-compatible AI gateway that routes requests across supported models from
        OpenAI, Anthropic and Google. Instead of hard-coding one model for every task, you send{" "}
        <C>model: &quot;auto&quot;</C> and Attentra selects an eligible model using its routing policy — then
        tells you which model it chose, which one actually answered, how many tokens were used and what
        the request cost.
      </DocsP>
      <DocsP>
        Because the API follows the OpenAI chat-completions format, you can use the official OpenAI SDKs.
        You change two settings: the API key and the base URL.
      </DocsP>
      <DocsCodeBlock language="text" title="Base URL" code={PRODUCTION_BASE_URL} />

      <DocsH2 id="why-routing">Why route requests?</DocsH2>
      <DocsList>
        <li>
          <strong className="text-white">Different tasks need different models.</strong> Classifying a support
          ticket rarely needs the most expensive model; debugging a complex incident might.
        </li>
        <li>
          <strong className="text-white">Providers fail.</strong> Rate limits, outages and retired models happen.
          A gateway can try another provider instead of failing your request.
        </li>
        <li>
          <strong className="text-white">You need to see what happened.</strong> Every request records the
          selected model, executed model, tokens, cost and latency in your dashboard.
        </li>
      </DocsList>

      <DocsH2 id="request-flow">What happens to a request</DocsH2>
      <DocsFlow steps={["Your application", "Attentra API", "Router", "AI provider", "Response + metadata"]} />
      <DocsList ordered>
        <li>Your server sends a chat-completions request with your Attentra API key.</li>
        <li>Attentra authenticates the key and checks your rate limit.</li>
        <li>The router estimates the task, its complexity and its token needs, then scores eligible models.</li>
        <li>The selected model is called. If it fails with a recoverable error, a fallback model is tried.</li>
        <li>You receive an OpenAI-format response plus Attentra&apos;s routing and execution details.</li>
        <li>The request appears in your History with tokens, cost and the models involved.</li>
      </DocsList>
      <DocsP>
        Details: <DocsLink href="/docs/concepts/routing">Automatic routing</DocsLink> ·{" "}
        <DocsLink href="/docs/concepts/fallback">Fallback &amp; reliability</DocsLink>.
      </DocsP>

      <DocsH2 id="responsibilities">What Attentra does and doesn&apos;t do</DocsH2>
      <DocsTable
        head={["Attentra handles", "You remain responsible for"]}
        rows={[
          ["Choosing an eligible model for each request", "Sending the conversation context each request needs"],
          ["Calling the provider and normalizing the response", "Keeping your API key secret and server-side"],
          ["Trying fallback models on recoverable failures", "Handling errors and rate limits in your app"],
          ["Recording tokens, cost, latency and models used", "Choosing output limits (max_tokens) and prompts"],
        ]}
      />
      <DocsCallout type="warning" title="Routing is a weighted estimate, not a guarantee">
        The router scores models using cost estimates, model-profile latency and capability data, and the
        policy you choose. It does not guarantee the cheapest, fastest or highest-quality result for every
        request. See <DocsLink href="/docs/limitations">Limitations</DocsLink>.
      </DocsCallout>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <DocsList>
        <li>
          <DocsLink href="/docs/quickstart">Quickstart</DocsLink> — your first request in about five minutes.
        </li>
        <li>
          <DocsLink href="/docs/guides/build-a-chatbot">Build a chatbot</DocsLink> — a complete terminal chatbot.
        </li>
        <li>
          <DocsLink href="/docs/api/chat-completions">API reference</DocsLink> — every parameter and field.
        </li>
      </DocsList>
    </>
  );
}

export function Quickstart() {
  return (
    <>
      <DocsH2 id="create-key">1. Create an API key</DocsH2>
      <DocsList ordered>
        <li>
          <DocsLink href="/login">Sign in with Google</DocsLink>. Your account is created on first sign-in.
        </li>
        <li>
          Open <DocsLink href="/dashboard/api-keys">Dashboard → API keys</DocsLink> and choose{" "}
          <strong className="text-white">Create key</strong>.
        </li>
        <li>
          Copy the key immediately. <strong className="text-white">It is shown only once</strong> — Attentra
          stores only a hash of it.
        </li>
      </DocsList>

      <DocsH2 id="store-key">2. Store the key as an environment variable</DocsH2>
      <DocsP>
        Examples read the key from an environment variable named <C>ATTENTRA_API_KEY</C>. Don&apos;t paste
        the key into source code.
      </DocsP>
      <DocsCodeTabs
        tabs={[
          { label: "Windows PowerShell", language: "powershell", code: ENV_POWERSHELL },
          { label: "macOS / Linux", language: "bash", code: ENV_BASH },
          { label: ".env file", language: "bash", code: ENV_DOTENV },
        ]}
      />
      <DocsCallout type="warning" title="Keep keys out of Git">
        If you use a <C>.env</C> file, add it to <C>.gitignore</C> before your first commit. The commands
        above only set the variable for the current terminal; open a new terminal and you&apos;ll need to set
        it again (or use a <C>.env</C> file).
      </DocsCallout>

      <DocsH2 id="install-sdk">3. Install the OpenAI SDK</DocsH2>
      <DocsP>Attentra works with the official OpenAI SDKs. There is no separate Attentra package.</DocsP>
      <DocsCodeTabs
        tabs={[
          { label: "Python", language: "bash", code: PY_INSTALL },
          { label: "JavaScript", language: "bash", code: JS_INSTALL },
        ]}
      />

      <DocsH2 id="first-request">4. Send your first request</DocsH2>
      <DocsCodeTabs
        tabs={[
          { label: "Python", language: "python", code: PY_QUICKSTART },
          { label: "JavaScript", language: "javascript", code: JS_QUICKSTART },
          { label: "cURL", language: "bash", code: CURL_REQUEST },
        ]}
      />
      <DocsP>
        <C>response.model</C> is the model that <em>executed</em> the request. If Attentra had to fall back,
        it differs from the model the router originally selected — see{" "}
        <DocsLink href="/docs/api/responses">Response format</DocsLink>.
      </DocsP>
      <DocsCallout type="note" title="Run JavaScript examples as ES modules">
        The JavaScript example uses top-level <C>await</C>. Save it as <C>quickstart.mjs</C> (or set{" "}
        <C>&quot;type&quot;: &quot;module&quot;</C> in <C>package.json</C>) and run{" "}
        <C>node quickstart.mjs</C>.
      </DocsCallout>

      <DocsH2 id="check-history">5. Find it in History</DocsH2>
      <DocsP>
        Open <DocsLink href="/dashboard/history">Dashboard → History</DocsLink>. Your request is listed with
        its latest user message, the routed and executed model, tokens, latency and actual cost. Open it to
        see the routing decision and the full conversation context you sent.
      </DocsP>
      <DocsP>
        Next: <DocsLink href="/docs/concepts/routing">how routing chose that model</DocsLink>, or{" "}
        <DocsLink href="/docs/guides/build-a-chatbot">build a chatbot</DocsLink>.
      </DocsP>
    </>
  );
}

export function Authentication() {
  return (
    <>
      <DocsH2 id="bearer">Bearer authentication</DocsH2>
      <DocsP>Send your API key in the <C>Authorization</C> header of every request:</DocsP>
      <DocsCodeBlock language="text" title="HTTP header" code={"Authorization: Bearer $ATTENTRA_API_KEY"} />
      <DocsP>
        The OpenAI SDKs add this header for you from the <C>api_key</C> (Python) or <C>apiKey</C>{" "}
        (JavaScript) option. Requests must also use <C>Content-Type: application/json</C>.
      </DocsP>

      <DocsH2 id="key-format">Key format</DocsH2>
      <DocsP>
        Attentra keys start with <C>atr_</C> followed by 64 hexadecimal characters. The dashboard shows only a
        short prefix (for example <C>atr_ab12cd…</C>) so you can tell keys apart. Attentra stores a SHA-256
        hash of each key, never the key itself, so a lost key cannot be recovered — create a new one.
      </DocsP>

      <DocsH2 id="lifecycle">Creating, revoking and expiring keys</DocsH2>
      <DocsList>
        <li>
          <strong className="text-white">Create</strong> keys at{" "}
          <DocsLink href="/dashboard/api-keys">Dashboard → API keys</DocsLink>. Give each key a name that says
          where it is used (e.g. &quot;staging server&quot;). The full key is displayed once.
        </li>
        <li>
          <strong className="text-white">Expire:</strong> you can optionally set an expiry date when creating a
          key. Expired keys are rejected.
        </li>
        <li>
          <strong className="text-white">Revoke</strong> a key from the same page as soon as you suspect it has
          leaked. Revoked keys stop working immediately; past request history is kept.
        </li>
      </DocsList>

      <DocsH2 id="personal-business">Personal and business keys</DocsH2>
      <DocsP>
        Keys created in your personal dashboard are tied to your account; their requests appear in your
        History. Business workspaces have their own keys, managed in the business dashboard, and their
        requests are recorded under the workspace rather than an individual user. Both use the same{" "}
        <C>atr_</C> format and the same endpoint.
      </DocsP>

      <DocsH2 id="storage">Storing keys safely</DocsH2>
      <DocsList>
        <li>Keep keys in environment variables or a secrets manager, never in source code or Git.</li>
        <li>
          Call Attentra only from server-side code. A key in a browser bundle or mobile app can be extracted
          by anyone.
        </li>
        <li>Use separate keys per environment so you can revoke one without affecting the others.</li>
        <li>Don&apos;t log full keys or the <C>Authorization</C> header.</li>
      </DocsList>

      <DocsH2 id="auth-errors">Authentication errors</DocsH2>
      <DocsTable
        head={["Status", "Code", "Meaning"]}
        rows={[
          ["401", <C key="a">AUTHENTICATION</C>, "No key was sent, or the key is invalid, revoked or expired. The message says which of “required” or “invalid” applies."],
          ["503", <C key="b">SERVICE_UNAVAILABLE</C>, "Attentra could not check the key (e.g. its database was briefly unavailable). Your key may be fine — retry later."],
        ]}
      />
      <DocsCallout type="tip">
        Getting 401 with a key you just created? Check that you copied the whole key, that it hasn&apos;t been
        revoked, and that the variable is set in the same terminal that runs your code.
      </DocsCallout>
    </>
  );
}

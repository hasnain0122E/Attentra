import DocsCodeBlock from "../DocsCodeBlock";
import { C, DocsCallout, DocsH2, DocsLink, DocsList, DocsP } from "../DocsPrimitives";
import {
  CURL_REQUEST,
  JS_ERRORS,
  JS_INSTALL,
  JS_POLICY,
  JS_QUICKSTART,
  POWERSHELL_REQUEST,
  PY_ERRORS,
  PY_INSTALL,
  PY_METADATA,
  PY_POLICY,
  PY_QUICKSTART,
  RESPONSE_EXAMPLE,
} from "@/lib/docs/examples";

function SubsetNote() {
  return (
    <DocsCallout type="note" title="A compatible subset, not the whole OpenAI API">
      Attentra implements the non-streaming <C>chat.completions.create</C> call. Other SDK methods
      (embeddings, images, audio, the Responses API, assistants, files) are not available. See{" "}
      <DocsLink href="/docs/api/parameters">Parameters</DocsLink> for exactly which fields are accepted.
    </DocsCallout>
  );
}

export function SdkPython() {
  return (
    <>
      <SubsetNote />
      <DocsH2 id="install">Install</DocsH2>
      <DocsCodeBlock language="bash" code={PY_INSTALL} />

      <DocsH2 id="client">Create a client</DocsH2>
      <DocsP>
        Pass your key and Attentra&apos;s base URL to the standard <C>OpenAI</C> client. Set{" "}
        <C>max_retries=0</C> (or a small number) deliberately: the SDK retries some failures automatically,
        and every retry is a new request that counts toward your rate limit and may incur cost.
      </DocsP>

      <DocsH2 id="completion">Send a completion</DocsH2>
      <DocsCodeBlock language="python" title="first_request.py" code={PY_QUICKSTART} />
      <DocsList>
        <li>
          <C>response.choices[0].message.content</C> — the answer text.
        </li>
        <li>
          <C>response.model</C> — the model identifier that executed the request.
        </li>
        <li>
          <C>response.usage</C> — <C>prompt_tokens</C>, <C>completion_tokens</C>, <C>total_tokens</C> as
          reported by the provider. It can be <C>None</C> if the provider reported no usage.
        </li>
      </DocsList>

      <DocsH2 id="attentra-fields">Read Attentra metadata</DocsH2>
      <DocsP>
        Responses include extra <C>routing</C> and <C>execution</C> objects. The Python SDK keeps fields it
        doesn&apos;t know in <C>model_extra</C>:
      </DocsP>
      <DocsCodeBlock language="python" code={PY_METADATA} />

      <DocsH2 id="policy">Choose a routing policy</DocsH2>
      <DocsP>
        <C>policy</C> is an Attentra field, so pass it through <C>extra_body</C>. Valid values are listed on{" "}
        <DocsLink href="/docs/concepts/policies">Routing policies</DocsLink>.
      </DocsP>
      <DocsCodeBlock language="python" code={PY_POLICY} />

      <DocsH2 id="errors">Handle errors</DocsH2>
      <DocsP>
        Attentra returns OpenAI-style error bodies, so the SDK raises its usual exception classes.
      </DocsP>
      <DocsCodeBlock language="python" code={PY_ERRORS} />
      <DocsP>
        All status codes and their meaning: <DocsLink href="/docs/api/errors">Errors</DocsLink>.
      </DocsP>
    </>
  );
}

export function SdkJavaScript() {
  return (
    <>
      <SubsetNote />
      <DocsH2 id="install">Install</DocsH2>
      <DocsCodeBlock language="bash" code={JS_INSTALL} />

      <DocsH2 id="client">Create a client</DocsH2>
      <DocsP>
        Use the official <C>openai</C> package with <C>apiKey</C> and <C>baseURL</C>. Run it in Node.js or
        another trusted server environment.
      </DocsP>

      <DocsH2 id="completion">Send a completion</DocsH2>
      <DocsCodeBlock language="javascript" title="quickstart.mjs" code={JS_QUICKSTART} />

      <DocsH2 id="policy">Choose a routing policy</DocsH2>
      <DocsP>
        The SDK sends the request body as given, so Attentra fields such as <C>policy</C> can be added
        directly. Attentra&apos;s <C>routing</C> and <C>execution</C> objects are present on the response at
        runtime even though the SDK&apos;s types don&apos;t declare them.
      </DocsP>
      <DocsCodeBlock language="javascript" code={JS_POLICY} />

      <DocsH2 id="errors">Handle errors</DocsH2>
      <DocsCodeBlock language="javascript" code={JS_ERRORS} />

      <DocsH2 id="browser">Never call Attentra from the browser</DocsH2>
      <DocsCallout type="warning" title="Keep keys out of public bundles">
        Anything shipped to a browser — including environment variables prefixed with{" "}
        <C>NEXT_PUBLIC_</C> or <C>VITE_</C> — can be read by visitors. Call Attentra from your own backend
        (an API route, server action or server) and send only the answer to the browser. Don&apos;t set the
        SDK&apos;s <C>dangerouslyAllowBrowser</C> option with an Attentra key.
      </DocsCallout>
    </>
  );
}

export function SdkCurl() {
  return (
    <>
      <DocsH2 id="request">Request</DocsH2>
      <DocsP>
        <C>POST https://attentra-nine.vercel.app/api/v1/chat/completions</C> with a JSON body. This example
        reads the key from the <C>ATTENTRA_API_KEY</C> environment variable (see{" "}
        <DocsLink href="/docs/quickstart#store-key">Quickstart</DocsLink>).
      </DocsP>
      <DocsCodeBlock language="bash" title="macOS / Linux" code={CURL_REQUEST} />

      <DocsH2 id="response">Response</DocsH2>
      <DocsP>
        A successful response is an OpenAI <C>chat.completion</C> object followed by Attentra fields. Values
        below are illustrative.
      </DocsP>
      <DocsCodeBlock language="json" code={RESPONSE_EXAMPLE} />
      <DocsP>
        Field-by-field explanation: <DocsLink href="/docs/api/responses">Response format</DocsLink>.
      </DocsP>

      <DocsH2 id="windows">Windows PowerShell</DocsH2>
      <DocsP>
        In PowerShell, <C>curl</C> may be an alias with different syntax. Use{" "}
        <C>Invoke-RestMethod</C> instead:
      </DocsP>
      <DocsCodeBlock language="powershell" code={POWERSHELL_REQUEST} />
    </>
  );
}

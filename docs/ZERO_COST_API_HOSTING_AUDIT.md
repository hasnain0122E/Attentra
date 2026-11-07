# Attentra — Zero-Cost API Hosting Feasibility Audit

**Date:** 2026-11-06
**Commit inspected:** `ff72037` (`main`)
**Mode:** read-only. No source, dependency, Vercel, environment, Neon or deployment changes.

**Evidence labels:**
- **[SRC]**: repository source.
- **[PROD]**: observed on production or the Vercel dashboard.
- **[DOC]**: vendor documentation fetched 2026-11-06 (sources at the end).
- **[ASSUMPTION]**: not verified.

---

## 1. Summary

**The problem is a temporary, IP-scoped challenge from Vercel's system-level DDoS mitigation.** It is not an outage, and it is not a rule you configured.

- On 2026-11-06 at about 19:08 UTC, every scripted request from one machine got `403` with `X-Vercel-Mitigated: challenge`. This covered curl, PowerShell, Python, OpenAI-SDK and even Chrome user-agents.
- The project Firewall showed:
  - Custom Rules **0**;
  - Bot Protection **Inactive**;
  - System Mitigations **Active**;
  - **25 requests challenged by "DDoS Mitigation"**.

  **[PROD]**
- By **20:13 UTC the same machine reached the route again** (`405` on GET, `X-Matched-Path: /api/v1/chat/completions`). **[PROD]**

**On Hobby there is no way to exempt traffic from system mitigations.** Vercel's System Bypass Rules are listed as "N/A" for Hobby and available on Pro/Enterprise only. Custom-rule "bypass" only skips your own WAF rules. **[DOC]**

**Recommendation for November 8:**
- **Stay on Vercel Hobby. Change no infrastructure.**
- Make the demo resilient: low request volume, the browser Playground as the primary live path, a clean SDK call from the demo network, a backup video, and a client that recognizes the challenge.
- Every zero-cost alternative adds more risk than it removes within 36 hours (§5).

**Longer term (real customers):** move the public API to a host without browser challenges, keeping the dashboard on Vercel and the shared Neon database. The cheapest durable options are a paid tier (Vercel Pro for system bypass, or Cloudflare Workers Paid). Cloudflare Workers **Free** is a possible zero-cost target, but only after a CPU-time spike test (§4.2).

---

## 2. Dependencies of `POST /api/v1/chat/completions`

A static import trace from `src/app/api/v1/chat/completions/route.ts` reaches **49 internal files** and these **external packages**:

| Package | Used for | Framework-coupled? |
|---|---|---|
| `next/server` (`NextRequest`, `NextResponse`) | Request/response types | **Yes**, but only in `route.ts` |
| `next-auth` (via `@/auth` → `resolve-requester.ts`) | Browser-session auth for the Playground | **Yes**. API-key auth does not need it |
| `@auth/prisma-adapter` | Pulled in by `@/auth` | Yes (same path) |
| `@prisma/client` (`prisma-client-js`, native engine) | All persistence | Runtime-coupled (Node engine) |
| `openai`, `@anthropic-ai/sdk`, `@google/generative-ai` | Provider calls (fetch-based SDKs) | No |
| `crypto` (Node: `createHash`, `randomBytes`) | Key hashing | Node API (also available on Workers with `nodejs_compat`) [ASSUMPTION] |

All of `src/lib/{routing,execution,providers,cost-intelligence,api-keys}` is **framework-agnostic TypeScript**. **[SRC]**

### Request path and database work (one successful request)
1. `resolveRequester`: `auth()` (session cookie, no DB), then `apiKey.findUnique` + `apiKey.update(lastUsedAt)`.
2. `routeAndPersist`: `loadRoutingCandidates` (model + provider + pricing read), then the scorer (CPU, about 58 candidates), then an **interactive `prisma.$transaction`** creating `Request` + `RoutingDecision` (`routing/persistence.ts:124`).
3. `request.update` (ownership).
4. `ExecutionOrchestrator.execute`: provider SDK call(s), with a 30 s timeout each and up to 5 attempts.
5. `persistRequestCostIntelligence`: model and baseline reads, then a `request.update` with cost and savings (about 3–6 queries).
6. `request.update` (prompt, response, status, latency).

That is about **10–15 database round-trips plus 1–5 provider HTTP calls** per request. **[SRC]**

### Can the API run without Next.js?
**Yes, with a thin adapter.** The only Next-specific code is the `NextRequest`/`NextResponse` wrapper and the optional session path. A standalone API would:
- accept **API keys only** (no browser sessions);
- reuse `src/lib/**` unchanged;
- use the same `DATABASE_URL`.

**[SRC]**

---

## 3. Why a Cloudflare proxy in front of Vercel does not fix this

- The challenge is issued by **Vercel's** edge, based on signals about the connecting client. A Cloudflare proxy (orange-cloud DNS or a Worker that `fetch`es the Vercel URL) only moves the connecting client from your laptop to **Cloudflare's shared egress IPs**.
- Vercel documents that a proxy "changes the connection information Vercel receives". When many visitors share a proxy's IPs, "mitigation against malicious traffic from those addresses can also affect legitimate requests". **[DOC]**
- Vercel also states that its Bot Protection ruleset "does not work when a reverse proxy is placed in front of Vercel", and that proxy egress-IP changes can trigger repeated challenges. **[DOC]**
- A challenge requires a JavaScript-capable browser. A proxy cannot solve it, so it would pass the `403` HTML straight through to the API client.
- Correctly attributing client IPs behind a proxy ("Verified Proxy Advanced") is Enterprise-only. **[DOC]**

**Conclusion:** a proxy changes **who** gets challenged, not **whether**. It can make things worse, because all customers then share one set of IPs. **Rejected.**

---

## 4. Options Compared

### 4.1 Option A — Keep API on Vercel Hobby (+ demo/client hardening)

| Aspect | Assessment |
|---|---|
| Feasibility | Already in production: 200s with Gemini on 2026-11-06 **[PROD]** |
| Code changes | **None required for hosting.** Optional, client side only: detect `X-Vercel-Mitigated` and back off (already in `scripts/verify-production-api.ps1`) |
| Compatibility | 100% (status quo) |
| Free-tier limits | System mitigation cannot be bypassed on Hobby **[DOC]**. Function duration and usage are within Hobby (usage page: about 3.5K invocations/30 d) **[PROD]** |
| Reliability risk | **Intermittent 403 challenge for scripted clients** from a flagged IP. Observed once, it cleared within about an hour. Browsers pass challenges automatically |
| Security risk | Unchanged (secrets in one place) |
| Complexity | Very low |
| Testing | Existing suite; one scripted call from the demo network; Playground run |
| Rollback | N/A (no change) |
| Nov 8 suitability | **Best.** Lowest risk |

### 4.2 Option B — Standalone API on Cloudflare Workers Free

| Aspect | Assessment |
|---|---|
| Feasibility | **Possible but unproven** |
| Code changes | New Worker entry (Web `Request`/`Response` adapter around `src/lib/**`). Prisma via the **Neon driver adapter** (`@prisma/adapter-neon`) **[DOC]**; generator/client changes for the edge runtime. Remove `next-auth` from this path (API keys only). `nodejs_compat` for `crypto`/`process.env` [ASSUMPTION]. New deps (`wrangler`, Neon adapter/driver), **which need approval** |
| Compatibility | Logic reusable. **Interactive `$transaction`** (`routing/persistence.ts:124`) requires Neon's WebSocket `Pool` mode, not the HTTP mode [ASSUMPTION based on adapter behavior; verify] |
| Free-tier limits **[DOC]** | 100,000 requests/day. **10 ms CPU per request** (network wait not counted). 50 subrequests per invocation (enough for about 10–15 queries + ≤5 provider calls). **6 simultaneous outgoing connections**. 128 MB memory. No wall-clock limit while the client is connected. Size: Cloudflare lists 64 MiB uncompressed and "no compressed limit", but Prisma's guide still cites **3 MB on free**, so the docs conflict |
| Reliability risk | **10 ms CPU is the main risk.** Prisma client initialization/query handling, JSON parsing of provider responses, scoring and SHA-256 must all fit. Exceeding it terminates the request (Error 1102) [ASSUMPTION: plausible on cold isolates; must be measured]. No browser-challenge problem on `*.workers.dev` for normal API traffic [ASSUMPTION] |
| Security risk | Secrets duplicated to a second platform (DB URL + 3 provider keys) → larger blast radius; needs rotation discipline |
| Complexity | **LARGE** (2–3 days including measurement) |
| Testing | Full auth/routing/execution suite against the Worker build; CPU profiling; transaction path; provider SDK compatibility on `workerd` |
| Rollback | Clients switch the base URL back to Vercel; DB unchanged |
| Nov 8 suitability | **Not suitable** |

### 4.3 Option C — Separate Node.js service on Render Free

| Aspect | Assessment |
|---|---|
| Feasibility | **Technically straightforward.** Real Node, so Prisma's native engine, Node `crypto` and the provider SDKs work as-is |
| Code changes | Small HTTP entry (Node `http` or a tiny framework, which adds a new dep) wrapping `src/lib/**`, API-key auth only; build/start scripts; Render env vars |
| Compatibility | High (same runtime model as Vercel functions) |
| Free-tier limits **[DOC]** | **Spins down after 15 min idle, about 1 min cold start.** 750 instance-hours/month. Bandwidth overage suspends all free services without a payment method. May restart at any time. **"Do not use them for production applications."** |
| Reliability risk | **High for a live pitch.** The first request after idle takes about a minute, which is longer than many SDK timeouts. Keep-warm pings mitigate it but may conflict with "unusually high service-initiated traffic" rules [ASSUMPTION] |
| Security risk | Secrets duplicated; one more public endpoint to maintain |
| Complexity | **MEDIUM** (about 1 day) |
| Testing | Same as B minus the CPU profile; cold-start behavior; Neon connection lifecycle on a long-lived process (direct vs pooled URL) |
| Rollback | Clients switch the base URL back; DB unchanged |
| Nov 8 suitability | **Not recommended.** Trades an intermittent 403 for a guaranteed cold start |

### 4.4 Option D — Cloudflare proxy in front of Vercel
**Rejected** (§3).

---

## 5. Recommendation for November 8 (temporary demo reliability)

**Option A. Keep everything on Vercel Hobby and harden the demo, not the infrastructure.**

1. **Primary live path: the browser Playground** on `attentra-nine.vercel.app`. Browsers solve challenges automatically, and it shows routing, provider, tokens and cost.
2. **Developer path:** one OpenAI-SDK/Python call from the **demo venue's network**. Run one probe on arrival.
   - If it is challenged, switch to a **mobile hotspot**. A different IP is a different mitigation scope; the challenge observed here was IP-scoped and cleared within about an hour.
3. **Low volume:**
   - no test loops or load tests on demo day;
   - stop rehearsal scripts at least 1–2 hours before the pitch;
   - use one key for the demo.
4. **The client must recognize the challenge.** The Python demo client should check `X-Vercel-Mitigated` and print "temporarily challenged, retrying" with backoff, instead of crashing on HTML. This is client code, not repository code. `scripts/verify-production-api.ps1` already does this.
5. **Backup video** of a full API run (SDK call → History entry).
6. **Honest framing if asked:** "Production runs on Vercel's edge with automatic DDoS protection. For high-volume API customers we'll put the public API on a dedicated, challenge-free endpoint."

---

## 6. Longer-term Architecture (public developer API)

Keep the **dashboard, auth and Playground on Vercel**. Serve the **public API from a dedicated, challenge-free endpoint**. Both share one Neon database.

```text
Browser ──► attentra-nine.vercel.app (Next.js: dashboard, Playground, session auth, key management, cron)
                                   │
SDK/API clients ──► api.<domain> (API-key auth only: routing, execution, persistence)
                                   │
                         Neon PostgreSQL (single source of truth)
```

**Preferred order:**
1. **Vercel Pro** (System Bypass Rules, no code changes), when affordable.
2. **Cloudflare Workers Paid** (lifts the 10 ms CPU limit) or Workers Free if a measured spike shows comfortable CPU headroom.
3. A paid always-on Node host.

Render Free is not suitable for customer traffic by its own terms.

### Changes required for split domains (any option)
| Concern | Requirement |
|---|---|
| Shared auth | Not needed across domains. The API host uses **API keys only**. Dashboard sessions stay on Vercel. Keys, ownership and revocation already live in the shared DB |
| Routing config / model registry | Shared via DB. **Run the pricing/catalog cron in exactly one place** (Vercel); the API host only reads |
| Usage history | Written once per request by whichever host served it. **Never proxy one host through the other**, which would duplicate `Request` rows |
| Playground | Keep calling the Vercel route (session auth). No CORS needed |
| CORS | Not required for server-to-server SDK use. If browser access to the API host is ever needed, allow explicit origins only, never `*` with credentials |
| Internal auth | Not needed if hosts never call each other. If they do, use a signed service token, never a shared static header |
| Rate limiting | Must use shared state (DB counters on `Request(apiKeyId, createdAt)` or a KV/Redis). Per-instance memory limits are bypassable across hosts |
| Secrets | `DATABASE_URL` + 3 provider keys on a second platform → document owners, rotate on exposure, least-privilege DB role for the API host if possible |
| Logging | Keep the existing secret-free auth logs; add a `host` field to distinguish origins |
| Code structure | Extract a transport-agnostic handler (`handleChatCompletion(req: Request): Promise<Response>`) used by both the Next route and the external entry, to avoid divergence |

### Data migration / schema
**None required for any option.** All hosts use the same Neon database and the existing schema; no records move. Generator/client configuration for Workers (driver adapter) is a build-config change, not a schema or data change.

---

## 7. Final Answers

1. **Recommended solution for November 8:** **stay on Vercel Hobby with no infrastructure change.**
   - Use the browser Playground as the primary live path, plus one SDK call from a pre-probed network (hotspot fallback).
   - Keep traffic low on demo day, use a challenge-aware client, and have a backup video.
   - Move nothing before the pitch.
2. **Recommended longer-term architecture:** dashboard on Vercel plus a **dedicated API-key-only API endpoint** sharing the Neon database, behind one transport-agnostic handler.
   - Host it on Vercel Pro (system bypass) or Cloudflare Workers Paid.
   - Workers Free only if a measured CPU profile fits 10 ms.
   - Not Render Free for customers.
3. **Exact first implementation task, if changes are necessary:**
   - **For November 8: none for hosting.** The first code task remains the additive OpenAI-compatible response (`docs/MVP_READINESS_AUDIT_2026-11-08.md` §14).
   - **After the pitch:** extract `handleChatCompletion(request: Request, deps): Promise<Response>` from `src/app/api/v1/chat/completions/route.ts` into `src/lib/api/chat-completions-handler.ts`, accepting API-key auth only. The Next route stays a thin wrapper, with no behavior change, covered by the existing route tests.
   - This is the prerequisite for any second host and carries no deployment risk.

---

## Sources
- [Cloudflare Workers — Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Prisma — Deploy to Cloudflare Workers](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare)
- [Render — Deploy for Free](https://render.com/docs/free)
- [Vercel — WAF System Bypass Rules](https://vercel.com/docs/vercel-firewall/vercel-waf/system-bypass-rules)
- [Vercel — WAF Custom Rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules)
- [Vercel KB — Can I use a proxy on top of my Vercel deployment?](https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment)
- [Vercel KB — How to resolve IP blocking issues](https://vercel.com/kb/guide/how-to-resolve-ip-blocking-issues)

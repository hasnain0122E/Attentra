# Attentra — Demo Guide

Everything needed to run a reliable 3–5 minute judge demo.

---

## 1. Pre-Demo Checklist (night before)

- [ ] `npm run build` succeeds locally
- [ ] `npx prisma migrate status` → "Database schema is up to date"
- [ ] `.env` / `.env.local` contain real `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET`, `AUTH_SECRET`, provider keys, `CRON_SECRET`, `CONSUMER_BASELINE_MODEL`
- [ ] Dev server boots: `npm run dev` → http://localhost:3000
- [ ] Demo account exists and is signed in once (session cookie warm)
- [ ] Business workspace exists with a **real organization name** and at least one member
- [ ] Model registry seeded (`npm run db:seed`) and pricing synced (cron or `npm run pricing:sync`)
- [ ] `RUN_LIVE_PROVIDER_TESTS` is **not** exported in your shell for the demo session
- [ ] Close all tabs except the demo tab; browser zoom 100%; do-not-disturb on

## 2. Expected Account State

| Artifact | Expected state |
|---|---|
| Consumer account | Signed-in via Google; a few historical requests in `/dashboard/history` so charts are populated |
| Playground | Empty on load (fine — first run generates the story) |
| Personal API keys | 1–2 existing keys; have one **new** key created live |
| Business workspace | Named organization (not placeholder text); 1+ member; 1+ business API key; baseline model configured in Settings |
| Billing pages | Some data for the current month; coverage may be partial — that is honest and explained |

## 3. The 3–5 Minute Judge Demo Flow

### Act 0 — Landing (0:00–0:30)
1. Open `/`. Walk the value line: *"Teams overpay for AI because model choice is manual. Attentra routes every request to the cheapest capable model and bills 10% of verified savings."*
2. Click **Get started** → `/login` → **Continue with Google** (already authorized → instant).

### Act 1 — Consumer Dashboard (0:30–1:15)
3. Land on `/dashboard`. Point at overview cards: real request counts, real spend, cost intelligence from the database.
4. Open **Playground** (`/dashboard/playground`). Type the safe prompt (§4) and run.
5. Narrate while it resolves: routing decision card → selected model, task type, complexity, projected cost, routing score, candidate ranking (top 5), concise "Why this model" explanation.

### Act 2 — Transparency & History (1:15–2:00)
6. Open **History** (`/dashboard/history`) → the request that just ran. Show detail: prompt/response, actual cost vs baseline cost, latency, routing overview.
7. One sentence: *"Every request stores an audit trail — the full routing decision, candidate list, and both actual and baseline cost."*

### Act 3 — Developer API (2:00–3:00)
8. Open **API keys** (`/dashboard/api-keys`). Create a key → show the **one-time** raw key modal → copy it → Done. Say: *"Shown once; only a SHA-256 hash is stored."*
9. Paste a ready `curl` (below) into a terminal and run it live. The JSON response shows `routing.reason`, candidates, usage, `actualCost`.

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer PASTE_RAW_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Reply with exactly: routed."}]}'
```

### Act 4 — Business Workspace (3:00–4:00)
10. Navigate to `/business` (workspace switcher). Organization name is the real one everywhere.
11. **Requests**: business API-key traffic attributed to the organization.
12. **Billing** (`/business/billing`): walk the six cards — usage cost, verified savings, billable savings, **10% optimization fee**, customer net savings, total customer cost, plus coverage. Say: *"The fee applies to net savings for the period — negative-savings requests offset positive ones, and the fee is zero when we save nothing."*

### Act 5 — Close (4:00–4:30)
13. Back to consumer **Billing** (`/billing`): same model, personal scope.
14. Land the pitch: *"Transparent routing, verified savings, and a billing model aligned with the customer. That's Attentra."*

## 4. Safe Prompt Guidance

Good demo prompts (small, fast, general):
- `"Reply with exactly: routed."`
- `"Summarize in one sentence: <two-sentence paragraph>."`
- `"What is the capital of France? One word."`

Avoid: long essays, code generation with huge output, file analysis, anything needing tools/web, prompts with personal data.

## 5. If the Provider Call Fails (fallback talking points)

- **Timeout / provider error**: *"This is exactly what the fallback chain is for — the orchestrator retries on the next provider-diverse target. On this demo machine we'll retry once…"* (then retry).
- **Repeated failure**: open an existing history item instead and present the persisted decision + cost intelligence — the audit story works fully offline.
- **Slow (>20s)**: *"Provider latency varies by region; the request is still persisted and costed"* → move to Act 3.

The persistence-gate design means a failed provider call never leaves the system without an audit record — that is itself a talking point.

## 6. What NOT to Click

- **Delete/revoke** actions on anything needed later (keys, members).
- The email/password fields on `/login` — Google is the only live auth method.
- Footer **Privacy/Terms** (static text), pricing-buy buttons on the landing page.
- Any "invite member" flow that would email a stranger.

## 7. Secret Hygiene During the Demo

- Never open `.env`, `.env.local`, or the terminal history that shows provider keys.
- The raw API key shown in Act 3 is one-time: demo with it, then **revoke it** after the demo.
- If a key value appears on screen-share longer than intended, revoke it immediately — revocation is instant and part of the security story.
- Never paste real keys into the chat/curl examples beyond the demo key.

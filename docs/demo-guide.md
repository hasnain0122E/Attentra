# Attentra — Demo Guide (Investor Pitch, November 8, 2026)

Everything needed for a reliable 5-minute demo on **production**:
`https://attentra-nine.vercel.app`.

---

## 1. What to Say Attentra Does (accurate one-liner)

> "Attentra is an OpenAI-compatible gateway. For each request it reads the task and its complexity, ranks the eligible models from OpenAI, Anthropic and Google by estimated cost, latency estimates and capability under your chosen policy, falls back to another provider if an attempt fails, and records why it chose — plus the calculated cost."

**Do not claim:**
- "cheapest model every time" or "optimal" routing;
- measured latency or quality benchmarks (latency and capability are model-profile estimates);
- guaranteed savings (savings compare actual cost with a configured baseline model);
- live billing (pricing is a preview; no payments are collected);
- streaming (not supported).

---

## 2. Pre-Demo Checklist

**The night before:**
- [ ] The latest commit is deployed to Production. Note the deployment ID for Instant Rollback.
- [ ] One API key exists for the demo account. Store it on the laptop as an environment variable (`ATTENTRA_API_KEY`), never in a file you will show.
- [ ] Python with the official SDK is installed: `python -m pip install openai`. `demo.py` is ready (§5).
- [ ] **Backup recording**: a 2–3 minute screen recording of the full flow (Playground → History → SDK call → History) on the laptop desktop.
- [ ] Know which **baseline model** savings are compared against. Consumer: `CONSUMER_BASELINE_MODEL` in Vercel (e.g. `claude-sonnet-5`). Business: the model set in the workspace Settings.

**T−30 minutes, at the venue:**
- [ ] Open `https://attentra-nine.vercel.app` in the browser and sign in with Google (already signed in is best).
- [ ] **Network check, once:** run `demo.py`.
  - If it prints an answer, the network is fine.
  - If you see **HTTP 403 / "Vercel Security Checkpoint" / `X-Vercel-Mitigated: challenge`**, Vercel's automatic DDoS protection is challenging this network. **Switch the laptop to a mobile hotspot** and re-check. Do not retry in a loop.
- [ ] **Warm up:** send one Playground prompt (the first request after idle can take ~10–15 s).
- [ ] Open a tab on **History** with a request that shows **"Fallback used"** (e.g. 2026-11-06 20:51 UTC: routed Gemini 2.5 Flash → executed GPT-4o).
- [ ] Browser zoom 100%, notifications off, close unrelated tabs.

**Limits to respect during the demo:**
- Playground: **10 requests/minute per user**. Don't click "Run" repeatedly.
- API: **20 requests/minute per key**, `max_tokens` ≤ 4,096 (default 256).
- `stream=True` is **not supported** (returns a clear 400).

---

## 3. The 5-Minute Pitch Sequence

| Time | Segment | Do | Say |
|---|---|---|---|
| 0:00–0:40 | **What & why** | Landing hero, then scroll to "Different requests need different models" | "Teams hard-code one model. A ticket classifier and a production bug hunt pay the same price, and a provider outage takes the app down. Attentra decides per request, across providers." |
| 0:40–1:50 | **Live routing** | Playground: a simple prompt (§4) | Point at the selected model, the reason, the candidate ranking, **projected vs actual cost**, and savings **vs the baseline model (name it)** |
| 1:50–2:30 | **Different task, different model** | Playground: a rehearsed reasoning prompt (§4) | "Same API, different decision. Here's why it chose a stronger model." |
| 2:30–3:15 | **Reliability** | History → the **"Fallback used"** request | "When Google couldn't serve this model, Attentra re-routed to OpenAI automatically. The user got an answer, and the cost was recorded on the model that actually ran." |
| 3:15–4:15 | **Developer experience** | Terminal: `python demo.py` → then refresh History | "This is the official OpenAI SDK — two settings changed. `r.model` shows which model answered; the request is in History under the API key." |
| 4:15–5:00 | **Trust & business model** | (talk) | "Keys are shown once and stored hashed; per-key rate limits and token caps. Pricing preview: usage plus 10% of savings measured against your baseline — not billed during the MVP." |

---

## 4. Safe Prompts

Simple (routes to a low-cost model):
- `Classify this support ticket as billing, bug or feature request: "I was charged twice this month."`
- `Summarize in one sentence: <two-sentence paragraph>`

Harder (should route to a stronger model; **rehearse first** to confirm the chosen model executes):
- `Explain step by step why this Python function can deadlock when two threads call transfer() at the same time, and how to fix it.`

Avoid: long essays, huge code outputs, personal data, anything needing tools or the web.

---

## 5. Developer Demo Script (`demo.py`)

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://attentra-nine.vercel.app/api/v1",
    api_key=os.environ["ATTENTRA_API_KEY"],
    max_retries=1,
)

r = client.chat.completions.create(
    model="auto",
    max_tokens=300,
    messages=[{"role": "user", "content": "In two sentences: what does an AI gateway do?"}],
)
print("model:", r.model)
print("tokens:", r.usage.total_tokens if r.usage else "n/a")
print(r.choices[0].message.content)
```

Set the key without showing it:
```powershell
$env:ATTENTRA_API_KEY = Read-Host "Attentra API key"
python demo.py
```

---

## 6. If Something Fails

| Symptom | Cause | Response |
|---|---|---|
| 403 HTML / "Security Checkpoint" | Vercel DDoS mitigation on this network | Switch to the hotspot. Use the Playground (browsers pass the check). Play the backup recording |
| `RateLimitError` / 429 | 20/min per key or 10/min Playground | Wait for `Retry-After`. Avoid repeated clicks |
| `BadRequestError` with `param: "stream"` | `stream=True` used | Streaming is not supported yet. Remove it |
| Slow first request | Cold start | Expected after idle; this is why we warm up |
| Provider error after fallback | All attempts failed | Open the "Fallback used" History record instead and continue |

---

## 7. What NOT to Do

- Don't revoke or delete keys or members needed later.
- Don't run loops or load tests against production (rate limits, Vercel DDoS mitigation).
- Don't use `stream=True`.
- Don't show `.env` files, terminal history with keys, or the Vercel dashboard environment variables.
- If a key appears on screen-share, revoke it right after the demo.

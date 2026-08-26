# Attentra — Final Architecture

**Version:** 2.0  
**Status:** Approved for Implementation  
**Scope:** Hackathon MVP + scalable multi-provider architecture  
**Primary Currency:** PKR

---

## 1. Product Architecture Principle

Attentra is a **provider-agnostic LLM routing middleware**, not an OpenAI/Anthropic/Google-specific application.

The architecture separates:

1. Provider adapters
2. Model registry
3. Routing engine
4. Cost intelligence
5. Consumer dashboard
6. Business dashboard

The routing engine must never contain provider-specific SDK logic.

### Hackathon provider scope

Initial implementation:

- OpenAI
- Anthropic
- Google
- DeepSeek
- Selected free/open models where reliable API access is practical

The architecture must support future providers such as:

- xAI / Grok
- Meta / Llama
- Mistral
- Qwen / Alibaba
- Cohere
- Groq
- Together AI
- OpenRouter
- Other hosted or self-hosted models

Adding a provider should require an adapter and model metadata, **not a rewrite of the routing engine**.

---

## 2. Final Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│                                                             │
│ Marketing Site   Consumer Dashboard   Business Dashboard   │
│                                                             │
│ Next.js App Router · React 18 · Tailwind CSS 3.4           │
│ motion/react · Phosphor Icons · Lenis (marketing only)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / Server
┌──────────────────────────┴──────────────────────────────────┐
│                       SERVER LAYER                           │
│                                                             │
│ Auth.js          Next.js Server       Next.js Middleware    │
│ Google OAuth     Actions + API        Session / API auth    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    SERVICE LAYER                        │ │
│ │                                                         │ │
│ │ Routing Engine    Provider Abstraction    Cost Service │ │
│ │ ├─ Validation     ├─ OpenAI              ├─ Pricing    │ │
│ │ ├─ Classification ├─ Anthropic           ├─ Baseline   │ │
│ │ ├─ Complexity     ├─ Google              ├─ Savings    │ │
│ │ ├─ Filtering      ├─ DeepSeek            └─ Aggregates │ │
│ │ ├─ Scoring        └─ Extensible registry              │ │
│ │ ├─ Selection                                             │ │
│ │ └─ Fallback                                               │ │
│ └──────────────────────────┬──────────────────────────────┘ │
│                            │                                │
│ ┌──────────────────────────┴──────────────────────────────┐ │
│ │                  DATA ACCESS LAYER                       │ │
│ │                         Prisma ORM                       │ │
│ └──────────────────────────┬──────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                     DATABASE LAYER                           │
│                     PostgreSQL                              │
│                                                             │
│ User · Business · Membership · ApiKey                       │
│ Provider · Model · PricingSnapshot                          │
│ Request · RoutingDecision                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

```text
src/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (consumer)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   └── history/page.tsx
│   ├── (business)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── requests/page.tsx
│   │   ├── routing/page.tsx
│   │   ├── cost/page.tsx
│   │   ├── api-keys/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── v1/chat/completions/route.ts
│   │   └── internal/...
│   ├── globals.css
│   ├── layout.tsx
│   └── not-found.tsx
├── components/
│   ├── auth/
│   ├── layout/
│   ├── sections/
│   ├── consumer/
│   ├── business/
│   └── ui/
├── lib/
│   ├── utils.ts
│   ├── auth.ts
│   ├── prisma.ts
│   ├── routing/
│   ├── providers/
│   ├── cost/
│   └── api-keys/
├── services/
│   ├── request-service.ts
│   ├── business-api-service.ts
│   └── analytics-service.ts
├── styles/
│   └── design-tokens.css
└── types/
    ├── api.ts
    └── domain.ts
```

### Files to remove

- `src/components/sections/InteractiveRouter.tsx`
- `src/components/ui/RoutingLedger.tsx`

### Dependencies to remove

- `framer-motion`
- `class-variance-authority`
- `lucide-react`

Use `motion/react` and `@phosphor-icons/react`.

### cloudflared

Remove unless Cloudflare Tunnel is actively required for the hackathon.

---

## 4. Authentication

**Auth.js v5 + Google OAuth**

All authenticated users receive consumer access. Business access requires membership.

```text
Google OAuth
    ↓
Auth.js session
    ↓
User
    ├── Consumer access
    └── Business access via Membership
```

Use JWT sessions containing:

- userId
- email
- name
- avatarUrl

Protected routes use middleware plus server-side `auth()` checks.

```text
/dashboard/**       → authenticated user
/history/**         → authenticated user
/business/**        → authenticated + business membership
/api/v1/**          → valid business API key
/api/auth/**        → Auth.js passthrough
```

---

## 5. Database

**PostgreSQL + Prisma + Prisma Migrate**

Recommended database provider: **Neon**

Core entities:

```text
User
Business
Membership
ApiKey

Provider
Model
PricingSnapshot

Request
RoutingDecision
```

The provider/model registry is database-driven so models can be added without modifying the routing algorithm.

---

## 6. Provider Abstraction

### Core interface

```ts
export interface NormalizedAIRequest {
  messages: Message[];
  taskType?: TaskType;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export interface NormalizedAIResponse {
  id: string;
  content: string;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: string;
  raw?: unknown;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  readonly id: string;
  listModels(): ModelDefinition[];
  generate(
    request: NormalizedAIRequest,
    modelId: string
  ): Promise<NormalizedAIResponse>;
}

export interface ModelDefinition {
  id: string;
  providerId: string;
  modelIdentifier: string;
  displayName: string;
  capabilities: TaskType[];
  inputPricePer1k: number;
  outputPricePer1k: number;
  expectedLatencyMs?: number;
  active: boolean;
}
```

### Adapter structure

```text
src/lib/providers/
├── types.ts
├── index.ts
├── registry.ts
├── openai.ts
├── anthropic.ts
├── google.ts
├── deepseek.ts
└── generic.ts
```

Every adapter:

1. Implements `AIProvider`
2. Converts normalized requests to provider format
3. Normalizes provider responses
4. Normalizes token usage
5. Normalizes provider errors

The routing engine never imports provider SDKs directly.

---

## 7. Model Registry

The model registry stores:

- provider
- model identifier
- display name
- capabilities
- model tier
- input pricing
- output pricing
- expected latency
- active status
- optional context-window metadata
- optional reasoning/coding/vision metadata

Models may be classified as:

```text
LIGHT
MID
HEAVY
```

Example metadata:

```text
Gemini Flash → LIGHT
Claude Sonnet → MID
GPT-4.1 → HEAVY
DeepSeek R1 → HEAVY
```

These are routing categories, not provider restrictions.

### Free models

Free/zero-cost models are valid registry entries and can participate in routing.

**Free does not automatically mean selected.**

Capability, task fit, latency and reliability still determine selection.

---

## 8. Routing Engine

### Pipeline

```text
NormalizedAIRequest
        ↓
1. Validation
        ↓
2. Task Classification
        ↓
3. Complexity Estimation
        ↓
4. Candidate Filtering
        ↓
5. Candidate Scoring
        ↓
6. Model Selection
        ↓
7. Provider Execution
        ↓
8. Fallback
        ↓
9. Cost Calculation
        ↓
10. Persistence
        ↓
Response
```

### Task types

```ts
export type TaskType =
  | "chat"
  | "summarization"
  | "classification"
  | "extraction"
  | "coding"
  | "reasoning"
  | "creative_writing"
  | "translation";
```

MVP classification uses deterministic keyword/structural heuristics.

### Complexity

```text
LOW
MEDIUM
HIGH
```

Factors:

| Factor | Rule |
|---|---|
| Input tokens | <500 LOW; 500–2000 MEDIUM; >2000 HIGH |
| Reasoning/coding | +1 level |
| Structured output | +1 level |
| Max tokens >1000 | +1 level |

Clamp to LOW/MEDIUM/HIGH.

### Candidate filtering

Remove models when:

- inactive
- provider inactive
- required capability unavailable
- required modality unavailable
- provider configuration unavailable

### Scoring

```text
score =
    capabilityFit * 0.40
  + taskFit       * 0.30
  + costScore     * 0.20
  + latencyScore  * 0.10
```

Attentra is **not** a cheapest-model router.

The highest-scoring model is selected based on capability, task suitability, cost and latency.

### Fallback

On `PROVIDER_ERROR` or `TIMEOUT_ERROR`:

1. Log failure
2. Select next-highest candidate
3. Retry once
4. Return routing error if fallback fails

Do not fallback on authentication or validation errors.

---

## 9. Cost Intelligence — PKR

Because this is a **Pakistan-based hackathon**, the Attentra dashboard uses **PKR as the primary user-facing currency**.

Examples:

```text
Attentra Cost:       ₨ 1,240
Baseline Cost:       ₨ 2,850
Savings:             ₨ 1,610
Savings Percentage:  56.49%
```

### Pricing architecture

Provider pricing may originate in USD or another provider currency.

Use:

```text
Provider pricing
      ↓
Canonical pricing representation
      ↓
Exchange-rate conversion
      ↓
PKR
      ↓
Dashboard / analytics
```

The exchange rate must be centralized.

```env
USD_TO_PKR_RATE=...
```

Do not scatter hardcoded conversion values throughout the codebase.

### Cost calculation

```text
inputCost =
(inputTokens / 1000) * model.inputPricePer1k

outputCost =
(outputTokens / 1000) * model.outputPricePer1k

actualCost =
inputCost + outputCost
```

Convert to PKR for dashboard/business presentation.

### Baseline

Each business has a configurable:

```text
Business.baselineModelId
```

If no baseline exists:

- actual cost is shown
- baseline is N/A
- savings is N/A
- user is prompted to configure a baseline

### Savings

```text
savings = baselineCost - actualCost

savingsPercentage =
(baselineCost > 0)
  ? (savings / baselineCost) * 100
  : 0
```

Negative savings must be displayed honestly when a more capable model costs more.

---

## 10. Pricing Snapshots

`PricingSnapshot` preserves historical provider pricing.

When pricing changes:

1. Create new snapshot
2. Set `effectiveFrom`
3. Close previous snapshot with `effectiveTo`

Request-level cost remains persisted so historical analytics remain accurate.

---

## 11. API Architecture

### Consumer API

Consumer requests use Next.js Server Actions:

```text
Consumer UI
   ↓
submitConsumerRequest()
   ↓
auth()
   ↓
Routing engine
   ↓
Provider
   ↓
Cost
   ↓
Persistence
   ↓
Response
```

### Business API

```http
POST /api/v1/chat/completions
Authorization: Bearer att_live_XXXXXXXX
Content-Type: application/json
```

The API should remain OpenAI-compatible at the request/response boundary where practical.

Example response:

```json
{
  "id": "req_cuid123",
  "object": "chat.completion",
  "model": "gemini-2.5-flash",
  "provider": "google",
  "usage": {
    "input_tokens": 250,
    "output_tokens": 120
  },
  "routing": {
    "task": "summarization",
    "complexity": "low",
    "reason": "Selected Gemini 2.5 Flash for strong summarization capability at low cost."
  },
  "cost": {
    "currency": "PKR",
    "actual": 0.86,
    "baseline": 3.31,
    "savings": 2.45,
    "savings_percentage": 74.17
  }
}
```

Values are illustrative and must be calculated from the active model registry and exchange rate.

---

## 12. Consumer Dashboard

```text
/dashboard

AI Workspace
├── Prompt input
├── Submit
├── Loading
├── AI response
├── Selected provider
├── Selected model
├── Task classification
├── Complexity
├── Routing explanation
├── Cost in PKR
└── Recent requests
```

`/history` shows previous requests with model, provider, cost, timestamp and routing information.

---

## 13. Business Dashboard

```text
/business/dashboard
/business/requests
/business/routing
/business/cost
/business/api-keys
/business/settings
```

### Overview

- Total requests
- Successful requests
- Attentra cost in PKR
- Baseline cost in PKR
- Savings in PKR
- Savings percentage
- Model distribution
- Provider distribution

### Requests

Sortable/filterable request analytics.

### Routing

Show:

- selected model
- provider
- task
- complexity
- candidate scores
- routing reason

### Cost

Show:

- Attentra vs baseline
- savings over time
- model cost distribution
- provider cost distribution

### API keys

Support:

- create
- show once
- copy
- list prefix
- last used
- expiration
- revoke

### Settings

Support:

- business name
- baseline model
- future team settings

---

## 14. Business Data Isolation

Every business query must be scoped by authenticated membership.

```text
Authenticated User
       ↓
Membership check
       ↓
businessId
       ↓
Service query
       ↓
WHERE businessId = authenticated businessId
```

Never trust a client-supplied `businessId`.

---

## 15. API Key Security

Generation:

```text
crypto.randomBytes(32)
```

Format:

```text
att_live_{prefix8}_{random24}
```

Storage:

```text
SHA-256 hash only
```

Display:

```text
Full key shown once
```

Logging:

```text
Prefix only
```

Never log complete API keys.

---

## 16. Security

Three protection layers:

```text
Layer 1 — Next.js Middleware
↓
Fast route protection

Layer 2 — Server-side auth()
↓
Session + membership validation

Layer 3 — Service layer
↓
Ownership/data isolation
```

Use **Zod** for request validation.

Provider API keys and database credentials must never use `NEXT_PUBLIC_`.

---

## 17. Environment Variables

```bash
# Database
DATABASE_URL=

# Auth.js
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
DEEPSEEK_API_KEY=

# Currency
USD_TO_PKR_RATE=

# Consumer
CONSUMER_BASELINE_MODEL_ID=

# Optional
ENABLE_FALLBACK_ROUTING=true
LOG_PROMPTS=false
API_RATE_LIMIT_PER_MINUTE=60
CONSUMER_RATE_LIMIT_PER_MINUTE=10
```

Future provider credentials can be added independently.

---

## 18. Deployment

| Layer | Provider |
|---|---|
| Application | Vercel |
| Database | Neon |
| Source control | GitHub |

Build:

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
```

---

## 19. Testing

Use:

- Vitest
- Testing Library
- jest-dom

Priority:

1. Routing classifier
2. Complexity estimator
3. Scoring
4. Cost calculation
5. Provider adapters
6. API key generation
7. API endpoint
8. Authentication boundaries
9. Consumer dashboard
10. Business dashboard

Coverage targets:

| Area | Minimum |
|---|---:|
| Routing engine | 90% |
| Cost calculation | 95% |
| Provider adapters | 80% |
| API endpoint | 80% |
| Auth boundaries | 70% |

---

## 20. Hackathon Implementation Sequence

Qoder must work **phase-by-phase**, not from one giant build prompt.

```text
STEP 1 — Architecture Freeze
        ↓
STEP 2 — Clean Existing Repository
        ↓
STEP 3 — Authentication + Database
        ↓
STEP 4 — Provider Abstraction
        ↓
STEP 5 — Model Registry + Pricing
        ↓
STEP 6 — Routing Engine
        ↓
STEP 7 — Attentra API
        ↓
STEP 8 — Consumer Dashboard
        ↓
STEP 9 — Business Dashboard
        ↓
STEP 10 — Cost & Savings Intelligence
        ↓
STEP 11 — Real End-to-End Testing
        ↓
STEP 12 — Hackathon Demo / Presentation
```

Each phase must be implemented, tested and verified before the next phase begins.

---

## 21. Final Provider Scope

### Required hackathon demonstration

**Primary providers:**

- OpenAI
- Anthropic
- Google

**Additional provider:**

- DeepSeek

**Additional free/open models:**

- Include where reliable API access and pricing metadata are available.

The purpose is to demonstrate:

```text
ONE ATTENTRA API
       ↓
MANY PROVIDERS
       ↓
MANY MODELS
       ↓
AUTOMATIC ROUTING
       ↓
COST INTELLIGENCE
       ↓
PKR SAVINGS
```

The top three providers are the primary demo set, but they are **not an architectural limitation**.

---

## 22. Final Architectural Decisions

| Decision | Final |
|---|---|
| Architecture | Provider-agnostic LLM middleware |
| Primary providers | OpenAI + Anthropic + Google |
| Additional MVP provider | DeepSeek |
| Free/open models | Supported where practical |
| Future providers | Extensible |
| Routing | Best-fit weighted scoring |
| Cheapest model only | No |
| Provider SDK access | Adapter layer only |
| Model registry | Database-driven |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Auth.js v5 |
| OAuth | Google |
| Deployment | Vercel |
| Database host | Neon |
| Business API | `/api/v1/chat/completions` |
| Consumer API | Server Actions |
| API key | SHA-256 hash |
| Baseline | Business-configured |
| Provider pricing | Canonical provider pricing |
| Dashboard currency | **PKR** |
| Currency conversion | Centralized `USD_TO_PKR_RATE` |
| Historical pricing | PricingSnapshot |
| Fallback | Next highest candidate, one retry |
| Validation | Zod |
| Testing | Vitest + Testing Library |
| Motion | motion/react |
| Icons | Phosphor |
| Marketing smooth scroll | Lenis |
| Provider-specific routing logic | **Forbidden** |

---

## 23. Final Product Definition

**Attentra is an intelligent, provider-agnostic LLM routing middleware that receives one AI request, evaluates available models across multiple providers, selects the best-fit model based on task capability, complexity, cost and latency, executes the request with fallback support, and reports the resulting cost and savings in PKR.**

The hackathon implementation proves the architecture using OpenAI, Anthropic, Google, DeepSeek and selected free/open models.

The architecture is intentionally designed so that adding future providers or models does **not** require rewriting the core routing engine.

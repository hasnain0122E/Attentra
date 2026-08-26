# Attentra — Technical Specification

**Version:** 1.0  
**Status:** Hackathon Master Specification

---

## 1. Technical Objective

Build Attentra as a full-stack web application and AI middleware service while preserving the existing Next.js marketing website.

The implementation must support:

1. Consumer authentication and AI workspace.
2. Business authentication and dashboard.
3. Unified Attentra API.
4. Multi-provider model abstraction.
5. Request analysis and routing.
6. Provider execution.
7. Usage/cost calculation.
8. Request persistence.
9. Business analytics.

---

## 2. Existing Stack

The repository currently uses:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Phosphor Icons
- npm/package-lock

The exact current folder architecture must be preserved where practical.

---

## 3. Architecture

```text
Next.js Application
│
├── Marketing UI
├── Consumer UI
├── Business UI
├── API Routes
│
├── Authentication
├── Routing Service
├── Provider Abstraction
├── Cost Service
├── Analytics Service
└── Data Access Layer
        │
        └── PostgreSQL-compatible database
```

The exact authentication/database provider may be selected during implementation based on available hackathon credentials and deployment constraints. Do not add infrastructure without documenting the decision.

---

## 4. Provider Abstraction

Use a common provider interface.

Conceptual interface:

```ts
interface AIProvider {
  id: string;
  listModels(): ModelDefinition[];
  generate(request: NormalizedAIRequest): Promise<NormalizedAIResponse>;
}
```

Each provider adapter implements this interface.

Initial adapters:

```text
OpenAIProvider
AnthropicProvider
GoogleProvider
```

The routing engine must not call provider SDKs directly.

---

## 5. Normalized Request

Conceptual structure:

```ts
type NormalizedAIRequest = {
  messages: Message[];
  taskType?: TaskType;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
};
```

Provider-specific request formatting happens inside adapters.

---

## 6. Routing Engine

Pipeline:

```text
Request
 ↓
Validation
 ↓
Task Analysis
 ↓
Complexity Estimation
 ↓
Candidate Filtering
 ↓
Candidate Scoring
 ↓
Model Selection
 ↓
Provider Execution
 ↓
Usage/Cost Calculation
 ↓
Persistence
 ↓
Response
```

The router should be deterministic where possible so benchmark results are reproducible.

---

## 7. Routing Score

Initial conceptual score:

```text
routingScore =
    capabilityFit * capabilityWeight
  + costScore * costWeight
  + latencyScore * latencyWeight
  + taskFit * taskWeight
```

Weights should be configurable rather than hardcoded throughout the codebase.

The first MVP does not require machine-learning-based routing.

A rules/scoring engine is acceptable if it is measurable, explainable, and extensible.

---

## 8. Task Classification

Initial task categories can include:

- general chat
- summarization
- classification
- extraction
- coding
- reasoning
- creative writing
- translation

The initial implementation should keep the taxonomy small and useful.

---

## 9. Complexity

Use a simple, explainable complexity score initially.

Potential factors:

- input length
- requested output size
- task category
- reasoning requirement
- structured-output requirement
- context size

Do not claim semantic complexity that the system cannot actually measure.

---

## 10. Model Registry

Maintain model metadata separately from routing logic.

Example:

```ts
type ModelDefinition = {
  id: string;
  providerId: string;
  displayName: string;
  capabilities: string[];
  inputCostPerToken: number;
  outputCostPerToken: number;
  expectedLatencyMs?: number;
  active: boolean;
};
```

Pricing must be configurable.

---

## 11. Cost Calculation

For a request:

```text
inputCost = inputTokens * inputPricePerToken
outputCost = outputTokens * outputPricePerToken

actualCost = inputCost + outputCost
```

Alternative comparison:

```text
baselineCost =
inputTokens * baselineInputPrice
+
outputTokens * baselineOutputPrice
```

Savings:

```text
savings = baselineCost - actualCost
```

Savings percentage:

```text
savingsPercentage = savings / baselineCost * 100
```

Handle zero/negative baseline cases safely.

---

## 12. API

Initial business endpoint concept:

```http
POST /api/v1/chat/completions
```

The API should:

1. Authenticate API key.
2. Validate payload.
3. Normalize request.
4. Route request.
5. Execute provider.
6. Calculate usage/cost.
7. Persist request.
8. Return normalized response.

Example response metadata:

```json
{
  "id": "request-id",
  "model": "selected-model",
  "provider": "provider",
  "usage": {
    "inputTokens": 100,
    "outputTokens": 80
  },
  "routing": {
    "task": "summarization",
    "complexity": "low",
    "reason": "..."
  }
}
```

---

## 13. API Keys

Business API keys must:

- be generated securely;
- be stored hashed where practical;
- only be shown in full at creation;
- be revocable;
- be associated with a business;
- never be logged in plaintext.

---

## 14. Database

Use a PostgreSQL-compatible relational database.

The exact ORM/provider is an implementation decision and must be documented before setup.

Recommended logical entities:

```text
User
Business
Membership (if needed)
APIKey
Model
Provider
Request
RoutingDecision
Usage
PricingSnapshot
```

---

## 15. Authentication

Authentication must provide:

- Google sign-in for consumer users;
- authenticated business dashboard;
- protected application routes;
- server-side session validation.

The current repository contains authentication UI but not the actual authentication implementation.

---

## 16. Authorization

Minimum roles:

```text
consumer
business
admin/internal
```

A business user can only access its own business data.

---

## 17. Analytics

Analytics should be derived from persisted request data.

Required metrics:

- requests
- successful requests
- failed requests
- model distribution
- provider distribution
- actual spend
- baseline spend
- savings
- average latency

---

## 18. Error Handling

Provider failures must not crash the application.

Use normalized internal errors:

```text
AUTHENTICATION_ERROR
VALIDATION_ERROR
ROUTING_ERROR
PROVIDER_ERROR
RATE_LIMIT_ERROR
TIMEOUT_ERROR
INTERNAL_ERROR
```

Fallback routing may be attempted where safe and configured.

---

## 19. Observability

For each request, record:

- request ID
- timestamp
- provider/model
- status
- latency
- usage
- cost
- routing decision

Do not log secrets or full sensitive prompts unnecessarily.

---

## 20. Environment Variables

All secrets must be environment variables.

Examples:

```text
DATABASE_URL
AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_AI_API_KEY
```

Exact names can be adjusted to the chosen libraries.

Never commit `.env`.

---

## 21. Existing Repository Cleanup

Known cleanup candidates from the audit:

- image filename case mismatch;
- font filename mismatch;
- duplicate motion packages;
- unrelated/orphaned `InteractiveRouter.tsx`;
- unused/broken `RoutingLedger.tsx`.

These should be handled carefully and only after verifying references.

---

## 22. Testing

Minimum:

- routing unit tests;
- cost calculation tests;
- API validation tests;
- provider adapter tests with mocks;
- authentication/protected-route tests;
- critical dashboard integration tests.

Provider API calls should be mocked in unit tests.

---

## 23. Deployment

The deployment target should support:

- Next.js;
- server-side API execution;
- environment variables;
- PostgreSQL;
- HTTPS.

The deployment provider must be selected based on hackathon access and reliability.

---

## 24. Performance

Do not optimize prematurely.

Measure:

- routing overhead;
- provider latency;
- total response latency;
- database latency.

The routing layer should introduce minimal overhead relative to provider response time.

---

## 25. Security Baseline

- No secrets in source.
- Validate API keys.
- Validate request body.
- Protect dashboard routes.
- Enforce business ownership.
- Avoid prompt/API-key leakage in logs.
- Apply basic rate limiting where feasible.

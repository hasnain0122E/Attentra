# Attentra — Data Schema

## 1. Purpose

This document defines the logical data model.

The exact ORM syntax depends on the selected implementation stack, but the entities and relationships should remain conceptually stable.

---

## 2. User

```text
User
- id
- name
- email
- avatarUrl
- role
- createdAt
- updatedAt
```

Roles:

```text
consumer
business
admin
```

---

## 3. Business

```text
Business
- id
- name
- ownerUserId
- createdAt
- updatedAt
```

---

## 4. API Key

```text
ApiKey
- id
- businessId
- name
- keyHash
- keyPrefix
- lastUsedAt
- expiresAt
- revokedAt
- createdAt
```

Never store the raw API key when avoidable.

---

## 5. Provider

```text
Provider
- id
- name
- status
- createdAt
```

Examples:

```text
openai
anthropic
google
```

---

## 6. Model

```text
Model
- id
- providerId
- modelIdentifier
- displayName
- capabilities
- inputPricePerToken
- outputPricePerToken
- expectedLatencyMs
- active
- createdAt
- updatedAt
```

---

## 7. Pricing Snapshot

Pricing must be versionable so historical request costs do not change simply because a provider later changes pricing.

```text
PricingSnapshot
- id
- modelId
- inputPricePerToken
- outputPricePerToken
- effectiveFrom
- effectiveTo
- createdAt
```

---

## 8. Request

```text
Request
- id
- userId
- businessId
- apiKeyId
- taskType
- complexity
- status
- selectedProviderId
- selectedModelId
- inputTokens
- outputTokens
- latencyMs
- actualCost
- baselineCost
- savings
- savingsPercentage
- createdAt
```

---

## 9. Routing Decision

```text
RoutingDecision
- id
- requestId
- taskType
- complexity
- candidateModels
- selectedModelId
- score
- reason
- createdAt
```

Candidate models may be stored as structured JSON if the chosen database design supports it.

---

## 10. Provider Response Metadata

Provider-specific raw response data should not automatically be stored in full.

Store normalized metadata needed for:

- usage
- latency
- status
- model
- provider
- error classification

---

## 11. Relationships

```text
User
 ├── Requests
 └── Businesses (ownership/membership if supported)

Business
 ├── API Keys
 └── Requests

Provider
 └── Models

Model
 └── Pricing Snapshots

Request
 └── Routing Decision
```

---

## 12. Data Ownership

A business may only access:

- its own API keys;
- its own requests;
- its own analytics;
- its own cost/savings information.

A consumer may only access their own user data and requests.

---

## 13. Sensitive Data

Do not persist unnecessarily:

- API secrets;
- passwords if delegated to an auth provider;
- full private prompts where not required;
- provider credentials.

---

## 14. Auditability

Every important request should have a unique request ID.

This allows:

```text
Dashboard
   ↓
Request
   ↓
Routing Decision
   ↓
Provider/Model
   ↓
Cost
```

to be traced.

# Attentra — Product Requirements Document

**Version:** 1.0  
**Status:** Hackathon Master Specification  
**Project:** Attentra  
**Hackathon:** Alibaba Cloud AI Hackathon Pakistan 2026  
**Current Grade:** Grade 1

---

## 1. Product Overview

Attentra is an intelligent AI model routing infrastructure platform.

Instead of forcing an application to send every AI request to one expensive or fixed model, Attentra acts as an intelligent middleware layer between the application and multiple AI providers.

A business integrates with Attentra once. Attentra analyzes each request and selects an appropriate model based on the request's task, complexity, capability requirements, cost, and latency considerations.

The core value proposition is:

> **One AI API. Multiple models. Intelligent routing. Measurable cost intelligence.**

Attentra has two product experiences:

1. **Consumer product** — a free AI workspace for individual users.
2. **Business product** — a paid/API-oriented platform for businesses that use AI inside their own products.

The hackathon implementation should prioritize a credible, working end-to-end demonstration of the core routing infrastructure over production-scale billing or enterprise functionality.

---

## 2. Problem Statement

Modern applications increasingly depend on generative AI. A team may integrate GPT, Claude, Gemini, or another model directly into its product and then send most or all requests to that model.

This creates several problems:

- A single model may be unnecessarily expensive for simple tasks.
- Different tasks have different capability requirements.
- Developers have to manage multiple provider integrations themselves.
- Provider switching increases engineering complexity.
- Teams often lack request-level visibility into model selection and AI spending.
- Businesses may not know how much they could have spent using alternative models.
- AI costs can increase as application usage grows.

Attentra addresses this by introducing an intelligent routing layer.

---

## 3. Product Vision

Attentra should become the decision layer between an application and the model providers it uses.

Conceptually:

```text
Business Application
        |
        v
   Attentra API
        |
        v
  Request Analysis
        |
        v
 Routing Engine
        |
        +---- OpenAI
        +---- Anthropic
        +---- Google
        |
        v
    Response
        |
        v
 Business Application
```

The application does not need to hard-code its AI workload to one provider.

---

## 4. Product Goals

### Primary Goals

1. Demonstrate real AI request routing.
2. Support multiple AI model/provider integrations.
3. Provide a unified Attentra API abstraction.
4. Analyze requests before selecting a model.
5. Make routing decisions using explicit, explainable criteria.
6. Record request-level usage and routing information.
7. Calculate actual request cost using provider/model pricing data.
8. Estimate comparable alternative-model cost.
9. Demonstrate potential savings.
10. Provide a consumer dashboard for free AI usage.
11. Provide a separate business dashboard for API customers.
12. Produce measurable benchmark/evaluation results for the hackathon.

### Secondary Goals

- Provide API key management.
- Provide request history.
- Provide model usage analytics.
- Provide routing decision visibility.
- Provide fallback/error handling.
- Provide a polished demo experience.

### Explicit Non-Goals for the Hackathon

The following are not required for the first working version:

- Full production billing infrastructure.
- Real payment processing.
- Enterprise-grade organization management.
- Complex subscription lifecycle management.
- Complete provider coverage.
- Production-scale distributed infrastructure.
- Perfect autonomous model selection for every possible task.

The system should instead demonstrate a technically credible and measurable MVP.

---

## 5. Target Users

### 5.1 Consumer User

An individual who wants to use AI without choosing between providers/models manually.

They should be able to:

- Sign in with Google.
- Open a free AI workspace.
- Submit an AI task.
- Let Attentra select an appropriate model.
- Receive the model response.
- View basic request/usage information.

The consumer experience is free for the hackathon concept.

---

### 5.2 Business User

A developer, startup, product team, or business owner whose product uses AI APIs.

Their problem is not simply "I need a chatbot."

Their problem is:

> "I need reliable AI capability in my product without unnecessarily paying premium-model prices for every request."

They should be able to:

- Create/access a business account.
- Generate an Attentra API key.
- Integrate Attentra into their application.
- Send AI requests through the Attentra API.
- Allow Attentra to select the model.
- See which model handled each request.
- See request cost.
- See estimated alternative cost.
- See estimated savings.
- Review model/request analytics.

---

## 6. Core Product Principles

### 6.1 Routing First

The routing engine is the core technical differentiator.

### 6.2 Provider Agnostic

The core application should not be tightly coupled to one AI provider.

### 6.3 Explainable Decisions

The system should be able to show why a model was selected.

Example:

```text
Task: Summarization
Complexity: Low
Required capability: General language
Cost sensitivity: High
Selected model: Gemini Flash
Reason: Sufficient capability with lower estimated cost
```

### 6.4 Measurable Economics

Cost and savings must be calculated from actual request/model pricing data rather than invented values.

### 6.5 Preserve Existing Product Design

The existing Attentra marketing website is a substantial part of the current project and should be preserved unless an explicit redesign is requested.

---

## 7. Consumer Product Requirements

### 7.1 Authentication

The consumer should be able to authenticate using Google Sign-In.

The existing repository contains authentication UI, but the audit established that the authentication implementation is not yet wired to a real OAuth/session provider.

Therefore:

**Authentication UI exists; authentication implementation is a pending requirement.**

### 7.2 Free AI Workspace

The consumer dashboard should provide:

- Task/prompt input.
- Request submission.
- Loading state.
- AI response.
- Selected model information.
- Basic routing information.
- Basic request/usage history.

### 7.3 Consumer Routing

A consumer request should follow:

```text
User Prompt
    |
    v
Attentra
    |
    v
Request Analysis
    |
    v
Routing Decision
    |
    v
Provider/Model
    |
    v
Response
```

---

## 8. Business Product Requirements

### 8.1 Business Authentication

Business users require authenticated access to the business dashboard.

### 8.2 API Access

A business should receive an Attentra API credential/key.

The business application should use Attentra rather than directly hard-coding a single model provider.

### 8.3 Unified API

The API should provide a provider-independent request format.

The exact endpoint and payload format will be frozen in `TechSpec.md`.

### 8.4 Routing

For each request, Attentra should determine:

- task type
- complexity
- capability requirements
- cost sensitivity
- latency considerations
- available candidate models

The router then scores/selects an appropriate candidate.

### 8.5 Request Logging

For each request, the system should record as applicable:

- request ID
- business/user
- timestamp
- task category
- complexity
- selected provider
- selected model
- token usage
- latency
- actual cost
- comparable alternative cost
- estimated savings
- request status
- routing reason

### 8.6 Cost Intelligence

The business dashboard should clearly communicate:

```text
Actual Attentra Cost
        vs.
Estimated Cost With Alternative Model
        =
Estimated Savings
```

Example concept:

```text
Your monthly Attentra cost
PKR 10,000

Estimated cost with a more expensive fixed model
PKR 20,000

Estimated savings
PKR 10,000
```

The above numbers are illustrative only. The implementation must calculate real values from recorded requests and pricing data.

### 8.7 Pricing Concept

The proposed commercial model is:

> Attentra charges a percentage of the savings it creates.

For example:

```text
Estimated savings = PKR 10,000
Attentra share = 10%
Attentra charge = PKR 1,000
```

This is a **hackathon business-model demonstration**, not a requirement to implement real payment processing.

---

## 9. Routing Engine Requirements

The routing engine must be modular.

It should be able to:

1. Receive a normalized AI request.
2. Analyze the request.
3. Determine task characteristics.
4. Identify eligible models.
5. Score eligible models.
6. Select the best candidate.
7. Execute the provider request.
8. Record the decision.
9. Provide a fallback when practical.

### Candidate scoring

The exact algorithm will be defined in `TechSpec.md`, but the implementation should consider:

- capability fit
- task complexity
- estimated cost
- latency target
- model availability
- configured priorities

The system should favor an inexpensive model when it is sufficiently capable and use a stronger model when the request genuinely requires it.

---

## 10. Provider Requirements

The initial architecture should support multiple providers through adapters.

Target providers established by the project direction:

- OpenAI
- Anthropic
- Google

The system must isolate provider-specific SDK/API behavior behind a provider abstraction.

Adding a new provider should not require rewriting the routing engine.

---

## 11. Business Dashboard Requirements

The dashboard should prioritize evidence of Attentra's value.

### Overview

Display:

- total requests
- total actual cost
- estimated alternative cost
- estimated savings
- model distribution

### Requests

Display:

- request ID
- timestamp
- task
- selected model
- provider
- cost
- latency
- status

### Routing

Display:

- routing decisions
- model selected
- routing reason
- complexity/task information

### Cost Intelligence

Display:

- actual Attentra spend
- comparison spend
- savings
- savings percentage

### API Keys

Allow business users to manage the API credential required for integration.

---

## 12. Existing Website Requirements

The current marketing website should remain the primary product presentation layer.

Existing sections include the Attentra product narrative, architecture, product demo, use cases, cost intelligence, and developer integration concepts.

The Qoder audit established that several current demo elements are simulated/static rather than connected to a backend.

These should eventually be connected to real functionality where useful, but existing polished UI should not be discarded.

---

## 13. Current Repository Reality

The existing repository is primarily a frontend/marketing implementation.

Known current state:

- Next.js/React/TypeScript frontend exists.
- Tailwind-based design system exists.
- Premium Attentra visual system exists.
- Framer Motion is used.
- Marketing pages/components exist.
- Authentication UI exists.
- Actual authentication backend is not yet implemented.
- Database is not yet implemented.
- AI provider integrations are not yet implemented.
- Routing is currently simulated.
- Cost/metrics displayed in current UI include static/demo values.
- Attentra API does not yet exist.
- Consumer dashboard does not yet exist as the working product.
- Business dashboard does not yet exist as the working product.

This PRD intentionally distinguishes **existing UI** from **working product infrastructure**.

---

## 14. Success Criteria

Attentra is considered hackathon-MVP complete when a judge can observe the following end-to-end:

### Consumer

```text
Google Sign In
   ↓
Consumer Dashboard
   ↓
Submit AI task
   ↓
Attentra analyzes/routs request
   ↓
Real model response
   ↓
Routing/result information
```

### Business

```text
Business authentication
   ↓
API key
   ↓
Business app/request
   ↓
Attentra API
   ↓
Routing engine
   ↓
Real provider/model
   ↓
Response
   ↓
Request logged
   ↓
Cost calculated
   ↓
Savings calculated
   ↓
Business dashboard
```

### Evidence

The team must be able to demonstrate actual measured results for a defined benchmark workload.

---

## 15. Hackathon Evaluation Strategy

The product should be demonstrated around five dimensions:

### Problem

Clearly explain the cost and model-selection problem.

### Innovation

Show that Attentra is not merely another chatbot; it is a routing/middleware layer.

### Technical implementation

Demonstrate:

- provider abstraction
- routing engine
- API
- request logging
- cost engine
- dashboard analytics

### Feasibility

Demonstrate a real API flow and measurable results.

### Impact

Demonstrate how intelligent routing can reduce unnecessary model spending while maintaining task suitability.

---

## 16. Product Metrics

The final demo should calculate actual metrics, such as:

- total benchmark requests
- routing decisions
- model distribution
- average latency
- total actual cost
- estimated baseline cost
- estimated savings
- savings percentage
- routing success/failure rate

No benchmark metric should be fabricated.

---

## 17. Security Requirements

At minimum:

- Never commit provider API keys.
- Never expose server-side provider secrets to the browser.
- Never expose full API keys after creation.
- Validate API requests.
- Authenticate business API requests.
- Protect dashboard routes.
- Sanitize/log safely.
- Do not store unnecessary personal information.
- Do not expose one business's request data to another business.

---

## 18. Constraints

The hackathon has a fixed build window.

Therefore:

- prioritize the core differentiator;
- avoid unnecessary infrastructure;
- prefer reliable managed services where appropriate;
- avoid building real billing until the core product works;
- keep the architecture extensible without overengineering;
- ensure the final demo is reproducible.

---

## 19. Product Decision Log

### Decision 1
Attentra has two experiences: free consumer and business/API.

### Decision 2
The business product is the primary monetization concept.

### Decision 3
The core differentiator is intelligent model routing.

### Decision 4
The business dashboard must make model selection, cost, comparison and savings visible.

### Decision 5
The proposed 10% savings-share pricing is a conceptual hackathon model, not an immediate payment implementation requirement.

### Decision 6
The current website is preserved and extended rather than replaced.

### Decision 7
The implementation must prove real functionality rather than relying on UI simulations.

---

## 20. Out of Scope Until Core MVP Works

Do not prioritize:

- full payment gateway
- production subscription management
- advanced RBAC
- enterprise SSO
- complex team permissions
- massive provider catalog
- distributed multi-region infrastructure
- advanced ML-based routing trained on a large dataset

---

## 21. Final Product Definition

> **Attentra is an intelligent AI routing infrastructure layer that allows applications to use multiple AI models through one API. It evaluates each request and routes it to a suitable model based on task requirements, complexity, capability, cost and latency considerations, while providing businesses with transparent request-level cost and savings intelligence.**

That statement is the canonical product definition for this project.

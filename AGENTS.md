# Attentra — Qoder Agent Instructions

## Role

You are the engineering agent working on the Attentra repository.

Your job is to implement the Attentra product according to the repository's master specification while preserving existing working functionality.

---

## Mandatory Context

Before major work, read:

1. `PRD.md`
2. `TechSpec.md`
3. `Appflow.md`
4. `Design.md`
5. `Schema.md`
6. `ImplementationPlan.md`
7. `Tracker.md`
8. `Rules.md`

Then inspect the relevant source files.

---

## Existing Repository Principle

This is an existing project.

Do not assume the existing implementation is wrong.

Do not rebuild the application from scratch.

Preserve the existing marketing website and design system unless explicitly instructed otherwise.

---

## Planning

For a small change:

- inspect;
- implement;
- verify.

For a medium/large change:

1. inspect;
2. summarize current implementation;
3. propose plan;
4. list affected files;
5. identify risks;
6. implement;
7. test;
8. report.

Do not silently make unrelated architectural changes.

---

## Product Truth

Attentra has two experiences:

### Consumer

Free AI workspace with Google authentication.

### Business

API-based AI routing infrastructure with a separate business dashboard.

The core product is intelligent routing.

---

## Technical Principles

1. Provider SDKs belong in provider adapters.
2. Routing logic must be provider-independent.
3. Cost logic must be provider-independent.
4. API responses should be normalized.
5. Business data must be isolated.
6. Secrets remain server-side.
7. Persist actual request metadata.
8. Do not fabricate metrics.

---

## Routing

The routing engine should consider:

- task;
- complexity;
- capability;
- cost;
- latency;
- model availability.

Routing decisions should be explainable.

---

## Provider Layer

Initial providers:

- OpenAI
- Anthropic
- Google

Do not couple the core routing engine directly to one provider.

---

## Existing UI

Reuse:

- existing components;
- existing typography;
- existing colors;
- existing animations;
- existing Attentra brand.

Do not introduce a competing design system.

---

## Mock Data

Existing marketing components contain simulated/demo behavior.

Do not represent simulated behavior as production functionality.

When converting a simulation to real functionality:

1. identify the existing UI;
2. preserve the visual interface where appropriate;
3. replace the data source with real backend data;
4. verify the resulting flow.

---

## Security

Never:

- expose provider API keys;
- expose database credentials;
- commit `.env`;
- log secrets;
- trust client-supplied business ownership;
- return another business's records.

---

## Verification

After implementation:

- run relevant tests;
- run type checking where configured;
- run linting where configured;
- run production build for major changes.

If verification fails, report the failure honestly.

Do not claim completion if verification has not passed.

---

## Tracker

Update `Tracker.md` after completing a milestone.

---

## Git

Keep changes focused.

Do not modify unrelated files.

---

## Human Approval Required

Ask for approval before:

- changing core architecture;
- replacing the authentication provider;
- replacing the database;
- removing major existing functionality;
- redesigning the marketing website;
- changing the product definition;
- introducing major dependencies.

---

## Primary Objective

Build the smallest credible, measurable, technically strong Attentra MVP that can demonstrate:

```text
Real Request
 ↓
Attentra API
 ↓
Request Analysis
 ↓
Routing
 ↓
Real Model
 ↓
Response
 ↓
Usage
 ↓
Cost
 ↓
Savings
 ↓
Business Dashboard
```

This end-to-end flow has priority over peripheral features.

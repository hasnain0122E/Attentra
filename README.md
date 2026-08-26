# Attentra

**Intelligent AI Model Routing Infrastructure**

Attentra is an AI middleware platform that routes AI requests to suitable models based on task requirements, complexity, capability, cost, and latency considerations.

## Hackathon

**Alibaba Cloud AI Hackathon Pakistan 2026**

**Current Grade:** Grade 1

---

## Product

Attentra has two experiences.

### Consumer

A free AI workspace where users sign in and submit AI tasks without manually choosing a model.

### Business

An API platform for applications that use AI.

Instead of integrating directly with one provider:

```text
Application → GPT
```

a business can use:

```text
Application
    ↓
Attentra API
    ↓
Routing Engine
    ↓
GPT / Claude / Gemini
```

Attentra records request-level usage, cost and routing information and provides business analytics.

---

## Core Value

> One API. Multiple models. Intelligent routing. Cost intelligence.

---

## Repository Documentation

| File | Purpose |
|---|---|
| `PRD.md` | Product requirements |
| `TechSpec.md` | Technical architecture |
| `Appflow.md` | Application flows |
| `Design.md` | UI/brand rules |
| `Schema.md` | Data model |
| `ImplementationPlan.md` | Build phases |
| `Tracker.md` | Current development status |
| `Rules.md` | Project constraints |
| `AGENTS.md` | Qoder engineering instructions |

---

## Current Repository

The current project started as a polished Attentra marketing/frontend prototype.

The product infrastructure is being implemented during the hackathon build phase.

Current known areas include:

- Next.js/React/TypeScript frontend
- Tailwind CSS
- Attentra visual system
- marketing pages
- product demo UI
- authentication UI

Pending product infrastructure includes:

- real authentication
- database
- provider integrations
- routing engine
- Attentra API
- cost engine
- request persistence
- consumer dashboard
- business dashboard
- analytics

---

## Development Principle

Do not rebuild the existing website unnecessarily.

Extend the existing project into a working product.

---

## Target End-to-End Flow

```text
Business Application
        ↓
Attentra API
        ↓
Request Analysis
        ↓
Routing Engine
        ↓
Selected AI Model
        ↓
Provider
        ↓
Response
        ↓
Usage + Cost
        ↓
Savings
        ↓
Business Dashboard
```

---

## Security

Never commit environment files or API keys.

Use environment variables for all provider/database/authentication secrets.

---

## Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run the commands supported by the current repository's `package.json`.

---

## Hackathon Strategy

Priority order:

1. Real AI request.
2. Multi-provider abstraction.
3. Routing engine.
4. Cost calculation.
5. Request logging.
6. Business API.
7. Consumer dashboard.
8. Business dashboard.
9. Benchmark/evaluation.
10. Final demo.

Do not prioritize full billing or enterprise infrastructure before the core routing demonstration works.

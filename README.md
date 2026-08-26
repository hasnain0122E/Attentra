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

### Requirements

- **Node.js** 18+
- **npm** (package-lock.json is present)
- **PostgreSQL** database (recommended: [Neon](https://neon.tech))

### Installation

```bash
npm install
```

### Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` (development) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |

### Google OAuth Configuration

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Set **Authorized JavaScript origins**: `http://localhost:3000`
4. Set **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
5. For production (Vercel), add your production URL as an additional origin and redirect URI

### Database Setup

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations (requires `DATABASE_URL`):

```bash
npx prisma migrate dev --name initial_attentra_schema
```

### Development Server

```bash
npm run dev
```

### Build

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
```

---

## Phase 3 — Authentication + Database

This phase implements:

- **PostgreSQL** database via **Prisma ORM** (v6.19)
- Complete schema: User, Account, Session, Business, Membership, ApiKey, Provider, Model, PricingSnapshot, Request, RoutingDecision
- **Auth.js v5** with **Google OAuth** and **JWT sessions**
- Prisma adapter for persistent user/account storage
- Next.js middleware for route protection
- Server-side authorization utilities (`requireAuth`, `requireBusinessMembership`)
- Session provider for client components

Provider integrations and routing engine are intentionally deferred to later phases.

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

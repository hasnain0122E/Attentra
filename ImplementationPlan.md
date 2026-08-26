# Attentra — Implementation Plan

## Phase 0 — Repository Audit

**Status:** Completed

- [x] Push current project to GitHub.
- [x] Qoder repository audit.
- [x] Identify existing stack.
- [x] Identify missing backend/product infrastructure.
- [x] Identify technical cleanup items.

---

## Phase 1 — Documentation and Project Governance

**Goal:** Give Qoder a complete source of truth.

- [ ] Add PRD.md
- [ ] Add TechSpec.md
- [ ] Add Appflow.md
- [ ] Add Design.md
- [ ] Add Schema.md
- [ ] Add ImplementationPlan.md
- [ ] Add Tracker.md
- [ ] Add Rules.md
- [ ] Add AGENTS.md
- [ ] Add README.md
- [ ] Configure `.qoder/rules/`

---

## Phase 2 — Repository Stabilization

- [ ] Verify production build.
- [ ] Fix image case mismatch.
- [ ] Fix font filename/reference mismatch.
- [ ] Resolve duplicate motion dependencies.
- [ ] Remove/relocate unrelated orphaned code after verification.
- [ ] Resolve unused/broken components.
- [ ] Establish clean baseline commit.

---

## Phase 3 — Backend Foundation

- [ ] Select authentication provider.
- [ ] Select PostgreSQL-compatible database.
- [ ] Select ORM/data-access approach.
- [ ] Configure environment variables.
- [ ] Implement database connection.
- [ ] Implement User.
- [ ] Implement Business.
- [ ] Implement API Key.
- [ ] Implement Provider/Model registry.
- [ ] Implement Request.
- [ ] Implement RoutingDecision.

---

## Phase 4 — Authentication

- [ ] Implement Google OAuth.
- [ ] Implement sessions.
- [ ] Protect consumer dashboard.
- [ ] Protect business dashboard.
- [ ] Implement business ownership checks.
- [ ] Connect existing UI to real auth.

---

## Phase 5 — Provider Layer

- [ ] Create normalized AI request type.
- [ ] Create normalized AI response type.
- [ ] Create provider interface.
- [ ] Implement OpenAI adapter.
- [ ] Implement Anthropic adapter.
- [ ] Implement Google adapter.
- [ ] Implement provider error normalization.
- [ ] Implement usage extraction.

---

## Phase 6 — Routing Engine

- [ ] Implement task classification.
- [ ] Implement complexity estimation.
- [ ] Implement candidate filtering.
- [ ] Implement capability matching.
- [ ] Implement cost scoring.
- [ ] Implement latency scoring.
- [ ] Implement final model selection.
- [ ] Implement routing explanation.
- [ ] Implement fallback behavior.

---

## Phase 7 — Cost Intelligence

- [ ] Model pricing registry.
- [ ] Pricing snapshots.
- [ ] Token cost calculation.
- [ ] Baseline cost calculation.
- [ ] Savings calculation.
- [ ] Savings percentage.
- [ ] Aggregate monthly calculations.

---

## Phase 8 — Attentra Business API

- [ ] API key authentication.
- [ ] Request validation.
- [ ] Normalized request.
- [ ] Routing.
- [ ] Provider execution.
- [ ] Usage extraction.
- [ ] Cost calculation.
- [ ] Persistence.
- [ ] Normalized response.
- [ ] Error handling.

---

## Phase 9 — Consumer Dashboard

- [ ] Dashboard shell.
- [ ] AI workspace.
- [ ] Real request submission.
- [ ] Loading state.
- [ ] Response rendering.
- [ ] Routing metadata.
- [ ] Request history.

---

## Phase 10 — Business Dashboard

- [ ] Dashboard shell.
- [ ] Overview metrics.
- [ ] Request table.
- [ ] Routing analytics.
- [ ] Model distribution.
- [ ] Cost intelligence.
- [ ] Savings visualization.
- [ ] API key management.

---

## Phase 11 — Evaluation

Create a fixed benchmark set.

For each benchmark:

- task;
- expected task type;
- complexity;
- candidate models;
- selected model;
- actual cost;
- baseline cost;
- savings;
- latency;
- success.

Produce real measurements.

---

## Phase 12 — Quality

- [ ] Unit tests.
- [ ] API tests.
- [ ] Routing tests.
- [ ] Cost tests.
- [ ] Auth tests.
- [ ] Critical UI integration tests.
- [ ] Production build.
- [ ] Error-state review.
- [ ] Security review.

---

## Phase 13 — Hackathon Demo

- [ ] Seed demo data if appropriate.
- [ ] Prepare clean accounts.
- [ ] Prepare provider credentials.
- [ ] Verify end-to-end consumer flow.
- [ ] Verify end-to-end business API flow.
- [ ] Verify dashboard analytics.
- [ ] Verify cost comparison.
- [ ] Verify benchmark metrics.
- [ ] Prepare pitch.
- [ ] Prepare judge Q&A.

---

## Execution Rule

Never begin a later phase by assuming an earlier phase works.

Each phase must have a verification checkpoint.

---

## Definition of Done

A feature is done only when:

1. It works.
2. It handles failure states.
3. It does not break existing functionality.
4. It passes relevant tests/build.
5. It is documented if architectural.
6. Tracker.md is updated.
7. A Git commit represents the stable state.

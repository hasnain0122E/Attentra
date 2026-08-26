# Attentra — Project Rules

## 1. Product Rules

1. Attentra is an AI model routing infrastructure platform.
2. Do not change the core product direction without explicit approval.
3. The two product experiences are consumer and business.
4. The business/API product is the primary monetization concept.
5. Intelligent routing is the core technical differentiator.

---

## 2. Existing Website Rules

1. Preserve the existing marketing website.
2. Do not redesign existing pages unless explicitly requested.
3. Reuse existing components.
4. Reuse existing design tokens.
5. Do not replace the logo/wordmark.
6. Do not remove working animations without reason.

---

## 3. Engineering Rules

1. Inspect before modifying.
2. Prefer small, focused changes.
3. Do not rewrite large sections unnecessarily.
4. Do not introduce duplicate functionality.
5. Reuse existing abstractions where appropriate.
6. Keep business logic separate from presentation.
7. Keep provider-specific logic behind provider adapters.
8. Keep routing logic independent of provider SDKs.

---

## 4. Qoder Rules

Before a significant implementation:

1. Read the relevant master documents.
2. Inspect affected files.
3. Explain the intended approach.
4. Identify affected files.
5. Identify risks.
6. Implement only the requested scope.
7. Run verification.
8. Report changed files.
9. Update Tracker.md for completed work.

For architectural changes, ask for human approval before implementation.

---

## 5. No Fabrication

Never fabricate:

- API responses;
- model availability;
- pricing;
- latency;
- savings;
- benchmark results;
- authentication state;
- successful provider calls.

Demo/mock data must be explicitly marked as mock data.

---

## 6. Secrets

Never:

- commit `.env`;
- expose provider API keys in client code;
- print secrets in logs;
- hardcode credentials;
- store raw business API keys unnecessarily.

---

## 7. Security

Validate all external input.

Enforce authentication and authorization.

A business must never access another business's data.

---

## 8. Data

Request analytics should be derived from actual request records.

Historical pricing should be preserved through pricing snapshots or equivalent.

---

## 9. Testing

Critical business logic must have tests.

At minimum:

- routing;
- cost;
- API validation;
- provider normalization;
- authentication boundaries.

---

## 10. Git

Create a commit after every stable milestone.

Suggested format:

```text
feat: implement routing engine
fix: correct provider error handling
chore: stabilize project baseline
test: add routing engine tests
```

Never leave the repository in a knowingly broken state at the end of a milestone.

---

## 11. Dependency Rules

Do not add a dependency when the existing stack can solve the problem cleanly.

Do not replace a dependency merely for preference.

Any major dependency change must be documented.

---

## 12. Scope Control

Do not spend hackathon time on:

- full payment systems;
- unnecessary enterprise features;
- speculative abstractions;
- large visual redesigns;
- features that do not improve the judge-visible core demonstration.

---

## 13. Final Rule

> A smaller system that genuinely routes real requests, measures cost, and proves savings is more valuable than a large system full of simulations.

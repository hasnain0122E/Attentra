# Attentra — Design Specification

## 1. Design Objective

Attentra should look like a premium 2026 AI infrastructure/SaaS product.

The design must communicate:

- intelligence
- technical credibility
- clarity
- trust
- cost transparency
- modern infrastructure

---

## 2. Existing Brand

Use the existing Attentra brand identity.

The updated logo/wordmark is the canonical brand asset.

The wordmark uses:

**Reservation Wide Regular**

Do not replace the logo or wordmark without explicit approval.

---

## 3. Visual Direction

- premium
- clean
- modern
- light-first
- strong hierarchy
- restrained use of decorative elements
- polished micro-interactions
- clear technical visualization
- no unnecessary clutter

---

## 4. Existing Website

Preserve the existing marketing website and its established visual language.

Existing major concepts include:

- hero
- model fragmentation/problem
- how it works
- architecture
- product demo
- why Attentra
- use cases
- cost intelligence
- developer integration

Existing visual components should be reused where appropriate.

---

## 5. Color

The current Attentra design system is the source of truth.

Do not introduce arbitrary colors.

When adding new screens:

1. inspect existing CSS tokens;
2. reuse existing palette;
3. maintain contrast;
4. maintain accessible text contrast.

---

## 6. Typography

Use the existing typography system.

Do not introduce additional fonts unless necessary.

Fix the known font filename/reference mismatch before relying on the font in production.

---

## 7. UI Principles

### Cards

Use cards to group:

- metrics
- request records
- model information
- routing decisions
- cost comparisons

### Buttons

Primary actions should be visually obvious.

### Forms

Every form must include:

- label or accessible equivalent;
- validation;
- loading state;
- success state;
- error state.

### Tables

Business request analytics should use readable, responsive tables.

---

## 8. Dashboard Design

### Consumer

Minimal:

```text
Sidebar / Header
AI Workspace
Response
Recent Requests
```

### Business

Data-rich but clean:

```text
Overview
 ├── Total Requests
 ├── Attentra Cost
 ├── Baseline Cost
 ├── Savings
 └── Model Distribution
```

Then detailed analytics below.

---

## 9. Cost Comparison Visual

The core business-value visualization should make the comparison immediately understandable:

```text
ATTENTRA COST              ALTERNATIVE COST

PKR 10,000                 PKR 20,000

        ─────── SAVED PKR 10,000 ───────
```

Actual values must be calculated dynamically.

---

## 10. Routing Visualization

A request can be represented as:

```text
REQUEST
  ↓
ANALYZE
  ↓
ROUTE
  ↓
MODEL
  ↓
RESPONSE
```

Show the selected model and a concise routing reason.

---

## 11. Motion

Reuse the existing motion system.

Motion should communicate:

- routing
- transitions
- progress
- state changes

Avoid animations that delay task completion.

---

## 12. Accessibility

All product interfaces must support:

- keyboard navigation;
- readable contrast;
- visible focus;
- accessible labels;
- sensible heading hierarchy;
- responsive layout.

---

## 13. Responsive Design

Consumer and business dashboards must work on:

- desktop
- tablet
- mobile

Business analytics may use horizontally scrollable tables on narrow screens.

---

## 14. Design Rule

> Do not redesign a working Attentra screen merely because a new implementation could look different.

Extend the system; do not fragment it.

# Attentra — Application Flow

## 1. Global Product Flow

```text
User / Business Application
        ↓
Attentra Entry Point
        ↓
Authentication / API Key Validation
        ↓
Request Validation
        ↓
Request Analysis
        ↓
Routing Engine
        ↓
Selected Provider + Model
        ↓
Provider API
        ↓
Normalized Response
        ↓
Usage + Cost Calculation
        ↓
Persistence
        ↓
Dashboard Analytics
```

---

## 2. Consumer Flow

```text
Landing Page
 ↓
Google Sign-In
 ↓
Authenticated Session
 ↓
Consumer Dashboard
 ↓
Enter AI Task
 ↓
Submit
 ↓
Attentra Request Service
 ↓
Analyze Task
 ↓
Estimate Complexity
 ↓
Select Model
 ↓
Call Provider
 ↓
Return Response
 ↓
Save Request
 ↓
Display Response + Routing Metadata
```

### Consumer error states

- authentication failed
- invalid request
- provider unavailable
- routing failed
- timeout
- unexpected server error

---

## 3. Business Onboarding

```text
Landing
 ↓
Business Signup/Login
 ↓
Business Dashboard
 ↓
Create API Key
 ↓
Display Key Once
 ↓
Developer Integrates Attentra
```

---

## 4. Business API Flow

```text
Business Application
 ↓
POST /api/v1/chat/completions
 ↓
API Key Validation
 ↓
Request Validation
 ↓
Normalize Request
 ↓
Task Classification
 ↓
Complexity Estimation
 ↓
Candidate Model Selection
 ↓
Model Scoring
 ↓
Best Model Selected
 ↓
Provider Adapter
 ↓
Provider API
 ↓
Response
 ↓
Usage Extraction
 ↓
Cost Calculation
 ↓
Baseline Comparison
 ↓
Savings Calculation
 ↓
Persist Request
 ↓
Return Response
```

---

## 5. Routing Decision Flow

```text
Request
 ↓
What task is this?
 ↓
How complex is it?
 ↓
What capabilities are required?
 ↓
Which models can handle it?
 ↓
Which models are available?
 ↓
Score candidates
 ↓
Select best candidate
 ↓
Explain decision
```

---

## 6. Business Dashboard Flow

```text
Business Login
 ↓
Dashboard
 ├── Overview
 ├── Requests
 ├── Routing
 ├── Cost Intelligence
 ├── Savings
 ├── API Keys
 └── Settings
```

---

## 7. Cost Intelligence Flow

```text
Request
 ↓
Actual Model
 ↓
Actual Token Usage
 ↓
Actual Cost

              +

Baseline Model
 ↓
Same Usage
 ↓
Estimated Baseline Cost

              ↓

Baseline Cost - Actual Cost
              ↓
          Savings
```

---

## 8. Demo Flow

Recommended hackathon demo:

```text
1. Explain problem
2. Show Attentra architecture
3. Show consumer request
4. Show real routing decision
5. Show model response
6. Switch to business dashboard
7. Send business API request
8. Show selected model
9. Show request cost
10. Show alternative cost
11. Show savings
12. Show aggregate analytics
13. Explain benchmark results
```

The demo should prioritize a small number of flawless flows over many unfinished features.

# Execution Blueprint: Decision Simulation & Scenario Intelligence Platform ("Resonance")
**Hackathon Problem Statement 7 (PS 7)**

---

## 1. Product Thesis & Hackathon Pitch ("What We MUST Know")

### 🎯 Positioning: *"The Flight Simulator for High-Stakes Decisions"*
Most people and businesses make critical decisions using intuition or static spreadsheets. Generic LLMs offer vague, non-committal bullet points without mathematical rigor. 

**Resonance** is a **reactive decision simulation engine**. It converts complex, uncertain real-world dilemmas into structured mathematical models with dynamic variables, sensitivity sliders, and multi-dimensional trade-off radar matrices.

| Dimension | Hackathon Pitch Answer |
| :--- | :--- |
| **Why it is THE PRODUCT** | It is **not a chatbot**. The LLM acts as an intake compiler that builds a mathematical state machine. Users don't just read advice; they manipulate constraints in real time (e.g., budget, risk tolerance, timeline) and watch outcomes and trade-offs shift instantly. |
| **For Whom** | **1. Business:** Founders & corporate strategists (expansion, hiring vs. runway).<br>**2. Finance:** Individuals making major life purchases (vehicles, mortgages, investments).<br>**3. Life/Agro:** High-stakes personal transitions & smallholder farmers optimizing yield under climate/budget constraints. |
| **How It Works IRL** | **Extract $\rightarrow$ Model $\rightarrow$ Simulate $\rightarrow$ Compare:**<br>1. Guided domain wizard extracts priorities, hard limits, and unknowns.<br>2. Gemini generates a structured parametric formula matrix.<br>3. Client-side math engine executes zero-latency "what-if" simulations as sliders move.<br>4. Dynamic radar charts display Pareto-optimal trade-offs (Risk vs. Return vs. Feasibility). |
| **Monetization & Funding** | **B2B Tier:** $499/mo per seat for scenario planning & corporate M&A modeling.<br>**B2C Pro:** $15/mo for personal financial & career simulations with exportable decision dossiers. |
| **Global Impact** | Democratizes institutional-grade scenario analysis. Prevents catastrophic capital misallocation for small businesses and empowers vulnerable decision-makers (like farmers) with actionable risk mitigation. |

---

## 2. System Architecture & Tech Stack

### Tech Stack Breakdown
* **Frontend**: HTML5, Modern CSS (Glassmorphic dark mode, responsive layout), Vanilla JavaScript (modular, no build step required for rapid hackathon iteration), **Chart.js** (for multi-dimensional Radar / Spider charts & comparison curves).
* **Backend**: **FastAPI** (`app.py`), `uvicorn`, `pydantic` for strict data schema validation.
* **LLM Intelligence**: **Google Gemini API** (`google-generativeai`) configured with `response_mime_type="application/json"` for deterministic, schema-enforced scenario generation.

---

## 3. The 3 Turnkey Showcase Domains

To guarantee an unbeatable demo for the judges, implement dedicated guided wizards with 1-click turnkey scenarios:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               DOMAINS                                       │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ 🏢 1. BUSINESS       │ 💰 2. FINANCE        │ 🌱 3. LIFE & AGRO             │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ SaaS Global Expansion│ EV vs Transit vs Move│ Smallholder Crop Optimization │
│                      │                      │                               │
│ • Resource: $500K    │ • Resource: $35K     │ • Resource: 5 Acres, $4,000   │
│ • Constraint: 12 mo  │ • Constraint: Commute│ • Constraint: Monsoons & Soil │
│ • Priority: Cashflow │ • Priority: Savings  │ • Priority: Reliable Yield    │
│                      │                      │                               │
│ Scenarios:           │ Scenarios:           │ Scenarios:                    │
│ A: Aggressive HQ     │ A: Buy Model 3 (Loan)│ A: High-Value Cash Crop       │
│ B: Remote Geo-Hub    │ B: Hybrid + Transit  │ B: Multi-Crop + Drip Irrig.   │
│ C: Local Partnership │ C: Organic Soil Regen│ C: Organic Soil Regeneration  │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## 4. Parametric Simulation Model (JSON Schema)

When the backend calls Gemini, it returns a structured JSON model. This enables the frontend to compute trade-offs **instantly** without waiting for round-trip LLM calls when a user drags a slider.

---

## 5. Division of Responsibilities (You & Rahul)

| Member | Focus Area | Deliverables |
| :--- | :--- | :--- |
| **Backend & AI Pipeline** *(e.g., User or Rahul)* | **FastAPI + Gemini Prompt Engine** | • FastAPI setup (`app.py`) with CORS & static file serving.<br>• Gemini 1.5/2.0 Flash prompt engineering with structured Pydantic schemas.<br>• Fallback pre-calculated scenario mocks (ensures the demo never crashes even if offline or rate-limited). |
| **Frontend & UI/UX** *(e.g., User or Rahul)* | **Interactive Dashboard & Visualization** | • Premium dark-mode UI with glassmorphism, glowing accents, and typography.<br>• Domain wizard cards + intake form with dynamic chips/tags.<br>• Chart.js Radar chart integration comparing 3 scenarios simultaneously.<br>• Dynamic sensitivity sliders that recalculate metric weights live on the canvas. |


## 6. Git Push

**terminal**
> git commit -m "Refactor front page: rename styles and scripts, remove button placeholders"
> git push origin main

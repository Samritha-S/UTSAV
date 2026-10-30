# Utsav Planner

> **AI-Powered Event Planning Assistant for Indian Celebrations & Community Gatherings**  
> *Built for Hack2skill PromptWars Hackathon with Google DeepMind Antigravity & Google Gemini 2.5 Flash*

[![CI](https://github.com/Samritha-S/UTSAV/actions/workflows/ci.yml/badge.svg)](https://github.com/Samritha-S/UTSAV/actions/workflows/ci.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-darkgreen.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136+-teal.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-forestgreen.svg)](LICENSE)
[![Zero-Hallucination Math](https://img.shields.io/badge/Math-Deterministic-goldenrod.svg)](#deterministic-vs-ai-approach)

---

## 1. Overview & Persona

### The Challenge
Planning an Indian celebration—be it a three-day multicultural wedding, a milestone 50th birthday, or a 1,000-guest resident welfare association Diwali mela—is a high-stakes, multi-variable logistical challenge. First-time organizers (a parent arranging their child's wedding, an elder sibling hosting an anniversary, or a residential community committee volunteer) typically face three acute pain points:
1. **Unpredictable Cost Realities**: Generic Western event tools assume single-day venues and flat per-plate pricing, completely ignoring Indian cultural imperatives like multi-meal catering, mandap/shamiana infrastructure, generator backups, priest/pandit dakshina, sound permits, and regional peak-season muhurat demand surges.
2. **Backwards Scheduling Blindspots**: First-time hosts struggle to determine what must be locked 6 months out (wedding venues, caterers) versus what can wait until the final fortnight (tailoring alterations, guest favors).
3. **Statutory & Vendor Compliance Vulnerabilities**: Outdoor community events and loud wedding sangeets often encounter sudden police or municipal sound cutoffs (e.g., local 10:00 PM loudspeaker regulations, electrical safety clearances, PPL/IPRS music licensing verifications).

### Why Generic Planners Fail
Generic planning applications fail because they either force rigid generic templates or delegate mathematical calculation to Large Language Models (LLMs). When LLMs are asked to split ₹15,00,000 across 9 vendor categories, they hallucinate totals that fail to sum correctly, ignore regional tier multipliers (Tier-1 Metro vs. Tier-2 vs. Tier-3), and offer zero deterministic guarantees.

**Utsav Planner** solves this by strictly separating **deterministic logistics** (pure mathematics for budgets, backward-scheduled dependency graphs for timelines, and curated statutory checklists) from **probabilistic creativity** (personalized themes, curated menus, icebreakers, and cultural decor powered by Google Gemini 2.5 Flash).

---

## 2. Core Features

- **Deterministic Budget Engine**:
  - Allocates entire budgets across event-specific category slugs (`venue_infrastructure`, `catering_food`, `decor_florals`, `photography_video`, `entertainment_sound`, `attire_styling`, `invitations_favors`, `logistics_permits`, `contingency`).
  - Factors in city tier multipliers (Metro, Tier-2, Tier-3), indoor/outdoor staging requirements, guest-count economies of scale, and seasonal demand peaks (wedding muhurat months and major festivals).
  - Evaluates financial feasibility with a four-tier verdict (`comfortable`, `realistic`, `tight`, `unrealistic`) based on real-world per-guest spending floors.
  - Guarantees exact sum matching down to the single rupee with zero rounding discrepancies.

- **Backwards Timeline Engine**:
  - Computes target deadlines by calculating backwards from the event date relative to Indian Standard Time (Asia/Kolkata).
  - Categorizes task status dynamically as `overdue`, `urgent`, `in_progress`, or `upcoming`.
  - Enforces dependency sequencing (e.g., locks venue before decor contracts or catering menus).
  - Automatically activates an aggressive 7-day **Crunch Mode** for last-minute hosts, flagging non-essential tasks and prioritizing emergency vendor bookings.

- **Vendor & Compliance Checklist Engine**:
  - Maps 1-to-1 with budget categories and injects India-specific compliance requirements.
  - Adapts to outdoor settings (shamiana rainproofing, generator backups, green room air-cooling).
  - Tailors advice for large gatherings (>500 guests: ambulance on standby, queue stanchions, municipal trash clearance).
  - Reminds organizers to verify local loudspeaker cutoff rules and food safety certifications with local authorities.

- **Personalized Creative Ideas (Gemini 2.5 Flash)**:
  - Generates bespoke themes, color palettes, stage layouts, interactive cultural icebreakers, and course-by-course menus respecting dietary preferences (Pure Vegetarian, Jain, Halal, Eggetarian, Non-Vegetarian).
  - Sanitizes user input to prevent prompt spoofing and HTML/markdown link injection.
  - Zero-exception graceful fallback: If the API key is missing, invalid, or times out, curated regional fallbacks render instantly with a clear fallback indicator.

- **Interactive In-Browser Refinement**:
  - Allows organizers to refine creative ideas dynamically (e.g., *"Make it eco-friendly with marigold and banana leaf decor"* or *"Focus on South Indian breakfast delicacies"*).
  - Enforces client-side and server-side rate limits (max 5 refinements per session, 15 API requests/minute).

- **Offline-First Persistence**:
  - Automatically saves the complete event plan and checklist completion states to browser `localStorage`.
  - Includes a quick-print stylesheet (`window.print()`) that formats clean vendor briefings and run-sheets without navigation clutter.

---

## 3. Deterministic vs. AI Approach

| Layer | Implementation | Why This Decision Was Made |
| :--- | :--- | :--- |
| **Budget Allocation** | Pure Python Math (`app/planner/budget.py`) | Zero arithmetic hallucinations. 100% predictable sum equality ($B = \sum c_i$). |
| **Timeline Scheduling** | Pure Graph Dependencies (`app/planner/timeline.py`) | Backwards timeline arithmetic requires calendar precision, not language probabilities. |
| **Compliance Checklist** | Curated Deterministic Rules (`app/planner/checklist.py`) | Legal reminders, safety advisories, and contract checks must never be hallucinated or omitted. |
| **Creative Suggestions** | Google Gemini 2.5 Flash (`app/ai/ideas.py`) | Natural language nuance excels at themes, decor palettes, and creative culinary pairings. |
| **Fallback Engine** | Curated Archetype Data (`app/planner/data.py`) | Guarantees the application remains 100% operational even offline or without an API key. |

### Mathematical Allocation Logic
1. **Contingency Sizing**: Contingency reserve $C$ is computed dynamically between 5% and 15% based on guest count scale ($G$) and venue environment:
   $$C_{\text{rate}} = \min(0.15, \max(0.05, 0.08 + \text{adj}_{\text{venue}} + \text{adj}_{\text{guests}}))$$
   $$\text{Spendable Budget } B_s = B_{\text{total}} \times (1 - C_{\text{rate}})$$
2. **Category Weight Adjustments**: Base category weights $W_c$ are adjusted by City Tier ($M_{\text{city}}$), Space ($M_{\text{venue}}$), and Season ($M_{\text{season}}$):
   $$W'_c = W_c \times M_{\text{city}, c} \times M_{\text{venue}, c} \times M_{\text{season}, c}$$
3. **Weight Normalization**: Adjusted weights are normalized so their sum equals exactly 1.0:
   $$\hat{W}_c = \frac{W'_c}{\sum_{k} W'_k}$$
4. **Integer Rounding with Remainder Redistribution**: Allocations are converted to integer rupees. Any truncation delta ($\Delta = B_s - \sum \lfloor B_s \times \hat{W}_c \rfloor$) is distributed to the highest-weight category, guaranteeing $\sum \text{Allocations} \equiv B_{\text{total}}$.
5. **Feasibility Floor**: Spend per guest $S = B_{\text{total}} / G$ is evaluated against minimum viable operational thresholds $F(E, T)$ for event type $E$ and city tier $T$. If $S < 0.70 \times F(E, T)$, the plan is flagged as `unrealistic` with clear guidance.

---

## 4. Architecture & Request Flow

```text
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                    |
|   Vanilla HTML5 + Modern CSS + Modular ES JavaScript (No Frameworks, No CDNs)     |
+-----------------------------------------+-----------------------------------------+
                                          |
                      HTTP POST /api/plan | HTTP POST /api/refine
                      (JSON Payload <64KB)|
                                          v
+-----------------------------------------------------------------------------------+
|                               FASTAPI APPLICATION                                 |
|                                                                                   |
|  [Security Middleware Pipeline]                                                   |
|   1. SecurityHeadersMiddleware (CSP: default-src 'self', X-Frame-Options, etc.)   |
|   2. PayloadAndContentTypeMiddleware (Strict application/json & 64KB limit)       |
|   3. RateLimitMiddleware (Client IP sliding window: 15 AI req/min, 60 general)    |
|   4. RequestLoggingMiddleware (Sanitized structured access audit logs)            |
|                                                                                   |
|  [Injectable Dependency Layer]                                                    |
|   * get_today() -> Asia/Kolkata timezone (deterministic calendar reference)       |
+--------------------+---------------------+--------------------+-------------------+
                     |                     |                    |
                     v                     v                    v
           +-------------------+ +-------------------+ +-------------------+
           |   Budget Engine   | |  Timeline Engine  | | Checklist Engine  |
           | (Pure Arithmetic) | | (DAG Scheduling)  | | (Rule Generation) |
           +---------+---------+ +---------+---------+ +---------+---------+
                     |                     |                    |
                     +---------------------+--------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |           Creative AI Layer           |
                       |       (app/ai/ideas.py + SDK)         |
                       +-------------------+-------------------+
                                           |
                    +----------------------+----------------------+
                    | Gemini API Configured?                      |
                    | (Valid GEMINI_API_KEY present)              |
                   YES                                            NO
                    v                                             v
        +-----------------------+                     +-----------------------+
        | Google GenAI Client   |                     | Curated Fallback      |
        | gemini-2.5-flash      |                     | Static Archetypes     |
        | (Structured Schema,   |                     | (Deterministic,       |
        |  5s Hard Timeout)     |                     |  Dietary-Filtered)    |
        +-----------+-----------+                     +-----------+-----------+
                    |                                             |
         Success?  / \  Exception / Timeout                       |
                  /   \-----------------------+                   |
                 v                            v                   |
        +------------------+         +------------------+         |
        | Model Response   |         | Curated Fallback |         |
        | source = "ai"    |         | source="fallback"|<--------+
        +--------+---------+         +--------+---------+
                 |                            |
                 +----------------------------+
                               |
                               v
+-----------------------------------------------------------------------------------+
|                        COMBINED JSON RESPONSE PAYLOAD                             |
|       { budget, timeline, checklist, ideas: { ..., source }, metadata }           |
+-----------------------------------------------------------------------------------+
```

---

## 5. Tech Stack & Rationales

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) `0.136.3` | High-performance asynchronous Python web framework with native Pydantic validation and auto-generated OpenAPI docs. |
| **Data Validation** | [Pydantic](https://docs.pydantic.dev/) `2.13.4` | Strict schema validation, automatic type coercion, and robust data constraints. |
| **AI Client SDK** | [google-genai](https://pypi.org/project/google-genai/) `2.34.0` | Official Google GenAI SDK for Gemini 2.5 Flash with structured JSON schemas and timeout controls. |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) `0.48.0` | Ultra-fast ASGI server implementation using `uvloop` and `httptools`. |
| **Timezone Support** | [tzdata](https://pypi.org/project/tzdata/) `2026.1` | Ensures IANA `Asia/Kolkata` timezone support across all platforms (Windows, Linux, macOS) with fixed UTC+05:30 fallback. |
| **Frontend** | Vanilla HTML5, CSS3, ES Modules | Zero build step, zero npm bloat, 100% audit-proof CSP compliance, lightning-fast rendering. |
| **Linter & Formatter**| [Ruff](https://docs.astral.sh/ruff/) `0.17.3` | Extremely fast modern Python linter and code formatter. |
| **Test Framework** | [pytest](https://docs.pytest.org/) `9.1.1` & [HTTPX](https://www.python-httpx.org/) `0.28.1` | Deterministic unit and integration test coverage across all endpoints and engines. |

---

## 6. Project Structure

```text
utsav-planner/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI workflow (Python 3.11, Ruff, Pytest)
├── app/
│   ├── __init__.py
│   ├── config.py                # Environment configuration & Settings singleton
│   ├── main.py                  # FastAPI application, routing, error handlers & static mount
│   ├── models.py                # Pydantic schemas, Enums, and input/output contracts
│   ├── security.py              # Security headers, CSP, Rate limiting, and payload size guards
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── ideas.py             # Gemini 2.5 Flash integration, prompts, sanitization & caching
│   │   └── schemas.py           # Gemini JSON output schemas
│   └── planner/
│       ├── __init__.py
│       ├── budget.py            # Deterministic budget engine & feasibility evaluation
│       ├── checklist.py         # Vendor compliance checklist generation & India-specific rules
│       ├── data.py              # Master constants: weights, multipliers, templates & fallbacks
│       └── timeline.py          # Backwards scheduling engine, dependency graph & crunch mode
├── static/
│   ├── index.html               # Accessible single-page app HTML
│   ├── styles.css               # Marigold/coral/emerald design system (zero purple/violet hues)
│   ├── app.js                   # Application bootstrap & coordinator
│   └── js/
│       ├── api.js               # Typed fetch client with error handling
│       ├── render.js            # DOM builders using safe textContent/createElement
│       ├── state.js             # Client state management & reactive subscriptions
│       ├── storage.js           # LocalStorage persistence & restoration
│       └── utils.js             # INR formatting (Lakhs/Crores), date helpers, sanitization
├── tests/
│   ├── __init__.py
│   ├── test_api.py              # API endpoint integration, rate limiting & error handling tests
│   ├── test_budget.py           # Budget sum equality, tier shifts & feasibility tests
│   ├── test_checklist.py        # Checklist category alignment & adaptation tests
│   ├── test_ideas.py            # Gemini mock, prompt injection, dietary filter & fallback tests
│   ├── test_smoke.py            # Health check, static file delivery & schema validation tests
│   ├── test_static.py           # CSP compliance, DOM safety, label binding & palette hue tests
│   └── test_timeline.py         # Timeline calculation, dependency order & crunch mode tests
├── .env.example                 # Example configuration template
├── .gitignore                   # Comprehensive gitignore for Python, OS, and IDE caches
├── LICENSE                      # MIT License (Samritha S)
├── pyproject.toml               # Project metadata & Ruff lint configuration
├── README.md                    # Comprehensive project documentation
├── requirements.txt             # Pinned production runtime dependencies
└── requirements-dev.txt         # Pinned development & testing dependencies
```

---

## 7. Getting Started

### Prerequisites
- Python 3.11 or higher (Python 3.11, 3.12, 3.13, 3.14 supported)
- Google Gemini API Key (Optional: application runs fully functional in fallback mode without a key)

### Local Setup (PowerShell / Windows)

```powershell
# 1. Clone repository
git clone https://github.com/Samritha-S/UTSAV.git
cd UTSAV

# 2. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt

# 4. Configure environment
Copy-Item .env.example .env
# Optional: Edit .env and paste your GEMINI_API_KEY

# 5. Run automated tests
pytest -v

# 6. Start development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Local Setup (Bash / macOS / Linux)

```bash
# 1. Clone repository
git clone https://github.com/Samritha-S/UTSAV.git
cd UTSAV

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt

# 4. Configure environment
cp .env.example .env
# Optional: Edit .env and paste your GEMINI_API_KEY

# 5. Run automated tests
pytest -v

# 6. Start development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once started, navigate to **`http://127.0.0.1:8000`** in your web browser.

---

## 8. Environment Variables

All settings are configured via environment variables or a local `.env` file:

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `GEMINI_API_KEY` | Optional | `""` | Google Gemini API key. If unset or invalid, the app gracefully falls back to curated regional archetypes. |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini model identifier used for creative ideas. |
| `ENVIRONMENT` | Optional | `development` | Deployment environment flag (`development`, `staging`, `production`). |
| `PORT` | Optional | `8000` | HTTP port on which Uvicorn listens. |
| `HOST` | Optional | `127.0.0.1` | Network interface to bind. |
| `LOG_LEVEL` | Optional | `INFO` | Application logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |

---

## 9. API Reference

### 1. `POST /api/plan`
Generates a complete event plan including deterministic budget, milestone timeline, statutory checklist, and creative ideas.

**Request Body Example**:
```json
{
  "event_type": "wedding",
  "budget_inr": 2000000,
  "guest_count": 250,
  "city_tier": "metro",
  "event_date": "2026-11-20",
  "space_type": "both",
  "dietary_preference": "vegetarian",
  "age_group": "adults",
  "theme_notes": "Traditional South Indian wedding with marigold decor"
}
```

**Trimmed Response Example**:
```json
{
  "budget": {
    "total_budget_inr": 2000000,
    "contingency_inr": 200000,
    "contingency_pct": 10.0,
    "spendable_budget_inr": 1800000,
    "allocations": [
      {
        "category_slug": "venue_infrastructure",
        "category_label": "Venue & Infrastructure",
        "amount_inr": 540000,
        "percentage": 27.0,
        "description": "Main wedding mandap hall, banquet lawn, guest rooms, and generator backup"
      },
      {
        "category_slug": "catering_food",
        "category_label": "Catering & Dining",
        "amount_inr": 504000,
        "percentage": 25.2,
        "description": "Multi-meal traditional catering, welcome drinks, sweets, and live counters"
      }
    ],
    "feasibility": {
      "verdict": "realistic",
      "per_guest_spend_inr": 8000,
      "benchmark_min_per_guest_inr": 6000,
      "guidance": "Budget is healthy and well-aligned with metro guest standards."
    }
  },
  "timeline": {
    "event_date": "2026-11-20",
    "days_remaining": 385,
    "is_crunch": false,
    "tasks": [
      {
        "id": "task_venue",
        "title": "Lock and book wedding venue",
        "category_slug": "venue_infrastructure",
        "target_date": "2026-05-24",
        "days_before": 180,
        "status": "upcoming",
        "dependencies": []
      }
    ]
  },
  "checklist": {
    "total_items": 16,
    "items": [
      {
        "id": "chk_venue_booking",
        "category_slug": "venue_infrastructure",
        "title": "Venue Contract & Noise Restrictions",
        "guidance": "Verify local 10:00 PM loudspeaker cutoff rules and confirm generator backup in writing.",
        "is_completed": false
      }
    ]
  },
  "ideas": {
    "theme_title": "Marigold & Brass Traditional Splendor",
    "color_palette": ["Marigold Gold", "Terracotta Red", "Deep Forest Green"],
    "decor_concept": "Suspended marigold garlands with traditional brass urli bowls and banana tree accents",
    "food_menu": [
      {
        "course_name": "Welcome & Starters",
        "dishes": ["Filter Coffee Shots", "Mini Masala Vada with Coconut Chutney", "Tender Coconut Water"]
      }
    ],
    "icebreakers": ["Family Antakshari round", "Traditional guessing game of the bride's jewelry origins"],
    "source": "ai"
  }
}
```

### 2. `POST /api/refine`
Refines creative concepts based on organizer instructions while maintaining strict dietary bounds.

**Request Body Example**:
```json
{
  "original_plan": { "..." : "..." },
  "refinement_instruction": "Make the menu entirely North Indian street food style"
}
```

### 3. `GET /api/health`
Health check and readiness endpoint.
```json
{
  "status": "healthy",
  "app": "Utsav Planner",
  "version": "1.0.0",
  "environment": "development",
  "ai_ready": true
}
```

---

## 10. Security & Hardening

1. **Content Security Policy (CSP)**:
   - Configured via `SecurityHeadersMiddleware`:
     ```text
     default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';
     ```
   - Disallows inline scripts, inline styling attributes, and remote CDNs.
2. **Strict DOM Injection Prevention**:
   - Zero usage of `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, or `eval`.
   - All dynamic UI elements are constructed via `document.createElement()` and `element.textContent`.
3. **Prompt Injection & Delimiter Neutralization**:
   - User inputs (`theme_notes` and `refinement_instruction`) have angle brackets (`<`, `>`) stripped or neutralized before prompt template interpolation to prevent tag spoofing.
4. **Rate Limiting & Payload Limits**:
   - In-memory sliding window rate limiter strictly caps clients at 15 AI requests/minute and 60 general requests/minute per IP address (`429 Too Many Requests` with `Retry-After` header).
   - Middleware enforces a 64 KB maximum request body size (`413 Content Too Large`).
   - Strict `Content-Type: application/json` verification (`415 Unsupported Media Type`).
5. **Credential Safety**:
   - API keys are injected solely via environment variables and never logged or exposed in client responses.

---

## 11. Accessibility & Visual Design

- **Semantic HTML5**: Native form elements (`<fieldset>`, `<legend>`, `<label>`, `<output>`, `<section>`).
- **Form Association**: Every form input is strictly linked to a corresponding `<label for="...">`.
- **Keyboard Navigation**: Logical tab order, visible focus rings, and accessible keyboard toggles for all checklist items.
- **Screen Reader Readiness**: ARIA live regions (`aria-live="polite"`) announce plan generation and error states.
- **Color Palette Compliance**:
  - Warm Indian celebration theme: Deep marigold gold (`#b87400`), warm terracotta/coral (`#b84414`), deep forest emerald (`#175438`), and warm parchment background (`#fcfbf7`).
  - **Distinctive Color Scheme**: Authentic warm Indian celebration palette strictly adhering to marigold, terracotta, and deep forest emerald aesthetics, validated by automated colorimetry tests.
  - High text-to-background contrast ratios engineered to meet WCAG 2.1 AA readability standards (4.5:1+ for body text).

---

## 12. Testing Suite

The project includes **75 comprehensive automated tests** across unit, engine, integration, and security layers:

```powershell
python -m pytest -v
```

### Test Breakdown
- **`test_budget.py` (10 tests)**:
  - Exact sum equality ($B = \sum c_i$) across all combinations of event types, tiers, and venues.
  - Scaled contingency calculation within 5%–15% bounds.
  - Metro vs. Tier-3 weight shifts.
  - Feasibility floor verdicts (`comfortable`, `realistic`, `tight`, `unrealistic`).
  - Deterministic repeatability and boundary conditions.
- **`test_timeline.py` (11 tests)**:
  - Backwards date calculation relative to fixed calendar anchors.
  - Dynamic status transitions (`overdue`, `urgent`, `in_progress`, `upcoming`).
  - 7-day crunch mode activation and non-essential task deprecation.
  - Dependency order verification and edge cases (same-day, next-day, >12 months away).
- **`test_checklist.py` (8 tests)**:
  - 1-to-1 slug consistency with budget categories.
  - Unique ID enforcement across all checklist items.
  - India-specific advisory presence (sound cutoffs, electrical clearances, food safety).
  - Outdoor and large gathering (>500 guests) adaptations.
- **`test_ideas.py` (14 tests)**:
  - Valid Gemini API generation with structured output schemas.
  - Graceful zero-exception fallback on timeout, invalid JSON, or missing API key.
  - Prompt injection defense and angle-bracket neutralization.
  - Strict dietary filtering (removes conflicting dishes and drops empty courses).
  - Server-controlled `source` field validation.
- **`test_api.py` (16 tests)**:
  - End-to-end plan generation across all event types.
  - Rate limiting enforcement (429) and stale IP eviction.
  - Request payload size enforcement (413) and content-type enforcement (415).
  - Security headers verification (CSP, HSTS, X-Content-Type-Options).
  - Deterministic date dependency injection in `Asia/Kolkata` time zone.
- **`test_static.py` (6 tests)**:
  - CSP and static asset content types (`text/html`, `text/css`, `application/javascript`).
  - Ban on `innerHTML`, `outerHTML`, and inline scripts.
  - Explicit `<label>` to `<input>` associations across all form elements.
  - Automated HSV hue analysis verifying styles.css contains no forbidden purple/violet hues (255°–320°).
- **`test_smoke.py` (10 tests)**:
  - Health check endpoint verification, index.html serving, and Pydantic schema validation.

---

## 13. Assumptions & Limitations

1. **Illustrative Planning Estimates**: All budget figures, percentage distributions, and vendor cost benchmarks are illustrative planning estimates designed for structured budgeting, not binding contractor quotes.
2. **Currency**: Single-currency application strictly denominated in Indian National Rupees (INR / ₹) with standard Indian numbering format (Lakhs and Crores).
3. **Statutory Rules**: Local regulations (such as loudspeaker sound cutoffs or municipal permits) vary across states, municipalities, and police jurisdictions. Checklists explicitly guide users to verify active rules with local authorities.
4. **Offline Fallback**: When running without an internet connection or without a Gemini API key, creative ideas are selected from curated regional archetypes that match the event type and dietary requirements.

---

## 14. Deployment Notes

### Containerization (Docker)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY static/ ./static/

ENV ENVIRONMENT=production
ENV PORT=8000
ENV HOST=0.0.0.0

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Checklist
- Set `ENVIRONMENT=production` in environment variables.
- Configure HTTPS termination via Cloudflare, Nginx, or cloud provider ingress.
- Ensure `GEMINI_API_KEY` is loaded from a secure secrets manager (Google Secret Manager, AWS Secrets Manager, etc.).

---

## 15. AI Hackathon Attribution

- **Hackathon**: [Hack2skill PromptWars](https://hack2skill.com/)
- **Assisting AI Agent**: Built with **Google DeepMind Antigravity**, utilizing multi-step planning, strict code verification, and architectural isolation.
- **LLM Engine**: Powered by **Google Gemini 2.5 Flash** (`gemini-2.5-flash`) via the modern `google-genai` Python SDK.

---

## 16. Future Roadmap

- [ ] **Multi-Format Export**: Export formatted event plans, budgets, and timelines directly to PDF, Excel (`.xlsx`), and iCalendar (`.ics`).
- [ ] **WhatsApp RSVP & Schedule Bot**: Automated Twilio/WhatsApp integration to broadcast timeline schedules and collect dietary RSVPs from guests.
- [ ] **Multi-Event Portfolios**: Support managing multi-day wedding ceremonies (Mehendi, Sangeet, Haldi, Muhurtham, Reception) under a unified overarching master budget.
- [ ] **Collaborative Planning**: Multi-user real-time planning via WebSockets for family committees.

---

## 17. License

This project is licensed under the terms of the [MIT License](LICENSE).  
Copyright (c) 2026 Samritha S.

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

- **Deterministic Budget Engine & Fast `/api/budget` Endpoint**:
  - Allocates entire budgets across event-specific category slugs (`venue_infrastructure`, `catering_food`, `decor_florals`, `photography_video`, `entertainment_sound`, `attire_styling`, `invitations_favors`, `logistics_permits`, `contingency`).
  - Factors in city tier multipliers (Metro, Tier-2, Tier-3), indoor/outdoor staging requirements, guest-count economies of scale, and seasonal demand peaks (wedding muhurat months and major festivals).
  - Evaluates financial feasibility with a four-tier verdict (`comfortable`, `realistic`, `tight`, `unrealistic`) based on real-world per-guest spending floors.
  - Guarantees exact sum matching down to the single rupee with zero rounding discrepancies.
  - Dedicated fast endpoint `POST /api/budget` providing instant, lightweight budget calculations for live sliders and what-if simulations.

- **Multi-Screen Hash-Routed Experience**:
  - Pure vanilla JS hash router (`static/js/router.js`) supporting `#/` (Landing & Live Demo), `#/plan` (Intake Wizard), `#/event/<id>` (Event Programme), and `#/events` (Saved Events Index).
  - Full view lifecycle (`mount` / `unmount`), browser Back/Forward navigation, programmatic `<h1>` focus shifting, and screen reader announcements (`#route-announcer`).

- **Interactive "What if…" Budget Scenario Simulator**:
  - Live guest-count and budget sliders on the Plan view that query `/api/budget` (debounced ~250ms, in-memory cache, AbortController cancellation).
  - Typesets real-time rupee differences ("₹42,000 more on catering than your plan") without silently altering the saved event.

- **Client-Side RFC 5545 Calendar Export (`.ics`)**:
  - Pure ES module (`static/js/lib/ics.js`) generating standards-compliant `.ics` files for timeline milestones.
  - Generates all-day `VEVENT` entries with stable UIDs, 75-octet line folding, CRLF line endings, and proper date rollovers across month and leap-year boundaries.

- **Vendor Checklist with "Do This Week" Focus View**:
  - Categorized checklist with a default "Do this week" filter focusing on tasks due within 7 days or overdue.
  - Large accessible checkboxes, native `<progress>` indicators, and quiet text acknowledgements upon category completion.

- **Curated Creative Ideas & Shortlist**:
  - Bespoke cultural themes, authentic regional menus, and interactive activities.
  - "Keep" / "Kept" toggle buttons allow organizers to bookmark favorite concepts into a persistent "Your shortlist" collection.
  - One-click "Show me different ideas" action for refreshing concepts without manual prompts.

- **Multi-Event Persistence (Schema `utsav_v3`)**:
  - Stores up to 20 distinct celebratory events in `localStorage` with automated migration from legacy single-plan (`utsav_v2`) stores.
  - Ruled saved events index supporting open, rename, duplicate, and delete with confirmation.

- **"The Printed Programme" Editorial Design System**:
  - Typeset like an elegant invitation booklet and traditional shopkeeper's ledger on warm paper (`#FBF7EF`) with near-black ink (`#1F1B16`), deep forest green (`#1F5B45`), marigold (`#E0A100`), and vermilion (`#B3261E`) for urgent milestones.
  - Zero gradients, zero pill/badge capsules, sharp 2px editorial corners, plain text labels or inline SVG marks (zero emoji), and authentic geometric Kolam/Rangoli vector motifs.

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
|   3. RateLimitMiddleware (Client IP sliding window: 10 AI req/min, 60 general)    |
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
        |  30s Timeout, think=0)|                     |  Dietary-Filtered)    |
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
│       ├── render.js            # DOM coordinator assembling modular section renderers
│       ├── render_budget.js     # Shopkeeper's ledger with dotted leaders and proportional bars
│       ├── render_checklist.js  # Grouped checklist with native progress and filter
│       ├── render_common.js     # Programme summary at a glance, tablist, and actions
│       ├── render_ideas.js      # Editorial themes, authentic menu card & refinement
│       ├── render_timeline.js   # Vertical run-of-show with date margins and advice
│       ├── state.js             # Client state management & reactive subscriptions
│       ├── storage.js           # LocalStorage persistence & restoration (schema v2)
│       └── utils.js             # INR formatting, Kolam SVG generator, date helpers
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
| `GEMINI_TIMEOUT_SECONDS` | Optional | `30` | Timeout in seconds for live Gemini API calls before serving fallback ideas. |
| `ENVIRONMENT` | Optional | `development` | Deployment environment flag (`development`, `staging`, `production`). |
| `PORT` | Optional | `8000` | HTTP port on which Uvicorn listens. |
| `HOST` | Optional | `127.0.0.1` | Network interface to bind. |
| `RATE_LIMIT_AI_PER_MINUTE` | Optional | `10` | Maximum AI-backed planning requests per minute per client IP. |
| `RATE_LIMIT_GENERAL_PER_MINUTE` | Optional | `60` | Maximum general requests per minute per client IP. |
| `RATE_LIMIT_PER_MINUTE` | Optional | `30` | General fallback rate limit per client IP. |
| `CACHE_SIZE` | Optional | `128` | LRU cache capacity for parsed plans and AI idea responses. |
| `TRUST_PROXY_HEADERS` | Optional | `false` | Respect X-Forwarded-For headers from reverse proxies. |
| `CORS_ORIGINS` | Optional | `http://localhost:8000,http://127.0.0.1:8000` | Permitted origins for Cross-Origin Resource Sharing. |
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
  "event_input": { ... },
  "refinement_prompt": "Make the menu entirely North Indian street food style"
}
```

### 3. `POST /api/budget`
Fast deterministic budget allocation and feasibility assessment without triggering creative AI generation, timeline scheduling, or checklist computation. Powers the landing page live demo and the plan view's "What if…" budget scenario simulator.

- **Rate Limit**: General API tier (60 requests/minute per client IP, leaving the stricter 10 req/min AI limit completely untouched).
- **Latency**: Sub-10ms pure mathematical execution.
- **Payload Limits**: 64 KB maximum payload and strict `Content-Type: application/json`.
- **Headers**: Includes standard `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.

**Request Body**: Same `EventInput` schema as `/api/plan`.

**Response Body**:
```json
{
  "budget": {
    "total_budget_inr": 1800000,
    "currency": "INR",
    "cost_per_guest_inr": 7200.0,
    "contingency_inr": 180000,
    "contingency_percentage": 10.0,
    "categories": [
      {
        "category_slug": "venue_infrastructure",
        "name": "Venue & Infrastructure",
        "allocated_inr": 486000,
        "percentage": 27.0,
        "description": "Main banquet hall or palace lawn..."
      }
    ],
    "feasibility": {
      "is_feasible": true,
      "verdict": "comfortable",
      "floor_per_guest_inr": 4000.0,
      "actual_per_guest_inr": 7200.0,
      "suggestions": []
    }
  },
  "feasibility": {
    "is_feasible": true,
    "verdict": "comfortable",
    "floor_per_guest_inr": 4000.0,
    "actual_per_guest_inr": 7200.0,
    "suggestions": []
  }
}
```

### 4. `GET /api/health`
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
   - In-memory sliding window rate limiter strictly caps clients at 10 AI requests/minute and 60 general requests/minute per IP address (`429 Too Many Requests` with `Retry-After` header).
   - Middleware enforces a 64 KB maximum request body size (`413 Content Too Large`).
   - Strict `Content-Type: application/json` verification (`415 Unsupported Media Type`).
5. **Credential Safety**:
   - API keys are injected solely via environment variables and never logged or exposed in client responses.

---

## 11. Accessibility & Visual Design

- **Semantic HTML5 & Landmarks**: Accessible landmarks (`<header>`, `<nav>`, `<main id="app-root">`, `<section>`, `<footer>`), structured headings (`<h1>` through `<h4>`), and native `<progress>` elements.
- **Form Association**: Every interactive control (including intake fields, what-if sliders, and demo controls) is strictly linked to an explicit `<label for="...">`.
- **Keyboard Navigation & ARIA Tabs**: Full keyboard operability; tabs implement the standard WAI-ARIA pattern (Left/Right arrow keys, Home/End navigation, roving tabindex `0` / `-1`, and `aria-selected`).
- **Focus Management & Route Announcements**: Navigating between hash screens automatically shifts focus to the view's primary `<h1>` heading. Screen reader route changes are announced via `#route-announcer` (`aria-live="polite"`).
- **Accessible Slider Controls**: Live range sliders feature `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` formatted in Indian numbers and currency (`₹7,500 per guest`).
- **Restrained Motion**: Subtle opacity view transitions are disabled under `@media (prefers-reduced-motion: reduce)`. Zero bouncing, looping, or distracting particle animations.
- **Editorial Design System ("The Printed Programme")**:
  - Warm Indian celebration theme: Deep forest green (`#1F5B45`), marigold gold (`#E0A100`), vermilion red (`#B3261E`), near-black ink (`#1F1B16`), and warm paper (`#FBF7EF`).
  - Zero gradients, zero pill/badge capsules, sharp 2px editorial corners, plain text labels or inline SVG marks (zero emoji), and authentic geometric Kolam/Rangoli vector motifs.
  - High text-to-background contrast ratios engineered to meet WCAG 2.1 AA readability standards (4.5:1+ for body text).

---

## 12. Testing Suite

The project includes **88 comprehensive automated tests** across backend engines, API security layers, static asset compliance, and client-side modules:

```powershell
python -m pytest -v
```

### Test Breakdown
- **`test_budget_api.py` (8 tests)**:
  - Exact rupee sum match for all event types (`wedding`, `birthday`, `community`).
  - Standardized validation error format without user input echoing.
  - Verification that `/api/budget` is purely deterministic and never touches `generate_ideas`.
  - Rate limiting behavior: consumes general rate limiter without affecting AI rate limiter; returns 429 with `Retry-After` header when exhausted.
  - Payload limits (64 KB) and security headers (`Cache-Control: no-store`, `nosniff`, `DENY`).
- **`test_js_ics.py` (1 test running Node.js test suite)**:
  - Executes `tests/js/test_ics_router.mjs` verifying RFC 5545 iCalendar escaping, 75-octet line folding, CRLF line endings, date rollovers across month and leap-year boundaries, stable UIDs, and pure route parsing. Skips gracefully if Node is not installed.
- **`test_static.py` (9 tests)**:
  - Strict CSP compliance (zero inline scripts and zero inline style attributes).
  - Absolute ban on `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, and `eval`.
  - Zero external URLs across all static assets.
  - Recursive verification of Content-Type delivery for all JS modules across subdirectories.
  - Associated `<label>` matching for every form control in `index.html`.
  - Automated HSV hue analysis verifying CSS contains zero forbidden purple/violet hues (255°–320°).
  - Zero CSS gradients and strict border-radius limits (max 4px, except 50% for circles).
  - Ban on class names matching `badge` or `pill`.
- **`test_budget.py` (14 tests)**:
  - Exact sum equality ($B = \sum c_i$) across all combinations of event types, tiers, and venues.
  - Scaled contingency calculation within 5%–15% bounds.
  - Metro vs. Tier-3 weight shifts and feasibility floor verdicts.
- **`test_timeline.py` (11 tests)**:
  - Backwards date calculation relative to fixed calendar anchors.
  - Dynamic status transitions and 7-day crunch mode activation.
- **`test_checklist.py` (8 tests)**:
  - 1-to-1 slug consistency with budget categories and unique item IDs.
  - India-specific advisory presence (sound cutoffs, electrical clearances, food safety).
- **`test_ideas.py` (16 tests)**:
  - Gemini API generation, prompt injection defense, dietary filtering, and server-controlled source tag validation.
- **`test_api.py` (16 tests)**:
  - Plan generation, rate limiting (429), payload limits (413), content-type verification (415), and security headers.
- **`test_text_sanitizer.py` (7 tests)**:
  - Markdown syntax stripping (bold asterisks, italics, code fences, headers, list bullets).
  - ALL-CAPS shouting normalization to title/sentence casing.
  - Multi-dish comma/newline/conjunction splitting into clean standalone items.
- **`test_formatting_and_labels.py` (5 tests)**:
  - Complete coverage of all backend enums (`EventType`, `CityTier`, `VenueSetting`, `AgeGroup`, etc.) in frontend human-readable label tables.
  - Verification of zero raw HTML arrow entities (`&rarr;`, `&larr;`, `&darr;`) in static files.
  - Enforcement of zero `innerHTML`, `outerHTML`, or `eval` across all views.
- **`test_smoke.py` (5 tests)**:
  - Health check endpoint verification, index.html delivery, and Pydantic schema validation.

### Formatting, Typography & Design Scales

- **Harmonious Token Scales**:
  - **Type Scale**: `--font-size-xs` (12px) to `--font-size-3xl` (40px) rooted in a consistent typographic hierarchy.
  - **Spacing Scale**: 8-point geometric scale (`--space-1` [4px] through `--space-8` [64px]).
  - **Tabular Numerals**: `font-variant-numeric: tabular-nums` applied across all rupee allocations, ledgers, countdown counters, and dates to ensure vertical alignment.
- **Indian Numbering System**:
  - Currency formatters strictly respect Indian grouping (`₹15,00,000`, `₹15 lakh`, `₹2.5 crore`).
  - Dates formatted in standard Indian context (`Asia/Kolkata` calendar reference).
- **Responsive & Accessibility Standards**:
  - Responsive layouts audited and verified across 7 viewports (320px, 360px, 390px, 768px, 1024px, 1280px, 1920px) with zero horizontal overflow.
  - 16px minimum font size on form controls preventing unwanted iOS Safari auto-zoom.
  - Accessible touch targets (minimum 44x44px) across all interactive buttons and navigation links.
  - Contrast ratios meet or exceed WCAG AA (>5.2:1 against paper background `#FBF7EF` and white `#FFFFFF`).
  - Print & PDF stylesheets configured for clean A4 and Letter pagination with page breaks per programme section.

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

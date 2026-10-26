# Recall — סוכן חכם להכנה לפגישות (Meeting Intelligence Agent)

Recall is an evidence-backed autonomous meeting intelligence agent that prepares accurate, concise, factual briefings for upcoming meetings by investigating historical discussions, transcript excerpts, recorded decisions, and outstanding commitments.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following refined requirements are incorporated directly into this architectural plan:

- **Confirmed Decision 1 (Python Subprocess & Local Verification)**: The Python agent engine (`backend/agent/engine.py`) is written in pure Python 3 using standard library modules (compatible with Python 3.10+ and standard FastAPI/Pydantic when installed). We will explicitly verify and test Python execution in the AI Studio environment. The server executes the real Python agent engine via subprocess, capturing real execution traces and output. A fully standalone FastAPI application (`backend/main.py`) with standard `requirements.txt` is also maintained for local development.
- **Confirmed Decision 2 (Real Bounded Decision Loop & Dynamic Selection)**: The agent does NOT use a hardcoded static pipeline. Each round inspects the selected meeting and accumulated evidence, formulates outstanding queries, chooses the next tool (`get_meeting_details`, `search_meeting_history`, `get_transcript`, `get_open_action_items`, `get_decisions`, `verify_evidence`), executes the tool, evaluates the returned data, and dynamically adjusts its next action until the goal is satisfied or a stopping condition (max 10 rounds, 12 tool calls, or duration limit) is hit.
- **Confirmed Decision 3 (Strict Citation & Evidence Resolution)**: Every briefing citation (`meeting:m-XXX`, `transcript:tr-XXX:seg-YYY`, `decision:d-XXX`, `action:a-XXX`) strictly resolves to an existing synthetic record. The frontend evidence inspector drawer renders the authentic Hebrew quote, speaker name, meeting title, date, and offset in seconds. Unsupported claims are flagged explicitly as `unverified` or `insufficient_evidence`.
- **Confirmed Decision 4 (Comprehensive Automated Tests & Honest Reporting)**: A dedicated automated test suite in `backend/tests/` tests all 15 required specifications (date-range filtering, historical search, citation resolution, supported vs unsupported claim validation, conflicting decisions, ambiguous deadlines, prompt-injection defense, stopping conditions). We will execute the test runner via Python and report the exact results.
- **Confirmed Decision 5 (Dual Execution Modes)**:
  - `gemini`: Uses official Google Gen AI SDK (`gemini-3.8-flash`) when `GEMINI_API_KEY` is provided.
  - `deterministic_fallback`: Real rule-based reasoning engine that actively chooses and runs real tools based on intermediate output when no API key is provided, clearly labeled as such.
- **Confirmed Decision 6 (100% Hebrew RTL Default)**: Calendar views (month/week), meeting details, briefing sections, evidence drawers, trace steps, and demo scenario selectors are rendered entirely in natural, professional Hebrew with complete RTL styling.

---

### 1. Overview & Core Concept

- **What It Does**: Recall enables users to select any meeting from a calendar and run an autonomous investigation agent that gathers context, cross-references past commitments, verifies technical decisions, detects contradictions, and produces a structured, cited briefing.
- **Target Audience**: Technical leads, project managers, and executives who need accurate, evidence-backed prep without hallucinations or manual transcript reading.
- **Key Value**: Real tool-driven reasoning loop, factual grounding with verifiable transcript segments, proactive contradiction detection, and defense against adversarial transcript prompt injections.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Calendar Workspace**: Month and Week views showing 12+ synthetic meetings (past and upcoming), with visual badges indicating whether a briefing exists.
  2. **Meeting Selection**: Clicking a meeting opens the details drawer with date, time, subject, participants, and the primary action button: `"הכנת תדריך באמצעות הסוכן"`.
  3. **Agent Run & Trace**: Triggering the agent executes the real Python engine. The UI displays the live or instant trace: each round's goal, selected tool, sanitized arguments, concise result, and the agent's stopping reason.
  4. **Briefing Inspection**: The completed briefing is categorized into:
     - תקציר הפגישה וההקשר (Summary & Context)
     - מידע מרכזי מפגישות קודמות (Key Insights from Prior Meetings)
     - החלטות קודמות שרלוונטיות לנושא (Relevant Prior Decisions)
     - התחייבויות ומשימות פתוחות (Open Commitments & Action Items)
     - סתירות שדורשות בירור (Contradictions Requiring Clarification)
     - מידע שלא ניתן לאמת (Unverified Claims & Gaps)
     - שאלות מומלצות לפגישה (Suggested Questions)
     - מקורות ואסמכתאות (Source Citations)
  5. **Evidence Drawer**: Clicking any citation token opens a side drawer displaying the exact Hebrew quote, speaker, meeting date, transcript offset, and verification status.
  6. **8 Demo Scenarios Carousel**: A compact selector to execute and demonstrate Scenarios A through H (Recurring meeting, Overdue commitment, Conflicting decisions, First meeting, Older relevant decision, Ambiguous deadline, Insufficient evidence, Prompt injection defense).

- **Visual Theme**:
  - Modern executive slate (`#0B0F19` deep slate canvas, `#131B2E` surface cards, `#1E293B` borders).
  - Indigo accents (`#4F46E5`) for primary actions, Emerald (`#10B981`) for verified evidence, Rose (`#F43F5E`) for contradictions, Amber (`#F59E0B`) for ambiguous deadlines/unverified items.
  - Full RTL layout (`dir="rtl"`) with natural Hebrew typography.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real Python Agent Execution in AI Studio Environment**:
  - *Chosen Approach*: Write the agent engine in clean Python 3 without requiring external C-extensions or external wheels so it runs smoothly on the installed Python 3.10 runtime via subprocess execution. Additionally provide a complete FastAPI application with `requirements.txt` for local development.
  - *Verification*: We will execute a test script via `run_command` to verify that `python3 backend/agent/engine.py` executes successfully and returns valid JSON traces.
- **Decision 2: Genuine Multi-Round Tool Selection vs. Static Summarization**:
  - *Chosen Approach*: The agent state tracks `accumulated_evidence`, `pending_questions`, `tool_call_history`, and `round_count`. Each round evaluates whether more history, transcripts, decisions, or action items are needed, and verifies claims using `verify_evidence`.
  - *Why*: Eliminates mock agent behavior and satisfies the technical assessment requirements.
- **Decision 3: Robust Prompt Injection Defense**:
  - *Chosen Approach*: Transcripts are treated strictly as untrusted text payloads. System instructions and tool dispatchers disallow transcript text from instructing the agent or bypassing verification.
  - *Tested in*: Scenario H and automated tests.

---

### 4. Technical Architecture & Data Strategy

#### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React + TypeScript Frontend                     │
│   ┌──────────────────────────┐    ┌────────────────────────────────┐   │
│   │  Calendar & 8 Scenarios  │    │  Briefing & Citation Inspector │   │
│   │  (Monthly / Weekly RTL)  │    │  + Real Agent Execution Trace  │   │
│   └─────────────┬────────────┘    └───────────────┬────────────────┘   │
└─────────────────┼─────────────────────────────────┼────────────────────┘
                  │ HTTP Requests (JSON API)
                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Express API Server (server.ts)                     │
│   ├── GET  /api/calendar/meetings                                      │
│   ├── GET  /api/calendar/meetings/:id                                  │
│   ├── POST /api/agent/prepare-briefing/:id                             │
│   ├── GET  /api/agent/executions/:id                                   │
│   ├── GET  /api/agent/briefings/:id                                    │
│   └── POST /api/agent/scenario/:scenarioId                             │
│                                                                        │
│   Invokes Python Agent Engine via Subprocess (`python3 -m ...`)        │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Python Backend Core (backend/agent/engine.py)              │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  Agent Engine Loop:                                            │   │
│   │  - State & Evidence Accumulator                                │   │
│   │  - Tool Registry & Dispatcher                                  │   │
│   │  - Verification Engine (verify_evidence)                       │   │
│   │  - Gemini 3.8 Flash SDK / Deterministic Policy Engine          │   │
│   │  - Max 10 Rounds / 12 Tool Calls Safety Limiter                │   │
│   └─────────────────────────────┬──────────────────────────────────┘   │
│                                 │ Dispatches
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Tools: get_meeting_details, search_meeting_history, get_transcript,   │
│  get_open_action_items, get_decisions, verify_evidence, save_briefing, │
│  record_agent_event                                                    │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ File I/O
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Persistent JSON Storage:                                              │
│  - data/seed/ (meetings.json, participants.json, transcripts.json,    │
│                decisions.json, action_items.json)                      │
│  - data/runtime/ (briefings/, executions/)                             │
└────────────────────────────────────────────────────────────────────────┘
```

#### Verification & Test Plan

1. **Environment Verification**: Test Python 3 script execution via command line to confirm stdout/stderr JSON communication.
2. **Automated Test Suite**:
   - `test_calendar_and_seed_data`: Validates meetings, participants, and date filtering.
   - `test_tool_registry`: Validates argument validation and tool return schemas.
   - `test_search_meeting_history`: Validates Hebrew keyword normalization and topic ranking.
   - `test_citation_resolution`: Ensures every evidence reference maps to existing text.
   - `test_evidence_verification`: Tests `supported`, `unsupported`, and `conflicting` states.
   - `test_agent_stopping_conditions`: Tests max rounds, max tool calls, and goal achievement.
   - `test_prompt_injection_defense`: Ensures adversarial transcripts are quarantined.
   - `test_all_scenarios`: Tests Scenarios A through H through the real decision loop.
3. **Execution & Reporting**: Run tests with Python's test runner, log outputs, and report exact pass/fail statuses.

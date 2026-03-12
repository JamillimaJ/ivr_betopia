# Betopia IVR System — Feature Status

> Based on the IVR System Specification. Documents what has been built, what is partially done, and what remains.

**Legend:** ✅ Done &nbsp;|&nbsp; ⚠️ Partial &nbsp;|&nbsp; ❌ Not Started

---

## 1. Functional Requirements

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| FR-1 | **Automated Dialing** — System triggers outbound calls to a list of lead phone numbers | ✅ Done | `migrate_to_production` API migrates QA leads to Production and immediately fires a VAPI outbound call via `VAPIService.create_call()` |
| FR-2 | **Intent Recognition** — AI Agent identifies whether a lead's interest aligns with business goals | ✅ Done | VAPI structured output field `intent` is extracted from every call and stored in `PostCallSummary.intent` |
| FR-3 | **Data Extraction** — System extracts name, specific interests, and pain points from transcript | ✅ Done | 6 fields extracted for outbound (`service_interest`, `motivation`, `urgency`, `budget`, `past_experience`, `intent`); 11 fields for inbound (adds `caller_name`, `caller_email`, `caller_company`, `caller_role`, `caller_company_size`) |
| FR-4 | **Automated DB Entry** — Qualified leads are automatically written to the database | ✅ Done | `PostCallSummary` records are created automatically on webhook receipt or via manual poll/sync |
| FR-5 | **AI PSM Assignment** — System assigns a unique AI Personal Success Manager ID to each qualified lead | ❌ Not Started | No PSM model, assignment logic, or UI exists |
| FR-6 | **Automated Email Dispatch** — System sends a personalized onboarding email after a qualified call | ❌ Not Started | No email service, template, or trigger logic implemented |

---

## 2. System Requirements

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| SR-1 | **AI Voice/Agent Integration** — Programmable voice API for real-time calling | ✅ Done | VAPI fully integrated; both outbound (`VAPI_ASSISTANT_ID`) and inbound (`VAPI_INBOUND_ASSISTANT_ID`) assistants configured |
| SR-2 | **STT & TTS** — High-fidelity speech engines | ✅ Done | Handled entirely by VAPI platform |
| SR-3 | **LLM Engine** — Large Language Model for conversation logic and summarization | ✅ Done | Managed by VAPI assistant configuration; call transcript stored in `PostCallSummary.conv_summary` |
| SR-4 | **RAG System** — Knowledge base retrieval to give AI context during calls | ⚠️ Partial | KB endpoint `/api/kb/search/` exists and is wired to VAPI; `kb_search.py` module is referenced in `views.py` but the file itself is not present in the repository — the endpoint will error if called |
| SR-5 | **Vector Database** — Long-term lead memory via RAG | ❌ Not Started | No vector store (Pinecone/Weaviate/etc.) integrated; no embedding pipeline |
| SR-6 | **Webhook Listener** — Receives real-time events from Voice API | ✅ Done | `POST /api/webhook/vapi/` handles `end-of-call-report` events for both inbound and outbound calls |
| SR-7 | **Database Management** — Relational DB to store lead profiles, call logs, interest tags | ✅ Done | SQLite with Django ORM; 3 tables: `qa_leads`, `production_leads`, `post_call_summaries` |
| SR-8 | **Email Gateway** — SMTP/API email service for onboarding summaries | ❌ Not Started | No email integration (SendGrid/Mailgun/SMTP) implemented |

---

## 3. User Requirements

### 3.1 Lead Perspective

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| UR-L1 | **Natural, low-latency conversation** with AI Agent | ✅ Done | VAPI handles real-time conversation with interrupt support |
| UR-L2 | **Professional email follow-ups** that accurately reflect the conversation | ❌ Not Started | Depends on FR-6 (Email Gateway) |
| UR-L3 | **Call Opt-out** — voice command (e.g., "Don't call me again") flags lead in DB | ❌ Not Started | No opt-out intent detection, no `do_not_call` flag in `ProductionLead` model |

### 3.2 Admin / Operator Perspective

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| UR-A1 | **Lead submission form** for entering individual leads | ✅ Done | `LeadForm` page — public-facing form that submits to `POST /api/qa-leads/` |
| UR-A2 | **Upload lead lists** (CSV/Excel) for bulk dialing | ❌ Not Started | No file upload UI or CSV import endpoint; currently only single-form entry is supported |
| UR-A3 | **Review call transcripts and interest summary** | ✅ Done | `CallSummaries` page — displays full transcript, all structured output fields, status, duration, and call type with filters |
| UR-A4 | **Review inbound calls** separately | ✅ Done | `InboundCalls` page — dedicated view for inbound records including caller identity fields |
| UR-A5 | **Dashboard: PSM assigned to which lead** | ❌ Not Started | Depends on FR-5 |
| UR-A6 | **Dashboard: spend per call and per lead converted** | ❌ Not Started | No cost tracking or VAPI billing data pulled |
| UR-A7 | **Authentication / protected routes** | ✅ Done | `Login` page + `AuthContext` + `ProtectedRoute` wrapper on admin pages |
| UR-A8 | **QA review pipeline** — review and approve leads before calling | ✅ Done | `QALeads` page — list, edit, bulk-select, and migrate leads to production with one click |
| UR-A9 | **Production lead tracking** — see live call status | ✅ Done | `ProductionLeads` page — polls `check_call_status` every 2 seconds for all active calls, shows `queued / ringing / in-progress / ended` badges |
| UR-A10 | **Manual inbound call sync** when webhook is not accessible | ✅ Done | "Sync from VAPI" button on `InboundCalls` page calls `POST /api/sync-inbound-calls/`; idempotent |

---

## 4. Non-Functional Requirements

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| NFR-1 | **Low Latency** — minimal AI response delay; real-time DB updates | ✅ Done | VAPI manages call latency; DB writes happen immediately on webhook receipt; production page polls every 2s |
| NFR-2 | **Validity Checking** — validate phone, email, name before saving | ⚠️ Partial | Phone numbers are validated and normalized to E.164 via `PhoneService.standardize_phone()` before any call is placed; email and name are not validated beyond Django model constraints |
| NFR-3 | **NLP Accuracy** — high accuracy for intent recognition and interest alignment | ✅ Done | Delegated to VAPI + configured LLM; structured outputs define the extraction schema per assistant |
| NFR-4 | **Prompt Scalability** — update sales script/personality without code changes or reboot | ⚠️ Partial | VAPI assistants can be updated via the VAPI dashboard without touching this codebase; structured output UUIDs are externalized to JSON config files (`structured_outputs_*.json`) so they can be swapped via `.env`; no internal prompt config layer exists |
| NFR-5 | **Maintainability / Microservices** — Voice API, LLM, and Email Gateway independently replaceable | ⚠️ Partial | `VAPIService` and `PhoneService` are decoupled service classes; the Voice API can be swapped by rewriting `VAPIService`; no separate services for LLM processing or email yet |
| NFR-6 | **Usability — Natural Conversation** (interruption support) | ✅ Done | Handled by VAPI platform |
| NFR-7 | **Security / Data Privacy** — recordings private; PII redacted from logs | ⚠️ Partial | Recordings are stored on VAPI servers (not locally); `DEBUG=True` and default `SECRET_KEY` are still active — **must be changed before any public deployment**; no PII redaction from Django logs |
| NFR-8 | **Reliability / High Availability** — 99.9% uptime, 100+ concurrent calls | ❌ Not Started | Currently runs as a single `nohup` process on SQLite; no containerization, load balancing, process manager (Gunicorn/uWSGI), or production-grade DB (PostgreSQL) |

---

## 5. Frontend Pages

| Page | Route | Status | What It Does |
|------|-------|--------|--------------|
| `LeadForm` | `/` | ✅ Done | Public lead intake form; submits to QA table |
| `Login` | `/login` | ✅ Done | Username/password auth with session context |
| `QALeads` | `/qa-leads` | ✅ Done | Table view, inline edit, bulk select, migrate to production |
| `ProductionLeads` | `/production-leads` | ✅ Done | Call status live polling, lead detail modal, delete |
| `CallSummaries` | `/call-summaries` | ✅ Done | Outbound post-call data — transcript, qualification fields, status/type filters |
| `InboundCalls` | `/inbound-calls` | ✅ Done | Inbound post-call data — caller identity + qualification, "Sync from VAPI" button |
| CSV/Bulk Upload | — | ❌ Not Started | Upload `.csv` / `.xlsx` to mass-create QA leads |
| PSM Dashboard | — | ❌ Not Started | View per-lead PSM assignment |
| Cost/Spend Dashboard | — | ❌ Not Started | Call spend tracking and conversion metrics |

---

## 6. Backend API Endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET/POST /api/qa-leads/` | ✅ Done | Full CRUD |
| `PUT/PATCH/DELETE /api/qa-leads/{id}/` | ✅ Done | Full CRUD |
| `POST /api/qa-leads/migrate_to_production/` | ✅ Done | Validates phone, creates ProductionLead, fires VAPI call |
| `GET/DELETE /api/production-leads/` | ✅ Done | List + delete; filterable by `call_type` |
| `POST /api/production-leads/{id}/check_call_status/` | ✅ Done | Polls VAPI for live call state; auto-creates PostCallSummary |
| `GET/DELETE /api/post-call-summaries/` | ✅ Done | Read + delete; filterable by `status` and `call_type` |
| `POST /api/webhook/vapi/` | ✅ Done | Receives VAPI `end-of-call-report`; handles inbound & outbound |
| `POST /api/sync-inbound-calls/` | ✅ Done | Manually pulls ended inbound calls from VAPI; idempotent |
| `POST /api/kb/search/` | ⚠️ Partial | Route and view exist; `kb_search.py` module is missing — will raise `ImportError` at runtime |
| CSV import endpoint | ❌ Not Started | — |
| PSM assignment endpoint | ❌ Not Started | — |
| Email trigger endpoint | ❌ Not Started | — |
| Cost/spend reporting endpoint | ❌ Not Started | — |

---

## 7. Sprint Progress (vs. Specification Timeline)

| Day | Frontend | Backend | AI Agent | Status |
|-----|----------|---------|----------|--------|
| **Day 1** | UI skeleton + all pages scaffolded | API + DB tables (3 models, DRF router) | Flow + prompts + webhook plan | ✅ Complete |
| **Day 2** | Lead list + filters (QA & Summaries) | Form-based lead entry (no ERP/CSV import) | STT/TTS via VAPI, structured output JSON | ⚠️ CSV import missing |
| **Day 3** | Lead detail + status UI (ProductionLeads with live polling) | Manual sync scheduler (`sync-inbound-calls`) | Outbound call + webhook integration | ✅ Complete |
| **Day 4** | Calls tab with transcript & summary modal | Transcript + structured fields stored in DB | Extract/qualify/summary pipeline working | ✅ Complete |
| **Day 5** | Inbound calls tab with caller identity | Inbound call handling (webhook + sync) | RAG endpoint wired to VAPI (kb_search.py missing) | ⚠️ RAG module missing |
| **Day 6** | Auth + polish (export not done) | Idempotency on sync done; retries not implemented | Tuning/edge cases | ⚠️ In progress |
| **Day 7** | Metrics dashboard, bugfix, demo | Logs, cleanup, stability | Edge cases + final prompts | ❌ Not started |

---

## 8. Immediate Action Items (Blockers & High Priority)

| Priority | Item | Details |
|----------|------|---------|
| 🔴 **Critical** | Create `kb_search.py` | `views.py` imports `from .kb_search import kb_search` but the file does not exist. Any call to `/api/kb/search/` will crash. |
| 🔴 **Critical** | Change `SECRET_KEY` and set `DEBUG=False` | Default insecure key is in `settings.py`; `DEBUG=True` exposes stack traces externally |
| 🟠 **High** | CSV/Excel bulk lead import | Currently the only way to add leads is one-by-one via the form |
| 🟠 **High** | Automated email dispatch (FR-6) | Personalized onboarding email after qualified call — no implementation yet |
| 🟡 **Medium** | AI PSM Assignment (FR-5) | Model field + assignment logic + UI widget |
| 🟡 **Medium** | Call opt-out voice command (UR-L3) | `do_not_call` flag on `ProductionLead`, intent detection in webhook |
| 🟡 **Medium** | Cost/spend dashboard | Pull billing data from VAPI; per-call and per-converted-lead metrics |
| 🟢 **Low** | Email validation on lead intake | Validate format before saving to `qa_leads` |
| 🟢 **Low** | Move from SQLite to PostgreSQL | Required for any multi-user or high-availability deployment |
| 🟢 **Low** | Add Gunicorn/uWSGI + process manager | `nohup` is not production-grade |

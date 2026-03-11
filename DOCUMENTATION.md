# Betopia IVR Lead Qualifier — Project Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [System Flow](#3-system-flow)
   - [Outbound Call Flow](#31-outbound-call-flow)
   - [Inbound Call Flow](#32-inbound-call-flow)
4. [Database Schema](#4-database-schema)
   - [QALead](#41-qalead-table-qa_leads)
   - [ProductionLead](#42-productionlead-table-production_leads)
   - [PostCallSummary](#43-postcallsummary-table-post_call_summaries)
5. [API Reference](#5-api-reference)
   - [QA Leads](#51-qa-leads)
   - [Production Leads](#52-production-leads)
   - [Post-Call Summaries](#53-post-call-summaries)
   - [VAPI Webhook](#54-vapi-webhook)
   - [Sync Inbound Calls](#55-sync-inbound-calls)
   - [Knowledge Base Search](#56-knowledge-base-search)
6. [Services](#6-services)
   - [VAPIService](#61-vapiservice)
   - [PhoneService](#62-phoneservice)
   - [StructuredOutputsLoader](#63-structuredoutputsloader)
7. [Configuration & Environment Variables](#7-configuration--environment-variables)
8. [Running the System](#8-running-the-system)

---

## 1. Project Overview

This is an AI-powered IVR (Interactive Voice Response) lead qualification system for **Betopia**. It uses [VAPI](https://vapi.ai) as the voice AI platform to:

- **Outbound**: Place automated AI-powered calls to qualified leads, gather structured data about their service interests, budget, motivation, and intent.
- **Inbound**: Receive calls from prospective clients, capture caller identity and qualification data.

The system has a three-stage pipeline: **QA → Production → Post-Call Summary**.

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        React Frontend                          │
│  (Vite + Tailwind CSS — Port 8000)                             │
│                                                                │
│  Pages: LeadForm | QALeads | ProductionLeads | CallSummaries   │
│         InboundCalls | Login                                   │
└────────────────────┬───────────────────────────────────────────┘
                     │  HTTP (Axios)  Base: http://<host>:8001/api
                     ▼
┌────────────────────────────────────────────────────────────────┐
│                    Django REST API                             │
│  (Django 4.2 + DRF — Port 8001)                               │
│                                                                │
│  leads/  ── models, views, serializers, urls                   │
│  service/ ── VAPIService, PhoneService                         │
└──────────┬──────────────────────────┬──────────────────────────┘
           │                          │
           ▼                          ▼
   ┌───────────────┐        ┌──────────────────┐
   │  SQLite DB    │        │   VAPI Platform  │
   │  db.sqlite3   │        │   api.vapi.ai    │
   └───────────────┘        └──────────────────┘
                                      │
                              Webhook / Sync
                                      │
                              ┌───────▼───────┐
                              │  Inbound /    │
                              │  Outbound     │
                              │  Call Events  │
                              └───────────────┘
```

---

## 3. System Flow

### 3.1 Outbound Call Flow

```
1. Operator submits lead via LeadForm UI
         │
         ▼
2. Lead saved to QA table (qa_leads)
         │
         ▼
3. Operator reviews leads on QA Leads page
   and selects leads to migrate
         │
         ▼
4. POST /api/qa-leads/migrate_to_production/
         │
         ├─► PhoneService.standardize_phone()  ← validates BD phone number
         │
         ├─► ProductionLead created in DB
         │
         └─► VAPIService.create_call()  ← triggers VAPI outbound call
                   │
                   ▼
         VAPI AI Agent calls the lead
         Collects: service_interest, motivation, urgency,
                   budget, past_experience, intent
                   │
                   ▼
         Call ends  →  Two ways to capture results:

         A) VAPI Webhook (if server is publicly accessible):
            POST /api/webhook/vapi/  (fires automatically)

         B) Manual Poll:
            POST /api/production-leads/{id}/check_call_status/
                   │
                   ▼
         PostCallSummary record created in DB
```

### 3.2 Inbound Call Flow

```
1. Caller dials Betopia's VAPI phone number
         │
         ▼
2. VAPI Inbound Assistant (Chris_inbound) answers
   Collects: caller_name, caller_email, caller_company,
             caller_role, caller_company_size,
             service_interest, motivation, urgency,
             budget, past_experience, intent
         │
         ▼
3. Call ends  →  Two ways to capture results:

   A) VAPI Webhook (automatic):
      POST /api/webhook/vapi/
        ├─► Creates ProductionLead (call_type='inbound')
        └─► Creates PostCallSummary with caller identity fields

   B) Manual Sync:
      POST /api/sync-inbound-calls/
        ├─► Pulls all ended calls from VAPI for inbound assistant
        └─► Creates/updates ProductionLead + PostCallSummary for each
```

---

## 4. Database Schema

The database is **SQLite** (`backend/db.sqlite3`), managed by Django ORM.

### 4.1 QALead Table (`qa_leads`)

Staging table. All new leads land here first before human review.

| Column         | Type        | Description                                  |
|----------------|-------------|----------------------------------------------|
| `id`           | INTEGER PK  | Auto-increment primary key                   |
| `name`         | VARCHAR(255)| Lead's full name                             |
| `phone_number` | VARCHAR(20) | Raw phone number as entered                  |
| `email`        | VARCHAR(254)| Lead's email address                         |
| `company_name` | VARCHAR(255)| Company name                                 |
| `role`         | VARCHAR(255)| Lead's role / job title                      |
| `request`      | TEXT        | Lead's request or inquiry                    |
| `company_size` | VARCHAR(50) | Size category of the company                 |
| `submitted_at` | DATETIME    | When the form was submitted (default: now)   |
| `form_mode`    | VARCHAR(10) | `'test'` or `'live'` (default: `'test'`)     |
| `created_at`   | DATETIME    | Auto-set on creation                         |
| `updated_at`   | DATETIME    | Auto-updated on save                         |

---

### 4.2 ProductionLead Table (`production_leads`)

Approved leads with VAPI call tracking. Created from QA migration (outbound) or automatically from inbound calls.

| Column               | Type         | Description                                          |
|----------------------|--------------|------------------------------------------------------|
| `id`                 | INTEGER PK   | Auto-increment primary key                           |
| `name`               | VARCHAR(255) | Lead's full name                                     |
| `phone_number`       | VARCHAR(20)  | Raw phone number                                     |
| `email`              | VARCHAR(254) | Lead's email address                                 |
| `company_name`       | VARCHAR(255) | Company name                                         |
| `role`               | VARCHAR(255) | Lead's role / job title                              |
| `request`            | TEXT         | Lead's request or inquiry                            |
| `company_size`       | VARCHAR(50)  | Size category of the company                         |
| `submitted_at`       | DATETIME     | Original submission time (copied from QA)            |
| `standardized_phone` | VARCHAR(20)  | E.164 format phone (e.g. `+8801XXXXXXXXX`)           |
| `call_triggered`     | BOOLEAN      | Whether a VAPI call was successfully initiated       |
| `call_id`            | VARCHAR(255) | VAPI call UUID (used to look up call results)        |
| `call_type`          | VARCHAR(10)  | `'outbound'` or `'inbound'`                          |
| `call_status`        | VARCHAR(20)  | `'pending'`, `'ended'`, etc. (default: `'pending'`)  |
| `created_at`         | DATETIME     | Auto-set on creation                                 |
| `updated_at`         | DATETIME     | Auto-updated on save                                 |

---

### 4.3 PostCallSummary Table (`post_call_summaries`)

One-to-one with `ProductionLead`. Stores call outcomes and AI-extracted qualification data.

| Column               | Type         | Description                                                      |
|----------------------|--------------|------------------------------------------------------------------|
| `id`                 | INTEGER PK   | Auto-increment primary key                                       |
| `lead_id`            | INTEGER FK   | One-to-one FK → `production_leads.id`                            |
| `date`               | DATETIME     | Call date (default: now)                                         |
| `name`               | VARCHAR(255) | Lead name (snapshot from ProductionLead)                        |
| `phone`              | VARCHAR(20)  | Standardized phone number                                        |
| `email`              | VARCHAR(254) | Lead email                                                       |
| `company`            | VARCHAR(255) | Company name                                                     |
| `role`               | VARCHAR(255) | Lead role                                                        |
| `request`            | TEXT         | Original request                                                 |
| `company_size`       | VARCHAR(50)  | Company size                                                     |
| `caller_name`        | VARCHAR(255) | *Inbound only* — caller's name captured by AI                    |
| `caller_email`       | VARCHAR(254) | *Inbound only* — caller's email captured by AI                   |
| `caller_company`     | VARCHAR(255) | *Inbound only* — caller's company captured by AI                 |
| `caller_role`        | VARCHAR(255) | *Inbound only* — caller's role captured by AI                    |
| `caller_company_size`| VARCHAR(50)  | *Inbound only* — company size captured by AI                     |
| `conv_summary`       | TEXT         | Full call transcript from VAPI                                   |
| `service_interest`   | TEXT         | AI-extracted: what services the lead is interested in            |
| `motivation`         | TEXT         | AI-extracted: why the lead is reaching out                       |
| `urgency`            | TEXT         | AI-extracted: how urgently they need the service                 |
| `past_experience`    | TEXT         | AI-extracted: prior experience with similar services             |
| `budget`             | TEXT         | AI-extracted: budget range                                       |
| `intent`             | VARCHAR(50)  | AI-extracted: overall intent (`'interested'`, `'not_interested'`, etc.) |
| `status`             | VARCHAR(20)  | `'complete'`, `'voicemail'`, `'call_back'`, `'incorrect_phone'`, `'failed'` |
| `call_type`          | VARCHAR(10)  | `'outbound'` or `'inbound'`                                      |
| `call_duration`      | INTEGER      | Call duration in seconds                                         |
| `ended_reason`       | VARCHAR(50)  | Reason call ended as reported by VAPI                            |
| `created_at`         | DATETIME     | Auto-set on creation                                             |
| `updated_at`         | DATETIME     | Auto-updated on save                                             |

---

## 5. API Reference

**Base URL:** `http://<host>:8001/api`

All endpoints return JSON. Pagination is applied to list endpoints (10 items per page by default; use `?page=N` to navigate).

---

### 5.1 QA Leads

#### `GET /api/qa-leads/`
Retrieve all QA leads (paginated).

**Response:**
```json
{
  "count": 42,
  "next": "http://localhost:8001/api/qa-leads/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "phone_number": "01711234567",
      "email": "john@example.com",
      "company_name": "Acme Corp",
      "role": "CEO",
      "request": "Looking for IT solutions",
      "company_size": "50-100",
      "submitted_at": "2026-03-11T10:00:00Z",
      "form_mode": "live",
      "created_at": "2026-03-11T10:00:00Z",
      "updated_at": "2026-03-11T10:00:00Z"
    }
  ]
}
```

---

#### `POST /api/qa-leads/`
Create a new QA lead.

**Request Body:**
```json
{
  "name": "John Doe",
  "phone_number": "01711234567",
  "email": "john@example.com",
  "company_name": "Acme Corp",
  "role": "CEO",
  "request": "Looking for IT solutions",
  "company_size": "50-100",
  "form_mode": "live"
}
```

**Response:** `201 Created` — full lead object.

---

#### `GET /api/qa-leads/{id}/`
Retrieve a single QA lead by ID.

---

#### `PUT /api/qa-leads/{id}/`
Update a QA lead (full update).

**Request Body:** Same fields as POST.

---

#### `PATCH /api/qa-leads/{id}/`
Partially update a QA lead.

---

#### `DELETE /api/qa-leads/{id}/`
Delete a QA lead.

**Response:** `204 No Content`

---

#### `POST /api/qa-leads/migrate_to_production/`
Migrate one or more QA leads to Production and trigger VAPI outbound calls.

**Request Body:**
```json
{
  "qa_lead_ids": [1, 2, 5]
}
```

**Response:**
```json
{
  "migrated": [
    { "id": 10, "name": "John Doe", "call_id": "vapi-call-uuid-xxx" }
  ],
  "failed": [
    { "id": 2, "name": "Jane Smith", "reason": "Invalid phone number format" }
  ],
  "total_migrated": 1,
  "total_failed": 1
}
```

**Notes:**
- Phone numbers are standardized to `+88XXXXXXXXXXX` format before the call is placed.
- If phone validation fails, the lead is added to `failed` and **not** migrated.
- If the VAPI call API fails, the `ProductionLead` record is rolled back.

---

### 5.2 Production Leads

#### `GET /api/production-leads/`
Retrieve all production leads (paginated).

**Query Parameters:**
| Parameter   | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `call_type` | string | Filter by `'outbound'` or `'inbound'`    |
| `page`      | int    | Page number for pagination               |

---

#### `GET /api/production-leads/{id}/`
Retrieve a single production lead by ID.

---

#### `DELETE /api/production-leads/{id}/`
Delete a production lead (and cascades to its PostCallSummary).

---

#### `POST /api/production-leads/{id}/check_call_status/`
Poll VAPI for the current status of this lead's call. If the call has ended, creates/updates the `PostCallSummary` record.

**Request Body:** *(empty)*

**Response (call still in progress):**
```json
{
  "status": "in-progress",
  "call_data": { ... }
}
```

**Response (call ended):**
```json
{
  "status": "completed",
  "call_data": { ... }
}
```

**Error (no call ID):**
```json
{
  "error": "No call ID associated with this lead"
}
```

---

### 5.3 Post-Call Summaries

#### `GET /api/post-call-summaries/`
Retrieve all post-call summaries (paginated).

**Query Parameters:**
| Parameter   | Type   | Description                                                    |
|-------------|--------|----------------------------------------------------------------|
| `status`    | string | Filter by status: `complete`, `voicemail`, `call_back`, `incorrect_phone`, `failed` |
| `call_type` | string | Filter by `'outbound'` or `'inbound'`                          |
| `page`      | int    | Page number for pagination                                     |

**Response includes nested `lead_details` object** (full ProductionLead data).

---

#### `GET /api/post-call-summaries/{id}/`
Retrieve a single post-call summary by ID.

---

#### `DELETE /api/post-call-summaries/{id}/`
Delete a post-call summary record.

> **Note:** `POST`, `PUT`, and `PATCH` are disabled on this endpoint. Summaries are created automatically by the webhook or `check_call_status` action.

---

### 5.4 VAPI Webhook

#### `POST /api/webhook/vapi/`
Receives real-time call events from VAPI. No authentication required (must be publicly accessible for VAPI to reach it).

**Handled Event:** `end-of-call-report` only. All other event types return `{ "status": "ignored" }`.

**VAPI Webhook Payload Structure:**
```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "vapi-call-uuid",
      "type": "inboundPhoneCall",
      "status": "ended",
      "endedReason": "customer-ended-call",
      "duration": 120,
      "customer": {
        "number": "+8801711234567"
      },
      "artifact": {
        "transcript": "AI: Hello... Customer: ...",
        "structuredOutputs": {
          "<uuid>": { "name": "Service Interest", "result": "ERP Solutions" },
          "<uuid>": { "name": "Budget", "result": "50,000 BDT/month" }
        }
      }
    }
  }
}
```

**Logic:**
- Identifies call as `inbound` or `outbound` from `call.type`.
- For **outbound**: looks up `ProductionLead` by `call_id`. If not found → skips.
- For **inbound**: looks up by `call_id`. If not found → creates a new `ProductionLead` with `call_type='inbound'`.
- Extracts structured qualification fields using the appropriate config (inbound vs. outbound).
- Creates or updates a `PostCallSummary` record.

**Response:**
```json
{ "status": "success", "message": "Inbound call processed successfully", "call_id": "..." }
```

---

### 5.5 Sync Inbound Calls

#### `POST /api/sync-inbound-calls/`
Manually pulls all ended inbound calls from VAPI and creates `ProductionLead` + `PostCallSummary` records. Used when the server is not publicly accessible (no webhook delivery).

**Request Body:** *(empty)*

**Response:**
```json
{
  "status": "success",
  "synced": 5,
  "skipped": 2,
  "total": 7
}
```

**Notes:**
- Uses the `VAPI_INBOUND_ASSISTANT_ID` from `.env` to filter calls.
- Skips calls that haven't ended yet.
- Uses `get_or_create` so running it multiple times is safe (idempotent).

---

### 5.6 Knowledge Base Search

#### `POST /api/kb/search/`
Custom knowledge base endpoint called by the VAPI AI assistant during calls to look up information about Betopia's products and services.

**Request Body (VAPI format):**
```json
{
  "message": {
    "type": "knowledge-base-request",
    "messages": [
      { "role": "user", "content": "What ERP solutions does Betopia offer?" }
    ]
  }
}
```

**Response:**
```json
{
  "documents": [
    {
      "content": "Betopia offers a full-suite ERP platform...",
      "similarity": 0.92,
      "uuid": "doc-uuid-xxx"
    }
  ]
}
```

**Notes:**
- Uses the KB files from the `KB/` directory.
- Returns top 5 most relevant documents.
- Returns `{ "documents": [] }` on error to avoid disrupting the live call.

---

## 6. Services

### 6.1 VAPIService

**File:** [service/vapi_service.py](service/vapi_service.py)

Wraps all VAPI REST API calls. Configured via environment variables.

| Method | Description |
|--------|-------------|
| `create_call(phone_number, lead_name, company_name, request)` | Creates an outbound call. Passes `lead_name`, `lead_company_name`, `lead_request` as assistant variable overrides. Returns `{ success, call_id }`. |
| `get_call_details(call_id)` | Fetches details for a specific call by ID from `GET /call/{id}`. |
| `list_calls(assistant_id, limit=100)` | Lists calls, optionally filtered by assistant ID. Used for inbound sync. |
| `wait_for_call_completion(call_id, max_wait=300, poll_interval=10)` | Polls until call status is `'ended'` or timeout. |
| `extract_structured_data(call_data)` | Extracts structured output fields from raw call data. |

---

### 6.2 PhoneService

**File:** [service/phone_service.py](service/phone_service.py)

Handles Bangladesh phone number normalization.

| Method | Description |
|--------|-------------|
| `standardize_phone(phone_number)` | Converts a raw BD number to E.164 format (`+88XXXXXXXXXXX`). Returns `'incorrect format'` for invalid numbers. |
| `is_valid_bd_phone(phone_number)` | Returns `True` if the number is a valid Bangladesh number. |

**Normalization rules:**
- 10-digit number starting with `1` → prepends `0` → then `+88`
- 11-digit number starting with `01` → prepends `+88`
- 13-digit number starting with `880` → prepends `+`
- All other formats → `'incorrect format'`

---

### 6.3 StructuredOutputsLoader

**File:** [backend/leads/structured_outputs_loader.py](backend/leads/structured_outputs_loader.py)

Loads the VAPI structured output UUIDs from a JSON config file. The UUIDs are used to parse the `structuredOutputs` dictionary in call artifacts.

Two config files are used:
- `structured_outputs_old_account.json` — outbound assistant (6 fields)
- `structured_outputs_inbound.json` — inbound assistant (11 fields, includes caller identity)

**Fields mapped:**

| Field Name           | Outbound | Inbound |
|----------------------|----------|---------|
| `service_interest`   | ✅        | ✅       |
| `motivation`         | ✅        | ✅       |
| `urgency`            | ✅        | ✅       |
| `budget`             | ✅        | ✅       |
| `past_experience`    | ✅        | ✅       |
| `intent`             | ✅        | ✅       |
| `caller_name`        | ❌        | ✅       |
| `caller_email`       | ❌        | ✅       |
| `caller_company`     | ❌        | ✅       |
| `caller_role`        | ❌        | ✅       |
| `caller_company_size`| ❌        | ✅       |

---

## 7. Configuration & Environment Variables

File: `.env` (project root), loaded by `backend/lead_qualifier/settings.py`.

| Variable                              | Description                                                        |
|---------------------------------------|--------------------------------------------------------------------|
| `SECRET_KEY`                          | Django secret key                                                  |
| `DEBUG`                               | `True` / `False`                                                   |
| `VAPI_API_KEY`                        | VAPI account API key                                               |
| `VAPI_ASSISTANT_ID`                   | VAPI outbound assistant UUID                                       |
| `VAPI_INBOUND_ASSISTANT_ID`           | VAPI inbound assistant UUID                                        |
| `VAPI_PHONE_NUMBER_ID`                | VAPI phone number ID for outbound calls                            |
| `STRUCTURED_OUTPUTS_CONFIG`           | JSON file for outbound structured output UUIDs (default: `structured_outputs_old_account.json`) |
| `INBOUND_STRUCTURED_OUTPUTS_CONFIG`   | JSON file for inbound structured output UUIDs (default: `structured_outputs_inbound.json`) |

---

## 8. Running the System

### Initial Setup
```bash
./setup_backend.sh   # Creates venv, installs deps, runs migrations
```

### Start
```bash
./start.sh
# Backend:  http://localhost:8001
# Frontend: http://localhost:8000
```

### Stop
```bash
./stop.sh
```

### Status
```bash
./status.sh
```

### Logs
```bash
tail -f logs/backend.log
tail -f logs/frontend.log
```

### Access Points
| URL | Description |
|-----|-------------|
| `http://localhost:8000` | React dashboard |
| `http://localhost:8000/login` | Login page |
| `http://localhost:8001/api` | REST API root |
| `http://localhost:8001/admin` | Django admin panel |
| `http://localhost:8001/api/webhook/vapi/` | VAPI webhook receiver |

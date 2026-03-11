# Betopia IVR Lead Qualifier

An AI-powered voice call system that automates lead qualification using [VAPI](https://vapi.ai). The system places outbound calls to prospects and receives inbound calls, using a conversational AI agent to capture structured qualification data (service interest, budget, intent, etc.).

---

## Features

- **Lead Form** — Submit new leads via a web UI
- **QA Pipeline** — Review and approve leads before calling
- **Outbound Calling** — Automatically place AI calls to approved leads via VAPI
- **Inbound Calls** — Receive and qualify inbound callers via VAPI
- **Post-Call Summaries** — View AI-extracted qualification data per call
- **Knowledge Base** — AI assistant looks up Betopia product/service info in real time during calls

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend  | Django 4.2 + Django REST Framework |
| Database | SQLite (`backend/db.sqlite3`) |
| Voice AI | VAPI (`api.vapi.ai`) |

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- A [VAPI](https://vapi.ai) account with:
  - An outbound assistant
  - An inbound assistant
  - A phone number

---

## Quick Start

### 1. Clone the repo
```bash
git clone <repo-url>
cd ivr_betopia_v2
```

### 2. Configure environment
Edit the `.env` file in the project root:
```env
VAPI_API_KEY=your-vapi-api-key
VAPI_ASSISTANT_ID=your-outbound-assistant-id
VAPI_INBOUND_ASSISTANT_ID=your-inbound-assistant-id
VAPI_PHONE_NUMBER_ID=your-phone-number-id
```

### 3. Set up the backend
```bash
./setup_backend.sh
```
This will:
- Create a Python virtual environment
- Install all dependencies
- Run database migrations
- Optionally create a Django superuser

### 4. Start the system
```bash
./start.sh
```

| Service  | URL |
|----------|-----|
| Dashboard | http://localhost:8000 |
| API | http://localhost:8001/api |
| Admin | http://localhost:8001/admin |

Default login: `admin` / `admin`

---

## Project Structure

```
ivr_betopia_v2/
├── .env                          # Environment variables
├── start.sh / stop.sh            # Start & stop scripts
├── setup_backend.sh              # One-time setup script
├── status.sh                     # Check running services
│
├── backend/                      # Django project
│   ├── manage.py
│   ├── lead_qualifier/           # Django settings & root URLs
│   └── leads/                    # Main app
│       ├── models.py             # QALead, ProductionLead, PostCallSummary
│       ├── views.py              # API views + webhook + KB search
│       ├── serializers.py
│       ├── urls.py
│       └── structured_outputs_loader.py
│
├── frontend/                     # React app
│   └── src/
│       ├── pages/                # UI pages
│       └── services/api.js       # Axios API client
│
├── service/                      # Shared Python services
│   ├── vapi_service.py           # VAPI API wrapper
│   └── phone_service.py          # Phone number normalization
│
├── KB/                           # Knowledge base text files
│   ├── betopia_knowledge_base.txt
│   ├── products.txt
│   ├── services & solutions.txt
│   └── ...
│
├── structured_outputs_old_account.json   # Outbound structured output UUIDs
├── structured_outputs_inbound.json       # Inbound structured output UUIDs
└── DOCUMENTATION.md              # Full technical documentation
```

---

## Call Flow

### Outbound
1. Submit a lead via the **Lead Form**
2. Review it on the **QA Leads** page
3. Select leads and click **Migrate to Production** — this standardizes the phone number and triggers a VAPI outbound call
4. After the call ends, the summary appears on the **Call Summaries** page

### Inbound
1. A caller dials Betopia's VAPI phone number
2. The inbound AI assistant captures identity and qualification details
3. Use **Sync Inbound Calls** on the **Inbound Calls** page to pull completed call data

---

## Management Commands

```bash
./start.sh       # Start backend (port 8001) and frontend (port 8000)
./stop.sh        # Stop both servers
./status.sh      # Check if services are running
```

```bash
# View live logs
tail -f logs/backend.log
tail -f logs/frontend.log
```

```bash
# Run Django management commands
source venv/bin/activate
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

---

## API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/qa-leads/` | List QA leads |
| `POST` | `/api/qa-leads/` | Create a QA lead |
| `DELETE` | `/api/qa-leads/{id}/` | Delete a QA lead |
| `POST` | `/api/qa-leads/migrate_to_production/` | Migrate + trigger calls |
| `GET` | `/api/production-leads/` | List production leads |
| `POST` | `/api/production-leads/{id}/check_call_status/` | Poll call status |
| `GET` | `/api/post-call-summaries/` | List call summaries |
| `DELETE` | `/api/post-call-summaries/{id}/` | Delete a summary |
| `POST` | `/api/webhook/vapi/` | VAPI event webhook (auto) |
| `POST` | `/api/sync-inbound-calls/` | Manually sync inbound calls |
| `POST` | `/api/kb/search/` | Knowledge base search (used by AI) |

Full API documentation with request/response formats: [DOCUMENTATION.md](DOCUMENTATION.md)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` or `False` |
| `VAPI_API_KEY` | VAPI API key |
| `VAPI_ASSISTANT_ID` | Outbound VAPI assistant UUID |
| `VAPI_INBOUND_ASSISTANT_ID` | Inbound VAPI assistant UUID |
| `VAPI_PHONE_NUMBER_ID` | VAPI phone number ID |
| `STRUCTURED_OUTPUTS_CONFIG` | Outbound structured outputs config file |
| `INBOUND_STRUCTURED_OUTPUTS_CONFIG` | Inbound structured outputs config file |

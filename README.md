# Aegis Energy: Supply Chain Resilience Core

India energy-security command center. Unidirectional 3-agent pipeline:

1. **Agent 1** — live newsdata.io + OpenRouter LLM → `GeopoliticalRiskPayload` (fallback: `scenarios.json`)
2. **Agent 2** — deterministic scarcity / freight / war-risk / SPR math + `calculation_trace` → `DisruptionImpactPayload`
3. **Agent 3** — OpenRouter procurement memo + ranked actions → `ExecutiveSummary` (scenario-aware matrix mock fallback)

Frontend: Next.js War Room at `/dashboard` bound to the FastAPI simulate API (SSE progress + provenance badges).

---

## Fresh laptop setup (after GitHub clone)

Cloning the repo is **not enough**. These are **not on GitHub** and must be created locally:

| Not in repo | Why |
|-------------|-----|
| `.env` | API keys are gitignored (secrets) |
| `backend/venv/` | Python virtualenv — create per machine |
| `frontend/node_modules/` | Run `npm install` after clone |

### Prerequisites

Install before starting:

- **Git**
- **Node.js 18+** — `node -v` and `npm -v`
- **Python 3.11 or 3.12** — `python --version` (Windows: `py -3.12 --version`)

### 1. Clone the repository

```powershell
git clone https://github.com/AbhinavCoder-14/Energy-Security.git
cd Energy-Security
```

You should see `backend/`, `frontend/`, and this `README.md` at the project root.

### 2. Create `.env` in the project root

Create `Energy-Security/.env` (same folder as `backend/` and `frontend/`):

```env
OPEN_ROUTER_API=sk-or-v1-your-openrouter-key-here
NEWSAPI_KEY=pub_your-newsdata-key-here
```

- **OpenRouter:** https://openrouter.ai
- **newsdata.io:** https://newsdata.io (key usually starts with `pub_`)

Share keys privately with teammates — **never commit `.env` to GitHub**.

**Optional (recommended for first run / hackathon / corporate laptops):**

```env
AEGIS_DEMO_MODE=1
AEGIS_SSL_VERIFY=0
```

- `AEGIS_DEMO_MODE=1` — works without live APIs (uses `scenarios.json`)
- `AEGIS_SSL_VERIFY=0` — fixes SSL certificate errors on some corporate networks

**Minimum demo (no API keys):** only put this in `.env`:

```env
AEGIS_DEMO_MODE=1
AEGIS_SSL_VERIFY=0
```

### 3. Backend — Terminal 1 (port 8000)

```powershell
cd backend

# First time only — create virtual environment
python -m venv venv
# OR on Windows: py -3.12 -m venv venv

# Activate venv
.\venv\Scripts\Activate.ps1

# If PowerShell blocks scripts (first time on a machine):
# Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

pip install -r requirements.txt
pip install python-dotenv

$env:PYTHONPATH = "."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Verify backend:**

- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health → should return `"status": "ok"`

### 4. Frontend — Terminal 2 (port 3000)

Open a **new** terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open: **http://localhost:3000/dashboard**

The War Room calls `http://localhost:8000` by default. Both terminals must stay running.

### 5. UI badges (what they mean)

| Badge | Meaning |
|-------|---------|
| **LIVE TELEMETRY** | Live news + OpenRouter succeeded |
| **DEMO SAFETY NET** | Fallback mode — data still shows, but not fully live |
| **A1 fallback · A3 mock** | Agent 1/3 used cached or mock paths |

`A1 fallback` / `A3 mock` with **DEMO SAFETY NET** is normal when `.env` keys are missing, APIs fail, or `AEGIS_DEMO_MODE=1` is set.

### Setup checklist

```
[ ] Python 3.11+ installed
[ ] Node.js 18+ installed
[ ] .env created in project root
[ ] backend/venv created and pip install done
[ ] Backend running — /api/health returns ok
[ ] frontend npm install done
[ ] Frontend running — /dashboard loads scenarios
```

---

## Quick start (returning developers)

### Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH = "."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```powershell
cd frontend
npm run dev
```

Open http://localhost:3000/dashboard

---

## API reference

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Status, demo mode, key presence, model |
| `GET /api/scenarios` | Catalog with labels / severity / blurbs |
| `GET /api/simulate/{id}` | Full pipeline (`?mock=true` forces demo path) |
| `GET /api/simulate/{id}/stream` | SSE: ingest → risk → impact → orchestration → done |

**Scenario IDs:** `baseline_peace` · `strait_of_hormuz_closure` · `bab_el_mandeb_escalation`

---

## Environment variables

Create `.env` in the **project root** (not inside `backend/`).

| Variable | Purpose |
|----------|---------|
| `OPEN_ROUTER_API` | OpenRouter API key (also accepts `OPENROUTER_API_KEY`) |
| `NEWSAPI_KEY` | newsdata.io `pub_…` key (also accepts `NEWSDATA_API_KEY`) |
| `AEGIS_DEMO_MODE` | `1` / `true` — skip live APIs; use `scenarios.json` + matrix mock |
| `AEGIS_SSL_VERIFY` | `1` to enforce TLS cert checks (default `0` for corp SSL) |
| `AEGIS_API_MAX_RETRIES` | Retries for 429/5xx/network (default `3`) |
| `AEGIS_API_RETRY_BASE_S` | Base backoff seconds (default `1.0`) |
| `NEXT_PUBLIC_API_BASE` | Frontend API origin (default `http://localhost:8000`) |
| `NEXT_PUBLIC_FORCE_MOCK` | `1` — UI always passes `?mock=true` |

---

## Troubleshooting

### “Simulation unavailable” on `/dashboard`

- Backend is not running → start Terminal 1 (backend on port **8000**)
- Wrong API URL → set `$env:NEXT_PUBLIC_API_BASE = "http://localhost:8000"` before `npm run dev`
- Windows Firewall → allow Python on port 8000

### `ModuleNotFoundError: dotenv`

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install python-dotenv
```

### `Activate.ps1` cannot be loaded (PowerShell)

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### SSL / certificate errors (corporate laptop)

Add to `.env`:

```env
AEGIS_SSL_VERIFY=0
```

Restart the backend.

### OpenRouter 402 (insufficient credits)

Add credits at openrouter.ai, or use demo mode:

```env
AEGIS_DEMO_MODE=1
```

### Port 8000 already in use

Run backend on another port:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Then point the frontend at it:

```powershell
$env:NEXT_PUBLIC_API_BASE = "http://localhost:8001"
npm run dev
```

### `npm install` fails

- Use Node 18+
- Try: `npm install --legacy-peer-deps`
- On locked-down corporate machines, try a personal network or ask IT to allow npm registry access

---

## Deploy notes

- **Backend:** Railway / Render using `backend/Dockerfile`; set env keys + `AEGIS_DEMO_MODE=1` for stage demos
- **Frontend:** Vercel; set `NEXT_PUBLIC_API_BASE` to the public backend URL

---

## Timeline log

See [MEMORY.md](MEMORY.md) for the append-only change log for other agents/models.

# Aegis Energy: Supply Chain Resilience Core

India energy-security command center. Unidirectional 3-agent pipeline:

1. **Agent 1** — live news ingest + OpenRouter LLM → `RouteRisk` parse (fallback: `scenarios.json` in SIMULATION)
2. **Agent 2** — live Brent (`P_live`) + refinery exposure formulas + `calculation_trace` (LaTeX audit)
3. **Agent 3** — OpenRouter LLM procurement memo + ranked actions (scenario-aware matrix mock fallback)

Frontend: Next.js War Room at `/dashboard` — 4-card metrics ribbon, LIVE Brent badge, KaTeX audit modal.

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

Copy the template and fill in keys:

```powershell
copy .env.example .env
```

**LIVE production** (requires valid keys):

```env
APP_MODE=LIVE
PORT=8000
ENVIRONMENT=production

OPEN_ROUTER_API=sk-or-v1-...
LLM_MODEL=google/gemini-2.5-flash

NEWSDATA_API_KEY=pub_...          # newsdata.io
# OR NEWSAPI_ORG_KEY=...          # newsapi.org

OILPRICE_API_KEY=...              # optional; yfinance BZ=F fallback if missing

INDIA_ISPRL_CAPACITY_MB=39.0
INDIA_COMMERCIAL_BUFFER_MB=322.5
INDIA_TOTAL_DAILY_IMPORT_MBPD=5.0
GLOBAL_DAILY_OIL_SUPPLY_MBPD=102.5

AEGIS_SSL_VERIFY=0                # corp laptop SSL
```

**SIMULATION / hackathon demo** (no live APIs required):

```env
APP_MODE=SIMULATION
AEGIS_SSL_VERIFY=0
```

Legacy: `AEGIS_DEMO_MODE=1` maps to `APP_MODE=SIMULATION`.

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

$env:PYTHONPATH = "."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Verify backend:**

- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health → `"app_mode"`, `"brent_status"`, `"openrouter_configured"`

**Verify LIVE path:**

```powershell
# With APP_MODE=LIVE and keys set:
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/simulate/baseline_peace
# brent_source should NOT be a hardcoded fallback; meta.brent_data_source present
```

**Verify SIMULATION path:**

```powershell
# APP_MODE=SIMULATION — sub-second scenarios.json path:
curl "http://127.0.0.1:8000/api/simulate/strait_of_hormuz_closure?mock=true"
```

**Run Agent 2 unit test (no APIs):**

```powershell
python tests/test_agent_two.py
```

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
| **LIVE TELEMETRY** | `APP_MODE=LIVE` — live Brent + OpenRouter agents succeeded |
| **DEMO SAFETY NET** | `APP_MODE=SIMULATION` or fallback paths |
| **LIVE API: $P_live · source** | Brent card badge from `calculation_trace` / market service |

Click **AUDIT** on any metric card for KaTeX equations + substitution steps from `calculation_trace`.

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
| `GET /api/health` | `app_mode`, Brent status, OpenRouter/news/oilprice configured |
| `GET /api/scenarios` | Catalog with labels / severity / blurbs |
| `GET /api/simulate/{id}` | Full pipeline (`?mock=true` forces SIMULATION path) |
| `GET /api/simulate/{id}/stream` | SSE: ingest → risk → market → impact → orchestration → done |

**Scenario IDs:** `baseline_peace` · `strait_of_hormuz_closure` · `bab_el_mandeb_escalation`

---

## Environment variables

Create `.env` in the **project root** (not inside `backend/`). See `.env.example` for the full contract.

| Variable | Purpose |
|----------|---------|
| `APP_MODE` | `LIVE` or `SIMULATION` (default `SIMULATION`) |
| `OPEN_ROUTER_API` | OpenRouter API key (also accepts `OPENROUTER_API_KEY`) |
| `LLM_MODEL` | OpenRouter model slug (default `google/gemini-2.5-flash`) |
| `NEWSDATA_API_KEY` / `NEWSAPI_KEY` | newsdata.io key |
| `NEWSAPI_ORG_KEY` | newsapi.org alternative |
| `OILPRICE_API_KEY` | OilPriceAPI Brent (optional; yfinance fallback) |
| `INDIA_ISPRL_CAPACITY_MB` | SPR capacity in millions of barrels (default `39.0`) |
| `INDIA_COMMERCIAL_BUFFER_MB` | Commercial buffer MB (default `322.5`) |
| `GLOBAL_DAILY_OIL_SUPPLY_MBPD` | Global supply benchmark (default `102.5`) |
| `AEGIS_DEMO_MODE` | Legacy: `1` maps to `APP_MODE=SIMULATION` |
| `AEGIS_SSL_VERIFY` | `1` to enforce TLS cert checks (default `0` for corp SSL) |
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

### OpenRouter errors / missing key

Use SIMULATION mode for demos:

```env
APP_MODE=SIMULATION
```

Or add a valid `OPEN_ROUTER_API` key for LIVE mode.

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

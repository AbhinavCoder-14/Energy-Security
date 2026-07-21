# Aegis Energy: Supply Chain Resilience Core

India energy-security command center. Unidirectional 3-agent pipeline:

1. **Agent 1** — live newsdata.io + OpenRouter LLM → `GeopoliticalRiskPayload` (fallback: `scenarios.json`)
2. **Agent 2** — deterministic scarcity / freight / war-risk / SPR math + `calculation_trace` → `DisruptionImpactPayload`
3. **Agent 3** — OpenRouter procurement memo + ranked actions → `ExecutiveSummary` (scenario-aware matrix mock fallback)

Frontend: Next.js War Room at `/dashboard` bound to the FastAPI simulate API (SSE progress + provenance badges).

## Quick start

### Backend (port 8000)

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PYTHONPATH = "."
# Optional: force sub-second demo path (skip live news/LLM)
$env:AEGIS_DEMO_MODE = "1"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Docs: http://127.0.0.1:8000/docs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Status, demo mode, key presence, model |
| `GET /api/scenarios` | Catalog with labels / severity / blurbs |
| `GET /api/simulate/{id}` | Full pipeline (`?mock=true` forces demo path) |
| `GET /api/simulate/{id}/stream` | SSE stages: ingest → risk → impact → orchestration → done |

Scenario IDs: `baseline_peace` · `strait_of_hormuz_closure` · `bab_el_mandeb_escalation`

### Frontend (port 3000)

```powershell
cd frontend
npm install
# Point at backend (optional if localhost:8000)
$env:NEXT_PUBLIC_API_BASE = "http://localhost:8000"
# Optional: always request mock=1 from the UI
$env:NEXT_PUBLIC_FORCE_MOCK = "1"
npm run dev
```

Open http://localhost:3000/dashboard

### Environment (project root `.env`)

| Variable | Purpose |
|----------|---------|
| `OPEN_ROUTER_API` | OpenRouter API key (also accepts `OPENROUTER_API_KEY`) |
| `NEWSAPI_KEY` | newsdata.io `pub_…` key (also accepts `NEWSDATA_API_KEY`) |
| `AEGIS_DEMO_MODE` | `1` / `true` — skip live APIs; use scenarios.json + matrix mock |
| `AEGIS_SSL_VERIFY` | `1` to enforce TLS cert checks (default `0` for corp SSL) |
| `AEGIS_API_MAX_RETRIES` | Retries after first attempt for 429/5xx/network (default `3`) |
| `AEGIS_API_RETRY_BASE_S` | Base backoff seconds (default `1.0`) |
| `NEXT_PUBLIC_API_BASE` | Frontend API origin (default `http://localhost:8000`) |
| `NEXT_PUBLIC_FORCE_MOCK` | `1` — UI always passes `?mock=true` |

### Deploy notes

- Backend: Railway / Render with `Dockerfile` in `backend/`; set env keys + `AEGIS_DEMO_MODE=1` for stage demos.
- Frontend: Vercel; set `NEXT_PUBLIC_API_BASE` to the public API URL.

## Timeline log

See [MEMORY.md](MEMORY.md) for the append-only change log for other agents/models.

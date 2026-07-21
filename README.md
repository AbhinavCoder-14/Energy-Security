# Aegis Energy: Supply Chain Resilience Core

India energy-security command center. Unidirectional 3-agent pipeline:

1. **Agent 1** — live newsdata.io + OpenRouter LLM → `GeopoliticalRiskPayload` (fallback: `scenarios.json`)
2. **Agent 2** — deterministic scarcity / freight / war-risk / SPR math → `DisruptionImpactPayload`
3. **Agent 3** — OpenRouter procurement memo + ranked actions → `ExecutiveSummary` (fallback: hardcoded mock)

Frontend: Next.js App Router dashboard in Vercel monochrome Geist tokens (Inter / JetBrains Mono substitutes).

## Quick start

### Backend (port 8000)

```powershell
cd backend
# Prefer the venv created during setup:
.\venv\Scripts\Activate.ps1
# Or: & "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m venv venv
pip install -r requirements.txt
$env:PYTHONPATH = "."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Docs: http://127.0.0.1:8000/docs  
Simulate: `GET /api/simulate/{baseline_peace|strait_of_hormuz_closure|bab_el_mandeb_escalation}`

### Frontend (port 3000)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Environment (project root `.env`)

| Variable | Purpose |
|----------|---------|
| `OPEN_ROUTER_API` | OpenRouter API key (also accepts `OPENROUTER_API_KEY`) |
| `NEWSAPI_KEY` | newsdata.io `pub_…` key (also accepts `NEWSDATA_API_KEY`) |

## Timeline log

See [MEMORY.md](MEMORY.md) for the append-only change log for other agents/models.

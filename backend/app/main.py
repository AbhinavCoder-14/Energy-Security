"""
FastAPI entrypoint — unidirectional pipeline:
Scenario ID → Agent 1 (risk) → Agent 2 (math) → Agent 3 (procurement) → UnifiedDashboardPayload
"""

import json
import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend/ is on path when running as `python app/main.py`
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

# Load .env from project root (parent of backend/) and from backend/
_PROJECT_ROOT = os.path.abspath(os.path.join(_BACKEND_ROOT, ".."))
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"))
load_dotenv()

from app.agent_one import analyze_route_risk_with_ml
from app.agent_three import generate_procurement_strategy
from app.agent_two import calculate_disruption_impact
from app.schemas import GeopoliticalRiskPayload, UnifiedDashboardPayload

app = FastAPI(title="India Energy Security Intelligence Core API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.json")


def _load_scenario_ids() -> set:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return set(json.load(f).keys())


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "aegis-energy-security"}


@app.get("/api/scenarios")
async def list_scenarios():
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            scenarios = json.load(f)
        return {"scenarios": list(scenarios.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/simulate/{scenario_id}", response_model=UnifiedDashboardPayload)
async def simulate_scenario(scenario_id: str):
    # Validate scenario exists in cache (demo safety net)
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            scenarios = json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load scenario data matrix configuration: {str(e)}",
        )

    if scenario_id not in scenarios:
        raise HTTPException(
            status_code=404,
            detail="Requested scenario identifier not found in matrix parameters.",
        )

    # Agent 1 — live-first risk parse (internal fallback to scenarios.json)
    try:
        risk_payload = analyze_route_risk_with_ml(scenario_id)
    except Exception as e:
        print(f"[main] Agent 1 hard failure, using cache: {e}")
        risk_payload = GeopoliticalRiskPayload(**scenarios[scenario_id]["risk_data"])

    # Agent 2 — deterministic math (should never fail; still guarded)
    try:
        impact_payload = calculate_disruption_impact(risk_payload)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent 2 impact calculation failed: {str(e)}",
        )

    # Agent 3 — live LLM procurement (internal mock fallback)
    try:
        orchestration = generate_procurement_strategy(risk_payload, impact_payload)
    except Exception as e:
        print(f"[main] Agent 3 hard failure: {e}")
        from app.agent_three import _mock_executive_summary

        orchestration = _mock_executive_summary(risk_payload, impact_payload)

    return UnifiedDashboardPayload(
        risk_data=risk_payload,
        impact_data=impact_payload,
        orchestration_data=orchestration,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

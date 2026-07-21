"""
FastAPI entrypoint — unidirectional pipeline:
Scenario ID → Agent 1 (risk) → Agent 2 (math) → Agent 3 (procurement) → UnifiedDashboardPayload
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from typing import AsyncIterator, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Ensure backend/ is on path when running as `python app/main.py`
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

_PROJECT_ROOT = os.path.abspath(os.path.join(_BACKEND_ROOT, ".."))
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"))
load_dotenv()

from app.agent_one import analyze_route_risk_with_ml
from app.agent_three import generate_procurement_strategy
from app.agent_two import calculate_disruption_impact
from app.config import AEGIS_DEMO_MODE, OPENROUTER_MODEL, SIMULATE_WALL_CLOCK_BUDGET_S
from app.schemas import (
    SCENARIO_CATALOG,
    GeopoliticalRiskPayload,
    LatencyMs,
    PipelineMeta,
    UnifiedDashboardPayload,
)

app = FastAPI(title="India Energy Security Intelligence Core API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.json")


def _openrouter_configured() -> bool:
    return bool(os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY"))


def _news_configured() -> bool:
    return bool(os.getenv("NEWSAPI_KEY") or os.getenv("NEWSDATA_API_KEY"))


def _resolve_demo_mode(mock: Optional[bool]) -> bool:
    if mock is True:
        return True
    if mock is False:
        return False
    return AEGIS_DEMO_MODE


def _load_scenarios() -> dict:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _run_pipeline(
    scenario_id: str, *, demo_mode: bool
) -> UnifiedDashboardPayload:
    scenarios = _load_scenarios()
    if scenario_id not in scenarios:
        raise KeyError(scenario_id)

    t0 = time.perf_counter()
    deadline = t0 + SIMULATE_WALL_CLOCK_BUDGET_S

    # Agent 1
    t1 = time.perf_counter()
    if demo_mode or time.perf_counter() >= deadline:
        a1 = analyze_route_risk_with_ml(scenario_id, force_mock=True)
    else:
        a1 = analyze_route_risk_with_ml(scenario_id, force_mock=False)
        # Wall-clock budget: if live was slow, still keep result but flag timing
    agent1_ms = (time.perf_counter() - t1) * 1000
    risk_payload = a1.payload

    # Agent 2
    t2 = time.perf_counter()
    try:
        impact_payload = calculate_disruption_impact(risk_payload)
    except Exception as e:
        # Graceful default: baseline risk from cache
        print(f"[main] Agent 2 failure, using cached risk fallback: {e}")
        risk_payload = GeopoliticalRiskPayload(**scenarios[scenario_id]["risk_data"])
        impact_payload = calculate_disruption_impact(risk_payload)
    agent2_ms = (time.perf_counter() - t2) * 1000

    # Agent 3 — force mock if demo mode or budget exhausted
    t3 = time.perf_counter()
    force_a3_mock = demo_mode or (time.perf_counter() >= deadline)
    a3 = generate_procurement_strategy(
        risk_payload, impact_payload, force_mock=force_a3_mock
    )
    agent3_ms = (time.perf_counter() - t3) * 1000
    total_ms = (time.perf_counter() - t0) * 1000

    confidences = [t.confidence_score for t in risk_payload.active_threats]
    overall_conf = sum(confidences) / len(confidences) if confidences else 0.0

    meta = PipelineMeta(
        agent1_source=a1.source,
        agent3_source=a3.source,
        news_ok=a1.news_ok,
        demo_mode=demo_mode,
        model=OPENROUTER_MODEL if a1.source == "live" or a3.source == "live" else None,
        latency_ms=LatencyMs(
            agent1=round(agent1_ms, 1),
            agent2=round(agent2_ms, 1),
            agent3=round(agent3_ms, 1),
            total=round(total_ms, 1),
        ),
        overall_confidence=round(overall_conf, 1),
    )

    return UnifiedDashboardPayload(
        risk_data=risk_payload,
        impact_data=impact_payload,
        orchestration_data=a3.summary,
        meta=meta,
    )


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "aegis-energy-security",
        "demo_mode": AEGIS_DEMO_MODE,
        "openrouter_configured": _openrouter_configured(),
        "news_configured": _news_configured(),
        "model": OPENROUTER_MODEL,
    }


@app.get("/api/scenarios")
async def list_scenarios():
    try:
        scenarios = _load_scenarios()
        catalog = []
        for sid in scenarios.keys():
            item = SCENARIO_CATALOG.get(sid)
            if item:
                catalog.append(item.model_dump())
            else:
                catalog.append(
                    {
                        "id": sid,
                        "label": sid.replace("_", " ").title(),
                        "severity": "warn",
                        "blurb": "",
                        "codename": sid.upper(),
                    }
                )
        return {"scenarios": catalog}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/simulate/{scenario_id}", response_model=UnifiedDashboardPayload)
async def simulate_scenario(
    scenario_id: str,
    mock: Optional[bool] = Query(
        None, description="Force demo-safe mock path (skip live news/LLM)"
    ),
):
    try:
        scenarios = _load_scenarios()
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

    demo_mode = _resolve_demo_mode(mock)
    try:
        return _run_pipeline(scenario_id, demo_mode=demo_mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation pipeline failed: {e}")


@app.get("/api/simulate/{scenario_id}/stream")
async def simulate_scenario_stream(
    scenario_id: str,
    mock: Optional[bool] = Query(None),
):
    """SSE progress theater: ingest → risk → impact → orchestration → done."""
    try:
        scenarios = _load_scenarios()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if scenario_id not in scenarios:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    demo_mode = _resolve_demo_mode(mock)

    async def event_gen() -> AsyncIterator[str]:
        stages = [
            ("ingest", "Ingesting chokepoint intelligence signals"),
            ("risk", "Agent 1 — geopolitical risk parse"),
            ("impact", "Agent 2 — deterministic impact math"),
            ("orchestration", "Agent 3 — procurement orchestration"),
        ]
        for stage, message in stages:
            payload = json.dumps({"stage": stage, "message": message})
            yield f"event: progress\ndata: {payload}\n\n"
            await asyncio.sleep(0.22 if demo_mode else 0.12)

        try:
            result = await asyncio.to_thread(
                _run_pipeline, scenario_id, demo_mode=demo_mode
            )
            done = json.dumps(
                {"stage": "done", "payload": result.model_dump()},
                default=str,
            )
            yield f"event: done\ndata: {done}\n\n"
        except Exception as e:
            err = json.dumps({"stage": "error", "message": str(e)})
            yield f"event: error\ndata: {err}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

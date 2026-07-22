"""
FastAPI entrypoint — unidirectional pipeline:
Scenario ID → Agent 1 (risk) → Market Data → Agent 2 (math) → Agent 3 (procurement)
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

_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

_PROJECT_ROOT = os.path.abspath(os.path.join(_BACKEND_ROOT, ".."))
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"))
load_dotenv()

from app.agent_one import analyze_route_risk_with_ml
from app.agent_three import generate_procurement_strategy
from app.agent_two import calculate_disruption_impact
from app.config import LLM_MODEL, SIMULATE_WALL_CLOCK_BUDGET_S, resolve_app_mode
from app.schemas import (
    SCENARIO_CATALOG,
    GeopoliticalRiskPayload,
    LatencyMs,
    PipelineMeta,
    UnifiedDashboardPayload,
)
from app.services.market_data import get_brent_for_pipeline, get_last_market_error, get_live_brent

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


def _oilprice_configured() -> bool:
    return bool(os.getenv("OILPRICE_API_KEY"))


def _news_configured() -> bool:
    return bool(
        os.getenv("NEWSAPI_KEY")
        or os.getenv("NEWSDATA_API_KEY")
        or os.getenv("NEWSAPI_ORG_KEY")
    )


def _is_simulation_mode(mock: Optional[bool]) -> bool:
    if mock is True:
        return True
    if mock is False:
        return False
    return resolve_app_mode() == "SIMULATION"


def _load_scenarios() -> dict:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _run_pipeline(
    scenario_id: str, *, simulation_mode: bool
) -> UnifiedDashboardPayload:
    app_mode = resolve_app_mode()
    scenarios = _load_scenarios()
    if scenario_id not in scenarios:
        raise KeyError(scenario_id)

    t0 = time.perf_counter()
    deadline = t0 + SIMULATE_WALL_CLOCK_BUDGET_S

    # Agent 1
    t1 = time.perf_counter()
    a1 = analyze_route_risk_with_ml(
        scenario_id, force_mock=simulation_mode or time.perf_counter() >= deadline
    )
    agent1_ms = (time.perf_counter() - t1) * 1000
    risk_payload = a1.payload

    # Market data (required before Agent 2)
    t_mkt = time.perf_counter()
    try:
        market_quote = get_brent_for_pipeline(simulation_mode=simulation_mode)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"LIVE mode requires live Brent quote; market fetch failed: {e}",
        ) from e
    market_ms = (time.perf_counter() - t_mkt) * 1000

    # Agent 2
    t2 = time.perf_counter()
    try:
        impact_payload = calculate_disruption_impact(risk_payload, market_quote)
    except Exception as e:
        print(f"[main] Agent 2 failure: {e}")
        if app_mode == "LIVE" and not simulation_mode:
            raise HTTPException(status_code=503, detail=f"Agent 2 calculation failed: {e}") from e
        risk_payload = GeopoliticalRiskPayload(**scenarios[scenario_id]["risk_data"])
        impact_payload = calculate_disruption_impact(risk_payload, market_quote)
    agent2_ms = (time.perf_counter() - t2) * 1000

    # Agent 3
    t3 = time.perf_counter()
    force_a3_mock = simulation_mode or (time.perf_counter() >= deadline)
    a3 = generate_procurement_strategy(
        risk_payload,
        impact_payload,
        market_quote=market_quote,
        force_mock=force_a3_mock,
    )
    agent3_ms = (time.perf_counter() - t3) * 1000
    total_ms = (time.perf_counter() - t0) * 1000

    confidences = [t.confidence_score for t in risk_payload.active_threats]
    overall_conf = sum(confidences) / len(confidences) if confidences else 0.0

    meta = PipelineMeta(
        agent1_source=a1.source,
        agent3_source=a3.source,
        news_ok=a1.news_ok,
        demo_mode=simulation_mode,
        app_mode="SIMULATION" if simulation_mode else app_mode,
        model=LLM_MODEL if a1.source == "live" or a3.source == "live" else None,
        brent_data_source=market_quote.data_source,
        latency_ms=LatencyMs(
            agent1=round(agent1_ms, 1),
            agent2=round(agent2_ms + market_ms, 1),
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
    app_mode = resolve_app_mode()
    brent_status = "unknown"
    brent_price = None
    brent_source = None
    try:
        q = get_live_brent(require_live=False)
        brent_status = "ok"
        brent_price = q.live_brent_price
        brent_source = q.data_source
    except Exception:
        brent_status = "error"
        brent_price = None
        brent_source = get_last_market_error()

    return {
        "status": "ok",
        "service": "aegis-energy-security",
        "app_mode": app_mode,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "openrouter_configured": _openrouter_configured(),
        "oilprice_configured": _oilprice_configured(),
        "news_configured": _news_configured(),
        "model": LLM_MODEL,
        "brent_status": brent_status,
        "brent_price": brent_price,
        "brent_source": brent_source,
        "demo_mode": app_mode == "SIMULATION",
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
        None, description="Force SIMULATION path (skip live news/LLM)"
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

    simulation_mode = _is_simulation_mode(mock)
    try:
        return _run_pipeline(scenario_id, simulation_mode=simulation_mode)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation pipeline failed: {e}")


@app.get("/api/simulate/{scenario_id}/stream")
async def simulate_scenario_stream(
    scenario_id: str,
    mock: Optional[bool] = Query(None),
):
    """SSE progress: ingest → risk → market → impact → orchestration → done."""
    try:
        scenarios = _load_scenarios()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if scenario_id not in scenarios:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    simulation_mode = _is_simulation_mode(mock)

    async def event_gen() -> AsyncIterator[str]:
        stages = [
            ("ingest", "Ingesting chokepoint intelligence signals"),
            ("risk", "Agent 1 — geopolitical risk parse"),
            ("market", "Fetching live Brent crude quote"),
            ("impact", "Agent 2 — deterministic impact math"),
            ("orchestration", "Agent 3 — procurement orchestration"),
        ]
        for stage, message in stages:
            payload = json.dumps({"stage": stage, "message": message})
            yield f"event: progress\ndata: {payload}\n\n"
            await asyncio.sleep(0.22 if simulation_mode else 0.12)

        try:
            result = await asyncio.to_thread(
                _run_pipeline, scenario_id, simulation_mode=simulation_mode
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

    from app.config import PORT

    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)

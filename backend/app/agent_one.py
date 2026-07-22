"""
Agent 1 — Geopolitical Risk Parser.
LIVE: news_ingest + OpenRouter LLM → RouteRisk JSON parse.
SIMULATION: scenarios.json fallback.
"""

from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Literal, Optional

from dotenv import load_dotenv
from openai import OpenAI

from app.config import (
    AGENT1_LLM_TIMEOUT_S,
    LLM_MODEL,
    OPENROUTER_BASE_URL,
    resolve_app_mode,
)
from app.http_utils import make_httpx_client, with_retries
from app.news_engine import fetch_live_chokepoint_news
from app.schemas import GeopoliticalRiskPayload, NewsSnippet, RouteRisk

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY", "")

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.json")

TARGET_ROUTES = ["Strait_of_Hormuz", "Bab_el_Mandeb"]


@dataclass
class AgentOneResult:
    payload: GeopoliticalRiskPayload
    source: Literal["live", "fallback"]
    news_ok: bool
    snippets: List[NewsSnippet] = field(default_factory=list)


def _get_client() -> Optional[OpenAI]:
    if not OPENROUTER_API_KEY:
        return None
    return OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
        default_headers={
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Aegis Energy Security",
        },
        http_client=make_httpx_client(timeout=AGENT1_LLM_TIMEOUT_S + 4.0),
    )


def _load_fallback(scenario_id: str) -> GeopoliticalRiskPayload:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        scenarios = json.load(f)
    fallback_data = scenarios.get(scenario_id, scenarios["baseline_peace"])["risk_data"]
    return GeopoliticalRiskPayload(**fallback_data)


def _chokepoint_status(score: float) -> str:
    if score >= 81:
        return "Critical Blockade"
    if score >= 51:
        return "Elevated"
    return "Clear"


def _score_route(
    route: str, scenario_id: str, client: OpenAI
) -> tuple[Optional[RouteRisk], List[NewsSnippet], bool]:
    live_text, snippets = fetch_live_chokepoint_news(route)
    news_ok = bool(live_text)
    if not live_text:
        return None, snippets, False

    system_prompt = (
        "You are a Senior Maritime Geopolitical Intelligence Analyst. "
        "Evaluate risk from the provided news on a scale from 0 to 100:\n"
        "- 0-20: Peace, routine transits\n"
        "- 21-50: Increased verbal tension or drills\n"
        "- 51-80: Kinetic actions, drone strikes, active shipping diversions\n"
        "- 81-100: Total blockade, declare war zone, regular asset damage\n"
        "Output absolute JSON with keys: route_name, base_risk_score, risk_delta, "
        "primary_threat_driver, confidence_score, risk_score, chokepoint_status, threat_drivers.\n"
        "chokepoint_status must be one of: Clear, Elevated, Critical Blockade.\n"
        "threat_drivers must be an array of 1-3 concise strings.\n"
        f"Set route_name to exactly '{route}'."
    )
    scenario_hint = (
        f"Scenario context: '{scenario_id}'. "
        "Weight scores if live news is mixed or quiet."
    )

    completion = with_retries(
        lambda: client.chat.completions.create(
            model=LLM_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"{scenario_hint}\n\n"
                        f"Analyze this text context for {route}:\n\n{live_text}"
                    ),
                },
            ],
            max_tokens=800,
            timeout=AGENT1_LLM_TIMEOUT_S,
        ),
        label=f"agent1:{route}",
    )

    parsed_json = json.loads(completion.choices[0].message.content or "{}")
    parsed_json["route_name"] = route
    risk = RouteRisk(**parsed_json)
    risk.risk_score = risk.base_risk_score
    if not risk.chokepoint_status or risk.chokepoint_status == "Clear":
        risk.chokepoint_status = _chokepoint_status(risk.base_risk_score)  # type: ignore[assignment]
    return risk, snippets, news_ok


def analyze_route_risk_with_ml(
    scenario_id: str, *, force_mock: bool = False
) -> AgentOneResult:
    """
    Parse news into structured threat scores.
    force_mock / SIMULATION → scenarios.json fallback.
    LIVE: no silent fallback unless all routes fail.
    """
    app_mode = resolve_app_mode()
    if force_mock or app_mode == "SIMULATION":
        payload = _load_fallback(scenario_id)
        return AgentOneResult(payload=payload, source="fallback", news_ok=False)

    client = _get_client()
    if client is None:
        print("[Agent 1] No OpenRouter key — using scenarios.json fallback.")
        return AgentOneResult(
            payload=_load_fallback(scenario_id), source="fallback", news_ok=False
        )

    active_threats: List[RouteRisk] = []
    all_snippets: List[NewsSnippet] = []
    any_news = False

    try:
        with ThreadPoolExecutor(max_workers=len(TARGET_ROUTES)) as pool:
            futures = {
                pool.submit(_score_route, route, scenario_id, client): route
                for route in TARGET_ROUTES
            }
            for fut in as_completed(futures):
                route = futures[fut]
                try:
                    risk, snippets, news_ok = fut.result()
                    all_snippets.extend(snippets)
                    any_news = any_news or news_ok
                    if risk is not None:
                        active_threats.append(risk)
                    else:
                        print(f"[Agent 1] Partial miss for {route}; continuing.")
                except Exception as route_err:
                    print(f"[Agent 1] Route {route} failed: {route_err}")

        if not active_threats:
            raise ValueError("No routes scored successfully in LIVE mode.")

        order = {r: i for i, r in enumerate(TARGET_ROUTES)}
        active_threats.sort(key=lambda t: order.get(t.route_name, 99))

        payload = GeopoliticalRiskPayload(
            scenario_id=scenario_id,
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            active_threats=active_threats,
            system_rationale="Live telemetry parsed via OpenRouter LLM.",
            intel_snippets=all_snippets[:8],
        )
        return AgentOneResult(
            payload=payload, source="live", news_ok=any_news, snippets=all_snippets
        )

    except Exception as e:
        if resolve_app_mode() == "LIVE":
            raise RuntimeError(f"Agent 1 LIVE pipeline failed: {e}") from e
        print(f"[Agent 1] LIVE failed, SIMULATION fallback: {e}")
        return AgentOneResult(
            payload=_load_fallback(scenario_id),
            source="fallback",
            news_ok=any_news,
            snippets=all_snippets,
        )

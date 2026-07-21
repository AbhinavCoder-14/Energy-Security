"""
Agent 1 — Geopolitical Risk Parser.
Live-first: newsdata.io + OpenRouter LLM. Falls back to scenarios.json on any failure.
"""

import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from openai import OpenAI

from app.config import OPENROUTER_BASE_URL, OPENROUTER_MODEL
from app.news_engine import fetch_live_chokepoint_news
from app.schemas import GeopoliticalRiskPayload, RouteRisk

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY", "")

client = OpenAI(
    base_url=OPENROUTER_BASE_URL,
    api_key=OPENROUTER_API_KEY,
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Aegis Energy Security MVP",
    },
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.json")


def _load_fallback(scenario_id: str) -> GeopoliticalRiskPayload:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        scenarios = json.load(f)
    fallback_data = scenarios.get(scenario_id, scenarios["baseline_peace"])["risk_data"]
    return GeopoliticalRiskPayload(**fallback_data)


def analyze_route_risk_with_ml(scenario_id: str) -> GeopoliticalRiskPayload:
    """
    Uses an LLM to parse noisy, raw news text into structured numerical threat scores.
    Live-first; on any failure returns cached scenarios.json payload.
    """
    target_routes = ["Strait_of_Hormuz", "Bab_el_Mandeb"]
    active_threats = []

    try:
        for route in target_routes:
            live_text = fetch_live_chokepoint_news(route)

            if not live_text:
                raise ValueError(f"No live news text available for {route}.")

            system_prompt = (
                "You are a Senior Maritime Geopolitical Intelligence Analyst. "
                "Evaluate risk from the provided news on a scale from 0 to 100:\n"
                "- 0-20: Peace, routine transits\n"
                "- 21-50: Increased verbal tension or drills\n"
                "- 51-80: Kinetic actions, drone strikes, active shipping diversions\n"
                "- 81-100: Total blockade, declare war zone, regular asset damage\n"
                "Output absolute JSON with keys exactly matching: "
                "route_name, base_risk_score, risk_delta, primary_threat_driver, confidence_score.\n"
                f"Set route_name to exactly '{route}'."
            )

            # Bias the LLM toward the selected demo scenario when live news is ambiguous
            scenario_hint = (
                f"Scenario context for this simulation run: '{scenario_id}'. "
                "Weight your scores accordingly if the live news is mixed or quiet."
            )

            completion = client.chat.completions.create(
                model=OPENROUTER_MODEL,
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
                timeout=8.0,
            )

            parsed_json = json.loads(completion.choices[0].message.content)
            # Ensure route_name matches our matrix keys
            parsed_json["route_name"] = route
            active_threats.append(RouteRisk(**parsed_json))

        return GeopoliticalRiskPayload(
            scenario_id=scenario_id,
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            active_threats=active_threats,
            system_rationale="Live telemetry parsed dynamically via OpenRouter AI engine.",
        )

    except Exception as e:
        print(
            f"[Demo Safety Active] Live Agent 1 pipeline bypassed or failed: {e}. "
            "Defaulting to safe mock payload."
        )
        return _load_fallback(scenario_id)

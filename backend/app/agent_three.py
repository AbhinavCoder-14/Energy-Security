"""
Agent 3 — Procurement Orchestrator.
OpenRouter LLM → ExecutiveSummary JSON with live Agent 1/2 context.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Literal, Optional

from dotenv import load_dotenv
from openai import OpenAI

from app.config import (
    AGENT3_LLM_TIMEOUT_S,
    ALTERNATIVE_LOGISTICS_MATRIX,
    INDIA_REFINERY_SLATE_MATRIX,
    LLM_MODEL,
    OPENROUTER_BASE_URL,
    resolve_app_mode,
)
from app.http_utils import make_httpx_client, with_retries
from app.schemas import (
    DisruptionImpactPayload,
    ExecutiveSummary,
    GeopoliticalRiskPayload,
    LiveBrentQuote,
    ProcurementAction,
)

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY", "")


@dataclass
class AgentThreeResult:
    summary: ExecutiveSummary
    source: Literal["live", "mock"]


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
        http_client=make_httpx_client(timeout=AGENT3_LLM_TIMEOUT_S + 4.0),
    )


def _spr_action(volume: float) -> ProcurementAction:
    spr = ALTERNATIVE_LOGISTICS_MATRIX["India_SPR_Drawdown"]
    return ProcurementAction(
        priority_rank=1,
        action_type="SPR Drawdown",
        source_region="India Domestic Reserves",
        volume_mbpd=min(volume, spr["max_available_spot_mbpd"]),
        estimated_delivery_days=spr["transit_days_to_india"],
        crude_slate_compatibility="Compatible (High-Sour Mimic)",
        financial_cost_multiplier=1.05,
        action_justification=(
            "Immediate bridge supply from SPR to preserve high-sour assets "
            f"at Jamnagar/Paradip ({INDIA_REFINERY_SLATE_MATRIX['RIL_Jamnagar']['preferred_slate']})."
        ),
    )


def _latam_action(rank: int, volume: float) -> ProcurementAction:
    latam = ALTERNATIVE_LOGISTICS_MATRIX["Latin_America_Heavy"]
    return ProcurementAction(
        priority_rank=rank,
        action_type="Spot Market Diversion",
        source_region="Latin America (Heavy-Sour)",
        volume_mbpd=min(volume, latam["max_available_spot_mbpd"]),
        estimated_delivery_days=latam["transit_days_to_india"],
        crude_slate_compatibility="Optimal Match (High-Sulfur Sour for Jamnagar)",
        financial_cost_multiplier=round(1.0 + latam["freight_cost_per_bbl"] / 10.0, 2),
        action_justification=(
            "Heavy-sour Merey-class barrels match RIL Jamnagar ultra-heavy slate."
        ),
    )


def _waf_sweet_action(rank: int, volume: float) -> ProcurementAction:
    waf = ALTERNATIVE_LOGISTICS_MATRIX["West_Africa_Sweet"]
    return ProcurementAction(
        priority_rank=rank,
        action_type="Spot Market Diversion",
        source_region="West Africa (Sweet for Kochi)",
        volume_mbpd=min(volume, waf["max_available_spot_mbpd"]),
        estimated_delivery_days=waf["transit_days_to_india"],
        crude_slate_compatibility="Compatible (Light-Sweet for BPCL Kochi)",
        financial_cost_multiplier=round(1.0 + waf["freight_cost_per_bbl"] / 10.0, 2),
        action_justification="Matches BPCL Kochi blend while chokepoints remain impaired.",
    )


def _cape_reroute_action(rank: int) -> ProcurementAction:
    return ProcurementAction(
        priority_rank=rank,
        action_type="Route Rerouting",
        source_region="Cape of Good Hope diversion",
        volume_mbpd=0.6,
        estimated_delivery_days=28,
        crude_slate_compatibility="Transit path only — preserve existing slate contracts",
        financial_cost_multiplier=1.42,
        action_justification=(
            "Bab-el-Mandeb / Red Sea kinetic risk forces Cape diversion; "
            "pre-charter VLCC capacity before freight spikes."
        ),
    )


def _mock_executive_summary(
    risk: GeopoliticalRiskPayload, impact: DisruptionImpactPayload
) -> ExecutiveSummary:
    sid = risk.scenario_id
    vol = max(impact.affected_import_volume_mbpd, 0.3)
    spr_days = impact.spr_days_of_cover or impact.total_days_of_reserve_cover

    if sid == "baseline_peace":
        actions = [
            ProcurementAction(
                priority_rank=1,
                action_type="Monitor",
                source_region="Existing term contracts",
                volume_mbpd=0.0,
                estimated_delivery_days=0,
                crude_slate_compatibility="N/A — no disruption",
                financial_cost_multiplier=1.0,
                action_justification="All corridors within historical variance.",
            ),
        ]
        memo = (
            f"### STRATEGIC EXECUTIVE BRIEF\n\n**STATUS:** BASELINE_PEACE\n\n"
            f"Import shortfall **{impact.affected_import_volume_mbpd} MBPD**. "
            f"SPR cover **{spr_days} days**."
        )
    elif sid == "bab_el_mandeb_escalation":
        actions = [
            _cape_reroute_action(1),
            _waf_sweet_action(2, max(0.4, vol * 0.35)),
            _spr_action(min(0.8, vol * 0.5)),
        ]
        actions[2].priority_rank = 3
        memo = (
            f"### STRATEGIC EXECUTIVE BRIEF\n\n**CRISIS:** BAB_EL_MANDEB\n\n"
            f"Shortfall **{vol} MBPD**, SPR **{spr_days} days**."
        )
    else:
        actions = [
            _spr_action(min(1.5, max(0.8, vol * 0.55))),
            _latam_action(2, min(0.8, max(0.5, vol * 0.4))),
            _waf_sweet_action(3, min(0.5, max(0.3, vol * 0.2))),
        ]
        memo = (
            f"### STRATEGIC EXECUTIVE BRIEF\n\n**CRISIS:** {sid.upper()}\n\n"
            f"Shortfall **{vol} MBPD**, SPR **{spr_days} days**."
        )

    return ExecutiveSummary(actionable_memo=memo, recommended_actions=actions)


def generate_procurement_strategy(
    risk: GeopoliticalRiskPayload,
    impact: DisruptionImpactPayload,
    *,
    market_quote: Optional[LiveBrentQuote] = None,
    force_mock: bool = False,
) -> AgentThreeResult:
    """Rank 2–3 procurement actions using refinery slate chemistry + live context."""
    if force_mock or resolve_app_mode() == "SIMULATION":
        return AgentThreeResult(
            summary=_mock_executive_summary(risk, impact), source="mock"
        )

    client = _get_client()
    if client is None:
        return AgentThreeResult(
            summary=_mock_executive_summary(risk, impact), source="mock"
        )

    try:
        slate_context = json.dumps(INDIA_REFINERY_SLATE_MATRIX, indent=2)
        logistics_context = json.dumps(ALTERNATIVE_LOGISTICS_MATRIX, indent=2)
        risk_json = risk.model_dump_json(indent=2)
        impact_json = impact.model_dump_json(indent=2)
        brent_ctx = market_quote.model_dump_json() if market_quote else "{}"

        system_prompt = (
            "You are a senior energy economist advising India's Ministry of Petroleum. "
            "Match crude chemistry: Jamnagar/Paradip need Heavy/Ultra-Heavy Sour; "
            "Kochi accepts Medium-Sour/Light-Sweet. Never recommend Light Sweet for Jamnagar. "
            "Rank 2-3 actions: SPR Drawdown, Spot Diversion, Freight Hedging. "
            "For bab_el_mandeb_escalation prioritize Cape rerouting. "
            "For baseline_peace return monitoring-only actions with volume_mbpd 0.\n"
            "Return JSON with keys: actionable_memo (markdown string), recommended_actions "
            "(array of objects with: priority_rank, action_type, source_region, volume_mbpd, "
            "estimated_delivery_days, crude_slate_compatibility, financial_cost_multiplier, "
            "action_justification)."
        )

        user_prompt = (
            f"REFINERY SLATE:\n{slate_context}\n\n"
            f"LOGISTICS:\n{logistics_context}\n\n"
            f"LIVE BRENT:\n{brent_ctx}\n\n"
            f"RISK:\n{risk_json}\n\n"
            f"IMPACT:\n{impact_json}"
        )

        completion = with_retries(
            lambda: client.chat.completions.create(
                model=LLM_MODEL,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=1200,
                timeout=AGENT3_LLM_TIMEOUT_S,
            ),
            label="agent3:procurement",
        )

        parsed = json.loads(completion.choices[0].message.content or "{}")
        return AgentThreeResult(summary=ExecutiveSummary(**parsed), source="live")

    except Exception as e:
        print(f"[Agent 3] LLM failed: {e}. Using deterministic mock.")
        return AgentThreeResult(
            summary=_mock_executive_summary(risk, impact), source="mock"
        )

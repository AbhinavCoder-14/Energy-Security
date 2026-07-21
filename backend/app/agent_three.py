"""
Agent 3 — Procurement Orchestrator.
Live-first OpenRouter LLM for ExecutiveSummary; scenario-aware matrix mock fallback.
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
    OPENROUTER_BASE_URL,
    OPENROUTER_MODEL,
)
from app.http_utils import make_httpx_client, with_retries
from app.schemas import (
    DisruptionImpactPayload,
    ExecutiveSummary,
    GeopoliticalRiskPayload,
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
            "X-Title": "Aegis Energy Security MVP",
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
            "Immediate bridge supply from SPR to prevent high-sour asset shutdowns "
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
        financial_cost_multiplier=round(
            1.0 + latam["freight_cost_per_bbl"] / 10.0, 2
        ),
        action_justification=(
            "Heavy-sour Merey-class barrels match RIL Jamnagar ultra-heavy slate; "
            "never substitute light sweet into Jamnagar chemistry."
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
        action_justification=(
            "Matches BPCL Kochi Medium-Sour/Light-Sweet blend while Red Sea/Hormuz "
            "routes remain impaired."
        ),
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
            "pre-charter VLCC capacity before freight spikes further."
        ),
    )


def _mock_executive_summary(
    risk: GeopoliticalRiskPayload, impact: DisruptionImpactPayload
) -> ExecutiveSummary:
    """Scenario-aware deterministic orchestration from logistics + slate matrices."""
    sid = risk.scenario_id
    vol = max(impact.affected_import_volume_mbpd, 0.3)
    days = impact.total_days_of_reserve_cover

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
                action_justification=(
                    "All corridors within historical variance. Hold procurement cadence "
                    "and keep chokepoint watch at Level 1."
                ),
            ),
            ProcurementAction(
                priority_rank=2,
                action_type="Monitor",
                source_region="India SPR readiness",
                volume_mbpd=0.0,
                estimated_delivery_days=1,
                crude_slate_compatibility="Standby High-Sour Mimic",
                financial_cost_multiplier=1.0,
                action_justification=(
                    f"SPR cover at {days} days — above crisis threshold. "
                    "No drawdown indicated; maintain statutory floor."
                ),
            ),
        ]
        memo = (
            f"### STRATEGIC EXECUTIVE BRIEF\n\n"
            f"**STATUS:** BASELINE_PEACE — NOMINAL\n\n"
            f"Global energy shipping corridors are operating normally. "
            f"Modeled import shortfall is **{impact.affected_import_volume_mbpd} MBPD** "
            f"with **{days} days** of SPR cover remaining.\n\n"
            f"#### DIRECTIVES:\n"
            f"1. Maintain standard procurement cadence.\n"
            f"2. Keep SPR at policy target; no drawdown.\n"
        )
    elif sid == "bab_el_mandeb_escalation":
        actions = [
            _cape_reroute_action(1),
            _waf_sweet_action(2, max(0.4, vol * 0.35)),
            _spr_action(min(0.8, vol * 0.5)),
        ]
        # Re-rank SPR as tertiary readiness for Bab (less acute than Hormuz for heavy-sour)
        actions[2].priority_rank = 3
        actions[2].action_justification = (
            f"Stage partial SPR readiness — cover at {days} days remains usable. "
            "Prepare contingency drawdown; prioritize Cape freight hedges first."
        )
        memo = (
            f"### STRATEGIC EXECUTIVE BRIEF\n\n"
            f"**CRISIS ALERT:** BAB_EL_MANDEB_ESCALATION\n\n"
            f"Red Sea kinetic escalation threatens **{impact.affected_import_volume_mbpd} MBPD** "
            f"and compresses SPR cover to **{days} days**. "
            f"Freight premium modeled at "
            f"**${impact.market_metrics.freight_premium_usd_per_barrel}/bbl**.\n\n"
            f"#### MANDATORY RESPONSE DIRECTIVES:\n"
            f"1. **Cape diversion:** Pre-charter VLCC capacity around Africa.\n"
            f"2. **Sweet spot for Kochi:** West Africa barrels match Kochi blend chemistry.\n"
            f"3. **Stage SPR:** Ready but do not fully execute until Hormuz spillover.\n"
        )
    else:
        # strait_of_hormuz_closure and any unknown crisis → heavy-sour first
        actions = [
            _spr_action(min(1.5, max(0.8, vol * 0.55))),
            _latam_action(2, min(0.8, max(0.5, vol * 0.4))),
            _waf_sweet_action(3, min(0.5, max(0.3, vol * 0.2))),
        ]
        memo = (
            f"### STRATEGIC EXECUTIVE BRIEF\n\n"
            f"**CRISIS ALERT:** {sid.upper()}\n\n"
            f"Immediate mitigation protocols initiated. The modeled disruption threatens "
            f"**{impact.affected_import_volume_mbpd} MBPD** of inbound crude deliveries, "
            f"shortening total strategic reserves lifespan to **{days} days**.\n\n"
            f"#### MANDATORY RESPONSE DIRECTIVES:\n"
            f"1. **Execute Controlled Drawdown:** Release SPR volumes immediately to preserve "
            f"capacity at critical high-sour processing assets (Jamnagar / Paradip).\n"
            f"2. **Latin America heavy-sour swaps:** Secure Merey-class spot for Jamnagar slate.\n"
            f"3. **Kochi sweet blend:** West Africa / Permian sweet only for Kochi — "
            f"never light sweet into Jamnagar.\n"
        )

    return ExecutiveSummary(actionable_memo=memo, recommended_actions=actions)


def generate_procurement_strategy(
    risk: GeopoliticalRiskPayload,
    impact: DisruptionImpactPayload,
    *,
    force_mock: bool = False,
) -> AgentThreeResult:
    """
    Rank 2–3 procurement actions by urgency and cost using refinery slate chemistry.
    Falls back to scenario-aware matrix mock on LLM/API failure or force_mock.
    """
    if force_mock:
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

        system_prompt = (
            "You are a senior energy economist advising India's Ministry of Petroleum "
            "and Natural Gas on emergency crude procurement.\n"
            "You MUST match crude chemistry correctly: Jamnagar and Paradip require "
            "Heavy/Ultra-Heavy Sour; Kochi can take Medium-Sour / Light-Sweet blends. "
            "Never recommend Light Sweet for Jamnagar — it risks equipment damage.\n"
            "Rank exactly 2 or 3 actions by urgency then cost. Prefer SPR Drawdown first "
            "when reserve cover is critically low, then heavy-sour spot diversions "
            "(Latin America), then West Africa / US Permian for sweet-compatible sites.\n"
            "For bab_el_mandeb_escalation prioritize Cape rerouting and freight hedges.\n"
            "For baseline_peace return monitoring-only actions with volume_mbpd 0.\n"
            "Return JSON with keys: actionable_memo (markdown string), recommended_actions "
            "(array of objects with: priority_rank, action_type, source_region, volume_mbpd, "
            "estimated_delivery_days, crude_slate_compatibility, financial_cost_multiplier, "
            "action_justification)."
        )

        user_prompt = (
            f"REFINERY SLATE MATRIX:\n{slate_context}\n\n"
            f"ALTERNATIVE LOGISTICS MATRIX:\n{logistics_context}\n\n"
            f"RISK PAYLOAD:\n{risk_json}\n\n"
            f"IMPACT PAYLOAD:\n{impact_json}\n\n"
            "Generate the ExecutiveSummary JSON now."
        )

        completion = with_retries(
            lambda: client.chat.completions.create(
                model=OPENROUTER_MODEL,
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

        parsed = json.loads(completion.choices[0].message.content)
        return AgentThreeResult(summary=ExecutiveSummary(**parsed), source="live")

    except Exception as e:
        print(
            f"[Demo Safety Active] Agent 3 LLM failed: {e}. "
            "Returning scenario-aware mock ExecutiveSummary."
        )
        return AgentThreeResult(
            summary=_mock_executive_summary(risk, impact), source="mock"
        )

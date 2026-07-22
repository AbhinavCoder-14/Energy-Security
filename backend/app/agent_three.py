"""
Agent 3 — Procurement Orchestrator.
OpenRouter LLM → ExecutiveSummary JSON with live Agent 1/2 context.

Also hosts generate_rerouting_strategy for the additive DashboardPayload path
(chemical-slate matching + deterministic per-scenario fallback).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv
from openai import OpenAI

from app.config import (
    AGENT3_LLM_TIMEOUT_S,
    ALTERNATIVE_LOGISTICS_MATRIX,
    ALTERNATIVE_SUPPLY_ORIGINS,
    INDIA_REFINERY_SLATE_MATRIX,
    LLM_MODEL,
    OPENROUTER_BASE_URL,
    resolve_app_mode,
)
from app.http_utils import make_httpx_client, with_retries
from app.schemas import (
    DashboardPayload,
    DisruptionImpactPayload,
    ExecutiveSummary,
    GeopoliticalRiskPayload,
    LiveBrentQuote,
    ProcurementAction,
    ReroutingSummary,
    RouteAlternative,
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


# ---------------------------------------------------------------------------
# Rerouting strategy for DashboardPayload (additive; OpenRouter + fallback)
# ---------------------------------------------------------------------------

_CANONICAL = {"hormuz_closure": "strait_of_hormuz_closure"}


def _origin_to_alternative(
    origin_key: str,
    *,
    priority: int,
    volume_mbpd: float,
    compatibility: str,
    justification: str,
) -> RouteAlternative:
    origin = ALTERNATIVE_SUPPLY_ORIGINS[origin_key]
    return RouteAlternative(
        origin_name=origin_key,
        origin_coordinates=list(origin["coordinates"]),
        volume_mbpd=min(volume_mbpd, origin["max_available_mbpd"]),
        transit_days=int(origin["transit_days"]),
        freight_usd_per_bbl=float(origin["freight_usd_per_bbl"]),
        crude_grade=str(origin["crude_grade"]),
        slate_compatibility=compatibility,
        priority_rank=priority,
        justification=justification,
    )


def _fallback_rerouting(scenario_id: str, v_disrupted: float) -> ReroutingSummary:
    """Deterministic per-scenario directives — never raises."""
    sid = _CANONICAL.get(scenario_id, scenario_id)
    vol = max(v_disrupted, 0.3)

    if sid == "strait_of_hormuz_closure":
        actions = [
            _origin_to_alternative(
                "India_Domestic_SPR",
                priority=1,
                volume_mbpd=min(1.5, vol * 0.55),
                compatibility="Optimal (Heavy-Sour Mimic for Jamnagar/Paradip)",
                justification=(
                    "Immediate SPR bridge preserves ultra-heavy sour slate at "
                    "RIL Jamnagar and IOCL Paradip after Hormuz cut."
                ),
            ),
            _origin_to_alternative(
                "Brazil_Santos",
                priority=2,
                volume_mbpd=min(0.8, vol * 0.4),
                compatibility="Optimal Match (Merey/Marlim Heavy-Sour)",
                justification=(
                    "Brazil Heavy-Sour replaces severed Iraqi Basrah / Saudi barrels. "
                    "Do NOT substitute Light-Sweet — mismatch penalty on cokers."
                ),
            ),
            _origin_to_alternative(
                "West_Africa_Nigeria",
                priority=3,
                volume_mbpd=min(0.5, vol * 0.2),
                compatibility="Compatible (Medium-Sweet for Kochi blend)",
                justification="Secondary cover for BPCL Kochi medium-sour/sweet blend.",
            ),
        ]
        memo = (
            f"## Cabinet Situation Brief — Strait of Hormuz Closure\n\n"
            f"**Immediate shortfall:** {v_disrupted:.3f} MBPD of inbound crude is "
            f"severed (Iraq full cut, UAE full cut, Saudi ~60%). "
            f"RIL Jamnagar and IOCL Paradip face **Heavy-Sour chemical-slate risk**.\n\n"
            f"### Authorize now\n"
            f"1. Draw **India Domestic SPR** as a bridge (priority 1) to protect "
            f"Jamnagar/Paradip ultra-heavy sour runs.\n"
            f"2. Issue emergency tenders for **Brazil Santos Heavy-Sour** "
            f"(Merey/Marlim class) as the grade-matched replacement.\n"
            f"3. Stage **West Africa Medium-Sweet** for BPCL Kochi blend cover.\n"
            f"4. Pre-clear Cape of Good Hope freight (+~14 transit days) and war-risk "
            f"insurance uplift with shipping & MoP&NG.\n\n"
            f"### Do not\n"
            f"- Dump **US Gulf Light-Sweet** onto Jamnagar/Paradip cokers "
            f"(slate mismatch penalty, yield collapse).\n"
            f"- Wait for Hormuz reopening before SPR draw — runway is finite.\n"
            f"- Allow commercial stocks to fall below the 5-day operational floor "
            f"without Cabinet notification.\n\n"
            f"### Official next steps\n"
            f"- MoP&NG / PPAC: lock SPR release schedule within 24h.\n"
            f"- IOC procurement desks: Brazil + WAF RFQs with slate clauses.\n"
            f"- MoD / Coast Guard: elevate Hormuz / Gulf of Oman convoy advisories."
        )
    elif sid == "bab_el_mandeb_escalation":
        actions = [
            _origin_to_alternative(
                "West_Africa_Nigeria",
                priority=1,
                volume_mbpd=min(0.5, vol * 0.45),
                compatibility="Compatible (Medium-Sweet / Cape-capable)",
                justification="Cape diversion path; West Africa avoids Bab-el-Mandeb.",
            ),
            _origin_to_alternative(
                "US_Gulf_Coast",
                priority=2,
                volume_mbpd=min(1.0, vol * 0.35),
                compatibility="Compatible (Light-Sweet for Kochi; limited for heavy assets)",
                justification="Atlantic basin Light-Sweet via Cape — do not force onto Jamnagar.",
            ),
            _origin_to_alternative(
                "India_Domestic_SPR",
                priority=3,
                volume_mbpd=min(0.8, vol * 0.4),
                compatibility="Bridge (Heavy-Sour Mimic)",
                justification="SPR bridge while Cape freight settles.",
            ),
        ]
        memo = (
            f"## Cabinet Situation Brief — Bab-el-Mandeb Escalation\n\n"
            f"**Immediate shortfall:** {v_disrupted:.3f} MBPD affected by Red Sea "
            f"kinetic risk (Russia ~70% exposure, Saudi Red Sea leg ~40%). "
            f"Primary response is **Cape of Good Hope diversion**, not Hormuz-style "
            f"full Gulf blockade math.\n\n"
            f"### Authorize now\n"
            f"1. Re-route affected barrels via **Cape**; accept +~14 transit days "
            f"and elevated freight.\n"
            f"2. Prioritize **West Africa Nigeria** Medium-Sweet (Cape-capable).\n"
            f"3. Use **US Gulf Coast** Light-Sweet only for Kochi / light blend slots.\n"
            f"4. Soft SPR draw as freight markets settle.\n\n"
            f"### Do not\n"
            f"- Force Atlantic Light-Sweet onto Jamnagar heavy assets.\n"
            f"- Keep vessels in Bab-el-Mandeb without updated war-risk cover.\n"
            f"- Treat this as a full Hormuz closure — response envelope differs.\n\n"
            f"### Official next steps\n"
            f"- Shipping desks: Cape diversion standing order.\n"
            f"- MoP&NG: temporary freight surcharge briefing to Cabinet.\n"
            f"- Intelligence cell: daily Bab-el-Mandeb threat delta to Agent 1 feed."
        )
    elif sid == "secondary_sanctions_shock":
        actions = [
            _origin_to_alternative(
                "West_Africa_Nigeria",
                priority=1,
                volume_mbpd=min(0.5, vol * 0.5),
                compatibility="Compatible (Medium-Sweet replacing Russian Medium-Sour)",
                justification="Closest grade substitute for severed Russian Urals-class barrels.",
            ),
            _origin_to_alternative(
                "US_Gulf_Coast",
                priority=2,
                volume_mbpd=min(1.0, vol * 0.4),
                compatibility="Partial (Light-Sweet — blend carefully)",
                justification="Atlantic Light-Sweet fills volume gap; blend for Kochi.",
            ),
            _origin_to_alternative(
                "India_Domestic_SPR",
                priority=3,
                volume_mbpd=min(0.6, vol * 0.3),
                compatibility="Bridge cover",
                justification="SPR softens immediate sanctions cliff.",
            ),
        ]
        memo = (
            f"## Cabinet Situation Brief — Secondary Sanctions Shock\n\n"
            f"**Immediate shortfall:** Russia supply severed at "
            f"**{v_disrupted:.3f} MBPD** (Medium-Sour / Urals-class). "
            f"This is a **compliance + grade-substitution** shock, not a "
            f"maritime blockade.\n\n"
            f"### Authorize now\n"
            f"1. Replace with **West Africa Medium-Sweet** as closest grade proxy.\n"
            f"2. Fill residual volume with **US Gulf Light-Sweet** blended for Kochi.\n"
            f"3. Soft SPR bridge while contracts clear compliance review.\n"
            f"4. Legal / OFAC-equivalent clearance on every substitute cargo.\n\n"
            f"### Do not\n"
            f"- Dump Light-Sweet onto Jamnagar cokers as a volume dump.\n"
            f"- Continue Russian-origin cargoes without written compliance sign-off.\n"
            f"- Ignore slate chemistry — Medium-Sour loss is not generic barrels.\n\n"
            f"### Official next steps\n"
            f"- MoP&NG Legal: sanctions matrix update within 48h.\n"
            f"- Procurement: WAF + USGC RFQs with compliance attestations.\n"
            f"- Refinery planning: Kochi blend tables; Jamnagar hold heavy slate."
        )
    else:
        actions = []
        memo = (
            "## Cabinet Situation Brief — Steady State\n\n"
            "No active disruption. Maintain nominal procurement and chokepoint "
            "monitoring. No SPR draw, no emergency tenders, no Cape diversion "
            "standing orders.\n\n"
            "### Authorize now\n"
            "- Continue routine intelligence refresh (Agent 1) and live Brent telemetry.\n\n"
            "### Do not\n"
            "- Pre-emptively release SPR or reprice freight on rumor alone."
        )

    return ReroutingSummary(actionable_memo=memo, recommended_actions=actions)


def _parse_route_alternatives(raw: Any) -> List[RouteAlternative]:
    if not isinstance(raw, list):
        return []
    out: List[RouteAlternative] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        origin_name = item.get("origin_name") or item.get("source_region") or ""
        coords = item.get("origin_coordinates")
        if not coords and origin_name in ALTERNATIVE_SUPPLY_ORIGINS:
            coords = list(ALTERNATIVE_SUPPLY_ORIGINS[origin_name]["coordinates"])
        if not coords or len(coords) != 2:
            continue
        try:
            out.append(
                RouteAlternative(
                    origin_name=str(origin_name),
                    origin_coordinates=[float(coords[0]), float(coords[1])],
                    volume_mbpd=float(item.get("volume_mbpd", 0)),
                    transit_days=int(
                        item.get("transit_days", item.get("estimated_delivery_days", 0))
                    ),
                    freight_usd_per_bbl=float(
                        item.get(
                            "freight_usd_per_bbl",
                            ALTERNATIVE_SUPPLY_ORIGINS.get(origin_name, {}).get(
                                "freight_usd_per_bbl", 0
                            ),
                        )
                    ),
                    crude_grade=str(
                        item.get(
                            "crude_grade",
                            ALTERNATIVE_SUPPLY_ORIGINS.get(origin_name, {}).get(
                                "crude_grade", "Unknown"
                            ),
                        )
                    ),
                    slate_compatibility=str(
                        item.get(
                            "slate_compatibility",
                            item.get("crude_slate_compatibility", ""),
                        )
                    ),
                    priority_rank=int(item.get("priority_rank", len(out) + 1)),
                    justification=str(
                        item.get("justification", item.get("action_justification", ""))
                    ),
                )
            )
        except Exception:
            continue
    return out


def generate_rerouting_strategy(
    scenario_id: str,
    math_payload: DashboardPayload,
    live_brent: float,
    *,
    force_mock: bool = False,
) -> ReroutingSummary:
    """
    OpenRouter LLM → RouteAlternative[] with chemical-slate rules.
    Falls back to deterministic per-scenario directives (never 500).
    """
    sid = _CANONICAL.get(scenario_id, scenario_id)
    fallback = _fallback_rerouting(sid, math_payload.v_disrupted_mbpd)

    if force_mock or resolve_app_mode() == "SIMULATION":
        return fallback

    client = _get_client()
    if client is None:
        return fallback

    try:
        origins_ctx = json.dumps(ALTERNATIVE_SUPPLY_ORIGINS, indent=2)
        slate_ctx = json.dumps(INDIA_REFINERY_SLATE_MATRIX, indent=2)
        payload_ctx = math_payload.model_dump_json(indent=2)

        system_prompt = (
            "You are a senior energy economist advising India's Ministry of Petroleum "
            "on emergency crude rerouting. "
            "CHEMICAL SLATE RULE: If Heavy-Sour (Iraq/Saudi) is severed, prioritize "
            "Brazil_Santos (Merey/Marlim Heavy-Sour) or India_Domestic_SPR for "
            "Jamnagar/Paradip. Flag a mismatch penalty if Light-Sweet "
            "(US_Gulf_Coast) is suggested for those heavy assets. "
            "Use only origins from ALTERNATIVE_SUPPLY_ORIGINS. "
            "Return JSON with keys: actionable_memo (markdown string), "
            "recommended_actions (array of objects with: origin_name, "
            "origin_coordinates [lat,lng], volume_mbpd, transit_days, "
            "freight_usd_per_bbl, crude_grade, slate_compatibility, "
            "priority_rank, justification). "
            "actionable_memo MUST be Cabinet-ready markdown with sections: "
            "## Cabinet Situation Brief, ### Authorize now, ### Do not, "
            "### Official next steps. Be specific about grade chemistry, "
            "SPR draw, freight detours, and which refineries are protected."
        )
        user_prompt = (
            f"SCENARIO: {sid}\nLIVE_BRENT: {live_brent}\n\n"
            f"ORIGINS:\n{origins_ctx}\n\n"
            f"REFINERY SLATE:\n{slate_ctx}\n\n"
            f"MATH PAYLOAD:\n{payload_ctx}"
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
            label="agent3:rerouting",
        )
        parsed: Dict[str, Any] = json.loads(
            completion.choices[0].message.content or "{}"
        )
        actions = _parse_route_alternatives(parsed.get("recommended_actions"))
        if not actions:
            return fallback
        memo = str(parsed.get("actionable_memo") or fallback.actionable_memo)
        return ReroutingSummary(actionable_memo=memo, recommended_actions=actions)
    except Exception as e:
        print(f"[Agent 3] Rerouting LLM failed: {e}. Using deterministic fallback.")
        return fallback

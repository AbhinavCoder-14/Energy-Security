"""
Agent 3 — Procurement Orchestrator.
Live-first OpenRouter LLM for ExecutiveSummary; hardcoded mock fallback on any failure.
"""

import json
import os

from dotenv import load_dotenv
from openai import OpenAI

from app.config import (
    ALTERNATIVE_LOGISTICS_MATRIX,
    INDIA_REFINERY_SLATE_MATRIX,
    OPENROUTER_BASE_URL,
    OPENROUTER_MODEL,
)
from app.schemas import (
    DisruptionImpactPayload,
    ExecutiveSummary,
    GeopoliticalRiskPayload,
    ProcurementAction,
)

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


def _mock_executive_summary(
    risk: GeopoliticalRiskPayload, impact: DisruptionImpactPayload
) -> ExecutiveSummary:
    """Hardcoded demo-safe orchestration matching Content.md main.py mock."""
    mock_memo = (
        f"### STRATEGIC EXECUTIVE BRIEF\n\n"
        f"**CRISIS ALERT:** {risk.scenario_id.upper()}\n\n"
        f"Immediate mitigation protocols initiated. The modeled disruption threatens "
        f"**{impact.affected_import_volume_mbpd} MBPD** of inbound crude deliveries, "
        f"shortening total strategic reserves lifespan to "
        f"**{impact.total_days_of_reserve_cover} days**.\n\n"
        f"#### MANDATORY RESPONSE DIRECTIVES:\n"
        f"1. **Execute Controlled Drawdown:** Release SPR volumes immediately to preserve "
        f"capacity at critical high-sour processing assets.\n"
        f"2. **Alternative Supply Swaps:** Secure spot contracts for Latin American heavy "
        f"crudes to maintain slate compatibility requirements."
    )

    return ExecutiveSummary(
        actionable_memo=mock_memo,
        recommended_actions=[
            ProcurementAction(
                priority_rank=1,
                action_type="SPR Drawdown",
                source_region="India Domestic Reserves",
                volume_mbpd=1.5,
                estimated_delivery_days=1,
                crude_slate_compatibility="Compatible (High-Sour Mimic)",
                financial_cost_multiplier=1.05,
                action_justification=(
                    "Provides critical immediate supply bridge to prevent "
                    "refinery operational shutdowns."
                ),
            ),
            ProcurementAction(
                priority_rank=2,
                action_type="Spot Market Diversion",
                source_region="Latin America (Heavy-Sour)",
                volume_mbpd=0.8,
                estimated_delivery_days=22,
                crude_slate_compatibility="Optimal Match (High-Sulfur Sour)",
                financial_cost_multiplier=1.35,
                action_justification=(
                    "Long-term replacement volume optimized for heavy-sour "
                    "chemical specifications at Jamnagar."
                ),
            ),
            ProcurementAction(
                priority_rank=3,
                action_type="Spot Market Diversion",
                source_region="West Africa / US Permian (Sweet blend for Kochi)",
                volume_mbpd=0.4,
                estimated_delivery_days=20,
                crude_slate_compatibility="Compatible (Light-Sweet for BPCL Kochi)",
                financial_cost_multiplier=1.28,
                action_justification=(
                    "Matches Kochi's Medium-Sour/Light-Sweet blend profile while "
                    "Hormuz/Red Sea routes remain impaired."
                ),
            ),
        ],
    )


def generate_procurement_strategy(
    risk: GeopoliticalRiskPayload, impact: DisruptionImpactPayload
) -> ExecutiveSummary:
    """
    Rank 2–3 procurement actions by urgency and cost using refinery slate chemistry.
    Falls back to hardcoded mock on LLM/API failure.
    """
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

        completion = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            timeout=12.0,
        )

        parsed = json.loads(completion.choices[0].message.content)
        return ExecutiveSummary(**parsed)

    except Exception as e:
        print(
            f"[Demo Safety Active] Agent 3 LLM failed: {e}. "
            "Returning hardcoded mock ExecutiveSummary."
        )
        return _mock_executive_summary(risk, impact)

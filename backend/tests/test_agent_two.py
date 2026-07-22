"""Unit tests for Agent 2 live formulas (no external APIs)."""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agent_two import calculate_disruption_impact
from app.schemas import GeopoliticalRiskPayload, LiveBrentQuote


def test_agent2_hormuz_with_live_brent():
    with open(
        os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.json"),
        encoding="utf-8",
    ) as f:
        scenarios = json.load(f)
    risk = GeopoliticalRiskPayload(**scenarios["strait_of_hormuz_closure"]["risk_data"])
    quote = LiveBrentQuote(
        live_brent_price=80.0,
        currency="USD",
        timestamp="2026-01-01T00:00:00Z",
        data_source="YahooFinance Live",
    )
    impact = calculate_disruption_impact(risk, quote)

    assert impact.affected_import_volume_mbpd > 0
    assert impact.market_metrics.live_brent_spot_usd == 80.0
    assert impact.market_metrics.brent_crude_price_usd > 80.0
    assert impact.spr_days_of_cover is not None
    assert impact.commercial_days_of_cover is not None
    assert impact.calculation_trace is not None
    assert "latex_formulas" in impact.calculation_trace.model_dump()
    assert len(impact.calculation_trace.substitution_steps) >= 5


if __name__ == "__main__":
    test_agent2_hormuz_with_live_brent()
    print("agent2 unit test passed")

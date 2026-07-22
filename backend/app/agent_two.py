"""
Agent 2 — Deterministic Disruption Modeler (live P_live + refinery exposure).
No LLM. Spec formulas for scarcity, freight, war-risk, SPR/commercial split.
"""

from __future__ import annotations

from typing import Optional

from app.config import (
    BASE_FREIGHT_USD,
    CAPE_MILES,
    GLOBAL_DAILY_OIL_SUPPLY_MBPD,
    INDIA_COMMERCIAL_BUFFER_MB,
    INDIA_ISPRL_CAPACITY_MB,
    INDIA_REFINERY_SLATE_MATRIX,
    ROUTE_DEPENDENCY_MATRIX,
    SCARCITY_MULTIPLIER,
    SPR_BASELINE_DAYS,
    SUEZ_MILES,
    TOTAL_SYSTEM_CAPACITY_KBPD,
    WAR_RISK_COEFF,
)
from app.schemas import (
    CalculationTrace,
    DisruptionImpactPayload,
    FreightRouteBreakdown,
    GeopoliticalRiskPayload,
    LiveBrentQuote,
    MarketImpact,
    RefineryImpact,
)


def _chokepoint_from_risk(score: float) -> str:
    if score >= 81:
        return "Critical Blockade"
    if score >= 51:
        return "Elevated"
    return "Clear"


def calculate_disruption_impact(
    risk_payload: GeopoliticalRiskPayload,
    market_quote: Optional[LiveBrentQuote] = None,
) -> DisruptionImpactPayload:
    """Execute deterministic impact math from risk + live Brent quote."""
    if market_quote is None:
        raise ValueError("LiveBrentQuote is required for impact calculation")

    p_live = market_quote.live_brent_price
    s_global = GLOBAL_DAILY_OIL_SUPPLY_MBPD

    max_risk_score = max(
        (t.base_risk_score for t in risk_payload.active_threats),
        default=0.0,
    )
    r_ratio = max_risk_score / 100.0

    # V_disrupted = Σ (Capacity_i_MBPD × Exposure_i × R/100)
    v_disrupted = 0.0
    for _name, ref in INDIA_REFINERY_SLATE_MATRIX.items():
        cap_mbpd = ref["capacity_kbpd"] / 1000.0
        exposure = ref.get("exposure_ratio", 0.4)
        v_disrupted += cap_mbpd * exposure * r_ratio

    # Price components (spec)
    delta_p_scarcity = p_live * (v_disrupted / s_global) * SCARCITY_MULTIPLIER
    delta_p_freight = BASE_FREIGHT_USD * ((CAPE_MILES / SUEZ_MILES) - 1) * r_ratio
    delta_p_war = p_live * r_ratio * WAR_RISK_COEFF
    p_projected = p_live + delta_p_scarcity + delta_p_freight + delta_p_war
    price_inc_pct = ((p_projected - p_live) / p_live) * 100 if p_live > 0 else 0.0

    # Reserve depletion (days)
    if v_disrupted > 0:
        spr_days = INDIA_ISPRL_CAPACITY_MB / v_disrupted
        commercial_days = INDIA_COMMERCIAL_BUFFER_MB / v_disrupted
    else:
        spr_days = SPR_BASELINE_DAYS
        commercial_days = INDIA_COMMERCIAL_BUFFER_MB / max(0.01, v_disrupted or 0.01)

    total_days = min(spr_days, commercial_days) if v_disrupted > 0 else SPR_BASELINE_DAYS
    daily_shortfall_barrels = v_disrupted * 1_000_000

    freight_by_route: list[FreightRouteBreakdown] = []
    for threat in risk_payload.active_threats:
        route = threat.route_name
        if route not in ROUTE_DEPENDENCY_MATRIX:
            continue
        matrix = ROUTE_DEPENDENCY_MATRIX[route]
        severity = threat.base_risk_score / 100.0
        route_vol = v_disrupted * (matrix["india_import_share"] / 0.45) if severity > 0 else 0.0
        days_delta = matrix["reroute_transit_days"] - matrix["base_transit_days"]
        route_freight = delta_p_freight * (severity / max(r_ratio, 0.01)) if r_ratio > 0 else 0.0
        freight_by_route.append(
            FreightRouteBreakdown(
                route_name=route,
                severity_ratio=round(severity, 3),
                days_delta=float(days_delta),
                premium_usd_per_barrel=round(route_freight, 3),
                disrupted_volume_mbpd=round(route_vol, 3),
            )
        )

    refinery_impacts: list[RefineryImpact] = []
    for ref_name, ref_data in INDIA_REFINERY_SLATE_MATRIX.items():
        cap_mbpd = ref_data["capacity_kbpd"] / 1000.0
        exposure = ref_data.get("exposure_ratio", 0.4)
        ref_shortfall_mbpd = cap_mbpd * exposure * r_ratio
        ref_shortfall_bpd = int(ref_shortfall_mbpd * 1_000_000)
        base_bpd = ref_data["capacity_kbpd"] * 1000
        utilization = max(0.0, ((base_bpd - ref_shortfall_bpd) / base_bpd) * 100) if base_bpd > 0 else 100.0

        tank_mb = ref_data.get("tank_inventory_mb", 10.0)
        if ref_shortfall_mbpd > 0:
            run_days = (tank_mb * 1_000_000) / (ref_shortfall_mbpd * 1_000_000)
        else:
            run_days = ref_data["historical_days_cover"]

        refinery_impacts.append(
            RefineryImpact(
                refinery_name=ref_name,
                capacity_utilization_pct=round(utilization, 2),
                shortfall_barrels_per_day=ref_shortfall_bpd,
                operating_run_days_remaining=round(run_days, 1),
            )
        )

    scarcity_r = round(delta_p_scarcity, 2)
    freight_r = round(delta_p_freight, 2)
    war_r = round(delta_p_war, 2)
    brent_r = round(p_projected, 2)
    volume_r = round(v_disrupted, 3)
    spr_r = round(spr_days, 1)
    comm_r = round(commercial_days, 1)

    latex = {
        "v_disrupted": r"V_{\text{disrupted}} = \sum_i \left(C_i^{\text{MBPD}} \times E_i \times \frac{R}{100}\right)",
        "scarcity": r"\Delta P_{\text{scarcity}} = P_{\text{live}} \times \frac{V_{\text{disrupted}}}{S_{\text{global}}} \times 12.5",
        "freight": r"\Delta P_{\text{freight}} = B_{\text{base}} \times \left(\frac{D_{\text{Cape}}}{D_{\text{Suez}}} - 1\right) \times \frac{R}{100}",
        "war": r"\Delta P_{\text{war}} = P_{\text{live}} \times \frac{R}{100} \times 0.025",
        "projected": r"P_{\text{projected}} = P_{\text{live}} + \Delta P_{\text{scarcity}} + \Delta P_{\text{freight}} + \Delta P_{\text{war}}",
        "spr": r"D_{\text{SPR}} = \frac{\text{ISPRL}_{\text{MB}}}{V_{\text{disrupted}}}",
        "commercial": r"D_{\text{commercial}} = \frac{\text{Buffer}_{\text{MB}}}{V_{\text{disrupted}}}",
    }

    steps = [
        f"P_live = ${p_live:.2f}/bbl ({market_quote.data_source}, {market_quote.timestamp})",
        f"S_global = {s_global} MBPD",
        f"R_max = {max_risk_score:.1f} → R/100 = {r_ratio:.4f}",
        f"V_disrupted = {volume_r} MBPD",
        f"ΔP_scarcity = {p_live:.2f} × ({volume_r}/{s_global}) × {SCARCITY_MULTIPLIER} = ${scarcity_r}",
        f"ΔP_freight = {BASE_FREIGHT_USD} × ({CAPE_MILES}/{SUEZ_MILES} - 1) × {r_ratio:.4f} = ${freight_r}",
        f"ΔP_war = {p_live:.2f} × {r_ratio:.4f} × {WAR_RISK_COEFF} = ${war_r}",
        f"P_projected = {p_live:.2f} + {scarcity_r} + {freight_r} + {war_r} = ${brent_r}",
        f"D_SPR = {INDIA_ISPRL_CAPACITY_MB} / {volume_r} = {spr_r} days" if v_disrupted > 0 else f"D_SPR = baseline {SPR_BASELINE_DAYS} days",
        f"D_commercial = {INDIA_COMMERCIAL_BUFFER_MB} / {volume_r} = {comm_r} days" if v_disrupted > 0 else f"D_commercial = N/A (no disruption)",
    ]

    trace = CalculationTrace(
        brent_base_usd=p_live,
        live_brent_usd=p_live,
        brent_data_source=market_quote.data_source,
        brent_timestamp=market_quote.timestamp,
        scarcity_premium_usd=scarcity_r,
        freight_premium_usd=freight_r,
        war_risk_premium_usd=war_r,
        projected_brent_usd=brent_r,
        elasticity_factor=SCARCITY_MULTIPLIER,
        global_supply_mbpd=s_global,
        spr_total_barrels=int(INDIA_ISPRL_CAPACITY_MB * 1_000_000),
        spr_capacity_mb=INDIA_ISPRL_CAPACITY_MB,
        commercial_buffer_mb=INDIA_COMMERCIAL_BUFFER_MB,
        v_disrupted_mbpd=volume_r,
        max_risk_score=max_risk_score,
        spr_days=spr_r,
        commercial_days=comm_r,
        daily_shortfall_barrels=round(daily_shortfall_barrels, 0),
        days_of_reserve_cover=round(total_days, 1),
        freight_by_route=freight_by_route,
        formula_brent=(
            f"P_projected = P_live (${p_live}) + scarcity (${scarcity_r}) + "
            f"freight (${freight_r}) + war (${war_r}) = ${brent_r}/bbl"
        ),
        formula_spr=(
            f"D_SPR = {INDIA_ISPRL_CAPACITY_MB} MB / {volume_r} MBPD = {spr_r} days"
            if v_disrupted > 0
            else f"No import shortfall — baseline SPR cover at {SPR_BASELINE_DAYS} days."
        ),
        formula_scarcity=(
            f"ΔP_scarcity = P_live ({p_live}) × (V_disrupted {volume_r} / S_global {s_global}) "
            f"× {SCARCITY_MULTIPLIER} = ${scarcity_r}/bbl"
        ),
        latex_formulas=latex,
        substitution_steps=steps,
    )

    return DisruptionImpactPayload(
        scenario_id=risk_payload.scenario_id,
        total_days_of_reserve_cover=round(total_days, 1),
        spr_days_of_cover=spr_r,
        commercial_days_of_cover=comm_r,
        affected_import_volume_mbpd=volume_r,
        market_metrics=MarketImpact(
            brent_crude_price_usd=brent_r,
            price_increase_pct=round(price_inc_pct, 2),
            freight_premium_usd_per_barrel=freight_r,
            war_risk_insurance_multiplier=round(1.0 + r_ratio * 0.5, 2),
            live_brent_spot_usd=p_live,
            simulated_brent_usd=brent_r,
            brent_delta_usd=round(brent_r - p_live, 2),
            data_source=market_quote.data_source,
            war_risk_premium_usd=war_r,
        ),
        refinery_breakdown=refinery_impacts,
        calculation_trace=trace,
    )

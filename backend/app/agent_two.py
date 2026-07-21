"""
Agent 2 — Deterministic Disruption Modeler.
No LLM. Explicit economic formulas for scarcity, freight, war-risk, and SPR decay.
Emits calculation_trace for auditability.
"""

from app.config import (
    BRENT_BASE_PRICE,
    ELASTICITY_FACTOR,
    GLOBAL_SUPPLY_MBPD,
    INDIA_REFINERY_SLATE_MATRIX,
    INDIA_SPR_TOTAL_BARRELS,
    INDIA_TOTAL_IMPORTS_MBPD,
    ROUTE_DEPENDENCY_MATRIX,
    TOTAL_SYSTEM_CAPACITY_KBPD,
)
from app.schemas import (
    CalculationTrace,
    DisruptionImpactPayload,
    FreightRouteBreakdown,
    GeopoliticalRiskPayload,
    MarketImpact,
    RefineryImpact,
)


def calculate_disruption_impact(risk_payload: GeopoliticalRiskPayload) -> DisruptionImpactPayload:
    """Execute deterministic impact math from GeopoliticalRiskPayload."""
    total_affected_import_volume = 0.0
    max_risk_score = 0.0
    freight_premium = 0.0
    freight_by_route = []

    for threat in risk_payload.active_threats:
        route = threat.route_name
        if route not in ROUTE_DEPENDENCY_MATRIX:
            continue

        matrix = ROUTE_DEPENDENCY_MATRIX[route]
        severity_ratio = threat.base_risk_score / 100.0
        route_disrupted_vol = (
            matrix["india_import_share"] * INDIA_TOTAL_IMPORTS_MBPD
        ) * severity_ratio
        total_affected_import_volume += route_disrupted_vol

        if threat.base_risk_score > max_risk_score:
            max_risk_score = threat.base_risk_score

        days_delta = matrix["reroute_transit_days"] - matrix["base_transit_days"]
        route_freight_premium = (
            matrix["base_freight_cost"]
            * (days_delta / matrix["base_transit_days"])
            * severity_ratio
        )
        freight_premium += route_freight_premium
        freight_by_route.append(
            FreightRouteBreakdown(
                route_name=route,
                severity_ratio=round(severity_ratio, 3),
                days_delta=float(days_delta),
                premium_usd_per_barrel=round(route_freight_premium, 3),
                disrupted_volume_mbpd=round(route_disrupted_vol, 3),
            )
        )

    price_scarcity_delta = (
        total_affected_import_volume / GLOBAL_SUPPLY_MBPD
    ) * ELASTICITY_FACTOR

    war_risk_premium = BRENT_BASE_PRICE * (max_risk_score * 0.0015)

    projected_brent_price = (
        BRENT_BASE_PRICE + price_scarcity_delta + freight_premium + war_risk_premium
    )
    price_inc_pct = ((projected_brent_price - BRENT_BASE_PRICE) / BRENT_BASE_PRICE) * 100

    daily_shortfall_barrels = total_affected_import_volume * 1_000_000
    if daily_shortfall_barrels > 0:
        days_of_reserve_remaining = INDIA_SPR_TOTAL_BARRELS / daily_shortfall_barrels
    else:
        days_of_reserve_remaining = 9.5

    refinery_impacts = []
    for ref_name, ref_data in INDIA_REFINERY_SLATE_MATRIX.items():
        ref_share = ref_data["capacity_kbpd"] / TOTAL_SYSTEM_CAPACITY_KBPD
        ref_shortfall = int(daily_shortfall_barrels * ref_share)

        base_capacity_bps = ref_data["capacity_kbpd"] * 1000
        utilization = 100.0
        if base_capacity_bps > 0:
            utilization = max(
                0.0, ((base_capacity_bps - ref_shortfall) / base_capacity_bps) * 100
            )

        run_days = ref_data["historical_days_cover"]
        if ref_shortfall > 0:
            run_days = max(
                0.0,
                (base_capacity_bps * (ref_data["historical_days_cover"] / 10.0))
                / ref_shortfall,
            )

        refinery_impacts.append(
            RefineryImpact(
                refinery_name=ref_name,
                capacity_utilization_pct=round(utilization, 2),
                shortfall_barrels_per_day=ref_shortfall,
                operating_run_days_remaining=round(run_days, 1),
            )
        )

    scarcity_r = round(price_scarcity_delta, 2)
    freight_r = round(freight_premium, 2)
    war_r = round(war_risk_premium, 2)
    brent_r = round(projected_brent_price, 2)
    days_r = round(days_of_reserve_remaining, 1)
    volume_r = round(total_affected_import_volume, 2)

    trace = CalculationTrace(
        brent_base_usd=BRENT_BASE_PRICE,
        scarcity_premium_usd=scarcity_r,
        freight_premium_usd=freight_r,
        war_risk_premium_usd=war_r,
        projected_brent_usd=brent_r,
        elasticity_factor=ELASTICITY_FACTOR,
        global_supply_mbpd=GLOBAL_SUPPLY_MBPD,
        spr_total_barrels=INDIA_SPR_TOTAL_BARRELS,
        daily_shortfall_barrels=round(daily_shortfall_barrels, 0),
        days_of_reserve_cover=days_r,
        freight_by_route=freight_by_route,
        formula_brent=(
            f"ΔP_total = scarcity (${scarcity_r}) + freight (${freight_r}) + "
            f"war-risk (${war_r}) → Brent ${BRENT_BASE_PRICE} + ${scarcity_r + freight_r + war_r:.2f} "
            f"= ${brent_r}/bbl"
        ),
        formula_spr=(
            f"Days Remaining = SPR {INDIA_SPR_TOTAL_BARRELS:,} / daily shortfall "
            f"{daily_shortfall_barrels:,.0f} bbl = {days_r} days"
            if daily_shortfall_barrels > 0
            else "No import shortfall — baseline SPR cover held at 9.5 days."
        ),
        formula_scarcity=(
            f"Scarcity = (V_disrupted {volume_r} / V_global {GLOBAL_SUPPLY_MBPD}) "
            f"× ε {ELASTICITY_FACTOR} = ${scarcity_r}/bbl"
        ),
    )

    return DisruptionImpactPayload(
        scenario_id=risk_payload.scenario_id,
        total_days_of_reserve_cover=days_r,
        affected_import_volume_mbpd=volume_r,
        market_metrics=MarketImpact(
            brent_crude_price_usd=brent_r,
            price_increase_pct=round(price_inc_pct, 2),
            freight_premium_usd_per_barrel=freight_r,
            war_risk_insurance_multiplier=round(1.0 + (max_risk_score / 100.0) * 0.5, 2),
        ),
        refinery_breakdown=refinery_impacts,
        calculation_trace=trace,
    )

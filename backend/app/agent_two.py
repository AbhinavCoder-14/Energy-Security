"""
Agent 2 — Deterministic Disruption Modeler (live P_live + refinery exposure).
No LLM. Spec formulas for scarcity, freight, war-risk, SPR/commercial split.

Also hosts the additive country-cut what-if engine used by
GET /api/telemetry/live and POST /api/simulate/{scenario_id}.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from app.config import (
    BASE_FREIGHT_USD,
    CAPE_MILES,
    CHOKEPOINT_MAP,
    COUNTRY_SUPPLY_MATRIX,
    GLOBAL_DAILY_OIL_SUPPLY_MBPD,
    INDIA_COMMERCIAL_BUFFER_MB,
    INDIA_ISPRL_CAPACITY_MB,
    INDIA_REFINERY_SLATE_MATRIX,
    INDIA_TOTAL_IMPORTS_MBPD,
    LIVE_BASELINE_BRENT,
    NATIONAL_IMPORT_DEPENDENCE_PCT,
    ROUTE_DEPENDENCY_MATRIX,
    SCARCITY_MULTIPLIER,
    SCENARIO_DISRUPTION_MAP,
    SPR_BASELINE_DAYS,
    SUEZ_MILES,
    WAR_RISK_COEFF,
)
from app.schemas import (
    CalculationTrace,
    CountrySupplyShare,
    DashboardPayload,
    DisruptionImpactPayload,
    FreightRouteBreakdown,
    GeopoliticalRiskPayload,
    LiveBrentQuote,
    MapFeature,
    MarketImpact,
    RefineryImpact,
    ReroutingSummary,
    TimeSeriesData,
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


# ---------------------------------------------------------------------------
# Country-cut what-if engine (additive; used by telemetry + POST simulate)
# ---------------------------------------------------------------------------

_CANONICAL_SCENARIO_IDS = {
    "hormuz_closure": "strait_of_hormuz_closure",
}


def _normalize_scenario_id(scenario_id: str) -> str:
    return _CANONICAL_SCENARIO_IDS.get(scenario_id, scenario_id)


def _status_from_risk(score: float) -> str:
    if score >= 81:
        return "Critical Blockade"
    if score >= 51:
        return "Elevated"
    return "Clear"


def _country_volume_mbpd(country: str) -> float:
    share = COUNTRY_SUPPLY_MATRIX[country]["import_share_pct"] / 100.0
    return INDIA_TOTAL_IMPORTS_MBPD * share


def calculate_country_disruption(
    scenario_id: str,
) -> Tuple[float, List[str], Dict[str, float]]:
    """Return (v_disrupted_mbpd, lost_grades, per_country_cut_mbpd)."""
    sid = _normalize_scenario_id(scenario_id)
    cuts = SCENARIO_DISRUPTION_MAP.get(sid, {})
    per_country: Dict[str, float] = {}
    lost_grades: List[str] = []
    total = 0.0

    for country, fraction in cuts.items():
        if country not in COUNTRY_SUPPLY_MATRIX:
            continue
        cut_mbpd = _country_volume_mbpd(country) * fraction
        per_country[country] = round(cut_mbpd, 4)
        total += cut_mbpd
        grade = COUNTRY_SUPPLY_MATRIX[country]["crude_grade"]
        if cut_mbpd > 0 and grade not in lost_grades:
            lost_grades.append(grade)

    return round(total, 4), lost_grades, per_country


def calculate_market_impact(
    base_price: float,
    v_disrupted: float,
    max_risk_score: float,
    *,
    data_source: Optional[str] = None,
) -> MarketImpact:
    """
    Master formulas:
      ΔP_scarcity = (V / 102.0) * 120
      ΔP_freight  = base_freight * ((D_reroute - D_base) / D_base) * severity
      P_war       = base * (risk * 0.0015)
      daily_fiscal_loss = ΔP_total * 5.0e6
    """
    severity = max_risk_score / 100.0
    delta_p_scarcity = (v_disrupted / 102.0) * 120.0

    # Primary disrupted corridor freight (Hormuz defaults when volume > 0)
    primary = CHOKEPOINT_MAP.get("Strait_of_Hormuz", {})
    d_base = float(primary.get("base_transit_days", 12) or 12)
    d_reroute = float(primary.get("reroute_transit_days", 26) or 26)
    base_freight = float(primary.get("base_freight_cost", BASE_FREIGHT_USD))
    if v_disrupted <= 0:
        delta_p_freight = 0.0
        delta_p_war = 0.0
    else:
        delta_p_freight = base_freight * ((d_reroute - d_base) / d_base) * severity
        delta_p_war = base_price * (max_risk_score * 0.0015)

    delta_total = delta_p_scarcity + delta_p_freight + delta_p_war
    p_projected = base_price + delta_total
    price_inc_pct = ((p_projected - base_price) / base_price) * 100 if base_price > 0 else 0.0
    daily_fiscal = delta_total * 5.0e6

    return MarketImpact(
        brent_crude_price_usd=round(p_projected, 2),
        price_increase_pct=round(price_inc_pct, 2),
        freight_premium_usd_per_barrel=round(delta_p_freight, 2),
        war_risk_insurance_multiplier=round(1.0 + severity * 0.5, 2),
        live_brent_spot_usd=round(base_price, 2),
        simulated_brent_usd=round(p_projected, 2),
        brent_delta_usd=round(delta_total, 2),
        data_source=data_source,
        war_risk_premium_usd=round(delta_p_war, 2),
        scarcity_premium_usd=round(delta_p_scarcity, 2),
        daily_fiscal_loss_usd=round(daily_fiscal, 0),
    )


def generate_spr_depletion_curve(daily_shortfall_bpd: float) -> TimeSeriesData:
    """30-day SPR inventory runway (floored at 0)."""
    spr_barrels = INDIA_ISPRL_CAPACITY_MB * 1_000_000
    labels: List[str] = []
    values: List[float] = []
    remaining = spr_barrels
    for day in range(1, 31):
        if daily_shortfall_bpd > 0:
            remaining = max(0.0, remaining - daily_shortfall_bpd)
        labels.append(f"Day {day}")
        values.append(round(remaining / 1_000_000, 3))  # MB remaining
    return TimeSeriesData(labels=labels, values=values)


def generate_price_projection_curve(
    base_price: float, target_price: float
) -> TimeSeriesData:
    """30-day escalation curve from base → target."""
    labels: List[str] = []
    values: List[float] = []
    for day in range(1, 31):
        t = day / 30.0
        # Ease-in escalation (quadratic)
        price = base_price + (target_price - base_price) * (t * t)
        labels.append(f"Day {day}")
        values.append(round(price, 2))
    return TimeSeriesData(labels=labels, values=values)


def build_country_breakdown(
    per_country_cut: Optional[Dict[str, float]] = None,
) -> List[CountrySupplyShare]:
    cuts = per_country_cut or {}
    rows: List[CountrySupplyShare] = []
    for country, meta in COUNTRY_SUPPLY_MATRIX.items():
        vol = _country_volume_mbpd(country)
        disrupted = cuts.get(country, 0.0)
        cut_frac = (disrupted / vol) if vol > 0 else 0.0
        rows.append(
            CountrySupplyShare(
                country=country,
                import_share_pct=meta["import_share_pct"],
                volume_mbpd=round(vol, 3),
                crude_grade=meta["crude_grade"],
                primary_route=meta["primary_route"],
                disrupted_volume_mbpd=round(disrupted, 3),
                cut_fraction=round(cut_frac, 3),
            )
        )
    return rows


def build_refinery_impacts(
    scenario_id: str,
    per_country_cut: Dict[str, float],
) -> List[RefineryImpact]:
    """Flag Jamnagar/Paradip chemical-slate alerts when Heavy-Sour (Iraq/Saudi) is cut."""
    sid = _normalize_scenario_id(scenario_id)
    heavy_cut = per_country_cut.get("Iraq", 0.0) + per_country_cut.get("Saudi", 0.0)
    russia_cut = per_country_cut.get("Russia", 0.0)
    total_cut = sum(per_country_cut.values())
    severity = min(1.0, total_cut / max(INDIA_TOTAL_IMPORTS_MBPD, 0.01))

    impacts: List[RefineryImpact] = []
    for ref_name, ref_data in INDIA_REFINERY_SLATE_MATRIX.items():
        cap_mbpd = ref_data["capacity_kbpd"] / 1000.0
        exposure = ref_data.get("exposure_ratio", 0.4)
        ref_shortfall_mbpd = cap_mbpd * exposure * severity
        ref_shortfall_bpd = int(ref_shortfall_mbpd * 1_000_000)
        base_bpd = ref_data["capacity_kbpd"] * 1000
        utilization = (
            max(0.0, ((base_bpd - ref_shortfall_bpd) / base_bpd) * 100)
            if base_bpd > 0
            else 100.0
        )
        tank_mb = ref_data.get("tank_inventory_mb", 10.0)
        if ref_shortfall_mbpd > 0:
            run_days = tank_mb / ref_shortfall_mbpd
        else:
            run_days = ref_data["historical_days_cover"]

        slate_alert = False
        alert_msg: Optional[str] = None
        preferred = str(ref_data.get("preferred_slate", ""))
        is_heavy_asset = ref_name in ("RIL_Jamnagar", "IOCL_Paradip") or "Heavy" in preferred

        if is_heavy_asset and heavy_cut > 0:
            slate_alert = True
            alert_msg = (
                f"{ref_name} requires Heavy/Ultra-Heavy Sour; Iraq/Saudi cut of "
                f"{heavy_cut:.3f} MBPD threatens chemical slate integrity."
            )
        elif ref_name == "BPCL_Kochi" and russia_cut > 0 and sid == "secondary_sanctions_shock":
            slate_alert = True
            alert_msg = (
                f"Kochi medium-sour blend exposed to Russia cut "
                f"({russia_cut:.3f} MBPD) under secondary sanctions."
            )

        impacts.append(
            RefineryImpact(
                refinery_name=ref_name,
                capacity_utilization_pct=round(utilization, 2),
                shortfall_barrels_per_day=ref_shortfall_bpd,
                operating_run_days_remaining=round(run_days, 1),
                chemical_slate_alert=slate_alert if (slate_alert or total_cut > 0) else False,
                alert_message=alert_msg,
            )
        )
    return impacts


def build_map_data(
    scenario_id: str,
    risk_overlay: Optional[Dict[str, float]] = None,
    *,
    is_live: bool = False,
    per_country_cut: Optional[Dict[str, float]] = None,
) -> List[MapFeature]:
    """Chokepoint map features; live mode keeps status Clear with overlay risk levels."""
    sid = _normalize_scenario_id(scenario_id)
    overlay = risk_overlay or {}
    cuts = per_country_cut or {}

    # Map disrupted volume onto primary chokepoints
    route_disrupted: Dict[str, float] = {
        "Strait_of_Hormuz": 0.0,
        "Bab_el_Mandeb": 0.0,
        "Malacca_Strait": 0.0,
    }
    for country, cut_mbpd in cuts.items():
        route = COUNTRY_SUPPLY_MATRIX.get(country, {}).get("primary_route", "")
        if "Strait_of_Hormuz" in route:
            route_disrupted["Strait_of_Hormuz"] += cut_mbpd
        if "Bab_el_Mandeb" in route or "Red_Sea" in route:
            # Saudi Red Sea portion attributed to Bab for bab scenario
            if "Red_Sea" in route and sid == "bab_el_mandeb_escalation":
                route_disrupted["Bab_el_Mandeb"] += cut_mbpd
            elif "Bab_el_Mandeb" in route:
                route_disrupted["Bab_el_Mandeb"] += cut_mbpd
            elif "Strait_of_Hormuz" not in route:
                route_disrupted["Bab_el_Mandeb"] += cut_mbpd

    # Scenario default risk when no overlay
    scenario_risk_defaults = {
        "strait_of_hormuz_closure": {"Strait_of_Hormuz": 92.5, "Bab_el_Mandeb": 35.0, "Malacca_Strait": 20.0},
        "bab_el_mandeb_escalation": {"Strait_of_Hormuz": 28.0, "Bab_el_Mandeb": 88.0, "Malacca_Strait": 22.0},
        "secondary_sanctions_shock": {"Strait_of_Hormuz": 25.0, "Bab_el_Mandeb": 55.0, "Malacca_Strait": 30.0},
    }
    defaults = scenario_risk_defaults.get(sid, {
        "Strait_of_Hormuz": 15.0,
        "Bab_el_Mandeb": 18.0,
        "Malacca_Strait": 12.0,
    })

    features: List[MapFeature] = []
    threat_copy = {
        "strait_of_hormuz_closure": "Kinetic naval escalation / maritime blockade",
        "bab_el_mandeb_escalation": "Red Sea kinetic attacks forcing Cape diversion",
        "secondary_sanctions_shock": "Secondary sanctions severing Russian barrels",
    }

    for name, meta in CHOKEPOINT_MAP.items():
        risk = float(overlay.get(name, defaults.get(name, 15.0)))
        if is_live:
            status = "Clear"
            driver = "Live corridor monitoring — no active scenario shock"
            disrupted = 0.0
        else:
            status = _status_from_risk(risk)
            driver = threat_copy.get(sid, "Scenario disruption") if route_disrupted.get(name, 0) > 0 else "Secondary monitoring"
            disrupted = round(route_disrupted.get(name, 0.0), 3)

        features.append(
            MapFeature(
                id=name.lower(),
                name=name,
                coordinates=list(meta["coordinates"]),
                risk_level=round(risk, 1),
                status=status,  # type: ignore[arg-type]
                threat_driver=driver,
                disrupted_volume_mbpd=disrupted,
            )
        )
    return features


def _empty_rerouting_summary() -> ReroutingSummary:
    return ReroutingSummary(
        actionable_memo="Live telemetry steady state — no procurement shock directives.",
        recommended_actions=[],
    )


def build_dashboard_payload(
    scenario_id: str,
    live_brent: float,
    risk_overlay: Optional[Dict[str, float]] = None,
    *,
    is_live: bool = False,
    procurement_directives: Optional[ReroutingSummary] = None,
    brent_data_source: Optional[str] = None,
    system_rationale: str = "",
) -> DashboardPayload:
    """
    Orchestrate country-cut math + graphs + map into DashboardPayload.
    Live mode: zero disruption, flat graphs, Clear map statuses.
    """
    sid = _normalize_scenario_id(scenario_id) if not is_live else "live_telemetry"
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    base = live_brent if live_brent > 0 else LIVE_BASELINE_BRENT

    if is_live:
        v_disrupted = 0.0
        lost_grades: List[str] = []
        per_country: Dict[str, float] = {}
        max_risk = max((risk_overlay or {}).values(), default=15.0)
        market = calculate_market_impact(base, 0.0, max_risk, data_source=brent_data_source)
        # Force flat projected = base in live mode
        market.brent_crude_price_usd = round(base, 2)
        market.simulated_brent_usd = round(base, 2)
        market.brent_delta_usd = 0.0
        market.price_increase_pct = 0.0
        market.scarcity_premium_usd = 0.0
        market.freight_premium_usd_per_barrel = 0.0
        market.war_risk_premium_usd = 0.0
        market.daily_fiscal_loss_usd = 0.0
        spr_days = SPR_BASELINE_DAYS
        spr_curve = TimeSeriesData(
            labels=[f"Day {d}" for d in range(1, 31)],
            values=[round(INDIA_ISPRL_CAPACITY_MB, 3)] * 30,
        )
        price_curve = TimeSeriesData(
            labels=[f"Day {d}" for d in range(1, 31)],
            values=[round(base, 2)] * 30,
        )
        refineries = [
            RefineryImpact(
                refinery_name=name,
                capacity_utilization_pct=100.0,
                shortfall_barrels_per_day=0,
                operating_run_days_remaining=ref["historical_days_cover"],
                chemical_slate_alert=False,
                alert_message=None,
            )
            for name, ref in INDIA_REFINERY_SLATE_MATRIX.items()
        ]
        map_features = build_map_data(
            "baseline_peace", risk_overlay, is_live=True, per_country_cut={}
        )
        rationale = system_rationale or (
            "Live telemetry steady state — 0 MBPD disruption, SPR at baseline cover."
        )
        directives = procurement_directives or _empty_rerouting_summary()
        out_id = "live_telemetry"
    else:
        v_disrupted, lost_grades, per_country = calculate_country_disruption(sid)
        overlay = risk_overlay or {}
        max_risk = max(overlay.values(), default=80.0) if overlay else {
            "strait_of_hormuz_closure": 92.5,
            "bab_el_mandeb_escalation": 88.0,
            "secondary_sanctions_shock": 75.0,
        }.get(sid, 80.0)
        market = calculate_market_impact(
            base, v_disrupted, float(max_risk), data_source=brent_data_source
        )
        spr_days = (
            INDIA_ISPRL_CAPACITY_MB / v_disrupted if v_disrupted > 0 else SPR_BASELINE_DAYS
        )
        daily_shortfall_bpd = v_disrupted * 1_000_000
        spr_curve = generate_spr_depletion_curve(daily_shortfall_bpd)
        price_curve = generate_price_projection_curve(base, market.brent_crude_price_usd)
        refineries = build_refinery_impacts(sid, per_country)
        map_features = build_map_data(
            sid, overlay, is_live=False, per_country_cut=per_country
        )
        rationale = system_rationale or (
            f"Deterministic country-cut shock for {sid}: "
            f"{v_disrupted:.3f} MBPD disrupted."
        )
        directives = procurement_directives or _empty_rerouting_summary()
        out_id = sid

    return DashboardPayload(
        scenario_id=out_id,
        is_live_telemetry=is_live,
        timestamp=ts,
        baseline_brent_usd=round(base, 2),
        projected_brent_usd=round(market.brent_crude_price_usd, 2),
        national_import_dependence_pct=NATIONAL_IMPORT_DEPENDENCE_PCT,
        v_disrupted_mbpd=round(v_disrupted, 3),
        spr_days_remaining=round(spr_days, 1),
        lost_grades=lost_grades,
        market_impact=market,
        country_breakdown=build_country_breakdown(per_country),
        map_features=map_features,
        spr_depletion_curve=spr_curve,
        price_projection_curve=price_curve,
        refinery_impacts=refineries,
        procurement_directives=directives,
        system_rationale=rationale,
        brent_data_source=brent_data_source,
    )

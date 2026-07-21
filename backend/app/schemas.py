"""
Pydantic data contracts for the 3-agent unidirectional pipeline.
Strict validation ensures Agent 1 → Agent 2 → Agent 3 never experience runtime parsing errors.
"""

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class RouteRisk(BaseModel):
    route_name: str = Field(..., description="e.g., Strait of Hormuz, Bab-el-Mandeb, Suez Canal")
    base_risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_delta: float = Field(..., description="Change from 30-day baseline")
    primary_threat_driver: str = Field(
        ..., description="e.g., Drone strike risk, kinetic escalation, naval blockade"
    )
    confidence_score: float = Field(..., ge=0.0, le=100.0)


class NewsSnippet(BaseModel):
    route_name: str
    title: str
    source: str = ""
    published: Optional[str] = None


class GeopoliticalRiskPayload(BaseModel):
    scenario_id: str
    timestamp: str
    active_threats: List[RouteRisk]
    system_rationale: str
    intel_snippets: List[NewsSnippet] = Field(default_factory=list)


class RefineryImpact(BaseModel):
    refinery_name: str
    capacity_utilization_pct: float = Field(..., ge=0.0, le=100.0)
    shortfall_barrels_per_day: int
    operating_run_days_remaining: float


class MarketImpact(BaseModel):
    brent_crude_price_usd: float
    price_increase_pct: float
    freight_premium_usd_per_barrel: float
    war_risk_insurance_multiplier: float


class FreightRouteBreakdown(BaseModel):
    route_name: str
    severity_ratio: float
    days_delta: float
    premium_usd_per_barrel: float
    disrupted_volume_mbpd: float


class CalculationTrace(BaseModel):
    """Auditable Agent 2 math components for Explain This Number."""

    brent_base_usd: float
    scarcity_premium_usd: float
    freight_premium_usd: float
    war_risk_premium_usd: float
    projected_brent_usd: float
    elasticity_factor: float
    global_supply_mbpd: float
    spr_total_barrels: int
    daily_shortfall_barrels: float
    days_of_reserve_cover: float
    freight_by_route: List[FreightRouteBreakdown]
    formula_brent: str
    formula_spr: str
    formula_scarcity: str


class DisruptionImpactPayload(BaseModel):
    scenario_id: str
    total_days_of_reserve_cover: float
    affected_import_volume_mbpd: float  # Million barrels per day
    market_metrics: MarketImpact
    refinery_breakdown: List[RefineryImpact]
    calculation_trace: Optional[CalculationTrace] = None


class ProcurementAction(BaseModel):
    priority_rank: int
    action_type: str = Field(
        ..., description="SPR Drawdown, Spot Market Diversion, Route Rerouting"
    )
    source_region: str = Field(
        ..., description="e.g., US Permian, West Africa, Domestic Reserves"
    )
    volume_mbpd: float
    estimated_delivery_days: int
    crude_slate_compatibility: str = Field(
        ...,
        description="Matches refinery chemical profile (e.g., High-Sulfur Sour vs Light Sweet)",
    )
    financial_cost_multiplier: float = Field(
        ..., description="X times baseline spot cost"
    )
    action_justification: str


class ExecutiveSummary(BaseModel):
    actionable_memo: str = Field(
        ..., description="Markdown executive summary text for presentation"
    )
    recommended_actions: List[ProcurementAction]


class LatencyMs(BaseModel):
    agent1: float = 0.0
    agent2: float = 0.0
    agent3: float = 0.0
    total: float = 0.0


class PipelineMeta(BaseModel):
    agent1_source: Literal["live", "fallback"]
    agent3_source: Literal["live", "mock"]
    news_ok: bool = False
    demo_mode: bool = False
    model: Optional[str] = None
    latency_ms: LatencyMs = Field(default_factory=LatencyMs)
    overall_confidence: float = Field(default=0.0, ge=0.0, le=100.0)


class UnifiedDashboardPayload(BaseModel):
    risk_data: GeopoliticalRiskPayload
    impact_data: DisruptionImpactPayload
    orchestration_data: ExecutiveSummary
    meta: PipelineMeta


class ScenarioCatalogItem(BaseModel):
    id: str
    label: str
    severity: Literal["safe", "warn", "crit"]
    blurb: str
    codename: str = ""


SCENARIO_CATALOG: Dict[str, ScenarioCatalogItem] = {
    "baseline_peace": ScenarioCatalogItem(
        id="baseline_peace",
        label="Baseline Peace",
        severity="safe",
        blurb="Nominal global flows. No active disruption across monitored chokepoints.",
        codename="SCN-00 / STEADY STATE",
    ),
    "strait_of_hormuz_closure": ScenarioCatalogItem(
        id="strait_of_hormuz_closure",
        label="Strait of Hormuz Closure",
        severity="crit",
        blurb="Acute maritime blockade of the world's most critical crude gate.",
        codename="SCN-01 / GULF CLOSURE",
    ),
    "bab_el_mandeb_escalation": ScenarioCatalogItem(
        id="bab_el_mandeb_escalation",
        label="Bab-el-Mandeb Escalation",
        severity="warn",
        blurb="Red Sea kinetic escalation forcing Cape diversions and freight spikes.",
        codename="SCN-02 / BAB-EL-MANDEB",
    ),
}

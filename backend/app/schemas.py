"""
Pydantic data contracts for the 3-agent unidirectional pipeline.
"""

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


class LiveBrentQuote(BaseModel):
    live_brent_price: float
    currency: str = "USD"
    timestamp: str
    data_source: Literal["OilPriceAPI", "YahooFinance Live"]


class RouteRisk(BaseModel):
    route_name: str
    base_risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_delta: float = 0.0
    primary_threat_driver: str = ""
    confidence_score: float = Field(default=85.0, ge=0.0, le=100.0)
    risk_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    chokepoint_status: Literal["Clear", "Elevated", "Critical Blockade"] = "Clear"
    threat_drivers: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def sync_risk_score(self) -> "RouteRisk":
        if self.risk_score is None:
            self.risk_score = self.base_risk_score
        if not self.primary_threat_driver and self.threat_drivers:
            self.primary_threat_driver = self.threat_drivers[0]
        if not self.threat_drivers and self.primary_threat_driver:
            self.threat_drivers = [self.primary_threat_driver]
        return self


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
    live_brent_spot_usd: Optional[float] = None
    simulated_brent_usd: Optional[float] = None
    brent_delta_usd: Optional[float] = None
    data_source: Optional[str] = None
    war_risk_premium_usd: Optional[float] = None


class FreightRouteBreakdown(BaseModel):
    route_name: str
    severity_ratio: float
    days_delta: float
    premium_usd_per_barrel: float
    disrupted_volume_mbpd: float


class CalculationTrace(BaseModel):
    brent_base_usd: float
    live_brent_usd: Optional[float] = None
    brent_data_source: Optional[str] = None
    brent_timestamp: Optional[str] = None
    scarcity_premium_usd: float
    freight_premium_usd: float
    war_risk_premium_usd: float
    projected_brent_usd: float
    elasticity_factor: float = 12.5
    global_supply_mbpd: float
    spr_total_barrels: int = 0
    spr_capacity_mb: float = 0.0
    commercial_buffer_mb: float = 0.0
    v_disrupted_mbpd: float = 0.0
    max_risk_score: float = 0.0
    spr_days: float = 0.0
    commercial_days: float = 0.0
    daily_shortfall_barrels: float = 0.0
    days_of_reserve_cover: float = 0.0
    freight_by_route: List[FreightRouteBreakdown] = Field(default_factory=list)
    formula_brent: str = ""
    formula_spr: str = ""
    formula_scarcity: str = ""
    latex_formulas: Dict[str, str] = Field(default_factory=dict)
    substitution_steps: List[str] = Field(default_factory=list)


class DisruptionImpactPayload(BaseModel):
    scenario_id: str
    total_days_of_reserve_cover: float
    spr_days_of_cover: Optional[float] = None
    commercial_days_of_cover: Optional[float] = None
    affected_import_volume_mbpd: float
    market_metrics: MarketImpact
    refinery_breakdown: List[RefineryImpact]
    calculation_trace: Optional[CalculationTrace] = None


class ProcurementAction(BaseModel):
    priority_rank: int
    action_type: str
    source_region: str
    volume_mbpd: float
    estimated_delivery_days: int
    crude_slate_compatibility: str
    financial_cost_multiplier: float
    action_justification: str


class ExecutiveSummary(BaseModel):
    actionable_memo: str
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
    app_mode: Literal["LIVE", "SIMULATION"] = "SIMULATION"
    model: Optional[str] = None
    brent_data_source: Optional[str] = None
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

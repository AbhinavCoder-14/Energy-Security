"""
Pydantic data contracts for the 3-agent unidirectional pipeline.
Strict validation ensures Agent 1 → Agent 2 → Agent 3 never experience runtime parsing errors.
"""

from typing import List

from pydantic import BaseModel, Field


class RouteRisk(BaseModel):
    route_name: str = Field(..., description="e.g., Strait of Hormuz, Bab-el-Mandeb, Suez Canal")
    base_risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_delta: float = Field(..., description="Change from 30-day baseline")
    primary_threat_driver: str = Field(
        ..., description="e.g., Drone strike risk, kinetic escalation, naval blockade"
    )
    confidence_score: float = Field(..., ge=0.0, le=100.0)


class GeopoliticalRiskPayload(BaseModel):
    scenario_id: str
    timestamp: str
    active_threats: List[RouteRisk]
    system_rationale: str


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


class DisruptionImpactPayload(BaseModel):
    scenario_id: str
    total_days_of_reserve_cover: float
    affected_import_volume_mbpd: float  # Million barrels per day
    market_metrics: MarketImpact
    refinery_breakdown: List[RefineryImpact]


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


class UnifiedDashboardPayload(BaseModel):
    risk_data: GeopoliticalRiskPayload
    impact_data: DisruptionImpactPayload
    orchestration_data: ExecutiveSummary

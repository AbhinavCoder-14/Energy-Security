/** Mirrors backend UnifiedDashboardPayload / Pydantic schemas */

export interface RouteRisk {
  route_name: string;
  base_risk_score: number;
  risk_delta: number;
  primary_threat_driver: string;
  confidence_score: number;
}

export interface GeopoliticalRiskPayload {
  scenario_id: string;
  timestamp: string;
  active_threats: RouteRisk[];
  system_rationale: string;
}

export interface RefineryImpact {
  refinery_name: string;
  capacity_utilization_pct: number;
  shortfall_barrels_per_day: number;
  operating_run_days_remaining: number;
}

export interface MarketImpact {
  brent_crude_price_usd: number;
  price_increase_pct: number;
  freight_premium_usd_per_barrel: number;
  war_risk_insurance_multiplier: number;
}

export interface DisruptionImpactPayload {
  scenario_id: string;
  total_days_of_reserve_cover: number;
  affected_import_volume_mbpd: number;
  market_metrics: MarketImpact;
  refinery_breakdown: RefineryImpact[];
}

export interface ProcurementAction {
  priority_rank: number;
  action_type: string;
  source_region: string;
  volume_mbpd: number;
  estimated_delivery_days: number;
  crude_slate_compatibility: string;
  financial_cost_multiplier: number;
  action_justification: string;
}

export interface ExecutiveSummary {
  actionable_memo: string;
  recommended_actions: ProcurementAction[];
}

export interface UnifiedDashboardPayload {
  risk_data: GeopoliticalRiskPayload;
  impact_data: DisruptionImpactPayload;
  orchestration_data: ExecutiveSummary;
}

export type ScenarioId =
  | "baseline_peace"
  | "strait_of_hormuz_closure"
  | "bab_el_mandeb_escalation";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: "baseline_peace", label: "Baseline Peace" },
  { id: "strait_of_hormuz_closure", label: "Strait of Hormuz Closure" },
  { id: "bab_el_mandeb_escalation", label: "Bab-el-Mandeb Escalation" },
];

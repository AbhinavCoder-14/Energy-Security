/** Mirrors backend UnifiedDashboardPayload / Pydantic schemas */

export interface RouteRisk {
  route_name: string;
  base_risk_score: number;
  risk_delta: number;
  primary_threat_driver: string;
  confidence_score: number;
}

export interface NewsSnippet {
  route_name: string;
  title: string;
  source: string;
  published?: string | null;
}

export interface GeopoliticalRiskPayload {
  scenario_id: string;
  timestamp: string;
  active_threats: RouteRisk[];
  system_rationale: string;
  intel_snippets?: NewsSnippet[];
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

export interface FreightRouteBreakdown {
  route_name: string;
  severity_ratio: number;
  days_delta: number;
  premium_usd_per_barrel: number;
  disrupted_volume_mbpd: number;
}

export interface CalculationTrace {
  brent_base_usd: number;
  scarcity_premium_usd: number;
  freight_premium_usd: number;
  war_risk_premium_usd: number;
  projected_brent_usd: number;
  elasticity_factor: number;
  global_supply_mbpd: number;
  spr_total_barrels: number;
  daily_shortfall_barrels: number;
  days_of_reserve_cover: number;
  freight_by_route: FreightRouteBreakdown[];
  formula_brent: string;
  formula_spr: string;
  formula_scarcity: string;
}

export interface DisruptionImpactPayload {
  scenario_id: string;
  total_days_of_reserve_cover: number;
  affected_import_volume_mbpd: number;
  market_metrics: MarketImpact;
  refinery_breakdown: RefineryImpact[];
  calculation_trace?: CalculationTrace | null;
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

export interface LatencyMs {
  agent1: number;
  agent2: number;
  agent3: number;
  total: number;
}

export interface PipelineMeta {
  agent1_source: "live" | "fallback";
  agent3_source: "live" | "mock";
  news_ok: boolean;
  demo_mode: boolean;
  model?: string | null;
  latency_ms: LatencyMs;
  overall_confidence: number;
}

export interface UnifiedDashboardPayload {
  risk_data: GeopoliticalRiskPayload;
  impact_data: DisruptionImpactPayload;
  orchestration_data: ExecutiveSummary;
  meta: PipelineMeta;
}

export type ScenarioId =
  | "baseline_peace"
  | "strait_of_hormuz_closure"
  | "bab_el_mandeb_escalation";

export type ThreatLevel = "safe" | "warn" | "crit";

export interface ScenarioCatalogItem {
  id: ScenarioId | string;
  label: string;
  severity: ThreatLevel;
  blurb: string;
  codename: string;
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export const SCENARIO_CATALOG: ScenarioCatalogItem[] = [
  {
    id: "baseline_peace",
    label: "Baseline Peace",
    severity: "safe",
    blurb: "Nominal global flows. No active disruption across monitored chokepoints.",
    codename: "SCN-00 / STEADY STATE",
  },
  {
    id: "strait_of_hormuz_closure",
    label: "Strait of Hormuz Closure",
    severity: "crit",
    blurb: "Acute maritime blockade of the world's most critical crude gate.",
    codename: "SCN-01 / GULF CLOSURE",
  },
  {
    id: "bab_el_mandeb_escalation",
    label: "Bab-el-Mandeb Escalation",
    severity: "warn",
    blurb: "Red Sea kinetic escalation forcing Cape diversions and freight spikes.",
    codename: "SCN-02 / BAB-EL-MANDEB",
  },
];

export const SCENARIOS = SCENARIO_CATALOG;

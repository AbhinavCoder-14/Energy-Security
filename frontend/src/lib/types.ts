/** Mirrors backend UnifiedDashboardPayload / Pydantic schemas */

export interface RouteRisk {
  route_name: string;
  base_risk_score: number;
  risk_delta: number;
  primary_threat_driver: string;
  confidence_score: number;
  risk_score?: number;
  chokepoint_status?: "Clear" | "Elevated" | "Critical Blockade";
  threat_drivers?: string[];
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
  chemical_slate_alert?: boolean | null;
  alert_message?: string | null;
}

export interface MarketImpact {
  brent_crude_price_usd: number;
  price_increase_pct: number;
  freight_premium_usd_per_barrel: number;
  war_risk_insurance_multiplier: number;
  live_brent_spot_usd?: number | null;
  simulated_brent_usd?: number | null;
  brent_delta_usd?: number | null;
  data_source?: string | null;
  war_risk_premium_usd?: number | null;
  scarcity_premium_usd?: number | null;
  daily_fiscal_loss_usd?: number | null;
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
  live_brent_usd?: number | null;
  brent_data_source?: string | null;
  brent_timestamp?: string | null;
  scarcity_premium_usd: number;
  freight_premium_usd: number;
  war_risk_premium_usd: number;
  projected_brent_usd: number;
  elasticity_factor: number;
  global_supply_mbpd: number;
  spr_total_barrels: number;
  spr_capacity_mb?: number;
  commercial_buffer_mb?: number;
  v_disrupted_mbpd?: number;
  max_risk_score?: number;
  spr_days?: number;
  commercial_days?: number;
  daily_shortfall_barrels: number;
  days_of_reserve_cover: number;
  freight_by_route: FreightRouteBreakdown[];
  formula_brent: string;
  formula_spr: string;
  formula_scarcity: string;
  latex_formulas?: Record<string, string>;
  substitution_steps?: string[];
}

export interface DisruptionImpactPayload {
  scenario_id: string;
  total_days_of_reserve_cover: number;
  spr_days_of_cover?: number | null;
  commercial_days_of_cover?: number | null;
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
  app_mode?: "LIVE" | "SIMULATION";
  model?: string | null;
  brent_data_source?: string | null;
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

/* ============================================================
   Live Telemetry + What-If Scenario Engine (DashboardPayload)
   Mirrors backend/app/schemas.py DashboardPayload (additive).
   ============================================================ */

export interface CountrySupplyShare {
  country: string;
  import_share_pct: number;
  volume_mbpd: number;
  crude_grade: string;
  primary_route: string;
  disrupted_volume_mbpd: number;
  cut_fraction: number;
}

export type MapFeatureStatus = "Clear" | "Elevated" | "Critical Blockade";

export interface MapFeature {
  id: string;
  name: string;
  /** [lat, lng] as emitted by the backend */
  coordinates: [number, number];
  risk_level: number;
  status: MapFeatureStatus;
  threat_driver: string;
  disrupted_volume_mbpd: number;
}

export interface TimeSeriesData {
  labels: string[];
  values: number[];
}

export interface RouteAlternative {
  origin_name: string;
  /** [lat, lng] as emitted by the backend */
  origin_coordinates: [number, number];
  volume_mbpd: number;
  transit_days: number;
  freight_usd_per_bbl: number;
  crude_grade: string;
  slate_compatibility: string;
  priority_rank: number;
  justification: string;
}

export interface ReroutingSummary {
  actionable_memo: string;
  recommended_actions: RouteAlternative[];
}

export interface DashboardPayload {
  scenario_id: string;
  is_live_telemetry: boolean;
  timestamp: string;
  baseline_brent_usd: number;
  projected_brent_usd: number;
  national_import_dependence_pct: number;
  v_disrupted_mbpd: number;
  spr_days_remaining: number;
  lost_grades: string[];
  market_impact: MarketImpact;
  country_breakdown: CountrySupplyShare[];
  map_features: MapFeature[];
  spr_depletion_curve: TimeSeriesData;
  price_projection_curve: TimeSeriesData;
  refinery_impacts: RefineryImpact[];
  procurement_directives: ReroutingSummary;
  system_rationale: string;
  brent_data_source?: string | null;
}

export type CommandScenarioId =
  | "live_telemetry"
  | "strait_of_hormuz_closure"
  | "bab_el_mandeb_escalation"
  | "secondary_sanctions_shock";

export interface CommandScenarioItem {
  id: CommandScenarioId;
  label: string;
  severity: ThreatLevel;
  codename: string;
  blurb: string;
  /** Live telemetry uses GET; shocks use POST. */
  kind: "live" | "shock";
}

export const COMMAND_SCENARIOS: CommandScenarioItem[] = [
  {
    id: "live_telemetry",
    label: "Live Telemetry",
    severity: "safe",
    codename: "SCN-00 / STEADY STATE",
    blurb: "Fixed steady-state baseline. Zero disruption across monitored chokepoints.",
    kind: "live",
  },
  {
    id: "strait_of_hormuz_closure",
    label: "Strait of Hormuz Closure",
    severity: "crit",
    codename: "SCN-01 / GULF CLOSURE",
    blurb: "Acute maritime blockade of the world's most critical crude gate.",
    kind: "shock",
  },
  {
    id: "bab_el_mandeb_escalation",
    label: "Bab-el-Mandeb Escalation",
    severity: "warn",
    codename: "SCN-02 / BAB-EL-MANDEB",
    blurb: "Red Sea kinetic escalation forcing Cape diversions and freight spikes.",
    kind: "shock",
  },
  {
    id: "secondary_sanctions_shock",
    label: "Secondary Sanctions Shock",
    severity: "crit",
    codename: "SCN-03 / SANCTIONS SHOCK",
    blurb: "Secondary sanctions sever Russian medium-sour barrels into India.",
    kind: "shock",
  },
];

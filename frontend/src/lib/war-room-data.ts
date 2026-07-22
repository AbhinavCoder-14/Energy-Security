import type {
  CalculationTrace,
  PipelineMeta,
  ScenarioCatalogItem,
  ScenarioId,
  ThreatLevel,
  UnifiedDashboardPayload,
} from "@/lib/types";
import { SCENARIO_CATALOG } from "@/lib/types";

export type { ThreatLevel };

export type Chokepoint = {
  name: string;
  route: string;
  risk: number;
  flow: string;
  driver?: string;
};

export type Refinery = {
  name: string;
  location: string;
  health: number;
  crude: string;
  status: string;
  runDays?: number;
  shortfallBpd?: number;
};

export type Directive = {
  priority: "CRITICAL" | "HIGH" | "MONITOR";
  action: string;
  detail: string;
  volume_mbpd?: number;
  estimated_delivery_days?: number;
  crude_slate_compatibility?: string;
  financial_cost_multiplier?: number;
  source_region?: string;
};

export type Scenario = {
  id: string;
  name: string;
  codename: string;
  posture: ThreatLevel;
  summary: string;
  brent: number;
  brentBaseline: number;
  liveBrentSpot?: number;
  brentDataSource?: string;
  sprDays: number;
  commercialDays?: number;
  shortfall: number;
  freightPremium: number;
  warRiskPremium?: number;
  warRiskMultiplier: number;
  chokepoints: Chokepoint[];
  refineries: Refinery[];
  brief: Directive[];
  memo?: string;
  math: {
    brent: string;
    spr: string;
    shortfall: string;
  };
  calculationTrace?: CalculationTrace | null;
  meta?: PipelineMeta;
  systemRationale?: string;
  intelSnippets?: { route_name: string; title: string; source: string }[];
};

const ROUTE_LABELS: Record<string, { name: string; corridor: string }> = {
  Strait_of_Hormuz: { name: "Strait of Hormuz", corridor: "Persian Gulf" },
  Bab_el_Mandeb: { name: "Bab-el-Mandeb", corridor: "Red Sea" },
  Suez_Canal: { name: "Suez Canal", corridor: "Egypt" },
};

const REFINERY_META: Record<string, { name: string; location: string; crude: string }> = {
  IOCL_Paradip: { name: "Paradip", location: "Odisha, IN", crude: "Heavy sour" },
  RIL_Jamnagar: { name: "Jamnagar", location: "Gujarat, IN", crude: "Ultra-heavy sour" },
  BPCL_Kochi: { name: "Kochi", location: "Kerala, IN", crude: "Medium sour / light sweet" },
};

export const BASE_BRENT = 75;

/** Catalog cards for the trigger room (static labels; live metrics come from API). */
export const scenarios: Scenario[] = SCENARIO_CATALOG.map((c) => catalogToPlaceholder(c));

function catalogToPlaceholder(c: ScenarioCatalogItem): Scenario {
  return {
    id: c.id,
    name: c.label,
    codename: c.codename,
    posture: c.severity,
    summary: c.blurb,
    brent: BASE_BRENT,
    brentBaseline: BASE_BRENT,
    sprDays: 9.5,
    shortfall: 0,
    freightPremium: 0,
    warRiskMultiplier: 1,
    chokepoints: [],
    refineries: [],
    brief: [],
    math: {
      brent: "Awaiting Agent 2 calculation.",
      spr: "Awaiting Agent 2 calculation.",
      shortfall: "Awaiting Agent 2 calculation.",
    },
  };
}

function prettyRoute(routeName: string) {
  return (
    ROUTE_LABELS[routeName] ?? {
      name: routeName.replace(/_/g, " "),
      corridor: "Maritime corridor",
    }
  );
}

function priorityFromRank(
  rank: number,
  posture: ThreatLevel,
): Directive["priority"] {
  if (posture === "safe") return "MONITOR";
  if (rank === 1) return "CRITICAL";
  if (rank === 2) return "HIGH";
  return "MONITOR";
}

function postureFromScenario(id: string, catalog?: ScenarioCatalogItem): ThreatLevel {
  if (catalog) return catalog.severity;
  if (id.includes("hormuz")) return "crit";
  if (id.includes("bab") || id.includes("mandeb")) return "warn";
  return "safe";
}

export function mapPayloadToScenario(
  payload: UnifiedDashboardPayload,
  catalog: ScenarioCatalogItem[] = SCENARIO_CATALOG,
): Scenario {
  const id = payload.risk_data.scenario_id as ScenarioId | string;
  const cat = catalog.find((c) => c.id === id);
  const posture = postureFromScenario(id, cat);
  const m = payload.impact_data.market_metrics;
  const trace = payload.impact_data.calculation_trace;

  const chokepoints: Chokepoint[] = payload.risk_data.active_threats.map((t) => {
    const label = prettyRoute(t.route_name);
    return {
      name: label.name,
      route: label.corridor,
      risk: Math.round(t.base_risk_score),
      flow: `Δ ${t.risk_delta >= 0 ? "+" : ""}${t.risk_delta.toFixed(0)} risk`,
      driver: t.primary_threat_driver,
    };
  });

  const refineries: Refinery[] = payload.impact_data.refinery_breakdown.map((r) => {
    const meta = REFINERY_META[r.refinery_name] ?? {
      name: r.refinery_name.replace(/_/g, " "),
      location: "India",
      crude: "Slate TBD",
    };
    const health = Math.round(r.capacity_utilization_pct);
    let status = "Optimal intake";
    if (health < 45) status = "Feedstock critical";
    else if (health < 75) status = "Reduced runs";
    else if (r.shortfall_barrels_per_day > 0) status = "Stable";

    return {
      name: meta.name,
      location: meta.location,
      health,
      crude: meta.crude,
      status,
      runDays: r.operating_run_days_remaining,
      shortfallBpd: r.shortfall_barrels_per_day,
    };
  });

  const brief: Directive[] = [...payload.orchestration_data.recommended_actions]
    .sort((a, b) => a.priority_rank - b.priority_rank)
    .map((a) => ({
      priority: priorityFromRank(a.priority_rank, posture),
      action: a.action_type,
      detail: a.action_justification,
      volume_mbpd: a.volume_mbpd,
      estimated_delivery_days: a.estimated_delivery_days,
      crude_slate_compatibility: a.crude_slate_compatibility,
      financial_cost_multiplier: a.financial_cost_multiplier,
      source_region: a.source_region,
    }));

  return {
    id,
    name: cat?.label ?? id.replace(/_/g, " "),
    codename: cat?.codename ?? id.toUpperCase(),
    posture,
    summary: payload.risk_data.system_rationale || cat?.blurb || "",
    brent: m.brent_crude_price_usd,
    brentBaseline: trace?.live_brent_usd ?? trace?.brent_base_usd ?? m.live_brent_spot_usd ?? BASE_BRENT,
    liveBrentSpot: m.live_brent_spot_usd ?? trace?.live_brent_usd ?? undefined,
    brentDataSource: m.data_source ?? trace?.brent_data_source ?? payload.meta.brent_data_source ?? undefined,
    sprDays: payload.impact_data.spr_days_of_cover ?? trace?.spr_days ?? payload.impact_data.total_days_of_reserve_cover,
    commercialDays: payload.impact_data.commercial_days_of_cover ?? trace?.commercial_days ?? undefined,
    shortfall: payload.impact_data.affected_import_volume_mbpd,
    freightPremium: m.freight_premium_usd_per_barrel,
    warRiskPremium: m.war_risk_premium_usd ?? trace?.war_risk_premium_usd ?? undefined,
    warRiskMultiplier: m.war_risk_insurance_multiplier,
    chokepoints,
    refineries,
    brief,
    memo: payload.orchestration_data.actionable_memo,
    math: {
      brent: trace?.formula_brent ?? `Brent projected at $${m.brent_crude_price_usd}/bbl.`,
      spr: trace?.formula_spr ?? `SPR cover ${payload.impact_data.total_days_of_reserve_cover} days.`,
      shortfall:
        trace?.formula_scarcity ??
        `Affected import volume ${payload.impact_data.affected_import_volume_mbpd} MBPD.`,
    },
    calculationTrace: trace ?? null,
    meta: payload.meta,
    systemRationale: payload.risk_data.system_rationale,
    intelSnippets: (payload.risk_data.intel_snippets ?? []).slice(0, 5).map((s) => ({
      route_name: s.route_name,
      title: s.title,
      source: s.source,
    })),
  };
}

export function threatOf(risk: number): ThreatLevel {
  if (risk >= 70) return "crit";
  if (risk >= 40) return "warn";
  return "safe";
}

export function healthThreat(health: number): ThreatLevel {
  if (health < 45) return "crit";
  if (health < 75) return "warn";
  return "safe";
}

export type ThreatLevel = "safe" | "warn" | "crit";

export type Chokepoint = {
  name: string;
  route: string;
  risk: number; // 0-100
  flow: string; // Mb/d label
};

export type Refinery = {
  name: string;
  location: string;
  health: number; // 0-100 structural health
  crude: string; // required crude chemistry
  status: string; // short status label
};

export type Directive = {
  priority: "CRITICAL" | "HIGH" | "MONITOR";
  action: string;
  detail: string;
};

export type Scenario = {
  id: string;
  name: string;
  codename: string;
  posture: ThreatLevel;
  summary: string;
  brent: number; // $ / barrel
  brentBaseline: number; // for delta math
  sprDays: number; // strategic reserve cover, days remaining
  shortfall: number; // Mb/d disrupted
  chokepoints: Chokepoint[];
  refineries: Refinery[];
  brief: Directive[];
  math: {
    brent: string;
    spr: string;
    shortfall: string;
  };
};

export const BASE_BRENT = 82;

export const scenarios: Scenario[] = [
  {
    id: "baseline",
    name: "Baseline Peace",
    codename: "SCN-00 / STEADY STATE",
    posture: "safe",
    summary:
      "Nominal global flows. No active disruption across monitored chokepoints. Reserves and refinery intake within normal operating bands.",
    brent: 82,
    brentBaseline: BASE_BRENT,
    sprDays: 92,
    shortfall: 0,
    chokepoints: [
      { name: "Strait of Hormuz", route: "Persian Gulf", risk: 18, flow: "21.0M b/d" },
      { name: "Strait of Malacca", route: "SE Asia", risk: 22, flow: "16.0M b/d" },
      { name: "Suez Canal", route: "Egypt", risk: 14, flow: "9.0M b/d" },
      { name: "Bab-el-Mandeb", route: "Red Sea", risk: 20, flow: "6.2M b/d" },
      { name: "Turkish Straits", route: "Bosphorus", risk: 12, flow: "3.0M b/d" },
    ],
    refineries: [
      { name: "Jamnagar", location: "Gujarat, IN", health: 96, crude: "Heavy sour", status: "Optimal intake" },
      { name: "Paradip", location: "Odisha, IN", health: 94, crude: "Medium sour", status: "Optimal intake" },
      { name: "Vadinar", location: "Gujarat, IN", health: 92, crude: "Heavy sour", status: "Optimal intake" },
      { name: "Mangalore", location: "Karnataka, IN", health: 95, crude: "Light sweet", status: "Optimal intake" },
    ],
    brief: [
      { priority: "MONITOR", action: "Maintain standard procurement cadence", detail: "No rerouting required. Continue term-contract lifting at contracted volumes." },
      { priority: "MONITOR", action: "Hold strategic reserves at policy target", detail: "SPR cover at 92 days, above the 90-day statutory floor. No drawdown indicated." },
      { priority: "MONITOR", action: "Keep chokepoint watch at Level 1", detail: "All maritime routes green. Sustain routine AIS and conflict-signal monitoring." },
    ],
    math: {
      brent: "Baseline Brent anchored at $82.00 from 30-day volume-weighted average. No shock premium applied.",
      spr: "Reserve cover = total reserve stock / daily net imports. At nominal 3.2M b/d net imports this yields 92 days.",
      shortfall: "No monitored chokepoint is disrupted, so modeled import shortfall is 0.0M b/d.",
    },
  },
  {
    id: "hormuz",
    name: "Strait of Hormuz Blockade",
    codename: "SCN-01 / GULF CLOSURE",
    posture: "crit",
    summary:
      "Full closure of the Strait of Hormuz. ~21M b/d of seaborne crude choked at the world's most critical gate. Immediate physical shortfall and severe price shock.",
    brent: 148,
    brentBaseline: BASE_BRENT,
    sprDays: 58,
    shortfall: 21,
    chokepoints: [
      { name: "Strait of Hormuz", route: "Persian Gulf", risk: 97, flow: "0.4M b/d" },
      { name: "Strait of Malacca", route: "SE Asia", risk: 71, flow: "11.2M b/d" },
      { name: "Suez Canal", route: "Egypt", risk: 44, flow: "8.1M b/d" },
      { name: "Bab-el-Mandeb", route: "Red Sea", risk: 52, flow: "5.4M b/d" },
      { name: "Turkish Straits", route: "Bosphorus", risk: 33, flow: "2.9M b/d" },
    ],
    refineries: [
      { name: "Jamnagar", location: "Gujarat, IN", health: 34, crude: "Heavy sour", status: "Feedstock critical" },
      { name: "Paradip", location: "Odisha, IN", health: 41, crude: "Medium sour", status: "Feedstock critical" },
      { name: "Vadinar", location: "Gujarat, IN", health: 29, crude: "Heavy sour", status: "Chemistry starved" },
      { name: "Mangalore", location: "Karnataka, IN", health: 63, crude: "Light sweet", status: "Reduced runs" },
    ],
    brief: [
      { priority: "CRITICAL", action: "Execute immediate SPR drawdown", detail: "Release 1.1M b/d from strategic reserves to cover heavy-sour deficit at Jamnagar and Vadinar." },
      { priority: "CRITICAL", action: "Reroute Gulf cargoes via Cape of Good Hope", detail: "Add 18-21 days transit. Pre-charter VLCC capacity now before rates spike further." },
      { priority: "HIGH", action: "Activate West African sour substitution", detail: "Secure spot cargoes of comparable API/sulfur grade to keep Vadinar chemistry within tolerance." },
      { priority: "HIGH", action: "Open diplomatic channel with Gulf producers", detail: "Prioritize overland pipeline allocation (East-West, Habshan-Fujairah) to bypass the strait." },
    ],
    math: {
      brent: "Brent = $82 baseline + shock premium. Loss of 21M b/d (~20% of seaborne supply) modeled at a 3.1x scarcity elasticity yields +$66 → $148.",
      spr: "Net imports jump to ~5.6M b/d as domestic refiners draw reserves. Cover = stock / new import rate = 58 days.",
      shortfall: "Hormuz throughput falls from 21.0 to 0.4M b/d. Modeled disrupted volume = 20.6M b/d, rounded to 21M b/d headline.",
    },
  },
  {
    id: "redsea",
    name: "Red Sea Conflict",
    codename: "SCN-02 / BAB-EL-MANDEB",
    posture: "warn",
    summary:
      "Sustained attacks force diversions around the Cape. Suez and Bab-el-Mandeb throughput collapses. Moderate shortfall, elevated freight and insurance premiums.",
    brent: 109,
    brentBaseline: BASE_BRENT,
    sprDays: 74,
    shortfall: 9,
    chokepoints: [
      { name: "Strait of Hormuz", route: "Persian Gulf", risk: 38, flow: "20.1M b/d" },
      { name: "Strait of Malacca", route: "SE Asia", risk: 46, flow: "14.8M b/d" },
      { name: "Suez Canal", route: "Egypt", risk: 84, flow: "2.6M b/d" },
      { name: "Bab-el-Mandeb", route: "Red Sea", risk: 91, flow: "1.1M b/d" },
      { name: "Turkish Straits", route: "Bosphorus", risk: 40, flow: "2.8M b/d" },
    ],
    refineries: [
      { name: "Jamnagar", location: "Gujarat, IN", health: 71, crude: "Heavy sour", status: "Reduced runs" },
      { name: "Paradip", location: "Odisha, IN", health: 68, crude: "Medium sour", status: "Reduced runs" },
      { name: "Vadinar", location: "Gujarat, IN", health: 74, crude: "Heavy sour", status: "Stable" },
      { name: "Mangalore", location: "Karnataka, IN", health: 66, crude: "Light sweet", status: "Freight strained" },
    ],
    brief: [
      { priority: "HIGH", action: "Divert Europe-bound cargoes around Cape", detail: "Accept +12 day transit. Rebalance Atlantic Basin barrels to cover Suez collapse." },
      { priority: "HIGH", action: "Hedge freight and war-risk insurance", detail: "Lock forward tanker rates; insurance premiums up 4-6x on Red Sea transits." },
      { priority: "MONITOR", action: "Stage partial SPR readiness", detail: "Cover at 74 days remains adequate. Prepare, but do not yet execute, a contingency drawdown." },
      { priority: "MONITOR", action: "Track escalation into Hormuz", detail: "Watch for spillover raising Gulf risk above threshold; re-run model on any Hormuz signal." },
    ],
    math: {
      brent: "Brent = $82 + premium on 9M b/d rerouted supply and elevated freight. Elasticity model yields +$27 → $109.",
      spr: "Net imports rise to ~4.3M b/d during diversion window. Cover = stock / import rate = 74 days.",
      shortfall: "Combined Suez + Bab-el-Mandeb throughput falls ~9M b/d versus baseline during the diversion period.",
    },
  },
];

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

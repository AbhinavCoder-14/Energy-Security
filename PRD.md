Here is your comprehensive architectural blueprint and 48-hour execution roadmap to build a bulletproof, judge-certified energy security platform.

By hardcoding the domain expertise (refinery slates, logistics routes) into static reference tables and using structured JSON data paths, you eliminate non-deterministic LLM hallucinations. This guarantees a platform that runs lightning-fast and never breaks during a live demo.

---

## 1. System Architecture & Data Flow

To ensure sub-2-second execution, the platform avoids complex agent loop-backs. It operates as a strict, unidirectional data pipeline:
[UI Trigger: Select Scenario]
           │
           ▼
[Mock/Live Data Ingestion Engine] ──(Raw Events JSON)──► [Agent 1: Geopolitical Risk Parser]
                                                                     │
                                                           (Structured Risk Profile)
                                                                     │
                                                                     ▼
[UI Dashboard Display] ◄───(Final Payload JSON)◄──── [Agent 2: Disruption Modeler]
           ▲                                                         │
           │                                                (Impact Statistics)
           │                                                         │
           └──────────────────────────────────────── [Agent 3: Procurement Orchestrator]


---

## 2. Core Technical Schemas (Pydantic / FastAPI Contracts)

These data contracts must be strictly enforced. They ensure that if Agent 1 runs successfully, Agent 2 and Agent 3 will never experience runtime parsing errors.

### Agent 1 Output: Risk Profile
python
from pydantic import BaseModel, Field
from typing import List

class RouteRisk(BaseModel):
    route_name: str = Field(..., description="e.g., Strait of Hormuz, Bab-el-Mandeb, Suez Canal")
    base_risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_delta: float = Field(..., description="Change from 30-day baseline")
    primary_threat_driver: str = Field(..., description="e.g., Drone strike risk, kinetic escalation, naval blockade")
    confidence_score: float = Field(..., ge=0.0, le=100.0)

class GeopoliticalRiskPayload(BaseModel):
    scenario_id: str
    timestamp: str
    active_threats: List[RouteRisk]
    system_rationale: str


### Agent 2 Output: Disruption Impact
python
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


### Agent 3 Output: Strategic Procurement Directive
python
class ProcurementAction(BaseModel):
    priority_rank: int
    action_type: str = Field(..., description="SPR Drawdown, Spot Market Diversion, Route Rerouting")
    source_region: str = Field(..., description="e.g., US Permian, West Africa, Domestic Reserves")
    volume_mbpd: float
    estimated_delivery_days: int
    crude_slate_compatibility: str = Field(..., description="Matches refinery chemical profile (e.g., High-Sulfur Sour vs Light Sweet)")
    financial_cost_multiplier: float = Field(..., description="X times baseline spot cost")
    action_justification: str

class ExecutiveSummary(BaseModel):
    actionable_memo: str = Field(..., description="Markdown executive summary text for presentation")
    recommended_actions: List[ProcurementAction]


---

## 3. The Math Engine: Deterministic Impact Modeling (Agent 2)

Do not use LLMs to guess economic numbers. Code these explicit formulas directly into the Python backend:

### Price Impact Formula

The total projected crude price change ($\Delta P_{\text{total}}$) accounts for global volume scarcity, freight rerouting delays, and localized geopolitical insurance risk:

$$\Delta P_{\text{total}} = \Delta P_{\text{scarcity}} + \Delta P_{\text{freight}} + P_{\text{war\_risk}}$$

Where:

**Scarcity Premium:** $\Delta P_{\text{scarcity}} = \left( \frac{V_{\text{disrupted}}}{V_{\text{global}}} \right) \times \epsilon$ (where $V_{\text{disrupted}}$ is the disrupted volume, $V_{\text{global}} \approx 102$ million barrels per day, and $\epsilon \approx 120.0$ represents the short-run price elasticity constant under panic buying).
**Freight Premium:** $\Delta P_{\text{freight}} = C_{\text{base\freight}} \times \left( \frac{D{\text{reroute}} - D_{\text{base}}}{D_{\text{base}}} \right)$ (where $C_{\text{base\freight}} \approx \$3.00/\text{bbl}$, $D{\text{base}} = 12\text{ days}$ via Hormuz, and $D_{\text{reroute}} = 26\text{ days}$ around Cape of Good Hope).
**War Risk Premium:** $P_{\text{war\risk}} = P{\text{base\_crude}} \times (\text{Risk Score} \times 0.0015)$.

### Strategic Petroleum Reserve (SPR) Decay Formula

$$\text{Days Remaining} = \frac{\text{Total Current SPR Inventory (Barrels)}}{\text{Daily Deficit Volume}} = \frac{39,000,000}{V_{\text{import\_shortfall}}}$$

---

## 4. Static Industry Knowledge Base (Hardcoded Context)

Embed this domain data directly into your repository as local Python dictionaries. This serves as the source of truth for Agent 3’s recommendation logic.
python
INDIA_REFINERY_SLATE_MATRIX = {
    "IOCL_Paradip": {
        "capacity_kbpd": 300,
        "preferred_slate": "Heavy-Sour",
        "min_sour_ratio": 0.70,
        "alternative_compatibility": ["US_Permian_Sour", "Iraqi_Basrah_Heavy"]
    },
    "RIL_Jamnagar": {
        "capacity_kbpd": 1240,
        "preferred_slate": "Ultra-Heavy_Sour",
        "min_sour_ratio": 0.75,
        "alternative_compatibility": ["Latin_America_Merey", "US_Gulf_Coast_Heavy"]
    },
    "BPCL_Kochi": {
        "capacity_kbpd": 310,
        "preferred_slate": "Medium-Sour_Light-Sweet_Blend",
        "min_sour_ratio": 0.40,
        "alternative_compatibility": ["Nigerian_Bonny_Light", "US_Permian_Sweet"]
    }
}

ALTERNATIVE_LOGISTICS_MATRIX = {
    "US_Permian_Sweet": {"transit_days_to_india": 28, "freight_cost_per_bbl": 5.50, "max_available_spot_mbpd": 0.8},
    "West_Africa_Sweet": {"transit_days_to_india": 20, "freight_cost_per_bbl": 4.20, "max_available_spot_mbpd": 0.5},
    "India_SPR_Drawdown": {"transit_days_to_india": 1, "freight_cost_per_bbl": 0.20, "max_available_spot_mbpd": 1.5}
}


---

## 5. 48-Hour Execution Roadmap

### Phase 1: Hours 0–6 | Foundations & Scenarios

**Team Lead/Frontend:** Set up the Next.js workspace. Initialize Tailwind UI components, a map asset (or card components for chokepoints), and mock the final expected JSON response states.
**Backend Engineers:** Initialize the FastAPI app. Hardcode the three structural scenarios (strait_of_hormuz_closure, bab_el_mandeb_escalation, baseline_peace) as static JSON fixture files in a /data/scenarios/ directory.

### Phase 2: Hours 6–18 | Backend Core & Mathematical Logic

**Dev 1 (Agent 1):** Write the system prompts instructing the LLM to parse incoming text payloads and output the structured GeopoliticalRiskPayload.
**Dev 2 (Agent 2):** Implement the Python classes that execute the deterministic math formulas for global scarcity, freight hikes, and SPR drawdown metrics.
**Dev 3 (Agent 3):** Build the recommendation router. Integrate the logic that parses Agent 2's deficit values, checks the INDIA_REFINERY_SLATE_MATRIX, matches alternative routes, and prompts an LLM to generate the executive text memo using the ExecutiveSummary schema.

### Phase 3: Hours 18–30 | Backend Unification & End-to-End Testing

Assemble the data path pipeline: Trigger Scenario ID -> Load Local Document Signals -> Agent 1 -> Agent 2 -> Agent 3 -> Return Consolidated UI Payload.
Validate all execution branches using Pydantic. If a validation error occurs, log it instantly and ensure the application gracefully falls back to a clean default state rather than throwing a 500 Internal Server Error.

### Phase 4: Hours 30–42 | Frontend Integration & State Binding

Connect the Next.js frontend state to the unified API endpoint.
Build the dashboard view components:
**The Action Bar:** A prominent click-to-trigger component listing your core demo scenarios.
**The Impact Metrics Grid:** Cards displaying Brent Crude Price increases, immediate Freight premiums, and the dynamic SPR countdown clock.
**The Procurement Blueprint Panel:** A timeline mapping ranked alternative actions complete with explicit refinery compatibility flags.
**The Audit Tooltip:** A hoverable modal that reveals the clean, step-by-step math formulas driving the calculations.



### Phase 5: Hours 42–48 | Production Deployment & Pitch Rehearsal

Deploy the backend to Railway/Render and the frontend to Vercel.
Run repeated tests to confirm zero-caching live updates function perfectly.
**Refine the Presentation Narrative:** Focus heavily on the practical domain logic. Emphasize to the judges that the application balances chemical refiner matching with global logistics dynamics, moving well beyond generic text extraction.

---

## 6. Judges' Pitch Script & Demo Strategy
[0:00 - 0:30] Context & Problem Setting
"India imports 88% of its oil. If the Strait of Hormuz closes, our decision-makers face a data blindspot regarding our 9.5 days of reserves. Today, we are moving procurement from reactive panic to structured anticipation."

[0:30 - 1:15] The Live Trigger
"Watch our live dashboard. We will trigger an acute event scenario: A 7-day complete blockade of the Strait of Hormuz. In under two seconds, our pipeline ingests incoming intelligence reports and updates our system risk profiles."

[1:15 - 1:45] Transparent Math Over Black Boxes
"Notice that we don't guess the numbers using a black-box model. Clicking 'Explain This Number' shows our exact economic logic: calculating the real-world physical oil deficit, tracking the 14-day transit detour around Africa, and modeling real freight premiums."

[1:45 - 2:00] The Actionable Directive
"Look at our strategic recommendation panel. The system recognizes that Jamnagar requires heavy-sour crude slates and cannot use light sweet alternatives without risking equipment damage. Instead, it generates a prioritized directive: execute an immediate targeted SPR drawdown while simultaneously locking in heavy-sour spot options from Latin America. This gives procurement teams a clear, defensible blueprint to act before the price surge hits."
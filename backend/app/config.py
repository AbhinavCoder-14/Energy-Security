"""
Static industry knowledge base and env-driven baselines.
Source of truth for Agent 2 math and Agent 3 slate matching.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _BACKEND_ROOT.parent
_ENV_PATH = _PROJECT_ROOT / ".env"


def refresh_env() -> None:
    """Reload .env so APP_MODE / keys apply without a full process restart."""
    load_dotenv(_ENV_PATH, override=True)
    load_dotenv(override=True)


def resolve_app_mode() -> Literal["LIVE", "SIMULATION"]:
    refresh_env()
    if os.getenv("AEGIS_DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}:
        return "SIMULATION"
    mode = os.getenv("APP_MODE", "SIMULATION").strip().upper()
    return "LIVE" if mode == "LIVE" else "SIMULATION"


APP_MODE: Literal["LIVE", "SIMULATION"] = resolve_app_mode()

PORT = int(os.getenv("PORT", "8000"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
LLM_MODEL = os.getenv("LLM_MODEL", OPENROUTER_MODEL)

# Env-driven baseline capacities (millions of barrels / MBPD)
INDIA_ISPRL_CAPACITY_MB = float(os.getenv("INDIA_ISPRL_CAPACITY_MB", "39.0"))
INDIA_COMMERCIAL_BUFFER_MB = float(os.getenv("INDIA_COMMERCIAL_BUFFER_MB", "322.5"))
INDIA_TOTAL_IMPORTS_MBPD = float(os.getenv("INDIA_TOTAL_DAILY_IMPORT_MBPD", "5.0"))
GLOBAL_DAILY_OIL_SUPPLY_MBPD = float(os.getenv("GLOBAL_DAILY_OIL_SUPPLY_MBPD", "102.5"))

# Legacy aliases for backward compat
GLOBAL_SUPPLY_MBPD = GLOBAL_DAILY_OIL_SUPPLY_MBPD
INDIA_SPR_TOTAL_BARRELS = int(INDIA_ISPRL_CAPACITY_MB * 1_000_000)
TOTAL_SYSTEM_CAPACITY_KBPD = 1850.0

# Agent 2 formula constants (spec)
BASE_FREIGHT_USD = float(os.getenv("BASE_FREIGHT_USD", "3.00"))
CAPE_MILES = float(os.getenv("CAPE_MILES", "12000"))
SUEZ_MILES = float(os.getenv("SUEZ_MILES", "7200"))
SCARCITY_MULTIPLIER = float(os.getenv("SCARCITY_MULTIPLIER", "12.5"))
WAR_RISK_COEFF = float(os.getenv("WAR_RISK_COEFF", "0.025"))
SPR_BASELINE_DAYS = float(os.getenv("SPR_BASELINE_DAYS", "9.5"))

INDIA_REFINERY_SLATE_MATRIX = {
    "IOCL_Paradip": {
        "capacity_kbpd": 300,
        "exposure_ratio": 0.42,
        "preferred_slate": "Heavy-Sour",
        "min_sour_ratio": 0.70,
        "historical_days_cover": 10.0,
        "tank_inventory_mb": 8.5,
        "alternative_compatibility": ["US_Permian_Sour", "Iraqi_Basrah_Heavy"],
    },
    "RIL_Jamnagar": {
        "capacity_kbpd": 1240,
        "exposure_ratio": 0.55,
        "preferred_slate": "Ultra-Heavy_Sour",
        "min_sour_ratio": 0.75,
        "historical_days_cover": 12.0,
        "tank_inventory_mb": 35.0,
        "alternative_compatibility": ["Latin_America_Merey", "US_Gulf_Coast_Heavy"],
    },
    "BPCL_Kochi": {
        "capacity_kbpd": 310,
        "exposure_ratio": 0.38,
        "preferred_slate": "Medium-Sour_Light-Sweet_Blend",
        "min_sour_ratio": 0.40,
        "historical_days_cover": 8.0,
        "tank_inventory_mb": 9.0,
        "alternative_compatibility": ["Nigerian_Bonny_Light", "US_Permian_Sweet"],
    },
}

ROUTE_DEPENDENCY_MATRIX = {
    "Strait_of_Hormuz": {
        "india_import_share": 0.45,
        "base_transit_days": 12,
        "reroute_transit_days": 26,
        "base_freight_cost": 3.00,
    },
    "Bab_el_Mandeb": {
        "india_import_share": 0.15,
        "base_transit_days": 14,
        "reroute_transit_days": 28,
        "base_freight_cost": 3.50,
    },
    "Suez_Canal": {
        "india_import_share": 0.08,
        "base_transit_days": 16,
        "reroute_transit_days": 30,
        "base_freight_cost": 3.20,
    },
}

ALTERNATIVE_LOGISTICS_MATRIX = {
    "US_Permian_Sweet": {
        "transit_days_to_india": 28,
        "freight_cost_per_bbl": 5.50,
        "max_available_spot_mbpd": 0.8,
        "slate_profile": "Light-Sweet",
    },
    "West_Africa_Sweet": {
        "transit_days_to_india": 20,
        "freight_cost_per_bbl": 4.20,
        "max_available_spot_mbpd": 0.5,
        "slate_profile": "Light-Sweet",
    },
    "Latin_America_Heavy": {
        "transit_days_to_india": 22,
        "freight_cost_per_bbl": 4.80,
        "max_available_spot_mbpd": 0.8,
        "slate_profile": "Heavy-Sour",
    },
    "India_SPR_Drawdown": {
        "transit_days_to_india": 1,
        "freight_cost_per_bbl": 0.20,
        "max_available_spot_mbpd": 1.5,
        "slate_profile": "High-Sour Mimic",
    },
}

# OpenRouter LLM (Agents 1 & 3)

AEGIS_DEMO_MODE = resolve_app_mode() == "SIMULATION"

AGENT1_NEWS_TIMEOUT_S = 4.0
AGENT1_LLM_TIMEOUT_S = 12.0
AGENT3_LLM_TIMEOUT_S = 16.0
SIMULATE_WALL_CLOCK_BUDGET_S = 30.0
NEWS_CACHE_TTL_S = 60.0
MARKET_CACHE_TTL_S = 60.0

# ---------------------------------------------------------------------------
# Live telemetry + what-if scenario engine (additive; does not replace above)
# ---------------------------------------------------------------------------

LIVE_BASELINE_BRENT = float(os.getenv("LIVE_BASELINE_BRENT", "82.50"))
NATIONAL_IMPORT_DEPENDENCE_PCT = 88.0

COUNTRY_SUPPLY_MATRIX = {
    "Iraq": {
        "import_share_pct": 19.9,
        "crude_grade": "Heavy-Sour",
        "primary_route": "Strait_of_Hormuz",
    },
    "Russia": {
        "import_share_pct": 17.9,
        "crude_grade": "Medium-Sour",
        "primary_route": "Bab_el_Mandeb",
    },
    "Saudi": {
        "import_share_pct": 16.0,
        "crude_grade": "Medium/Heavy-Sour",
        "primary_route": "Strait_of_Hormuz+Red_Sea",
    },
    "UAE": {
        "import_share_pct": 11.0,
        "crude_grade": "Light-Sweet",
        "primary_route": "Strait_of_Hormuz",
    },
    "Diversified_Others": {
        "import_share_pct": 35.2,
        "crude_grade": "Mixed-Spot",
        "primary_route": "Long_Haul",
    },
}

CHOKEPOINT_MAP = {
    "Strait_of_Hormuz": {
        "coordinates": [26.56, 56.25],
        "india_import_share": 0.48,
        "base_transit_days": 12,
        "reroute_transit_days": 26,
        "base_freight_cost": 3.00,
    },
    "Bab_el_Mandeb": {
        "coordinates": [12.58, 43.33],
        "india_import_share": 0.18,
        "base_transit_days": 14,
        "reroute_transit_days": 28,
        "base_freight_cost": 3.50,
    },
    "Malacca_Strait": {
        "coordinates": [1.43, 102.89],
        "india_import_share": 0.05,
        "base_transit_days": 10,
        "reroute_transit_days": 10,
        "base_freight_cost": 2.50,
    },
}

ALTERNATIVE_SUPPLY_ORIGINS = {
    "Brazil_Santos": {
        "coordinates": [-23.96, -46.30],
        "crude_grade": "Heavy-Sour",
        "transit_days": 28,
        "freight_usd_per_bbl": 5.50,
        "max_available_mbpd": 0.8,
    },
    "US_Gulf_Coast": {
        "coordinates": [29.95, -90.07],
        "crude_grade": "Light-Sweet",
        "transit_days": 32,
        "freight_usd_per_bbl": 6.00,
        "max_available_mbpd": 1.0,
    },
    "West_Africa_Nigeria": {
        "coordinates": [4.37, 6.23],
        "crude_grade": "Medium-Sweet",
        "transit_days": 20,
        "freight_usd_per_bbl": 4.20,
        "max_available_mbpd": 0.5,
    },
    "India_Domestic_SPR": {
        "coordinates": [17.68, 83.21],
        "crude_grade": "Heavy-Sour_Mimic",
        "transit_days": 1,
        "freight_usd_per_bbl": 0.20,
        "max_available_mbpd": 1.5,
    },
}

# Country-cut fractions per scenario (fraction of that country's import volume lost)
SCENARIO_DISRUPTION_MAP = {
    "strait_of_hormuz_closure": {
        "Iraq": 1.0,
        "UAE": 1.0,
        "Saudi": 0.6,
    },
    "hormuz_closure": {  # alias
        "Iraq": 1.0,
        "UAE": 1.0,
        "Saudi": 0.6,
    },
    "bab_el_mandeb_escalation": {
        "Russia": 0.7,
        "Saudi": 0.4,  # Red Sea leg of Saudi barrels
    },
    "secondary_sanctions_shock": {
        "Russia": 1.0,
    },
}

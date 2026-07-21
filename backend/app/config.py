"""
Static industry knowledge base and 2026 economic baselines.
Source of truth for Agent 2 math and Agent 3 slate matching.
"""

import os

# Constants matching 2026 economic baselines
GLOBAL_SUPPLY_MBPD = 102.0
BRENT_BASE_PRICE = 75.0
INDIA_SPR_TOTAL_BARRELS = 39_000_000  # ~9.5 days of operational cover
INDIA_TOTAL_IMPORTS_MBPD = 5.0
TOTAL_SYSTEM_CAPACITY_KBPD = 1850.0
ELASTICITY_FACTOR = 120.0

INDIA_REFINERY_SLATE_MATRIX = {
    "IOCL_Paradip": {
        "capacity_kbpd": 300,
        "preferred_slate": "Heavy-Sour",
        "min_sour_ratio": 0.70,
        "historical_days_cover": 10.0,
        "alternative_compatibility": ["US_Permian_Sour", "Iraqi_Basrah_Heavy"],
    },
    "RIL_Jamnagar": {
        "capacity_kbpd": 1240,
        "preferred_slate": "Ultra-Heavy_Sour",
        "min_sour_ratio": 0.75,
        "historical_days_cover": 12.0,
        "alternative_compatibility": ["Latin_America_Merey", "US_Gulf_Coast_Heavy"],
    },
    "BPCL_Kochi": {
        "capacity_kbpd": 310,
        "preferred_slate": "Medium-Sour_Light-Sweet_Blend",
        "min_sour_ratio": 0.40,
        "historical_days_cover": 8.0,
        "alternative_compatibility": ["Nigerian_Bonny_Light", "US_Permian_Sweet"],
    },
}

ROUTE_DEPENDENCY_MATRIX = {
    "Strait_of_Hormuz": {
        "india_import_share": 0.45,
        "base_transit_days": 12,
        "reroute_transit_days": 26,  # Around Cape of Good Hope
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

OPENROUTER_MODEL = "google/gemini-2.5-flash"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Demo / latency controls
AEGIS_DEMO_MODE = os.getenv("AEGIS_DEMO_MODE", "").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
AGENT1_NEWS_TIMEOUT_S = 2.0
AGENT1_LLM_TIMEOUT_S = 4.0
AGENT3_LLM_TIMEOUT_S = 8.0
SIMULATE_WALL_CLOCK_BUDGET_S = 18.0
NEWS_CACHE_TTL_S = 60.0

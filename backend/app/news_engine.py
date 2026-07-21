"""
Live news ingestion via newsdata.io for chokepoint geopolitical signals.
Returns empty string on any failure so Agent 1 can fall back to scenarios.json.
"""

import os

import requests
from dotenv import load_dotenv

load_dotenv()

# Reconcile .env naming: NEWSAPI_KEY holds the newsdata.io pub_ key
NEWSDATA_API_KEY = os.getenv("NEWSAPI_KEY") or os.getenv("NEWSDATA_API_KEY", "")


def fetch_live_chokepoint_news(chokepoint_name: str) -> str:
    """
    Queries live newsdata.io endpoints for breaking geopolitical event text signals.
    """
    url = "https://newsdata.io/api/1/news"

    query_mapping = {
        "Strait_of_Hormuz": "Strait of Hormuz AND (tanker OR blockade OR Iran OR military)",
        "Bab_el_Mandeb": "Bab-el-Mandeb OR Red Sea AND (drone OR attack OR Houthi)",
        "Suez_Canal": "Suez Canal AND (blockage OR transit OR maritime)",
    }

    query = query_mapping.get(chokepoint_name, chokepoint_name)

    params = {
        "apikey": NEWSDATA_API_KEY,
        "q": query,
        "language": "en",
    }

    try:
        response = requests.get(url, params=params, timeout=4)
        if response.status_code != 200:
            print(
                f"[Warning] newsdata.io returned status {response.status_code}. Using fallback path."
            )
            return ""

        data = response.json()
        results = data.get("results", [])

        if not results:
            return ""

        context_lines = []
        for idx, article in enumerate(results[:5]):
            title = article.get("title", "No Title")
            description = article.get("description", "No Description")
            context_lines.append(f"[{idx + 1}] {title}: {description}")

        return "\n".join(context_lines)

    except requests.exceptions.RequestException as e:
        print(f"[Exception] Network friction on newsdata.io: {e}")
        return ""

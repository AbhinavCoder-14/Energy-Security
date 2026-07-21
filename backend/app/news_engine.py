"""
Live news ingestion via newsdata.io for chokepoint geopolitical signals.
Returns empty string / empty list on failure so Agent 1 can fall back safely.
Retries on 429 / 5xx / network blips.
"""

import os
import time
from typing import Dict, List, Tuple

import requests
from dotenv import load_dotenv

from app.config import AGENT1_NEWS_TIMEOUT_S, NEWS_CACHE_TTL_S
from app.http_utils import ssl_verify, with_retries
from app.schemas import NewsSnippet

load_dotenv()

NEWSDATA_API_KEY = os.getenv("NEWSAPI_KEY") or os.getenv("NEWSDATA_API_KEY", "")

_cache: Dict[str, Tuple[float, str, List[NewsSnippet]]] = {}


def _request_news(chokepoint_name: str, query: str) -> Tuple[str, List[NewsSnippet]]:
    url = "https://newsdata.io/api/1/news"
    params = {
        "apikey": NEWSDATA_API_KEY,
        "q": query,
        "language": "en",
    }

    response = requests.get(
        url,
        params=params,
        timeout=AGENT1_NEWS_TIMEOUT_S,
        verify=ssl_verify(),
    )

    if response.status_code in {429, 500, 502, 503, 504}:
        # Raise so with_retries treats as retryable
        raise requests.exceptions.HTTPError(
            f"newsdata.io HTTP {response.status_code}",
            response=response,
        )

    if response.status_code != 200:
        print(
            f"[Warning] newsdata.io returned status {response.status_code}. Using fallback path."
        )
        return "", []

    data = response.json()
    results = data.get("results", [])

    if not results:
        return "", []

    context_lines = []
    snippets: List[NewsSnippet] = []
    for idx, article in enumerate(results[:5]):
        title = article.get("title") or "No Title"
        description = article.get("description") or "No Description"
        source = article.get("source_id") or article.get("creator") or ""
        if isinstance(source, list):
            source = source[0] if source else ""
        published = article.get("pubDate")
        context_lines.append(f"[{idx + 1}] {title}: {description}")
        snippets.append(
            NewsSnippet(
                route_name=chokepoint_name,
                title=title,
                source=str(source),
                published=published,
            )
        )

    return "\n".join(context_lines), snippets


def fetch_live_chokepoint_news(
    chokepoint_name: str,
) -> Tuple[str, List[NewsSnippet]]:
    """
    Queries live newsdata.io for breaking geopolitical event text signals.
    Returns (context_blob, snippets). Empty on any failure.
    """
    now = time.monotonic()
    cached = _cache.get(chokepoint_name)
    if cached and (now - cached[0]) < NEWS_CACHE_TTL_S:
        return cached[1], cached[2]

    query_mapping = {
        "Strait_of_Hormuz": "Strait of Hormuz AND (tanker OR blockade OR Iran OR military)",
        "Bab_el_Mandeb": "Bab-el-Mandeb OR Red Sea AND (drone OR attack OR Houthi)",
        "Suez_Canal": "Suez Canal AND (blockage OR transit OR maritime)",
    }
    query = query_mapping.get(chokepoint_name, chokepoint_name)

    try:
        blob, snippets = with_retries(
            lambda: _request_news(chokepoint_name, query),
            label=f"newsdata:{chokepoint_name}",
        )
        if blob:
            _cache[chokepoint_name] = (now, blob, snippets)
        return blob, snippets
    except Exception as e:
        print(f"[Exception] Network friction on newsdata.io: {e}")
        return "", []

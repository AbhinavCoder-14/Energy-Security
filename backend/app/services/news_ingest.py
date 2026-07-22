"""
Multi-provider news ingest with regex blacklist filtering.
"""

from __future__ import annotations

import os
import re
import time
from typing import Dict, List, Tuple

import requests

from app.config import AGENT1_NEWS_TIMEOUT_S, NEWS_CACHE_TTL_S
from app.http_utils import ssl_verify, with_retries
from app.schemas import NewsSnippet

NEWSDATA_API_KEY = os.getenv("NEWSAPI_KEY") or os.getenv("NEWSDATA_API_KEY", "")
NEWSAPI_ORG_KEY = os.getenv("NEWSAPI_ORG_KEY", "")

ROUTE_QUERIES = {
    "Strait_of_Hormuz": '"Strait of Hormuz" AND ("tanker" OR "shipping" OR "naval" OR "blockade" OR "Iran")',
    "Bab_el_Mandeb": '"Bab-el-Mandeb" OR "Red Sea" AND ("Houthi" OR "missile" OR "tanker" OR "Cape route")',
}

NOISE_BLACKLIST = re.compile(
    r"(?i)(amazon|e-?commerce|warehouse\s+strike|retail|black\s+friday|"
    r"domestic\s+politics|local\s+crime|celebrity|sports\s+score|"
    r"crypto|bitcoin|nft|startup\s+funding)",
)

_cache: Dict[str, Tuple[float, str, List[NewsSnippet]]] = {}


def _filter_articles(title: str, description: str) -> bool:
    blob = f"{title} {description}"
    return not NOISE_BLACKLIST.search(blob)


def _fetch_newsdata(route: str, query: str) -> Tuple[str, List[NewsSnippet]]:
    url = "https://newsdata.io/api/1/news"
    params = {"apikey": NEWSDATA_API_KEY, "q": query, "language": "en"}

    def _call():
        resp = requests.get(
            url, params=params, timeout=AGENT1_NEWS_TIMEOUT_S, verify=ssl_verify()
        )
        if resp.status_code in {429, 500, 502, 503, 504}:
            resp.raise_for_status()
        if resp.status_code != 200:
            raise ValueError(f"newsdata.io HTTP {resp.status_code}")
        return resp.json()

    data = with_retries(_call, label=f"newsdata:{route}")
    results = data.get("results", [])
    return _pack_results(route, results, title_key="title", desc_key="description", source_key="source_id")


def _fetch_newsapi_org(route: str, query: str) -> Tuple[str, List[NewsSnippet]]:
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 10,
        "apiKey": NEWSAPI_ORG_KEY,
    }

    def _call():
        resp = requests.get(
            url, params=params, timeout=AGENT1_NEWS_TIMEOUT_S, verify=ssl_verify()
        )
        if resp.status_code in {429, 500, 502, 503, 504}:
            resp.raise_for_status()
        if resp.status_code != 200:
            raise ValueError(f"newsapi.org HTTP {resp.status_code}")
        return resp.json()

    data = with_retries(_call, label=f"newsapi.org:{route}")
    articles = data.get("articles", [])
    return _pack_results(
        route,
        articles,
        title_key="title",
        desc_key="description",
        source_key="source",
        nested_source=True,
    )


def _pack_results(
    route: str,
    items: list,
    *,
    title_key: str,
    desc_key: str,
    source_key: str,
    nested_source: bool = False,
) -> Tuple[str, List[NewsSnippet]]:
    lines: List[str] = []
    snippets: List[NewsSnippet] = []

    for idx, art in enumerate(items[:8]):
        title = (art.get(title_key) or "").strip()
        desc = (art.get(desc_key) or "").strip()
        if not title or not _filter_articles(title, desc):
            continue
        if nested_source:
            src_obj = art.get(source_key) or {}
            source = src_obj.get("name", "") if isinstance(src_obj, dict) else str(src_obj)
        else:
            source = str(art.get(source_key) or "")
        published = art.get("pubDate") or art.get("publishedAt")
        lines.append(f"[{idx + 1}] {title}: {desc}")
        snippets.append(
            NewsSnippet(
                route_name=route,
                title=title,
                source=source,
                published=published,
            )
        )

    return "\n".join(lines), snippets


def fetch_route_news(route: str) -> Tuple[str, List[NewsSnippet]]:
    """Fetch filtered news for a chokepoint route."""
    now = time.monotonic()
    cached = _cache.get(route)
    if cached and (now - cached[0]) < NEWS_CACHE_TTL_S:
        return cached[1], cached[2]

    query = ROUTE_QUERIES.get(route, route)
    blob, snippets = "", []

    if NEWSDATA_API_KEY:
        try:
            blob, snippets = _fetch_newsdata(route, query)
        except Exception as e:
            print(f"[news_ingest] newsdata failed for {route}: {e}")

    if not blob and NEWSAPI_ORG_KEY:
        try:
            blob, snippets = _fetch_newsapi_org(route, query)
        except Exception as e:
            print(f"[news_ingest] newsapi.org failed for {route}: {e}")

    if blob:
        _cache[route] = (now, blob, snippets)
    return blob, snippets

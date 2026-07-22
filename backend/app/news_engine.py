"""Thin wrapper — delegates to services.news_ingest."""

from app.services.news_ingest import fetch_route_news


def fetch_live_chokepoint_news(chokepoint_name: str):
    return fetch_route_news(chokepoint_name)

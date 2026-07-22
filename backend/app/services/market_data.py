"""
Live Brent crude fetcher — OilPriceAPI primary, yfinance BZ=F fallback.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Optional, Tuple

import requests

from app.config import MARKET_CACHE_TTL_S, resolve_app_mode
from app.http_utils import ssl_verify, with_retries
from app.schemas import LiveBrentQuote

OILPRICE_API_KEY = os.getenv("OILPRICE_API_KEY", "")
OILPRICE_URL = "https://api.oilpriceapi.com/v1/prices/latest"

_cache: Optional[Tuple[float, LiveBrentQuote]] = None
_last_error: Optional[str] = None


def _fetch_oilprice() -> LiveBrentQuote:
    headers = {"Authorization": f"Token {OILPRICE_API_KEY}"}
    params = {"by_code": "BRENT_CRUDE_USD"}

    def _call():
        resp = requests.get(
            OILPRICE_URL,
            headers=headers,
            params=params,
            timeout=8,
            verify=ssl_verify(),
        )
        if resp.status_code in {429, 500, 502, 503, 504}:
            resp.raise_for_status()
        if resp.status_code != 200:
            raise ValueError(f"OilPriceAPI HTTP {resp.status_code}")
        data = resp.json()
        price = float(data["data"]["price"])
        ts = data["data"].get("created_at") or datetime.now(timezone.utc).isoformat()
        return LiveBrentQuote(
            live_brent_price=round(price, 2),
            currency="USD",
            timestamp=ts,
            data_source="OilPriceAPI",
        )

    return with_retries(_call, label="oilpriceapi:brent")


def _fetch_yfinance(ticker: str) -> LiveBrentQuote:
    import yfinance as yf

    def _call():
        t = yf.Ticker(ticker)
        hist = t.history(period="1d")
        if hist.empty:
            raise ValueError(f"No yfinance data for {ticker}")
        price = float(hist["Close"].iloc[-1])
        return LiveBrentQuote(
            live_brent_price=round(price, 2),
            currency="USD",
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            data_source="YahooFinance Live",
        )

    return with_retries(_call, label=f"yfinance:{ticker}")


def get_live_brent(*, require_live: bool = False) -> LiveBrentQuote:
    """
    Fetch live Brent. Cached ~60s.
    require_live=True (APP_MODE=LIVE) raises on total failure.
    """
    global _cache, _last_error

    now = time.monotonic()
    if _cache and (now - _cache[0]) < MARKET_CACHE_TTL_S:
        return _cache[1]

    quote: Optional[LiveBrentQuote] = None
    errors: list[str] = []

    if OILPRICE_API_KEY:
        try:
            quote = _fetch_oilprice()
        except Exception as e:
            errors.append(f"OilPriceAPI: {e}")

    if quote is None:
        for ticker in ("BZ=F", "CL=F"):
            try:
                quote = _fetch_yfinance(ticker)
                break
            except Exception as e:
                errors.append(f"yfinance {ticker}: {e}")

    if quote is None:
        _last_error = "; ".join(errors) or "No market data source available"
        if require_live or resolve_app_mode() == "LIVE":
            raise RuntimeError(_last_error)
        raise RuntimeError(_last_error)

    _cache = (now, quote)
    _last_error = None
    return quote


def get_simulation_fallback_brent() -> LiveBrentQuote:
    """Last-resort structural baseline — SIMULATION only, never used in LIVE."""
    if resolve_app_mode() == "LIVE":
        raise RuntimeError("Simulation Brent fallback is not allowed in LIVE mode")
    return LiveBrentQuote(
        live_brent_price=75.0,
        currency="USD",
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        data_source="YahooFinance Live",
    )


def get_brent_for_pipeline(*, simulation_mode: bool) -> LiveBrentQuote:
    require = resolve_app_mode() == "LIVE" and not simulation_mode
    try:
        return get_live_brent(require_live=require)
    except Exception:
        if simulation_mode or resolve_app_mode() == "SIMULATION":
            return get_simulation_fallback_brent()
        raise


def get_last_market_error() -> Optional[str]:
    return _last_error

"""
HTTP helpers for corporate SSL / proxy environments + API retries.
Set AEGIS_SSL_VERIFY=1 to enforce certificate verification (default: off for local demo).
"""

from __future__ import annotations

import os
import random
import time
import warnings
from typing import Callable, Optional, TypeVar

import httpx
import urllib3

# Default off: many corp laptops fail with CERTIFICATE_VERIFY_FAILED (local issuer).
_SSL_VERIFY = os.getenv("AEGIS_SSL_VERIFY", "0").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

if not _SSL_VERIFY:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    warnings.filterwarnings("ignore", message="Unverified HTTPS request")

T = TypeVar("T")

# Retry knobs (overridable via env)
API_MAX_RETRIES = int(os.getenv("AEGIS_API_MAX_RETRIES", "3"))
API_RETRY_BASE_S = float(os.getenv("AEGIS_API_RETRY_BASE_S", "1.0"))
API_RETRY_MAX_S = float(os.getenv("AEGIS_API_RETRY_MAX_S", "8.0"))


def ssl_verify() -> bool:
    return _SSL_VERIFY


def make_httpx_client(timeout: float = 30.0) -> httpx.Client:
    return httpx.Client(verify=_SSL_VERIFY, timeout=timeout)


def _status_code_from_exc(exc: BaseException) -> Optional[int]:
    code = getattr(exc, "status_code", None)
    if isinstance(code, int):
        return code
    response = getattr(exc, "response", None)
    if response is not None:
        status = getattr(response, "status_code", None)
        if isinstance(status, int):
            return status
    msg = str(exc).lower()
    for token in ("429", "502", "503", "504", "408"):
        if token in msg:
            return int(token)
    return None


def is_retryable_error(exc: BaseException) -> bool:
    """Rate limits, transient server/network errors — retry. Hard auth/credit — don't."""
    code = _status_code_from_exc(exc)
    if code in {408, 429, 500, 502, 503, 504}:
        return True
    # OpenRouter credit exhausted (402) is not fixed by retrying the same call
    if code in {400, 401, 403, 402, 404}:
        return False

    name = type(exc).__name__.lower()
    msg = str(exc).lower()
    retry_markers = (
        "rate limit",
        "ratelimit",
        "too many requests",
        "timeout",
        "timed out",
        "connection",
        "temporarily unavailable",
        "overloaded",
        "server error",
        "ssl",
        "reset by peer",
        "503",
        "502",
        "429",
    )
    if any(m in msg for m in retry_markers):
        return True
    if any(k in name for k in ("timeout", "connection", "ratelimit", "apiconnection")):
        return True
    return False


def retry_after_seconds(exc: BaseException, attempt: int) -> float:
    """Honor Retry-After when present; else exponential backoff with jitter."""
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None) if response is not None else None
    if headers:
        retry_after = headers.get("retry-after") or headers.get("Retry-After")
        if retry_after:
            try:
                return min(float(retry_after), API_RETRY_MAX_S)
            except ValueError:
                pass

    delay = min(API_RETRY_BASE_S * (2 ** attempt), API_RETRY_MAX_S)
    return delay + random.uniform(0, 0.35 * delay)


def with_retries(
    fn: Callable[[], T],
    *,
    label: str = "api",
    max_retries: Optional[int] = None,
) -> T:
    """
    Run fn with retries on rate-limit / transient failures.
    max_retries = number of *retries* after the first attempt (default 3 → 4 tries).
    """
    attempts = (max_retries if max_retries is not None else API_MAX_RETRIES) + 1
    last_exc: Optional[BaseException] = None

    for attempt in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 — intentional catch for retry classification
            last_exc = exc
            if attempt >= attempts - 1 or not is_retryable_error(exc):
                raise
            wait = retry_after_seconds(exc, attempt)
            print(
                f"[Retry] {label} attempt {attempt + 1}/{attempts} failed "
                f"({type(exc).__name__}: {exc}). Sleeping {wait:.1f}s…"
            )
            time.sleep(wait)

    assert last_exc is not None
    raise last_exc

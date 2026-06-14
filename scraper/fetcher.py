"""aiohttp layer: semaphore, global rate limiter, global 429 pause."""
from __future__ import annotations

import asyncio
import logging
import random
from typing import Optional

import aiohttp

from scraper.config import (
    REQUEST_TIMEOUT, MAX_RETRIES,
    RETRY_WAIT_MIN, RETRY_WAIT_MAX,
    RATE_LIMIT_WAIT,
    MIN_REQUEST_GAP, SLEEP_MIN, SLEEP_MAX,
    USER_AGENT, PROXY_URL,
)

logger = logging.getLogger(__name__)


class _RateLimiter:
    """
    Two responsibilities:

    1. Spacing  — serialises request fires so at least MIN_REQUEST_GAP seconds
                  elapse between any two consecutive requests.

    2. Global pause — when any worker receives a 429, it calls pause_all(secs).
                  Every subsequent call to wait() blocks until the pause expires,
                  so all workers freeze together instead of hammering independently.
    """

    def __init__(self, min_gap: float) -> None:
        self._min_gap = min_gap
        self._lock = asyncio.Lock()
        self._last_sent: float = 0.0
        self._pause_until: float = 0.0

    async def wait(self) -> None:
        # Honour a global 429 pause before even trying the lock.
        loop = asyncio.get_event_loop()
        remaining = self._pause_until - loop.time()
        if remaining > 0:
            await asyncio.sleep(remaining)

        async with self._lock:
            now = loop.time()
            gap = self._min_gap - (now - self._last_sent)
            if gap > 0:
                await asyncio.sleep(gap)
            self._last_sent = loop.time()

    def pause_all(self, duration: float) -> None:
        """Freeze all workers for `duration` seconds (called on any 429)."""
        loop = asyncio.get_event_loop()
        new_until = loop.time() + duration
        if new_until > self._pause_until:
            self._pause_until = new_until
            logger.warning(f'Global pause: all workers suspended for {duration:.0f}s')


def _make_session() -> aiohttp.ClientSession:
    connector = aiohttp.TCPConnector(limit=10, ssl=False)
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    headers = {'User-Agent': USER_AGENT}
    return aiohttp.ClientSession(connector=connector, timeout=timeout, headers=headers)


class Fetcher:
    """
    Shared aiohttp session + semaphore + global rate limiter.

    Flow per request:
      1. Acquire semaphore slot       (caps inflight requests to SEMAPHORE_LIMIT)
      2. Wait for rate limiter        (MIN_REQUEST_GAP spacing + any active 429 pause)
      3. Sleep random jitter          (SLEEP_MIN–SLEEP_MAX)
      4. Fire HTTP request
         - 404  → return immediately
         - 429  → pause_all() on rate limiter, then this worker also waits
         - 5xx / network error → retry with random wait, up to MAX_RETRIES
    """

    def __init__(self, semaphore: asyncio.Semaphore) -> None:
        self._sem = semaphore
        self._rate_limiter = _RateLimiter(MIN_REQUEST_GAP)
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self) -> 'Fetcher':
        self._session = _make_session()
        return self

    async def __aexit__(self, *args) -> None:
        if self._session:
            await self._session.close()

    async def get(self, url: str) -> tuple[int, str]:
        assert self._session is not None

        async with self._sem:
            await self._rate_limiter.wait()
            await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

            last_exc: Optional[Exception] = None

            for attempt in range(MAX_RETRIES):
                try:
                    async with self._session.get(url, proxy=PROXY_URL) as resp:
                        text = await resp.text(errors='replace')

                        if resp.status == 404:
                            return 404, text

                        if resp.status == 429:
                            wait = RATE_LIMIT_WAIT * (2 ** attempt) + random.uniform(0, 15)
                            # Freeze every worker, not just this one.
                            self._rate_limiter.pause_all(wait)
                            await asyncio.sleep(wait)
                            continue

                        resp.raise_for_status()
                        return resp.status, text

                except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                    last_exc = exc
                    if attempt < MAX_RETRIES - 1:
                        wait = random.uniform(RETRY_WAIT_MIN, RETRY_WAIT_MAX)
                        logger.warning(
                            f'Retry {attempt + 1}/{MAX_RETRIES} for {url!r} '
                            f'({type(exc).__name__}) — waiting {wait:.1f}s'
                        )
                        await asyncio.sleep(wait)

            if last_exc is not None:
                raise last_exc
            raise aiohttp.ClientError(f'Failed after {MAX_RETRIES} attempts: {url}')

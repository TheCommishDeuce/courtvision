"""In-memory sliding-window API rate limiter."""
from __future__ import annotations

import math
import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class TierLimit:
    per_minute: int
    per_day: int


TIER_LIMITS: dict[str, TierLimit] = {
    "free": TierLimit(per_minute=60, per_day=5_000),
    "research": TierLimit(per_minute=300, per_day=100_000),
    "dev": TierLimit(per_minute=3_000, per_day=1_000_000),
    # Backward-compatible aliases for users created before the free-service pivot.
    "starter": TierLimit(per_minute=60, per_day=5_000),
    "pro": TierLimit(per_minute=300, per_day=100_000),
}


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    retry_after: int = 0
    limit: int = 0
    remaining: int = 0
    window: str = "minute"


class InMemoryRateLimiter:
    """Sliding-window limiter suitable for a single-worker deployment."""

    def __init__(self, now: Callable[[], float] | None = None) -> None:
        self._now = now or time.time
        self._minute_events: dict[str, deque[float]] = defaultdict(deque)
        self._day_events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key_id: str, tier: str) -> RateLimitResult:
        limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        now = self._now()
        with self._lock:
            minute_events = self._minute_events[key_id]
            day_events = self._day_events[key_id]
            self._prune(minute_events, now - 60)
            self._prune(day_events, now - 86_400)

            if len(minute_events) >= limit.per_minute:
                return RateLimitResult(
                    allowed=False,
                    retry_after=self._retry_after(minute_events[0], 60, now),
                    limit=limit.per_minute,
                    remaining=0,
                    window="minute",
                )

            if len(day_events) >= limit.per_day:
                return RateLimitResult(
                    allowed=False,
                    retry_after=self._retry_after(day_events[0], 86_400, now),
                    limit=limit.per_day,
                    remaining=0,
                    window="day",
                )

            minute_events.append(now)
            day_events.append(now)
            return RateLimitResult(
                allowed=True,
                limit=limit.per_minute,
                remaining=max(limit.per_minute - len(minute_events), 0),
                window="minute",
            )

    def reset(self) -> None:
        """Clear all counters. Intended for tests."""
        with self._lock:
            self._minute_events.clear()
            self._day_events.clear()

    @staticmethod
    def _prune(events: deque[float], cutoff: float) -> None:
        while events and events[0] <= cutoff:
            events.popleft()

    @staticmethod
    def _retry_after(oldest: float, window_seconds: int, now: float) -> int:
        return max(1, math.ceil(oldest + window_seconds - now))


rate_limiter = InMemoryRateLimiter()

"""
Gabi Hub — Rate Limiter
Redis-backed sliding window rate limiter per user UID.
Falls back to in-memory token bucket if Redis is unavailable.
"""

import logging
import os
import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import HTTPException, status

logger = logging.getLogger("gabi.rate_limit")

# ── Redis connection (lazy) ──

_redis = None
_redis_failed = False


def _get_redis():
    global _redis, _redis_failed
    if _redis_failed:
        return None
    if _redis is not None:
        return _redis
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        logger.info("REDIS_URL not set, using in-memory rate limiter")
        _redis_failed = True
        return None
    try:
        import redis
        _redis = redis.Redis.from_url(redis_url, decode_responses=True, socket_timeout=2)
        _redis.ping()
        logger.info("Redis rate limiter connected")
        return _redis
    except Exception as e:
        logger.warning("Redis unavailable (%s), falling back to in-memory", e)
        _redis_failed = True
        return None


# ── Redis sliding window ──

WINDOW_SECONDS = 60
MAX_REQUESTS = 30  # 30 requests per window


def _check_redis(user_id: str, cost: float = 1.0) -> None:
    """Redis sliding window counter."""
    r = _get_redis()
    key = f"gabi:rate:{user_id}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, WINDOW_SECONDS)
    results = pipe.execute()
    current = results[0]

    if current > MAX_REQUESTS:
        ttl = r.ttl(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Limite de requisições excedido. Tente novamente em {ttl}s.",
            headers={"Retry-After": str(ttl)},
        )


# ── In-memory fallback ──

@dataclass
class RateBucket:
    tokens: float = 10.0
    last_refill: float = field(default_factory=time.time)
    max_tokens: float = 10.0
    refill_rate: float = 0.5  # tokens per second


_buckets: dict[str, RateBucket] = defaultdict(RateBucket)


def _check_memory(user_id: str, cost: float = 1.0) -> None:
    """In-memory token bucket fallback."""
    bucket = _buckets[user_id]
    now = time.time()

    elapsed = now - bucket.last_refill
    bucket.tokens = min(bucket.max_tokens, bucket.tokens + elapsed * bucket.refill_rate)
    bucket.last_refill = now

    if bucket.tokens < cost:
        retry_after = int((cost - bucket.tokens) / bucket.refill_rate) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Limite de requisições excedido. Tente novamente em {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )

    bucket.tokens -= cost


# ── Public API ──

def check_rate_limit(user_id: str, cost: float = 1.0) -> None:
    """
    Rate limiter with Redis → in-memory fallback.
    Redis: sliding window, 30 req/min.
    Memory: token bucket, 10 tokens, 0.5/sec refill (~30 req/min).
    """
    if _get_redis():
        try:
            _check_redis(user_id, cost)
            return
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Redis rate check failed (%s), using memory", e)

    _check_memory(user_id, cost)

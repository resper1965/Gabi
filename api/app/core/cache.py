"""
Gabi Hub — Cache Layer
Redis-backed cache for RAG results, user profiles, and API responses.
Falls back to in-memory LRU if Redis is unavailable.
"""

import json
import logging
import time
from typing import Any

from app.config import get_settings
from app.core.circuit_breaker import redis_breaker

logger = logging.getLogger("gabi.cache")
settings = get_settings()

# ── Redis connection (lazy) ──

_redis = None
_redis_available = None


def _get_redis():
    global _redis, _redis_available
    if _redis_available is False:
        return None
    if _redis is not None:
        return _redis
    if not settings.redis_url:
        _redis_available = False
        return None
    try:
        import redis
        _redis = redis.Redis.from_url(settings.redis_url, decode_responses=True, socket_timeout=2)
        _redis.ping()
        _redis_available = True
        logger.info("Cache: Redis connected")
        return _redis
    except Exception as e:
        logger.warning("Cache: Redis unavailable (%s), using in-memory", e)
        _redis_available = False
        return None


# ── In-memory fallback ──

_memory_cache: dict[str, tuple[Any, float]] = {}
_MEMORY_MAX = 500


def _memory_get(key: str) -> Any | None:
    if key in _memory_cache:
        value, expiry = _memory_cache[key]
        if expiry > time.time():
            return value
        del _memory_cache[key]
    return None


def _memory_set(key: str, value: Any, ttl: int) -> None:
    if len(_memory_cache) >= _MEMORY_MAX:
        # Evict oldest entries
        sorted_keys = sorted(_memory_cache, key=lambda k: _memory_cache[k][1])
        for k in sorted_keys[: _MEMORY_MAX // 4]:
            del _memory_cache[k]
    _memory_cache[key] = (value, time.time() + ttl)


# ── Public API ──

async def cache_get(key: str) -> Any | None:
    """Get value from cache (Redis → in-memory fallback)."""
    r = _get_redis()
    if r and redis_breaker.can_execute():
        try:
            data = r.get(f"gabi:{key}")
            await redis_breaker.record_success()
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            await redis_breaker.record_failure()
            logger.warning("Cache get failed: %s", e)
    return _memory_get(f"gabi:{key}")


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Set value in cache with TTL (Redis → in-memory fallback)."""
    r = _get_redis()
    if r and redis_breaker.can_execute():
        try:
            r.setex(f"gabi:{key}", ttl, json.dumps(value, default=str))
            await redis_breaker.record_success()
            return
        except Exception as e:
            await redis_breaker.record_failure()
            logger.warning("Cache set failed: %s", e)
    _memory_set(f"gabi:{key}", value, ttl)


async def cache_delete(key: str) -> None:
    """Delete key from cache."""
    r = _get_redis()
    if r:
        try:
            r.delete(f"gabi:{key}")
        except Exception:
            pass
    _memory_cache.pop(f"gabi:{key}", None)


async def cache_invalidate_prefix(prefix: str) -> None:
    """Invalidate all keys with a given prefix (Redis only)."""
    r = _get_redis()
    if r:
        try:
            keys = r.keys(f"gabi:{prefix}:*")
            if keys:
                r.delete(*keys)
        except Exception as e:
            logger.warning("Cache prefix invalidation failed: %s", e)
    # Memory fallback
    to_delete = [k for k in _memory_cache if k.startswith(f"gabi:{prefix}:")]
    for k in to_delete:
        del _memory_cache[k]


# ── Convenience wrappers ──

async def cached_user_profile(user_id: str) -> dict | None:
    """Get cached user profile (TTL: 2min)."""
    return await cache_get(f"user:{user_id}")


async def cache_user_profile(user_id: str, profile: dict) -> None:
    """Cache user profile."""
    await cache_set(f"user:{user_id}", profile, ttl=120)


async def cached_rag_result(query_hash: str) -> list | None:
    """Get cached RAG result (TTL: 5min)."""
    return await cache_get(f"rag:{query_hash}")


async def cache_rag_result(query_hash: str, chunks: list) -> None:
    """Cache RAG result."""
    await cache_set(f"rag:{query_hash}", chunks, ttl=300)

"""
Gabi Hub — Rate Limiter
Simple in-memory rate limiter per user UID.
For production: replace with Redis-backed limiter.
"""

import time
from collections import defaultdict
from dataclasses import dataclass, field
from fastapi import HTTPException, status


@dataclass
class RateBucket:
    tokens: float = 10.0
    last_refill: float = field(default_factory=time.time)
    max_tokens: float = 10.0
    refill_rate: float = 0.5  # tokens per second


_buckets: dict[str, RateBucket] = defaultdict(RateBucket)


def check_rate_limit(user_id: str, cost: float = 1.0) -> None:
    """
    Token bucket rate limiter.
    Default: 10 tokens, refills at 0.5/sec (~30 requests/min).
    Raises HTTPException 429 if exhausted.
    """
    bucket = _buckets[user_id]
    now = time.time()

    # Refill tokens
    elapsed = now - bucket.last_refill
    bucket.tokens = min(bucket.max_tokens, bucket.tokens + elapsed * bucket.refill_rate)
    bucket.last_refill = now

    # Check
    if bucket.tokens < cost:
        retry_after = int((cost - bucket.tokens) / bucket.refill_rate) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Limite de requisições excedido. Tente novamente em {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )

    bucket.tokens -= cost

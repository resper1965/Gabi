"""
Tests for Gabi Hub — Rate Limiter
Tests in-memory token bucket and Redis fallback behavior.
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from fastapi import HTTPException


class TestInMemoryRateLimiter:
    """Test in-memory token bucket rate limiter."""

    def setup_method(self):
        """Reset module state before each test."""
        import app.core.rate_limit as rl
        rl._buckets.clear()
        rl._redis = None
        rl._redis_failed = True  # Force in-memory mode

    def test_allows_requests_within_limit(self):
        """Should allow requests when tokens are available."""
        from app.core.rate_limit import check_rate_limit
        # Should not raise for the first request
        check_rate_limit("user-123", cost=1.0)

    def test_blocks_when_exhausted(self):
        """Should raise 429 when tokens are exhausted."""
        from app.core.rate_limit import check_rate_limit
        # Exhaust all 10 tokens
        for _ in range(10):
            check_rate_limit("user-exhaust", cost=1.0)

        # 11th should raise
        with pytest.raises(HTTPException) as exc_info:
            check_rate_limit("user-exhaust", cost=1.0)
        assert exc_info.value.status_code == 429

    def test_different_users_independent(self):
        """Different users should have independent buckets."""
        from app.core.rate_limit import check_rate_limit
        # Exhaust user A
        for _ in range(10):
            check_rate_limit("user-A", cost=1.0)

        # User B should still work
        check_rate_limit("user-B", cost=1.0)

    def test_retry_after_header(self):
        """429 response should include Retry-After header."""
        from app.core.rate_limit import check_rate_limit
        for _ in range(10):
            check_rate_limit("user-header", cost=1.0)

        with pytest.raises(HTTPException) as exc_info:
            check_rate_limit("user-header", cost=1.0)
        assert "Retry-After" in exc_info.value.headers

    def test_high_cost_request(self):
        """Request with cost > available tokens should be rejected."""
        from app.core.rate_limit import check_rate_limit
        with pytest.raises(HTTPException) as exc_info:
            check_rate_limit("user-expensive", cost=11.0)
        assert exc_info.value.status_code == 429


class TestRedisRateLimiter:
    """Test Redis rate limiter with mocked Redis client."""

    def setup_method(self):
        """Reset module state."""
        import app.core.rate_limit as rl
        rl._redis = None
        rl._redis_failed = False

    @patch("app.core.rate_limit._get_redis")
    def test_falls_back_to_memory_when_redis_unavailable(self, mock_get_redis):
        """Should fall back to in-memory when Redis returns None."""
        mock_get_redis.return_value = None

        import app.core.rate_limit as rl
        rl._redis_failed = True
        rl._buckets.clear()

        from app.core.rate_limit import check_rate_limit
        # Should work via in-memory fallback
        check_rate_limit("user-fallback", cost=1.0)

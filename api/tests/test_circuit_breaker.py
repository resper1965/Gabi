"""
Gabi Hub — Circuit Breaker Tests
Tests for circuit breaker state machine: CLOSED → OPEN → HALF_OPEN → CLOSED.
"""

import time
import pytest
import asyncio

from app.core.circuit_breaker import CircuitBreaker, CircuitState

pytestmark = pytest.mark.asyncio

class TestCircuitBreaker:
    """Test circuit breaker state transitions."""

    async def test_starts_closed(self):
        cb = CircuitBreaker(name="test")
        assert cb.state == CircuitState.CLOSED
        assert cb.can_execute()

    async def test_opens_after_threshold_failures(self):
        cb = CircuitBreaker(name="test", failure_threshold=3)
        await cb.record_failure()
        await cb.record_failure()
        assert cb.state == CircuitState.CLOSED
        await cb.record_failure()
        assert cb.state == CircuitState.OPEN

    async def test_open_blocks_execution(self):
        cb = CircuitBreaker(name="test", failure_threshold=2)
        await cb.record_failure()
        await cb.record_failure()
        assert not cb.can_execute()

    async def test_success_resets_failure_count(self):
        cb = CircuitBreaker(name="test", failure_threshold=3)
        await cb.record_failure()
        await cb.record_failure()
        await cb.record_success()
        assert cb.failure_count == 0
        assert cb.state == CircuitState.CLOSED

    async def test_transitions_to_half_open_after_timeout(self):
        cb = CircuitBreaker(name="test", failure_threshold=2, recovery_timeout=0.1)
        await cb.record_failure()
        await cb.record_failure()
        assert cb.state == CircuitState.OPEN
        await asyncio.sleep(0.15)
        assert cb.can_execute()
        assert cb.state == CircuitState.HALF_OPEN

    async def test_half_open_closes_on_success(self):
        cb = CircuitBreaker(name="test", failure_threshold=2, recovery_timeout=0.1, half_open_max=1)
        await cb.record_failure()
        await cb.record_failure()
        await asyncio.sleep(0.15)
        cb.can_execute()  # transitions to HALF_OPEN
        await cb.record_success()
        assert cb.state == CircuitState.CLOSED

    async def test_half_open_reopens_on_failure(self):
        cb = CircuitBreaker(name="test", failure_threshold=2, recovery_timeout=0.1)
        await cb.record_failure()
        await cb.record_failure()
        await asyncio.sleep(0.15)
        cb.can_execute()  # transitions to HALF_OPEN
        await cb.record_failure()
        assert cb.state == CircuitState.OPEN

    async def test_is_open_property(self):
        cb = CircuitBreaker(name="test", failure_threshold=1)
        assert not cb.is_open
        await cb.record_failure()
        assert cb.is_open

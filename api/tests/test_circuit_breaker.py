"""
Gabi Hub — Circuit Breaker Tests
Tests for circuit breaker state machine: CLOSED → OPEN → HALF_OPEN → CLOSED.
"""

import time
import pytest

from app.core.circuit_breaker import CircuitBreaker, CircuitState


class TestCircuitBreaker:
    """Test circuit breaker state transitions."""

    def test_starts_closed(self):
        cb = CircuitBreaker(name="test")
        assert cb.state == CircuitState.CLOSED
        assert cb.can_execute()

    def test_opens_after_threshold_failures(self):
        cb = CircuitBreaker(name="test", failure_threshold=3)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitState.CLOSED
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

    def test_open_blocks_execution(self):
        cb = CircuitBreaker(name="test", failure_threshold=2)
        cb.record_failure()
        cb.record_failure()
        assert not cb.can_execute()

    def test_success_resets_failure_count(self):
        cb = CircuitBreaker(name="test", failure_threshold=3)
        cb.record_failure()
        cb.record_failure()
        cb.record_success()
        assert cb.failure_count == 0
        assert cb.state == CircuitState.CLOSED

    def test_transitions_to_half_open_after_timeout(self):
        cb = CircuitBreaker(name="test", failure_threshold=2, recovery_timeout=0.1)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitState.OPEN
        time.sleep(0.15)
        assert cb.can_execute()
        assert cb.state == CircuitState.HALF_OPEN

    def test_half_open_closes_on_success(self):
        cb = CircuitBreaker(name="test", failure_threshold=2, recovery_timeout=0.1, half_open_max=1)
        cb.record_failure()
        cb.record_failure()
        time.sleep(0.15)
        cb.can_execute()  # transitions to HALF_OPEN
        cb.record_success()
        assert cb.state == CircuitState.CLOSED

    def test_half_open_reopens_on_failure(self):
        cb = CircuitBreaker(name="test", failure_threshold=2, recovery_timeout=0.1)
        cb.record_failure()
        cb.record_failure()
        time.sleep(0.15)
        cb.can_execute()  # transitions to HALF_OPEN
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

    def test_is_open_property(self):
        cb = CircuitBreaker(name="test", failure_threshold=1)
        assert not cb.is_open
        cb.record_failure()
        assert cb.is_open

"""
Gabi Hub — Circuit Breaker
Protects against cascading failures from upstream services (Vertex AI, Redis).
States: CLOSED (normal) → OPEN (failing fast) → HALF_OPEN (testing recovery).
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger("gabi.circuit_breaker")


class CircuitState(str, Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Failing fast — not calling upstream
    HALF_OPEN = "half_open" # Testing if upstream recovered


@dataclass
class CircuitBreaker:
    """Simple circuit breaker for upstream service protection."""

    name: str
    failure_threshold: int = 5      # Failures before opening
    recovery_timeout: float = 60.0  # Seconds before trying again
    half_open_max: int = 2          # Successful calls to close circuit

    # Internal state
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: float = 0.0
    _last_state_change: float = field(default_factory=time.time)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def can_execute(self) -> bool:
        """Check if the circuit allows execution."""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                # State transition doesn't strictly need await lock block here as it drops early calls
                self._transition(CircuitState.HALF_OPEN)
                return True
            return False

        # HALF_OPEN — allow limited calls
        return True

    async def record_success(self) -> None:
        """Record a successful call (thread-safe)."""
        async with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.half_open_max:
                    self._transition(CircuitState.CLOSED)
            elif self.state == CircuitState.CLOSED:
                self.failure_count = 0  # Reset on success

    async def record_failure(self) -> None:
        """Record a failed call (thread-safe)."""
        async with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.state == CircuitState.HALF_OPEN:
                self._transition(CircuitState.OPEN)
            elif self.failure_count >= self.failure_threshold:
                self._transition(CircuitState.OPEN)

    def _transition(self, new_state: CircuitState) -> None:
        """Transition to a new state with logging."""
        old_state = self.state
        self.state = new_state
        self._last_state_change = time.time()

        if new_state == CircuitState.CLOSED:
            self.failure_count = 0
            self.success_count = 0
        elif new_state == CircuitState.HALF_OPEN:
            self.success_count = 0

        logger.warning(
            "Circuit breaker '%s': %s → %s (failures=%d)",
            self.name,
            old_state.value,
            new_state.value,
            self.failure_count,
        )

    @property
    def is_open(self) -> bool:
        return self.state == CircuitState.OPEN


# ── Pre-configured circuit breakers ──

vertex_ai_breaker = CircuitBreaker(
    name="vertex_ai",
    failure_threshold=5,
    recovery_timeout=60.0,
)

redis_breaker = CircuitBreaker(
    name="redis",
    failure_threshold=3,
    recovery_timeout=30.0,
)

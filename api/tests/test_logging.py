"""
Gabi Hub — Logging & Middleware Tests
Tests for structured logging, request middleware, and security headers.
"""

import pytest
import json
import logging
from unittest.mock import AsyncMock, MagicMock

from app.core.logging_config import StructuredFormatter, generate_request_id
from app.core.circuit_breaker import CircuitState


class TestStructuredFormatter:
    """Test JSON log formatting."""

    def test_basic_format(self):
        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name="gabi.test", level=logging.INFO, pathname="", lineno=0,
            msg="Test message", args=(), exc_info=None,
        )
        output = formatter.format(record)
        parsed = json.loads(output)
        assert parsed["severity"] == "INFO"
        assert parsed["message"] == "Test message"
        assert parsed["service"] == "gabi-api"
        assert "timestamp" in parsed

    def test_error_with_exception(self):
        formatter = StructuredFormatter()
        try:
            raise ValueError("test error")
        except ValueError:
            import sys
            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name="gabi.test", level=logging.ERROR, pathname="", lineno=0,
            msg="Error occurred", args=(), exc_info=exc_info,
        )
        output = formatter.format(record)
        parsed = json.loads(output)
        assert parsed["severity"] == "ERROR"
        assert parsed["error"]["type"] == "ValueError"
        assert "test error" in parsed["error"]["message"]


class TestGenerateRequestId:
    """Test request ID generation."""

    def test_generates_12_char_hex(self):
        req_id = generate_request_id()
        assert len(req_id) == 12
        int(req_id, 16)  # Should be valid hex

    def test_unique_ids(self):
        ids = {generate_request_id() for _ in range(100)}
        assert len(ids) == 100  # All unique

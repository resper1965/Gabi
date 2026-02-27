"""
Tests for Gabi Hub — Analytics Logger
Tests event logging with mock DB.
"""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch


class TestLogEvent:
    """Test analytics event logging."""

    @pytest.mark.asyncio
    @patch("app.core.analytics.AnalyticsEvent")
    async def test_logs_event_successfully(self, MockEvent):
        """Should create and flush an analytics event."""
        mock_event = MagicMock()
        mock_event.user_id = "test-uid"
        mock_event.module = "ghost"
        mock_event.event_type = "query"
        mock_event.tokens_used = 150
        mock_event.metadata_ = json.dumps({"prompt_length": 42})
        MockEvent.return_value = mock_event

        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()

        from app.core.analytics import log_event
        await log_event(
            db=db,
            user_id="test-uid",
            module="ghost",
            event_type="query",
            tokens_used=150,
            metadata={"prompt_length": 42},
        )

        db.add.assert_called_once()
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.core.analytics.AnalyticsEvent")
    async def test_logs_event_without_metadata(self, MockEvent):
        """Should work with no metadata."""
        mock_event = MagicMock()
        mock_event.metadata_ = None
        mock_event.tokens_used = None
        MockEvent.return_value = mock_event

        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()

        from app.core.analytics import log_event
        await log_event(
            db=db,
            user_id="test-uid",
            module="law",
            event_type="upload",
        )

        event = db.add.call_args[0][0]
        assert event.metadata_ is None
        assert event.tokens_used is None

    @pytest.mark.asyncio
    async def test_swallows_db_errors(self):
        """Should NOT raise on DB errors — analytics should never break main flow."""
        db = AsyncMock()
        db.add = MagicMock(side_effect=Exception("DB connection lost"))

        from app.core.analytics import log_event

        # Should not raise
        await log_event(
            db=db,
            user_id="test-uid",
            module="ghost",
            event_type="query",
        )
        # If we get here without exception, the test passes

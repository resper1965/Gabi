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
    async def test_logs_event_successfully(self):
        """Should create and commit an analytics event."""
        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()

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
        db.commit.assert_called_once()

        # Verify the event object
        event = db.add.call_args[0][0]
        assert event.user_id == "test-uid"
        assert event.module == "ghost"
        assert event.event_type == "query"
        assert event.tokens_used == 150
        assert json.loads(event.metadata_) == {"prompt_length": 42}

    @pytest.mark.asyncio
    async def test_logs_event_without_metadata(self):
        """Should work with no metadata."""
        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()

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
        db.add = MagicMock()
        db.commit = AsyncMock(side_effect=Exception("DB connection lost"))
        db.rollback = AsyncMock()

        from app.core.analytics import log_event

        # Should not raise
        await log_event(
            db=db,
            user_id="test-uid",
            module="ghost",
            event_type="query",
        )

        db.rollback.assert_called_once()

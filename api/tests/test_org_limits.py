"""
Gabi Hub — FinOps Limits Tests
Tests for seat limits, ops limits, session limits, increment_ops, touch_session.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException


class TestCheckSeatLimit:
    """Test seat limit enforcement."""

    @pytest.mark.asyncio
    async def test_seat_limit_raises_429_when_full(self, mock_db):
        """Raises 429 when org reaches max_seats."""
        from app.core.org_limits import check_seat_limit
        mock_db.execute.return_value = AsyncMock(
            first=MagicMock(return_value=MagicMock(max_seats=2, current_seats=2))
        )
        with pytest.raises(HTTPException) as exc_info:
            await check_seat_limit("org-123", mock_db)
        assert exc_info.value.status_code == 429

    @pytest.mark.asyncio
    async def test_seat_limit_passes_when_available(self, mock_db):
        """No error when seats are available."""
        from app.core.org_limits import check_seat_limit
        mock_db.execute.return_value = AsyncMock(
            first=MagicMock(return_value=MagicMock(max_seats=5, current_seats=2))
        )
        # Should not raise
        await check_seat_limit("org-123", mock_db)


class TestCheckOpsLimit:
    """Test monthly operations limit enforcement."""

    @pytest.mark.asyncio
    async def test_ops_limit_raises_429_when_exhausted(self, mock_db):
        """Raises 429 when monthly ops are exhausted."""
        from app.core.org_limits import check_ops_limit
        mock_db.execute.return_value = AsyncMock(
            first=MagicMock(return_value=MagicMock(max_ops_month=100, current_ops=100))
        )
        with pytest.raises(HTTPException) as exc_info:
            await check_ops_limit("org-123", mock_db)
        assert exc_info.value.status_code == 429


class TestCheckSessionLimit:
    """Test concurrent session limit enforcement."""

    @pytest.mark.asyncio
    async def test_session_limit_raises_429_when_full(self, mock_db):
        """Raises 429 when concurrent sessions reach max."""
        from app.core.org_limits import check_session_limit
        mock_db.execute.return_value = AsyncMock(
            first=MagicMock(return_value=MagicMock(max_concurrent=2, active_sessions=2))
        )
        with pytest.raises(HTTPException) as exc_info:
            await check_session_limit("org-123", "user-123", mock_db)
        assert exc_info.value.status_code == 429


class TestIncrementOps:
    """Test ops counter increment."""

    @pytest.mark.asyncio
    async def test_increment_ops_calls_upsert(self, mock_db):
        """increment_ops executes upsert SQL."""
        from app.core.org_limits import increment_ops
        await increment_ops("org-123", mock_db)
        assert mock_db.execute.called
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_increment_ops_skips_null_org(self, mock_db):
        """increment_ops does nothing if org_id is empty."""
        from app.core.org_limits import increment_ops
        await increment_ops("", mock_db)
        mock_db.execute.assert_not_called()


class TestTouchSession:
    """Test session activity tracking."""

    @pytest.mark.asyncio
    async def test_touch_session_calls_upsert(self, mock_db):
        """touch_session executes upsert SQL."""
        from app.core.org_limits import touch_session
        await touch_session("org-123", "user-123", mock_db)
        assert mock_db.execute.called
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_touch_session_skips_null_org(self, mock_db):
        """touch_session does nothing if org_id is empty."""
        from app.core.org_limits import touch_session
        await touch_session("", "user-123", mock_db)
        mock_db.execute.assert_not_called()


class TestDatetimeUsage:
    """Test that deprecated datetime.utcnow is not used."""

    def test_no_utcnow_in_org_limits(self):
        """org_limits.py must not use deprecated datetime.utcnow()."""
        import inspect
        from app.core import org_limits
        source = inspect.getsource(org_limits)
        assert "utcnow" not in source, "datetime.utcnow() is deprecated — use datetime.now(timezone.utc)"

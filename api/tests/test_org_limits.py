"""
Gabi Hub — FinOps Limits Tests
Tests for seat limits, ops limits, session limits, increment_ops, touch_session.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException


def _mock_row(*values):
    """Create a mock Row that supports tuple unpacking (like SQLAlchemy Row)."""
    row = MagicMock()
    row.__iter__ = MagicMock(return_value=iter(values))
    row.__len__ = MagicMock(return_value=len(values))
    row.__getitem__ = MagicMock(side_effect=lambda i: values[i])
    return row


class TestCheckSeatLimit:
    """Test seat limit enforcement."""

    @pytest.mark.asyncio
    async def test_seat_limit_raises_403_when_full(self, mock_db):
        """Raises 403 when org reaches max_seats."""
        from app.core.org_limits import check_seat_limit
        mock_result = MagicMock()
        mock_result.first.return_value = _mock_row(2, 2)  # max_seats=2, current=2
        mock_db.execute.return_value = mock_result
        with pytest.raises(HTTPException) as exc_info:
            await check_seat_limit("org-123", mock_db)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_seat_limit_passes_when_available(self, mock_db):
        """No error when seats are available."""
        from app.core.org_limits import check_seat_limit
        mock_result = MagicMock()
        mock_result.first.return_value = _mock_row(5, 2)  # max_seats=5, current=2
        mock_db.execute.return_value = mock_result
        # Should not raise
        await check_seat_limit("org-123", mock_db)

    @pytest.mark.asyncio
    async def test_seat_limit_unlimited(self, mock_db):
        """max_seats=0 means unlimited — never raises."""
        from app.core.org_limits import check_seat_limit
        mock_result = MagicMock()
        mock_result.first.return_value = _mock_row(0, 100)  # unlimited
        mock_db.execute.return_value = mock_result
        await check_seat_limit("org-123", mock_db)

    @pytest.mark.asyncio
    async def test_seat_limit_org_not_found(self, mock_db):
        """Raises 404 when org is not found."""
        from app.core.org_limits import check_seat_limit
        mock_result = MagicMock()
        mock_result.first.return_value = None
        mock_db.execute.return_value = mock_result
        with pytest.raises(HTTPException) as exc_info:
            await check_seat_limit("nonexistent", mock_db)
        assert exc_info.value.status_code == 404


class TestCheckOpsLimit:
    """Test monthly operations limit enforcement."""

    @pytest.mark.asyncio
    async def test_ops_limit_raises_429_when_exhausted(self, mock_db):
        """Raises 429 when monthly ops are exhausted."""
        from app.core.org_limits import check_ops_limit
        mock_result = MagicMock()
        mock_result.first.return_value = _mock_row(100, 100)  # max=100, current=100
        mock_db.execute.return_value = mock_result
        with pytest.raises(HTTPException) as exc_info:
            await check_ops_limit("org-123", mock_db)
        assert exc_info.value.status_code == 429

    @pytest.mark.asyncio
    async def test_ops_limit_passes_when_available(self, mock_db):
        """No error when ops are available."""
        from app.core.org_limits import check_ops_limit
        mock_result = MagicMock()
        mock_result.first.return_value = _mock_row(1000, 50)  # max=1000, current=50
        mock_db.execute.return_value = mock_result
        await check_ops_limit("org-123", mock_db)

    @pytest.mark.asyncio
    async def test_ops_limit_no_org_skips(self, mock_db):
        """Skips check if org not found (backward compat)."""
        from app.core.org_limits import check_ops_limit
        mock_result = MagicMock()
        mock_result.first.return_value = None
        mock_db.execute.return_value = mock_result
        await check_ops_limit("org-123", mock_db)  # should not raise


class TestCheckConcurrentLimit:
    """Test concurrent session limit enforcement."""

    @pytest.mark.asyncio
    async def test_concurrent_limit_raises_429_when_full(self, mock_db):
        """Raises 429 when concurrent sessions reach max."""
        from app.core.org_limits import check_concurrent_limit
        mock_result = MagicMock()
        mock_result.first.return_value = _mock_row(2, 2)  # max=2, active=2
        mock_db.execute.return_value = mock_result
        with pytest.raises(HTTPException) as exc_info:
            await check_concurrent_limit("org-123", "user-123", mock_db)
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

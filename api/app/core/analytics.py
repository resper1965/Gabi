"""
Gabi Hub — Lightweight Analytics Logger
Logs usage events to the database for dashboarding.
"""

import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.analytics import AnalyticsEvent

logger = logging.getLogger("gabi.analytics")


async def log_event(
    db: AsyncSession,
    user_id: str,
    module: str,
    event_type: str,
    tokens_used: int | None = None,
    metadata: dict | None = None,
) -> None:
    """Log a usage event to the analytics table.
    
    Non-blocking: swallows exceptions to avoid disrupting main flow.
    """
    try:
        event = AnalyticsEvent(
            user_id=user_id,
            module=module,
            event_type=event_type,
            tokens_used=tokens_used,
            metadata_=json.dumps(metadata) if metadata else None,
        )
        db.add(event)
        await db.flush()  # flush only — let the router's commit handle persistence
    except Exception as e:
        logger.warning("Failed to log analytics event: %s", e)

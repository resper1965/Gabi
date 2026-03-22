"""
Gabi Hub — Data Retention Policy
Automated cleanup of expired data based on retention rules.
Run as a scheduled Cloud Run Job or via admin endpoint.
"""

import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


logger = logging.getLogger("gabi.retention")

# ── Retention Rules ──
RETENTION_RULES = {
    "analytics_events": {
        "max_age_days": 365,
        "date_column": "created_at",
        "description": "Analytics events older than 1 year",
    },
    "chat_messages": {
        "max_age_days": 180,
        "date_column": "created_at",
        "description": "Chat messages in sessions inactive >6 months",
        "cascade_via": "chat_sessions",
    },
}


async def run_retention(db: AsyncSession, dry_run: bool = True) -> dict:
    """
    Execute data retention cleanup.

    Args:
        db: Async database session
        dry_run: If True, only report what would be deleted

    Returns:
        Dict with per-table deletion counts
    """
    now = datetime.now(timezone.utc)
    results = {}

    for table_name, rule in RETENTION_RULES.items():
        cutoff = now - timedelta(days=rule["max_age_days"])
        date_col = rule["date_column"]

        try:
            # Count affected rows
            count_result = await db.execute(
                text(f"SELECT COUNT(*) FROM {table_name} WHERE {date_col} < :cutoff"),
                {"cutoff": cutoff},
            )
            count = count_result.scalar() or 0

            if dry_run:
                results[table_name] = {
                    "would_delete": count,
                    "cutoff_date": cutoff.isoformat(),
                    "rule": rule["description"],
                }
                logger.info(
                    "DRY RUN: %s — would delete %d rows older than %s",
                    table_name, count, cutoff.date(),
                )
            else:
                if count > 0:
                    # Handle cascading deletes
                    if "cascade_via" in rule and table_name == "chat_messages":
                        # Find inactive sessions first
                        await db.execute(text(f"""
                            DELETE FROM {table_name} WHERE session_id IN (
                                SELECT id FROM chat_sessions WHERE updated_at < :cutoff
                            )
                        """), {"cutoff": cutoff})
                        await db.execute(text(
                            "DELETE FROM chat_sessions WHERE updated_at < :cutoff"
                        ), {"cutoff": cutoff})
                    else:
                        await db.execute(
                            text(f"DELETE FROM {table_name} WHERE {date_col} < :cutoff"),
                            {"cutoff": cutoff},
                        )

                    results[table_name] = {
                        "deleted": count,
                        "cutoff_date": cutoff.isoformat(),
                    }
                    logger.warning(
                        "RETENTION: %s — deleted %d rows older than %s",
                        table_name, count, cutoff.date(),
                    )
                else:
                    results[table_name] = {"deleted": 0}

        except Exception as e:
            results[table_name] = {"error": str(e)}
            logger.error("Retention failed for %s: %s", table_name, e)

    if not dry_run:
        await db.commit()

    return results

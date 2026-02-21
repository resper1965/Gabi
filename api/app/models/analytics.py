"""Analytics Event model for usage tracking."""

import uuid
from sqlalchemy import Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    module = Column(String(50), nullable=False, index=True)     # ghost, law, ntalk, insightcare
    event_type = Column(String(50), nullable=False, index=True)  # query, upload, extract_style, etc.
    tokens_used = Column(Integer, nullable=True)
    metadata_ = Column("metadata", Text, nullable=True)  # JSON: extra details
    created_at = Column(DateTime, server_default=func.now(), index=True)

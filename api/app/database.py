"""
Gabi Hub — Database Configuration
Async SQLAlchemy engine with enterprise-grade pool settings.
"""

import logging

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession

from app.config import get_settings

logger = logging.getLogger("gabi.database")
settings = get_settings()

# Auto-convert sync driver to async (Secret Manager stores postgresql://)
_db_url = settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _db_url,
    pool_size=20,
    max_overflow=30,
    pool_timeout=30,          # Max seconds to wait for a connection
    pool_recycle=1800,        # Recycle connections after 30min (Cloud SQL proxy compat)
    pool_pre_ping=True,       # Test connection health before using
    echo=settings.sql_echo,   # SQL debug logging (off in prod)
)

async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    """Dependency: yields an async database session."""
    async with async_session() as session:
        yield session

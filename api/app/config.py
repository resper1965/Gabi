from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Gabi Hub — Unified API Configuration."""

    # PostgreSQL (single brain database for all modules)
    database_url: str = "postgresql+asyncpg://localhost:5432/gabi"

    # Google Cloud
    gcp_project_id: str = ""
    vertex_ai_location: str = "us-central1"

    # Model routing per module
    model_ghost: str = "gemini-2.0-flash-001"   # Creativity + low latency
    model_law: str = "gemini-1.5-pro"            # Long context + precision
    model_ntalk: str = "gemini-2.0-flash-001"   # SQL generation
    
    # LLM Settings
    chat_history_limit: int = 6

    # Firebase Auth
    firebase_project_id: str = ""
    firebase_admin_service_account: str = ""  # JSON string or path

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # nTalkSQL specific
    max_query_rows: int = 1000
    query_timeout_seconds: int = 30

    # Authorization
    admin_emails: list[str] = ["resper@ness.com.br", "resper@bekaa.eu", "rsarlerno@ness.com.br", "myoshida@ness.com.br", "dajzen@ness.com.br"]
    auto_approve_domains: list[str] = ["ness.com.br", "bekaa.eu"]

    # Redis (rate limiting)
    redis_url: str = ""

    # Observability
    log_level: str = "INFO"
    sql_echo: bool = False  # Set True for SQL debug logging
    enable_docs: bool = False  # Set True for staging to enable /docs

    model_config = {"env_file": ".env", "env_prefix": "GABI_", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

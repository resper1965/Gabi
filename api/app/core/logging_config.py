"""
Gabi Hub — Structured Logging Configuration
Enterprise-grade JSON logging with request correlation.
"""

import logging
import sys
import uuid
from contextvars import ContextVar

# ── Request context for correlation ──
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
user_id_ctx: ContextVar[str] = ContextVar("user_id", default="")
module_ctx: ContextVar[str] = ContextVar("module", default="")


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging in Cloud Logging."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        from datetime import datetime, timezone

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "service": "gabi-api",
        }

        # Add request context if available
        req_id = request_id_ctx.get("")
        if req_id:
            log_entry["trace_id"] = req_id

        uid = user_id_ctx.get("")
        if uid:
            log_entry["user_id"] = uid

        mod = module_ctx.get("")
        if mod:
            log_entry["module"] = mod

        # Add extra fields from record
        if hasattr(record, "duration_ms"):
            log_entry["duration_ms"] = record.duration_ms
        if hasattr(record, "status_code"):
            log_entry["status_code"] = record.status_code
        if hasattr(record, "method"):
            log_entry["method"] = record.method
        if hasattr(record, "path"):
            log_entry["path"] = record.path
        if hasattr(record, "extra_data"):
            log_entry.update(record.extra_data)

        # Exception info
        if record.exc_info and record.exc_info[1]:
            log_entry["error"] = {
                "type": type(record.exc_info[1]).__name__,
                "message": str(record.exc_info[1]),
            }

        return json.dumps(log_entry, ensure_ascii=False, default=str)


def generate_request_id() -> str:
    """Generate a short request ID for correlation."""
    return uuid.uuid4().hex[:12]


def setup_logging(level: str = "INFO") -> None:
    """Configure structured logging for the entire application."""
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    for handler in root.handlers[:]:
        root.removeHandler(handler)

    # Add structured handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    root.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("google").setLevel(logging.WARNING)
    logging.getLogger("grpc").setLevel(logging.WARNING)

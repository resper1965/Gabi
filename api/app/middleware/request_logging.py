"""
Gabi Hub — Request Logging Middleware
Logs every HTTP request with method, path, status, duration, and user context.
Injects X-Request-ID for end-to-end correlation.
"""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging_config import (
    generate_request_id,
    request_id_ctx,
    user_id_ctx,
)

logger = logging.getLogger("gabi.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs all requests with structured context."""

    SKIP_PATHS = {"/health", "/health/ready", "/favicon.ico"}

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip health check noise
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Generate or reuse request ID
        req_id = request.headers.get("X-Request-ID") or generate_request_id()
        request_id_ctx.set(req_id)

        # Extract user hint from Authorization header (without full verification)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer ") and len(auth_header) > 20:
            user_id_ctx.set("authenticated")  # Will be refined by auth middleware
        else:
            user_id_ctx.set("anonymous")

        start = time.perf_counter()
        status_code = 500  # Default if exception occurs

        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = req_id
            return response
        except Exception:
            logger.exception("Unhandled exception in request pipeline")
            raise
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)

            # Log with extra structured fields
            log_data = {
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else "unknown",
            }

            # Choose log level based on status
            if status_code >= 500:
                level = logging.ERROR
            elif status_code >= 400:
                level = logging.WARNING
            else:
                level = logging.INFO

            record = logger.makeRecord(
                name=logger.name,
                level=level,
                fn="",
                lno=0,
                msg=f"{request.method} {request.url.path} → {status_code} ({duration_ms}ms)",
                args=(),
                exc_info=None,
            )
            record.duration_ms = duration_ms  # type: ignore
            record.status_code = status_code  # type: ignore
            record.method = request.method  # type: ignore
            record.path = request.url.path  # type: ignore
            record.extra_data = {"client_ip": log_data["client_ip"]}  # type: ignore
            logger.handle(record)

            # Reset context
            request_id_ctx.set("")
            user_id_ctx.set("")

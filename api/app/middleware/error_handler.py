"""
Gabi Hub — Global Error Handler Middleware
Catches unhandled exceptions, sanitizes responses, and logs structured errors.
"""

import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.logging_config import request_id_ctx

logger = logging.getLogger("gabi.error")


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Global exception handler — sanitizes errors and logs them."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            req_id = request_id_ctx.get("")

            # Log full error with context
            logger.error(
                "Unhandled exception: %s",
                str(exc),
                exc_info=True,
                extra={
                    "path": request.url.path,
                    "method": request.method,
                    "trace_id": req_id,
                },
            )

            # Return sanitized error (never expose internals)
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "Erro interno do servidor. Tente novamente.",
                    "trace_id": req_id,
                },
                headers={"X-Request-ID": req_id} if req_id else {},
            )

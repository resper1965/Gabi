"""FinOps Middleware — Auto-flush token usage after each request."""

import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse

logger = logging.getLogger("gabi.finops")


class FinOpsMiddleware(BaseHTTPMiddleware):
    """Flush per-request token usage to the database after the response completes.

    For regular responses, flush happens immediately after call_next().
    For StreamingResponse (SSE/stream endpoints), flush happens AFTER the
    stream body is fully consumed — otherwise tokens accumulated during
    streaming would be lost.
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        user = getattr(request.state, "user", None)
        if not user or not hasattr(user, "uid"):
            return response

        # For StreamingResponse, wrap the body to flush after stream ends
        if isinstance(response, StreamingResponse):
            original_body = response.body_iterator

            async def _flush_after_stream():
                try:
                    async for chunk in original_body:
                        yield chunk
                finally:
                    await self._flush(user)

            response.body_iterator = _flush_after_stream()
            return response

        # Regular response — flush immediately
        await self._flush(user)
        return response

    @staticmethod
    async def _flush(user) -> None:
        try:
            from app.core.ai import flush_token_usage
            await flush_token_usage(
                user_id=user.uid,
                org_id=getattr(user, "org_id", None),
            )
        except Exception as e:
            logger.debug("FinOps flush skipped: %s", e)


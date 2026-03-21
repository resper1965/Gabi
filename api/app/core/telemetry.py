"""
Gabi Hub — Telemetry (OpenTelemetry + Cloud Trace)
Distributed tracing and custom metrics for production observability.
"""

import logging
from contextlib import contextmanager

logger = logging.getLogger("gabi.telemetry")

_tracer = None
_initialized = False


def init_telemetry(service_name: str = "gabi-api") -> None:
    """Initialize OpenTelemetry with Cloud Trace exporter.

    Safe to call multiple times — only initializes once.
    Falls back gracefully if dependencies are missing.
    """
    global _tracer, _initialized
    if _initialized:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource.create({"service.name": service_name})
        provider = TracerProvider(resource=resource)

        # Try Cloud Trace exporter (production)
        try:
            from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
            exporter = CloudTraceSpanExporter()
            provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info("Telemetry: Cloud Trace exporter initialized")
        except ImportError:
            logger.info("Telemetry: Cloud Trace exporter not available, traces will be local only")

        trace.set_tracer_provider(provider)
        _tracer = trace.get_tracer("gabi")

        # Auto-instrument FastAPI (every route gets a span)
        try:
            from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
            FastAPIInstrumentor.instrument()
            logger.info("Telemetry: FastAPI auto-instrumentation enabled")
        except ImportError:
            logger.info("Telemetry: FastAPI instrumentor not available")

        # Auto-instrument SQLAlchemy (DB queries get spans)
        try:
            from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
            SQLAlchemyInstrumentor().instrument()
            logger.info("Telemetry: SQLAlchemy auto-instrumentation enabled")
        except ImportError:
            pass

        # Auto-instrument httpx (external API calls get spans)
        try:
            from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
            HTTPXClientInstrumentor().instrument()
            logger.info("Telemetry: HTTPX auto-instrumentation enabled")
        except ImportError:
            pass

        _initialized = True
        logger.info("OpenTelemetry initialized for service: %s", service_name)

    except ImportError:
        logger.info("Telemetry: OpenTelemetry not installed, tracing disabled")
        _initialized = True  # Don't retry


def get_tracer():
    """Get the global tracer (or a no-op tracer if not initialized)."""
    global _tracer
    if _tracer is None:
        try:
            from opentelemetry import trace
            return trace.get_tracer("gabi")
        except ImportError:
            return None
    return _tracer


@contextmanager
def trace_span(name: str, attributes: dict | None = None):
    """Context manager for creating a traced span.

    Usage:
        with trace_span("llm.generate", {"model": "gemini-2.5-pro"}):
            result = await generate(...)
    """
    tracer = get_tracer()
    if tracer is None:
        yield None
        return

    with tracer.start_as_current_span(name) as span:
        if attributes:
            for k, v in attributes.items():
                span.set_attribute(k, str(v))
        yield span

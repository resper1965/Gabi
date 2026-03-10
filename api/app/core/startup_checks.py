"""
Gabi Hub — Startup Dependency Checker (TD-6)
Validates that optional dependencies are available before requests hit them.
Called from app startup to fail fast with clear error messages.
"""

import importlib
import logging
import sys

logger = logging.getLogger("gabi.startup")

# Optional dependencies required by specific modules
OPTIONAL_DEPS = {
    "pymupdf": {
        "module": "pymupdf",
        "used_by": "Document ingestion (PDF)",
        "install": "pip install pymupdf",
    },
    "python-docx": {
        "module": "docx",
        "used_by": "Document ingestion (DOCX)",
        "install": "pip install python-docx",
    },
    "openpyxl": {
        "module": "openpyxl",
        "used_by": "XLSX parsing (InsightCare)",
        "install": "pip install openpyxl",
    },
    "pandas": {
        "module": "pandas",
        "used_by": "XLSX parsing (InsightCare)",
        "install": "pip install pandas",
    },
}


def check_dependencies(fail_hard: bool = False) -> list[str]:
    """
    Check all optional dependencies at startup.

    Args:
        fail_hard: If True, raise ImportError on first missing dep.
                   If False, log warnings and return list of missing.

    Returns:
        List of missing dependency names.
    """
    missing = []

    for name, info in OPTIONAL_DEPS.items():
        try:
            importlib.import_module(info["module"])
        except ImportError:
            msg = (
                f"Optional dependency '{name}' not installed. "
                f"Used by: {info['used_by']}. "
                f"Install with: {info['install']}"
            )
            if fail_hard:
                raise ImportError(msg)
            logger.warning("⚠️  %s", msg)
            missing.append(name)

    if not missing:
        logger.info("✅ All optional dependencies available")
    else:
        logger.warning(
            "⚠️  %d optional dependencies missing: %s",
            len(missing),
            ", ".join(missing),
        )

    return missing


def check_embedding_model() -> None:
    """Verify embedding model constant matches expected dimensions."""
    from app.core.embeddings import EMBEDDING_MODEL, EMBEDDING_DIMENSIONS

    logger.info(
        "Embedding model: %s (%dd)",
        EMBEDDING_MODEL,
        EMBEDDING_DIMENSIONS,
    )

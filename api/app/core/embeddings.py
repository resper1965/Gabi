"""
Gabi Hub — Embedding Service (Shared)
Uses Vertex AI text-embedding (server-side). No local model, no PyTorch.
LRU cache to avoid re-computing identical queries.
"""

import hashlib
from functools import lru_cache

import numpy as np

_model = None


def _get_model():
    """Lazy-load Vertex AI model to avoid import-time failures in testing."""
    global _model
    if _model is None:
        from vertexai.language_models import TextEmbeddingModel
        _model = TextEmbeddingModel.from_pretrained("text-multilingual-embedding-002")
    return _model


@lru_cache(maxsize=2048)
def _embed_cached(text_hash: str, text: str) -> tuple:
    """Cache embedding results by text hash. Returns tuple for hashability."""
    result = _get_model().get_embeddings([text])
    return tuple(result[0].values)


def embed(text: str) -> list[float]:
    """Generate embedding for a single text (cached)."""
    text_hash = hashlib.sha256(text.encode()).hexdigest()
    return list(_embed_cached(text_hash, text))


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Batch embedding generation via Vertex AI (max 250 per call)."""
    if not texts:
        return []
    results = []
    # Vertex AI supports up to 250 texts per batch
    for i in range(0, len(texts), 250):
        batch = texts[i : i + 250]
        embeddings = _get_model().get_embeddings(batch)
        results.extend([e.values for e in embeddings])
    return results


def similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity."""
    a_np, b_np = np.array(a), np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))

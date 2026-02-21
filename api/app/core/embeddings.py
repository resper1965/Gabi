"""
Gabi Hub — Embedding Service (Shared)
Open-source BGE-m3 running locally. Cost: $0.
Uses LRU cache to avoid re-computing identical queries.
"""

import hashlib
from functools import lru_cache

import numpy as np

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("BAAI/bge-m3")
    return _model


@lru_cache(maxsize=2048)
def _embed_cached(text_hash: str, text: str) -> tuple:
    """Cache embedding results by text hash. Returns tuple for hashability."""
    return tuple(_get_model().encode(text, normalize_embeddings=True).tolist())


def embed(text: str) -> list[float]:
    """Generate embedding for a single text (cached)."""
    text_hash = hashlib.md5(text.encode()).hexdigest()
    return list(_embed_cached(text_hash, text))


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Batch embedding generation (uses cache per-item)."""
    return [embed(t) for t in texts]


def similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity."""
    a_np, b_np = np.array(a), np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))

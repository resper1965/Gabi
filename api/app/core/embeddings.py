"""
Gabi Hub — Embedding Service (Shared)
Open-source BGE-m3 running locally. Cost: $0.
Used by all modules for vector search.
"""

import numpy as np

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("BAAI/bge-m3")
    return _model


def embed(text: str) -> list[float]:
    """Generate embedding for a single text."""
    return _get_model().encode(text, normalize_embeddings=True).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Batch embedding generation."""
    return [e.tolist() for e in _get_model().encode(texts, normalize_embeddings=True, batch_size=32)]


def similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity."""
    a_np, b_np = np.array(a), np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))

"""
Gabi Hub — RAG Evaluation Framework (TD-7)
Provides a harness for measuring precision, recall, and MRR of the RAG pipeline.

Usage:
    python -m tests.rag_eval_harness

The evaluation dataset is defined in tests/rag_eval_dataset.json.
"""

import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

logger = logging.getLogger("gabi.rag_eval")

DATASET_PATH = Path(__file__).parent / "rag_eval_dataset.json"
RESULTS_PATH = Path(__file__).parent / "rag_eval_results.json"


@dataclass
class EvalCase:
    """A single RAG evaluation case."""
    query: str
    expected_doc_titles: list[str]      # Titles of docs that SHOULD be retrieved
    expected_content_keywords: list[str]  # Keywords that MUST appear in retrieved content
    module: str = "law"
    profile_id: Optional[str] = None


@dataclass
class EvalResult:
    """Result of evaluating a single case."""
    query: str
    precision: float       # Retrieved relevant / Total retrieved
    recall: float          # Retrieved relevant / Total relevant
    mrr: float            # Mean reciprocal rank of first relevant result
    retrieved_titles: list[str]
    expected_titles: list[str]
    keyword_hits: int
    keyword_total: int
    duration_ms: float


def create_sample_dataset():
    """Create a sample evaluation dataset if none exists."""
    if DATASET_PATH.exists():
        logger.info("Dataset already exists at %s", DATASET_PATH)
        return

    sample = [
        {
            "query": "Quais são os direitos fundamentais da LGPD?",
            "expected_doc_titles": ["LGPD", "Lei 13.709"],
            "expected_content_keywords": ["dados pessoais", "tratamento", "consentimento"],
            "module": "law",
        },
        {
            "query": "O que diz o Art. 5 da Constituição Federal?",
            "expected_doc_titles": ["Constituição Federal"],
            "expected_content_keywords": ["iguais perante a lei", "direitos", "garantias"],
            "module": "law",
        },
        {
            "query": "Quais as exigências da Resolução BCB 355?",
            "expected_doc_titles": ["Resolução BCB 355", "BACEN"],
            "expected_content_keywords": ["compliance", "regulação", "financeiro"],
            "module": "law",
        },
    ]
    DATASET_PATH.write_text(json.dumps(sample, ensure_ascii=False, indent=2))
    logger.info("Created sample evaluation dataset at %s", DATASET_PATH)


def load_dataset() -> list[EvalCase]:
    """Load the evaluation dataset."""
    if not DATASET_PATH.exists():
        create_sample_dataset()
    data = json.loads(DATASET_PATH.read_text())
    return [EvalCase(**d) for d in data]


def compute_metrics(
    retrieved_chunks: list[dict],
    expected_titles: list[str],
    expected_keywords: list[str],
) -> tuple[float, float, float, int]:
    """
    Compute precision, recall, MRR, and keyword hit count.

    Args:
        retrieved_chunks: RAG results with 'title' and 'content' keys
        expected_titles: Document titles that should appear
        expected_keywords: Keywords that should appear in content

    Returns:
        (precision, recall, mrr, keyword_hits)
    """
    retrieved_titles = [c.get("title", "").lower() for c in retrieved_chunks]
    expected_lower = [t.lower() for t in expected_titles]

    # Precision: fraction of retrieved that are relevant
    relevant_retrieved = sum(
        1 for t in retrieved_titles
        if any(exp in t or t in exp for exp in expected_lower)
    )
    precision = relevant_retrieved / len(retrieved_titles) if retrieved_titles else 0

    # Recall: fraction of expected that were retrieved
    found_expected = sum(
        1 for exp in expected_lower
        if any(exp in t or t in exp for t in retrieved_titles)
    )
    recall = found_expected / len(expected_lower) if expected_lower else 0

    # MRR: reciprocal rank of first relevant result
    mrr = 0.0
    for rank, t in enumerate(retrieved_titles, 1):
        if any(exp in t or t in exp for exp in expected_lower):
            mrr = 1.0 / rank
            break

    # Keyword hits
    all_content = " ".join(c.get("content", "").lower() for c in retrieved_chunks)
    keyword_hits = sum(1 for kw in expected_keywords if kw.lower() in all_content)

    return precision, recall, mrr, keyword_hits


async def run_evaluation(db_session=None) -> list[EvalResult]:
    """
    Run the full evaluation suite.
    Requires a database session for RAG retrieval.
    """
    from app.core.dynamic_rag import retrieve_if_needed

    cases = load_dataset()
    results = []

    for case in cases:
        t0 = time.perf_counter()

        try:
            chunks, _ = await retrieve_if_needed(
                question=case.query,
                chat_history=None,
                db=db_session,
                module=case.module,
                user_id="eval_user",
                profile_id=case.profile_id,
                limit=5,
            )
        except Exception as e:
            logger.error("Eval case failed: %s — %s", case.query[:50], e)
            chunks = []

        duration_ms = (time.perf_counter() - t0) * 1000

        precision, recall, mrr, keyword_hits = compute_metrics(
            chunks, case.expected_doc_titles, case.expected_content_keywords,
        )

        results.append(EvalResult(
            query=case.query,
            precision=round(precision, 3),
            recall=round(recall, 3),
            mrr=round(mrr, 3),
            retrieved_titles=[c.get("title", "") for c in chunks],
            expected_titles=case.expected_doc_titles,
            keyword_hits=keyword_hits,
            keyword_total=len(case.expected_content_keywords),
            duration_ms=round(duration_ms, 1),
        ))

    # Save results
    RESULTS_PATH.write_text(
        json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2)
    )

    # Print summary
    avg_precision = sum(r.precision for r in results) / len(results)
    avg_recall = sum(r.recall for r in results) / len(results)
    avg_mrr = sum(r.mrr for r in results) / len(results)
    avg_kw = sum(r.keyword_hits / r.keyword_total for r in results if r.keyword_total) / len(results) * 100

    logger.info(
        "RAG Eval: %d cases | P=%.1f%% R=%.1f%% MRR=%.3f KW=%.0f%% | Results: %s",
        len(results), avg_precision * 100, avg_recall * 100, avg_mrr, avg_kw, RESULTS_PATH,
    )

    return results


if __name__ == "__main__":
    # Standalone usage: python -m tests.rag_eval_harness
    print("RAG Evaluation Harness")
    print("=" * 50)
    print(f"Dataset: {DATASET_PATH}")
    print()

    if not DATASET_PATH.exists():
        create_sample_dataset()
        print(f"Created sample dataset at {DATASET_PATH}")
        print("Edit this file with your ground truth cases before running evaluation.")
    else:
        print(f"Dataset found with {len(load_dataset())} cases.")
        print()
        print("To run evaluation, call run_evaluation() with a database session.")
        print("Example:")
        print("  from tests.rag_eval_harness import run_evaluation")
        print("  results = await run_evaluation(db_session)")

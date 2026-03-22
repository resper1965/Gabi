"""
Document Auto-Classifier — Gemini Flash–based classification of legal documents.

Given raw text from an uploaded document, classifies:
  - tipo: petition, opinion, contract, policy, precedent, law, regulation, gold_piece
  - area_direito: e.g. tributário, trabalhista, civil, penal, LGPD, seguros, mercado de capitais
  - tema: short thematic summary (e.g. "Cláusula de limitação de responsabilidade")
  - partes: parties involved (JSON list)
  - resumo: executive summary (2-3 sentences)
"""

import json
import logging

from app.core.ai import generate, safe_parse_json
from app.core.telemetry import trace_span

logger = logging.getLogger("gabi.doc_classifier")

CLASSIFY_PROMPT = """Analise o trecho inicial deste documento jurídico e classifique-o.

RETORNE EXCLUSIVAMENTE JSON válido:
{{
  "tipo": "petition|opinion|contract|policy|precedent|law|regulation|gold_piece",
  "area_direito": "tributário|trabalhista|civil|penal|empresarial|consumidor|ambiental|LGPD|seguros|mercado_de_capitais|previdenciário|administrativo|outro",
  "tema": "descrição curta do tema central (máx 100 chars)",
  "partes": ["Parte A", "Parte B"],
  "resumo": "resumo executivo em 2-3 frases"
}}

Regras:
- tipo: classifique pelo formato do documento, não pelo conteúdo
- area_direito: identifique a área predominante; se mais de uma, escolha a principal
- partes: extraia nomes de pessoas jurídicas ou físicas mencionadas como partes; [] se não identificar
- resumo: foque no objeto e conclusão, não em detalhes processuais

TEXTO DO DOCUMENTO (primeiros 4000 caracteres):
{text}"""

# Valid types matching LegalDocType in law/router.py
VALID_TYPES = {
    "petition", "opinion", "contract", "policy",
    "precedent", "law", "regulation", "gold_piece",
}


async def classify_document(text: str, fallback_type: str = "law") -> dict:
    """
    Classify a legal document using Gemini Flash.

    Args:
        text: Raw text of the document.
        fallback_type: Type to use if classification fails.

    Returns:
        dict with keys: tipo, area_direito, tema, partes, resumo
    """
    with trace_span("document.classify", {"fallback_type": fallback_type}) as span:
        # Use first 4000 chars for classification (enough for most docs)
        snippet = text[:4000] if text else ""
        if span: span.set_attribute("snippet_length", len(snippet))

        if len(snippet.strip()) < 50:
            logger.warning("Document too short for classification (%d chars)", len(snippet))
            if span: span.set_attribute("reason", "too_short")
            return _fallback(fallback_type)

        prompt = CLASSIFY_PROMPT.format(text=snippet)

        try:
            raw = await generate(module="flash", prompt=prompt)  # Flash (cheapest)
            result = safe_parse_json(raw)

            # Validate tipo
            tipo = result.get("tipo", fallback_type)
            if tipo not in VALID_TYPES:
                tipo = fallback_type

            # Validate partes
            partes = result.get("partes", [])
            if not isinstance(partes, list):
                partes = []

            if span:
                span.set_attribute("classification_tipo", tipo)
                span.set_attribute("classification_area", result.get("area_direito", "outro"))

            return {
                "tipo": tipo,
                "area_direito": result.get("area_direito", "outro"),
                "tema": (result.get("tema") or "")[:255],
                "partes": json.dumps(partes, ensure_ascii=False),
                "resumo": result.get("resumo", ""),
            }
        except Exception as e:
            logger.warning("Document classification failed: %s", e)
            if span: span.set_attribute("error", str(e))
            return _fallback(fallback_type)


def _fallback(tipo: str) -> dict:
    return {
        "tipo": tipo,
        "area_direito": None,
        "tema": None,
        "partes": None,
        "resumo": None,
    }

"""
CVM Historical Ingestion — Corpus Completo
Raspa o site conteudo.cvm.gov.br para ingerir todo o acervo normativo da CVM:
  • Resoluções CVM (RCVM) — normas vigentes pós-2021
  • Instruções CVM (ICVM) — normas legadas, muitas ainda vigentes

Fluxo por documento:
  1. Busca lista de normas no site da CVM
  2. Baixa o texto integral (HTML ou PDF)
  3. Extrai data de publicação, data de vigência, e referências de revogação
  4. Chunkiza via extract_provisions (structure-aware)
  5. Persiste via DBIngester (hash-based dedup — não reprocessa normas já indexadas)
  6. Marca como Revogada quaisquer normas citadas como revogadas no texto

Uso:
    python scripts/ingest_cvm_historico.py [--tipo resolucoes|instrucoes|todos]
    python scripts/ingest_cvm_historico.py --de 1 --ate 175  # range de Resoluções
"""

import asyncio
import logging
import os
import re
import sys
from datetime import datetime, timezone
from typing import Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import async_session
from app.models.audit import IngestRun, IngestSource
from app.schemas.ingest import RegulatoryAuthority, RegulatoryDocumentSchema
from app.services.bcb_client import BCBClient
from app.services.chunker import extract_provisions
from app.services.db_ingest import DBIngester
from app.services.normalizer import generate_hash, html_to_text, extract_pdf_text
from sqlalchemy import select, update
from app.models.regulatory import RegulatoryDocument

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("gabi.ingest_cvm_historico")

# ── CVM site URLs ────────────────────────────────────────────────────────────
CVM_BASE = "https://conteudo.cvm.gov.br"
CVM_RESOLUCOES_INDEX = f"{CVM_BASE}/legislacao/resolucoes.html"
CVM_INSTRUCOES_INDEX = f"{CVM_BASE}/legislacao/instrucoes.html"

# Patterns for extracting dates and revocation references from normative text
_DATE_RE = re.compile(
    r"(?:publicad[ao]|data\s+de\s+publicação|d\.o\.u\.\s+de|d\.o\.\s+de)"
    r"\s*[:\-]?\s*(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})",
    re.IGNORECASE,
)
_VIGENCIA_RE = re.compile(
    r"(?:entra\s+em\s+vigor|vigência\s+a\s+partir\s+de|produz\s+efeitos\s+a\s+partir\s+de)"
    r"\s*[:\-]?\s*(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})",
    re.IGNORECASE,
)
_REVOGA_ICVM_RE = re.compile(
    r"(?:fica[m]?\s+revogad[ao]s?|revoga[m]?)\s+"
    r"(?:a\s+)?(?:Instrução\s+CVM|ICVM)\s+(?:nº|n\.|n°)?\s*(\d+)",
    re.IGNORECASE,
)
_REVOGA_RCVM_RE = re.compile(
    r"(?:fica[m]?\s+revogad[ao]s?|revoga[m]?)\s+"
    r"(?:a\s+)?(?:Resolução\s+CVM|RCVM)\s+(?:nº|n\.|n°)?\s*(\d+)",
    re.IGNORECASE,
)
_NUMERO_FROM_TITLE_RE = re.compile(r"(\d+)", re.IGNORECASE)


def _parse_date(day: str, month: str, year: str) -> Optional[datetime]:
    try:
        y = int(year)
        if y < 100:
            y += 2000
        return datetime(y, int(month), int(day), tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def _extract_dates(text: str) -> tuple[Optional[datetime], Optional[datetime]]:
    """Returns (data_publicacao, data_vigencia) parsed from normative text."""
    pub_date = None
    vig_date = None

    m = _DATE_RE.search(text)
    if m:
        pub_date = _parse_date(m.group(1), m.group(2), m.group(3))

    m = _VIGENCIA_RE.search(text)
    if m:
        vig_date = _parse_date(m.group(1), m.group(2), m.group(3))

    return pub_date, vig_date


def _extract_revocations(text: str) -> list[tuple[str, str]]:
    """
    Returns list of (tipo_ato, numero) for norms explicitly revoked by this text.
    E.g. [("Instrução CVM", "555"), ("Resolução CVM", "12")]
    """
    revocations = []
    for m in _REVOGA_ICVM_RE.finditer(text):
        revocations.append(("Instrução CVM", m.group(1)))
    for m in _REVOGA_RCVM_RE.finditer(text):
        revocations.append(("Resolução CVM", m.group(1)))
    return revocations


class CVMIndexParser:
    """Parses CVM legislation index pages to enumerate available norms."""

    def __init__(self, http: BCBClient):
        self.http = http

    async def listar_resolucoes(self) -> list[dict]:
        """Returns [{numero, titulo, url, data_publicacao_str}] for all CVM Resoluções."""
        return await self._parse_index(CVM_RESOLUCOES_INDEX, "Resolução CVM", "rcvm")

    async def listar_instrucoes(self) -> list[dict]:
        """Returns [{numero, titulo, url, data_publicacao_str}] for all CVM Instruções."""
        return await self._parse_index(CVM_INSTRUCOES_INDEX, "Instrução CVM", "icvm")

    async def _parse_index(self, index_url: str, tipo_ato: str, prefix: str) -> list[dict]:
        logger.info("Buscando índice: %s", index_url)
        try:
            html = await self.http.fetch_async(index_url)
        except Exception as e:
            logger.error("Falha ao buscar índice %s: %s", index_url, e)
            return []

        norms = []
        # Strategy 1: table rows with links
        row_re = re.compile(
            r'<tr[^>]*>.*?<td[^>]*>.*?'
            r'<a\s+href="([^"]+)"[^>]*>\s*(\d+)\s*</a>.*?'
            r'<td[^>]*>([\d/]+)</td>.*?'
            r'<td[^>]*>(.*?)</td>.*?</tr>',
            re.DOTALL | re.IGNORECASE,
        )
        for m in row_re.finditer(html):
            href, numero, data_str, ementa = m.groups()
            url = href if href.startswith("http") else f"{CVM_BASE}{href}"
            norms.append({
                "numero": numero.strip(),
                "tipo_ato": tipo_ato,
                "titulo": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", ementa)).strip(),
                "url": url,
                "data_publicacao_str": data_str.strip(),
            })

        if norms:
            logger.info("Índice parseado via tabela: %d normas encontradas", len(norms))
            return norms

        # Strategy 2: any <a href> containing the prefix (e.g. /rcvm175.html)
        link_re = re.compile(
            rf'href="([^"]*/{prefix}(\d+)[^"]*\.(?:html?|pdf))"',
            re.IGNORECASE,
        )
        seen: set[str] = set()
        for m in link_re.finditer(html):
            href, numero = m.groups()
            if numero in seen:
                continue
            seen.add(numero)
            url = href if href.startswith("http") else f"{CVM_BASE}{href}"
            norms.append({
                "numero": numero,
                "tipo_ato": tipo_ato,
                "titulo": f"{tipo_ato} nº {numero}",
                "url": url,
                "data_publicacao_str": "",
            })

        logger.info("Índice parseado via links: %d normas encontradas", len(norms))
        return norms


class CVMDocumentFetcher:
    """Downloads and extracts full text from a CVM norm page."""

    def __init__(self, http: BCBClient):
        self.http = http

    async def baixar_texto(self, url: str) -> str:
        """Download full normative text. Handles HTML pages and PDF links."""
        if url.lower().endswith(".pdf"):
            return await self._from_pdf_url(url)

        try:
            html = await self.http.fetch_async(url)
        except Exception as e:
            logger.warning("Falha ao baixar %s: %s", url, e)
            return ""

        # Try to find a PDF link inside the page first (CVM often embeds a PDF)
        pdf_match = re.search(
            r'href="([^"]*\.pdf)"',
            html,
            re.IGNORECASE,
        )
        if pdf_match:
            pdf_href = pdf_match.group(1)
            pdf_url = pdf_href if pdf_href.startswith("http") else f"{CVM_BASE}{pdf_href}"
            pdf_text = await self._from_pdf_url(pdf_url)
            if pdf_text and len(pdf_text.strip()) > 200:
                return pdf_text

        # Extract HTML content — try known CVM content divs first
        for selector_re in [
            r'<div[^>]*class="[^"]*conteudo[^"]*"[^>]*>(.*?)</div\s*>',
            r'<div[^>]*id="conteudo"[^>]*>(.*?)</div\s*>',
            r'<article[^>]*>(.*?)</article>',
            r'<div[^>]*class="[^"]*texto[^"]*"[^>]*>(.*?)</div\s*>',
            r'<main[^>]*>(.*?)</main>',
        ]:
            m = re.search(selector_re, html, re.DOTALL | re.IGNORECASE)
            if m:
                text = html_to_text(m.group(1))
                if len(text.strip()) > 200:
                    return text

        # Fallback: full page text
        return html_to_text(html)

    async def _from_pdf_url(self, pdf_url: str) -> str:
        try:
            pdf_bytes = await self.http.fetch_binary_async(pdf_url)
            return extract_pdf_text(pdf_bytes)
        except Exception as e:
            logger.warning("Falha ao baixar PDF %s: %s", pdf_url, e)
            return ""


async def _mark_revoked(
    db,
    revocations: list[tuple[str, str]],
    revogada_pela: str,
) -> None:
    """
    Mark revoked norms as status='Revogada' and set revogada_por.
    revocations: list of (tipo_ato, numero)
    revogada_pela: human-readable reference to the revoking norm (e.g. "Resolução CVM 175")
    """
    for tipo_ato, numero in revocations:
        try:
            stmt = (
                select(RegulatoryDocument)
                .where(
                    RegulatoryDocument.tipo_ato == tipo_ato,
                    RegulatoryDocument.numero == numero,
                    RegulatoryDocument.authority == RegulatoryAuthority.CVM.value,
                )
            )
            doc = (await db.execute(stmt)).scalars().first()
            if doc and doc.status == "Vigente":
                doc.status = "Revogada"
                doc.revogada_por = revogada_pela
                logger.info("Marcada como Revogada: %s nº %s (por %s)", tipo_ato, numero, revogada_pela)
        except Exception as e:
            logger.warning("Erro ao marcar revogação de %s %s: %s", tipo_ato, numero, e)


async def ingerir_norma(
    run: IngestRun,
    ingester: DBIngester,
    db,
    norm: dict,
    fetcher: CVMDocumentFetcher,
) -> None:
    """Process a single CVM norm: download, parse, store."""
    numero = norm["numero"]
    tipo_ato = norm["tipo_ato"]
    url = norm["url"]
    titulo_base = norm.get("titulo") or f"{tipo_ato} nº {numero}"

    logger.info("[%s nº %s] Processando...", tipo_ato, numero)

    texto = await fetcher.baixar_texto(url)
    if not texto or len(texto.strip()) < 100:
        logger.warning("[%s nº %s] Texto insuficiente, pulando.", tipo_ato, numero)
        run.erros += 1
        return

    content_hash = generate_hash(texto)
    pub_date, vig_date = _extract_dates(texto)

    # Fallback: parse date from index string (DD/MM/YYYY)
    if not pub_date and norm.get("data_publicacao_str"):
        parts = norm["data_publicacao_str"].split("/")
        if len(parts) == 3:
            pub_date = _parse_date(parts[0], parts[1], parts[2])

    revocations = _extract_revocations(texto)
    revogada_pela = f"{tipo_ato} nº {numero}"

    chunks = extract_provisions(texto)
    if not chunks:
        logger.warning("[%s nº %s] Sem chunks extraídos.", tipo_ato, numero)

    schema = RegulatoryDocumentSchema(
        authority=RegulatoryAuthority.CVM,
        tipo_ato=tipo_ato,
        numero=numero,
        data_publicacao=pub_date,
        data_vigencia=vig_date,
        id_fonte=url,
        titulo=titulo_base[:200],
        version_hash=content_hash,
        texto_integral=texto,
        provisions=chunks,
        status="Vigente",
    )

    await ingester.ingest_regulatory_document(run, schema)

    # Mark revoked norms after ingesting the revoking norm
    if revocations:
        await _mark_revoked(db, revocations, revogada_pela)
        await db.commit()

    logger.info(
        "[%s nº %s] OK — chunks=%d revoga=%d",
        tipo_ato, numero, len(chunks), len(revocations),
    )


async def run_cvm_historico(
    tipo: str = "todos",
    de: Optional[int] = None,
    ate: Optional[int] = None,
    concurrency: int = 3,
) -> None:
    """
    Main ingestion entry point.

    Args:
        tipo: 'resolucoes', 'instrucoes', or 'todos'
        de: start norm number (inclusive, for range filtering)
        ate: end norm number (inclusive, for range filtering)
        concurrency: max parallel downloads (be gentle with CVM servers)
    """
    logger.info(
        "Iniciando ingestão histórica CVM | tipo=%s de=%s ate=%s concurrency=%d",
        tipo, de, ate, concurrency,
    )

    http = BCBClient()
    parser = CVMIndexParser(http)
    fetcher = CVMDocumentFetcher(http)

    norms: list[dict] = []
    if tipo in ("resolucoes", "todos"):
        norms += await parser.listar_resolucoes()
    if tipo in ("instrucoes", "todos"):
        norms += await parser.listar_instrucoes()

    # Apply number range filter
    if de is not None or ate is not None:
        filtered = []
        for n in norms:
            try:
                num = int(n["numero"])
                if (de is None or num >= de) and (ate is None or num <= ate):
                    filtered.append(n)
            except (ValueError, TypeError):
                pass
        norms = filtered

    logger.info("Total de normas a processar: %d", len(norms))
    if not norms:
        logger.warning("Nenhuma norma encontrada. Verifique conectividade com conteudo.cvm.gov.br")
        return

    async with async_session() as db:
        run = IngestRun(source=IngestSource.CVM_NORM, started_at=datetime.now(timezone.utc))
        db.add(run)
        await db.commit()
        await db.refresh(run)

        ingester = DBIngester(db)
        semaphore = asyncio.Semaphore(concurrency)

        async def _process(norm: dict) -> None:
            async with semaphore:
                await ingerir_norma(run, ingester, db, norm, fetcher)

        await asyncio.gather(*[_process(n) for n in norms])

        run.finished_at = datetime.now(timezone.utc)
        await db.commit()

    logger.info(
        "Ingestão histórica CVM finalizada | novos=%d atualizados=%d erros=%d",
        run.itens_novos, run.itens_atualizados, run.erros,
    )


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="CVM Historical Ingestion")
    ap.add_argument(
        "--tipo",
        choices=["resolucoes", "instrucoes", "todos"],
        default="todos",
        help="Type of CVM norms to ingest (default: todos)",
    )
    ap.add_argument("--de", type=int, default=None, help="Start norm number (inclusive)")
    ap.add_argument("--ate", type=int, default=None, help="End norm number (inclusive)")
    ap.add_argument(
        "--concurrency",
        type=int,
        default=3,
        help="Max parallel downloads (default: 3, be gentle with CVM servers)",
    )
    args = ap.parse_args()

    asyncio.run(
        run_cvm_historico(
            tipo=args.tipo,
            de=args.de,
            ate=args.ate,
            concurrency=args.concurrency,
        )
    )

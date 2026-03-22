"""
CVM Client — 3-Layer Strategy for CVM Normative Ingestion.

Layer 1: LexML SRU as discovery index (finds CVM resolutions/instructions).
Layer 2: PDF downloader for full text extraction from gov.br/cvm links.
Layer 3: DOU client as fallback for very recent acts not yet in LexML.

The CVM does NOT offer a public API for normative text.
This client combines multiple sources to achieve comprehensive coverage.
"""

import hashlib
import logging
import httpx
from dataclasses import dataclass, field
from typing import List, Optional

from app.services.bcb_client import BCBClient
from app.services.lexml_client import LexMLClient, LexMLDocument

logger = logging.getLogger("gabi.cvm")

# Known CVM PDF base URLs
CVM_PDF_BASES = [
    "https://conteudo.cvm.gov.br",
    "https://www.gov.br/cvm",
]

# CVM-specific search queries for LexML
CVM_LEXML_QUERIES = [
    'autoridade="comissão de valores mobiliários"',
    'autoridade="CVM"',
]

# Document types we care about
CVM_DOC_TYPES = [
    "resolução",
    "instrução",
    "deliberação",
    "parecer de orientação",
]


@dataclass
class CVMNormativo:
    """A CVM normative document with full text."""
    tipo: str               # e.g. "Resolução CVM"
    numero: str             # e.g. "175"
    date: str
    ementa: str
    source_url: str
    full_text: str = ""
    content_hash: str = ""
    urn: str = ""
    subjects: List[str] = field(default_factory=list)


class CVMClient:
    """
    Unified CVM normative client.
    Combines LexML discovery + PDF extraction + DOU fallback.
    """

    def __init__(self):
        self.http = BCBClient()
        self.lexml = LexMLClient()

    async def fetch_normativos(
        self,
        doc_types: Optional[List[str]] = None,
        max_per_type: int = 30,
    ) -> List[CVMNormativo]:
        """
        Discover and fetch CVM normatives using all 3 layers.
        Returns deduplicated list with full text extracted.
        """
        doc_types = doc_types or CVM_DOC_TYPES
        all_normativos: List[CVMNormativo] = []
        seen_hashes: set = set()

        # Layer 1: LexML discovery
        logger.info("CVM Layer 1: Searching LexML for CVM normatives...")
        lexml_docs = await self._search_lexml(doc_types, max_per_type)
        logger.info("CVM Layer 1: Found %d documents in LexML", len(lexml_docs))

        # Layer 2: Download full text (PDF or HTML)
        logger.info("CVM Layer 2: Downloading full text for %d documents...", len(lexml_docs))
        for doc in lexml_docs:
            normativo = await self._lexml_to_normativo(doc)
            if normativo and normativo.content_hash not in seen_hashes:
                seen_hashes.add(normativo.content_hash)
                all_normativos.append(normativo)

        # Layer 3: DOU fallback for recent acts
        logger.info("CVM Layer 3: Checking DOU for recent CVM acts...")
        dou_normativos = await self._fetch_from_dou()
        for norm in dou_normativos:
            if norm.content_hash not in seen_hashes:
                seen_hashes.add(norm.content_hash)
                all_normativos.append(norm)

        logger.info(
            "CVM: Total %d unique normatives collected (LexML=%d, DOU=%d)",
            len(all_normativos),
            len(lexml_docs),
            len(dou_normativos),
        )
        return all_normativos

    async def _search_lexml(
        self,
        doc_types: List[str],
        max_per_type: int,
    ) -> List[LexMLDocument]:
        """Search LexML for CVM normatives across document types."""
        all_docs: List[LexMLDocument] = []

        for doc_type in doc_types:
            for query_base in CVM_LEXML_QUERIES:
                query = f'tipo="{doc_type}" AND {query_base}'
                try:
                    docs = await self.lexml.search(query, max_records=max_per_type)
                    all_docs.extend(docs)
                except (httpx.HTTPError, ValueError) as e:
                    logger.warning("LexML search failed for CVM %s: %s", doc_type, e)

        # Deduplicate by URN
        seen_urns: set = set()
        unique: List[LexMLDocument] = []
        for doc in all_docs:
            if doc.urn and doc.urn not in seen_urns:
                seen_urns.add(doc.urn)
                unique.append(doc)
            elif not doc.urn and doc.title not in seen_urns:
                seen_urns.add(doc.title)
                unique.append(doc)

        return unique

    async def _lexml_to_normativo(self, doc: LexMLDocument) -> Optional[CVMNormativo]:
        """Convert a LexML document to a CVMNormativo with full text."""
        full_text = await self.lexml.fetch_full_text(doc)

        if not full_text or len(full_text.strip()) < 100:
            logger.debug("Skipping LexML doc with insufficient text: %s", doc.urn)
            return None

        content_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()

        # Extract tipo and numero from title or URN
        tipo, numero = self._extract_tipo_numero(doc)

        return CVMNormativo(
            tipo=tipo,
            numero=numero,
            date=doc.date,
            ementa=doc.description,
            source_url=doc.source_url,
            full_text=full_text,
            content_hash=content_hash,
            urn=doc.urn,
            subjects=doc.subjects,
        )

    async def _fetch_from_dou(self) -> List[CVMNormativo]:
        """Layer 3: Use DOU client for very recent CVM publications."""
        try:
            from app.services.dou_client import DOUClient
            dou = DOUClient()
            dou_docs = await dou.buscar_por_orgao("CVM", dias=15, max_results=20)

            normativos: List[CVMNormativo] = []
            for doc in dou_docs:
                if doc.texto:
                    text = doc.texto
                elif doc.url:
                    text = await dou.baixar_texto_integral(doc.url)
                else:
                    continue

                if not text or len(text.strip()) < 100:
                    continue

                content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
                normativos.append(CVMNormativo(
                    tipo=doc.tipo_ato,
                    numero=doc.numero,
                    date=doc.data_publicacao.isoformat() if doc.data_publicacao else "",
                    ementa=doc.titulo,
                    source_url=doc.url,
                    full_text=text,
                    content_hash=content_hash,
                ))

            logger.info("CVM DOU fallback: %d recent acts found", len(normativos))
            return normativos

        except (httpx.HTTPError, ValueError, ImportError) as e:
            logger.warning("CVM DOU fallback failed: %s", e)
            return []

    def _extract_tipo_numero(self, doc: LexMLDocument) -> tuple[str, str]:
        """Extract document type and number from LexML metadata."""
        import re

        # Try from title first
        patterns = [
            r"(Resolução\s+CVM)\s*(?:nº?\s*)?(\d[\d.]*)",
            r"(Instrução\s+CVM)\s*(?:nº?\s*)?(\d[\d.]*)",
            r"(Deliberação\s+CVM)\s*(?:nº?\s*)?(\d[\d.]*)",
            r"(Resolução)\s*(?:nº?\s*)?(\d[\d.]*)",
            r"(Instrução)\s*(?:nº?\s*)?(\d[\d.]*)",
        ]

        text_to_search = f"{doc.title} {doc.doc_type}"
        for pattern in patterns:
            match = re.search(pattern, text_to_search, re.IGNORECASE)
            if match:
                return match.group(1).strip(), match.group(2).strip()

        # Fallback: use doc_type and try to extract number from URN
        tipo = doc.doc_type or "Ato CVM"
        numero = "0"
        if doc.urn:
            urn_match = re.search(r";(\d+)$", doc.urn)
            if urn_match:
                numero = urn_match.group(1)

        return tipo, numero

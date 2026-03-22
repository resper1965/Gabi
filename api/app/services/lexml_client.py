"""
LexML Brasil — SRU Client for Structured Legislation Retrieval.

Uses the Search/Retrieval via URL (SRU) protocol from the Brazilian Senate.
Replaces fragile Planalto HTML scraping with structured XML from the
official legislative information network.

API Docs: https://www.lexml.gov.br/busca/SRU
Protocol: SRU 1.2 (OASIS standard)
Coverage: Federal, State, and Municipal legislation + jurisprudence.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional
try:
    from defusedxml.ElementTree import fromstring as _xml_fromstring, ParseError as _XMLParseError
except ImportError:
    from xml.etree.ElementTree import fromstring as _xml_fromstring  # noqa: S314
    from xml.etree.ElementTree import ParseError as _XMLParseError

import httpx

from app.services.bcb_client import BCBClient
from app.services.normalizer import html_to_text, extract_pdf_text

logger = logging.getLogger("gabi.lexml")

LEXML_SRU_BASE = "https://www.lexml.gov.br/busca/SRU"

# XML namespaces used by LexML SRU responses
NS = {
    "srw": "http://www.loc.gov/zing/srw/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "lexml": "http://www.lexml.gov.br/",
}


@dataclass
class LexMLDocument:
    """A legislation document discovered via LexML."""
    urn: str                         # URN LEX identifier
    title: str
    description: str                 # Ementa
    date: str                        # Publication date
    authority: str                   # Issuing authority
    doc_type: str                    # e.g. "Lei", "Resolução"
    locality: str                    # e.g. "Federal", "São Paulo"
    subjects: List[str] = field(default_factory=list)
    source_url: str = ""             # URL to the full text (HTML or PDF)
    full_text: str = ""              # Extracted full text (populated after download)


class LexMLClient:
    """
    Client for the LexML Brasil SRU API.
    Searches for legislation and extracts structured metadata + full text.
    """

    def __init__(self):
        self.http = BCBClient()

    async def search(
        self,
        query: str,
        max_records: int = 20,
        start_record: int = 1,
    ) -> List[LexMLDocument]:
        """
        Search LexML using CQL (Contextual Query Language).

        Examples:
            search("urn=urn:lex:br:federal:lei:2018;13709")  # LGPD by URN
            search("tipo=lei AND localidade=federal AND ementa=proteção dados")
            search("tipo=resolução AND autoridade=cvm")
        """
        from urllib.parse import quote

        url = (
            f"{LEXML_SRU_BASE}"
            f"?operation=searchRetrieve"
            f"&version=1.2"
            f"&query={quote(query)}"
            f"&maximumRecords={max_records}"
            f"&startRecord={start_record}"
            f"&recordSchema=lexml"
        )

        try:
            xml_text = await self.http.fetch_async(url)
            return self._parse_sru_response(xml_text)
        except httpx.HTTPError as e:
            logger.error("LexML HTTP search failed for query '%s': %s", query[:80], e)
            return []

    async def search_by_authority(
        self,
        authority: str,
        doc_type: str = "resolução",
        max_records: int = 50,
    ) -> List[LexMLDocument]:
        """Search for normatives from a specific authority (e.g., CVM, SUSEP)."""
        query = f'tipo="{doc_type}" AND autoridade="{authority}"'
        return await self.search(query, max_records=max_records)

    async def search_federal_law(
        self,
        law_number: str,
        law_type: str = "lei",
    ) -> List[LexMLDocument]:
        """Search for a specific federal law by number."""
        query = f'tipo="{law_type}" AND localidade="federal" AND numero="{law_number}"'
        return await self.search(query, max_records=5)

    async def fetch_full_text(self, doc: LexMLDocument) -> str:
        """
        Download and extract the full text of a LexML document.
        Handles PDF and HTML sources.
        """
        if not doc.source_url:
            logger.warning("No source URL for LexML doc: %s", doc.urn)
            return ""

        try:
            url_lower = doc.source_url.lower()
            if ".pdf" in url_lower:
                pdf_bytes = await self.http.fetch_binary_async(doc.source_url)
                text = extract_pdf_text(pdf_bytes)
            else:
                html_raw = await self.http.fetch_async(doc.source_url)
                text = html_to_text(html_raw)

            doc.full_text = text
            return text
        except (httpx.HTTPError, ValueError) as e:
            logger.warning(
                "Failed to fetch full text for %s (%s): %s",
                doc.urn, doc.source_url, e,
            )
            return ""

    def _parse_sru_response(self, xml_text: str) -> List[LexMLDocument]:
        """Parse a LexML SRU XML response into LexMLDocument objects."""
        docs: List[LexMLDocument] = []

        try:
            root = _xml_fromstring(xml_text)
        except _XMLParseError as e:
            logger.error("Failed to parse LexML XML response: %s", e)
            return []

        records = root.findall(".//srw:record", NS)
        if not records:
            # Try without namespace (some responses may vary)
            records = root.findall(".//{http://www.loc.gov/zing/srw/}record")

        for record in records:
            try:
                doc = self._parse_record(record)
                if doc:
                    docs.append(doc)
            except (ValueError, AttributeError, TypeError) as e:
                logger.warning("Failed to parse LexML record: %s", e)

        logger.info("LexML: parsed %d documents from SRU response", len(docs))
        return docs

    def _parse_record(self, record) -> Optional[LexMLDocument]:
        """Parse a single SRU record into a LexMLDocument."""
        # Try multiple paths to find the data element
        data = record.find(".//srw:recordData", NS)
        if data is None:
            data = record.find(".//{http://www.loc.gov/zing/srw/}recordData")
        if data is None:
            return None

        def _text(tag: str, ns_prefix: str = "dc") -> str:
            ns_uri = NS.get(ns_prefix, "")
            el = data.find(f".//{{{ns_uri}}}{tag}") if ns_uri else data.find(f".//{tag}")
            if el is None:
                # Fallback: search without namespace
                el = data.find(f".//{tag}")
            return (el.text or "").strip() if el is not None else ""

        def _all_text(tag: str, ns_prefix: str = "dc") -> List[str]:
            ns_uri = NS.get(ns_prefix, "")
            els = data.findall(f".//{{{ns_uri}}}{tag}") if ns_uri else data.findall(f".//{tag}")
            if not els:
                els = data.findall(f".//{tag}")
            return [el.text.strip() for el in els if el.text]

        urn = _text("urn", "lexml") or _text("urn")
        title = _text("title")
        description = _text("description")

        if not urn and not title:
            return None

        # Extract source URL from identifier or relation fields
        source_url = ""
        identifiers = _all_text("identifier")
        for ident in identifiers:
            if ident.startswith("http"):
                source_url = ident
                break

        return LexMLDocument(
            urn=urn,
            title=title,
            description=description,
            date=_text("date"),
            authority=_text("autoridade", "lexml") or _text("autoridade"),
            doc_type=_text("tipoDocumento", "lexml") or _text("tipoDocumento"),
            locality=_text("localidade", "lexml") or _text("localidade"),
            subjects=_all_text("subject"),
            source_url=source_url,
        )

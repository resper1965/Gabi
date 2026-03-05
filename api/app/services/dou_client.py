"""
DOU Client — Unified Diário Oficial da União scraper.
Searches in.gov.br for normative acts by regulatory agency.
Used by ANS, SUSEP, ANPD, and ANEEL ingestion scripts.
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import quote

from app.services.bcb_client import BCBClient

logger = logging.getLogger(__name__)

# DOU search API (Imprensa Nacional)
DOU_SEARCH_URL = "https://www.in.gov.br/consulta/-/buscar/dou"
DOU_API_URL = "https://www.in.gov.br/web/dou/-/"

# Mapping of regulatory authority → DOU search terms
AGENCY_SEARCH_TERMS = {
    "ANS": [
        "Agência Nacional de Saúde Suplementar",
        "Resolução Normativa ANS",
        "Instrução Normativa ANS",
    ],
    "SUSEP": [
        "Superintendência de Seguros Privados",
        "Circular SUSEP",
        "Resolução CNSP",
    ],
    "ANPD": [
        "Autoridade Nacional de Proteção de Dados",
        "Resolução CD/ANPD",
    ],
    "ANEEL": [
        "Agência Nacional de Energia Elétrica",
        "Resolução Normativa ANEEL",
        "Resolução Homologatória ANEEL",
    ],
    "CVM": [
        "Comissão de Valores Mobiliários",
        "Resolução CVM",
        "Instrução CVM",
    ],
}


class DOUDocument:
    """Represents a document found in the DOU."""

    def __init__(
        self,
        titulo: str,
        url: str,
        tipo_ato: str,
        numero: str,
        orgao: str,
        data_publicacao: Optional[datetime] = None,
        texto: str = "",
    ):
        self.titulo = titulo
        self.url = url
        self.tipo_ato = tipo_ato
        self.numero = numero
        self.orgao = orgao
        self.data_publicacao = data_publicacao
        self.texto = texto


class DOUClient:
    """
    Client for searching and fetching normative acts from the
    Diário Oficial da União (in.gov.br).
    """

    def __init__(self):
        self.http = BCBClient()

    async def buscar_por_orgao(
        self,
        orgao: str,
        dias: int = 30,
        max_results: int = 50,
    ) -> list[DOUDocument]:
        """
        Search the DOU for recent normative acts by a regulatory agency.
        Uses the in.gov.br search interface.
        """
        search_terms = AGENCY_SEARCH_TERMS.get(orgao, [orgao])
        all_docs: list[DOUDocument] = []

        for term in search_terms:
            try:
                docs = await self._search_term(term, dias, max_results)
                all_docs.extend(docs)
            except Exception as e:
                logger.warning(f"DOU search failed for term '{term}': {e}")

        # Deduplicate by URL
        seen_urls: set[str] = set()
        unique_docs: list[DOUDocument] = []
        for doc in all_docs:
            if doc.url not in seen_urls:
                seen_urls.add(doc.url)
                unique_docs.append(doc)

        return unique_docs

    async def _search_term(
        self,
        term: str,
        dias: int,
        max_results: int,
    ) -> list[DOUDocument]:
        """Search for a specific term in the DOU."""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=dias)

        # Build search URL matching in.gov.br's search parameters
        params = {
            "q": f'"{term}"',
            "exactDate": "personalizado",
            "publishFrom": start_date.strftime("%d-%m-%Y"),
            "publishTo": end_date.strftime("%d-%m-%Y"),
            "delta": str(max_results),
            "sortType": "0",  # Relevance
        }

        param_str = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
        url = f"{DOU_SEARCH_URL}?{param_str}"

        try:
            html = await self.http.fetch_async(url)
            return self._parse_search_results(html, term)
        except Exception as e:
            logger.error(f"DOU search request failed: {e}")
            return []

    def _parse_search_results(self, html: str, orgao_term: str) -> list[DOUDocument]:
        """Parse search results HTML from in.gov.br into DOUDocument objects."""
        docs: list[DOUDocument] = []

        # Try JSON first (in.gov.br sometimes returns JSON)
        try:
            data = json.loads(html)
            if isinstance(data, dict) and "jsonArray" in data:
                for item in data["jsonArray"]:
                    doc = self._parse_json_item(item, orgao_term)
                    if doc:
                        docs.append(doc)
                return docs
        except (json.JSONDecodeError, KeyError):
            pass

        # Fallback: parse HTML with simple string matching
        # Look for result entries in the DOU HTML structure
        import re

        # Pattern: <a class="title-marker" href="/web/dou/-/...">TITLE</a>
        title_pattern = re.compile(
            r'href="(/web/dou/-/[^"]+)"[^>]*>([^<]+)</a>', re.IGNORECASE
        )
        matches = title_pattern.findall(html)

        for href, title in matches:
            title = title.strip()
            if not title:
                continue

            # Extract tipo_ato and numero from title
            tipo_ato, numero = self._extract_type_number(title)
            full_url = f"https://www.in.gov.br{href}"

            docs.append(
                DOUDocument(
                    titulo=title,
                    url=full_url,
                    tipo_ato=tipo_ato,
                    numero=numero,
                    orgao=orgao_term,
                )
            )

        return docs

    def _parse_json_item(self, item: dict, orgao_term: str) -> Optional[DOUDocument]:
        """Parse a single JSON result item from in.gov.br API."""
        titulo = item.get("title", "").strip()
        url = item.get("urlTitle", "")
        if url and not url.startswith("http"):
            url = f"https://www.in.gov.br/web/dou/-/{url}"

        if not titulo or not url:
            return None

        pub_date_str = item.get("pubDate")
        pub_date = None
        if pub_date_str:
            try:
                pub_date = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass

        tipo_ato, numero = self._extract_type_number(titulo)

        return DOUDocument(
            titulo=titulo,
            url=url,
            tipo_ato=tipo_ato,
            numero=numero,
            orgao=orgao_term,
            data_publicacao=pub_date,
        )

    def _extract_type_number(self, title: str) -> tuple[str, str]:
        """Extract act type and number from a title string."""
        import re

        patterns = [
            r"(Resolução Normativa)\s*(?:ANS|ANEEL)?\s*[Nn]?[°.\s]*(\d[\d.]*)",
            r"(Resolução CD/ANPD)\s*[Nn]?[°.\s]*(\d[\d.]*)",
            r"(Resolução CNSP)\s*[Nn]?[°.\s]*(\d[\d.]*)",
            r"(Circular SUSEP)\s*[Nn]?[°.\s]*(\d[\d.]*)",
            r"(Circular)\s*[Nn]?[°.\s]*(\d[\d.]*)",
            r"(Instrução Normativa)\s*[Nn]?[°.\s]*(\d[\d.]*)",
            r"(Resolução)\s*[Nn]?[°.\s]*(\d[\d.]*)",
            r"(Portaria)\s*[Nn]?[°.\s]*(\d[\d.]*)",
        ]

        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return match.group(1).strip(), match.group(2).strip()

        return "Ato Normativo", "0"

    async def baixar_texto_integral(self, url: str) -> str:
        """Download and extract the full text of a DOU document."""
        from app.services.normalizer import html_to_text

        try:
            html = await self.http.fetch_async(url)

            # Try to extract the main content div
            import re

            # DOU pages have the content in a <div class="texto-dou">
            content_match = re.search(
                r'<div[^>]*class="[^"]*texto-dou[^"]*"[^>]*>(.*?)</div>',
                html,
                re.DOTALL | re.IGNORECASE,
            )

            if content_match:
                return html_to_text(content_match.group(1))

            # Fallback: try <div id="materia">
            materia_match = re.search(
                r'<div[^>]*id="materia"[^>]*>(.*?)</div>',
                html,
                re.DOTALL | re.IGNORECASE,
            )
            if materia_match:
                return html_to_text(materia_match.group(1))

            # Last resort: full page text
            return html_to_text(html)

        except Exception as e:
            logger.error(f"Failed to download DOU document at {url}: {e}")
            return ""

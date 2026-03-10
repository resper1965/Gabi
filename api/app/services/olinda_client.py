"""
Olinda BCB OData Client — Official public API for BCB/CMN normatives.
Replaces the reverse-engineered internal BCB search/content APIs.

Documentation: https://olinda.bcb.gov.br/olinda/servico/Normativos/versao/v1/odata/
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from urllib.parse import quote

from app.services.bcb_client import BCBClient
from app.services.normalizer import html_to_text, extract_pdf_text

logger = logging.getLogger("gabi.olinda")

OLINDA_BASE = (
    "https://olinda.bcb.gov.br/olinda/servico/Normativos/versao/v1/odata"
)


@dataclass
class NormativoItem:
    tipo: str
    numero: str
    data: str        # "YYYY-MM-DD"
    assunto: str
    link: str        # URL to PDF or HTML on bcb.gov.br


class OlindaClient:
    """
    Official BCB OData client for BACEN and CMN normatives.

    Endpoints used:
      NormativosPorData — paginated list filtered by publication date range
      NormativosPorNumero — single document lookup by tipo + numero (fallback)
    """

    def __init__(self):
        self.http = BCBClient()

    async def fetch_por_data(
        self,
        days: int = 30,
        tipo_filter: Optional[str] = None,
        page_size: int = 100,
    ) -> List[NormativoItem]:
        """
        Return normatives published in the last `days` days.
        Paginates via $skip until the API returns an empty page.
        Optionally filter by exact Tipo (e.g. 'Resolução CMN').
        """
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")

        base_url = (
            f"{OLINDA_BASE}/NormativosPorData("
            f"datainicial=@datainicial,datafinal=@datafinal)"
            f"?@datainicial='{start_str}'"
            f"&@datafinal='{end_str}'"
            f"&$top={page_size}"
            f"&$format=json"
        )
        if tipo_filter:
            base_url += f"&$filter=Tipo eq '{quote(tipo_filter, safe='')}'"

        all_items: List[NormativoItem] = []
        skip = 0

        while True:
            url = base_url + f"&$skip={skip}"
            try:
                raw = await self.http.fetch_async(url)
                page = json.loads(raw).get("value", [])
            except Exception as e:
                logger.error("OlindaClient fetch_por_data error (skip=%d): %s", skip, e)
                break

            if not page:
                break

            for item in page:
                if item.get("Numero"):
                    all_items.append(NormativoItem(
                        tipo=item.get("Tipo", ""),
                        numero=str(item.get("Numero", "")).split(".")[0],
                        data=item.get("Data", ""),
                        assunto=item.get("Assunto", ""),
                        link=item.get("Link", ""),
                    ))

            if len(page) < page_size:
                break  # Last page — no need for another request

            skip += page_size

        logger.info(
            "OlindaClient: %d normatives fetched (days=%d, tipo=%s)",
            len(all_items), days, tipo_filter or "all",
        )
        return all_items

    async def fetch_content(self, normativo: NormativoItem) -> str:
        """
        Download and extract full text from a normativo's link.
        Handles both PDF and HTML responses.
        """
        if not normativo.link:
            return ""
        try:
            link_lower = normativo.link.lower()
            if ".pdf" in link_lower or "downloadnormativo" in link_lower:
                pdf_bytes = await self.http.fetch_binary_async(normativo.link)
                return extract_pdf_text(pdf_bytes)
            else:
                html_raw = await self.http.fetch_async(normativo.link)
                return html_to_text(html_raw)
        except Exception as e:
            logger.warning(
                "OlindaClient fetch_content error for %s %s: %s",
                normativo.tipo, normativo.numero, e,
            )
            return ""

    def canonical_url(self, normativo: NormativoItem) -> str:
        """Return the stable canonical URL for the normativo on bcb.gov.br."""
        tipo_enc = quote(normativo.tipo, safe="")
        return (
            f"https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo"
            f"?tipo={tipo_enc}&numero={normativo.numero}"
        )

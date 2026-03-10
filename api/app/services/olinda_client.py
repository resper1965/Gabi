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
        top: int = 100,
    ) -> List[NormativoItem]:
        """
        Return normatives published in the last `days` days.
        Optionally filter by exact Tipo (e.g. 'Resolução CMN').
        """
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")

        url = (
            f"{OLINDA_BASE}/NormativosPorData("
            f"datainicial=@datainicial,datafinal=@datafinal)"
            f"?@datainicial='{start_str}'"
            f"&@datafinal='{end_str}'"
            f"&$top={top}"
            f"&$format=json"
        )
        if tipo_filter:
            url += f"&$filter=Tipo eq '{quote(tipo_filter, safe='')}'"

        try:
            raw = await self.http.fetch_async(url)
            data = json.loads(raw)
            return [
                NormativoItem(
                    tipo=item.get("Tipo", ""),
                    numero=str(item.get("Numero", "")).split(".")[0],
                    data=item.get("Data", ""),
                    assunto=item.get("Assunto", ""),
                    link=item.get("Link", ""),
                )
                for item in data.get("value", [])
                if item.get("Numero")
            ]
        except Exception as e:
            logger.error("OlindaClient fetch_por_data error: %s", e)
            return []

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

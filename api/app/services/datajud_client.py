"""
DataJud CNJ Client — Public API for STJ and STF jurisprudence.
Free public API provided by Conselho Nacional de Justiça (CNJ).

Docs: https://datajud-wiki.cnj.jus.br/api-publica/
Base: https://api-publica.datajud.cnj.jus.br
Auth: Public API key — ROTATED PERIODICALLY by CNJ.

IMPORTANT: The CNJ rotates the public API key without prior notice.
If ingestion starts returning 401/403, get the current key from:
  https://datajud-wiki.cnj.jus.br/api-publica/
and update the DATAJUD_API_KEY environment variable.
"""

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import httpx
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger("gabi.datajud")

DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br"

# API key sourced from environment — MUST be kept current (CNJ rotates it).
# Get current key: https://datajud-wiki.cnj.jus.br/api-publica/
DATAJUD_API_KEY: str = os.getenv("DATAJUD_API_KEY", "")
if not DATAJUD_API_KEY:
    logger.warning(
        "⚠️  DATAJUD_API_KEY not set. DataJud CNJ searches will fail. "
        "Get current key from https://datajud-wiki.cnj.jus.br/api-publica/"
    )

TRIBUNAL_ENDPOINTS = {
    "STJ": f"{DATAJUD_BASE}/api_publica_stj/_search",
    "STF": f"{DATAJUD_BASE}/api_publica_stf/_search",
}

# Compliance-relevant search queries per tribunal
COMPLIANCE_QUERIES = {
    "STJ": [
        "proteção de dados LGPD",
        "sigilo bancário responsabilidade",
        "seguro obrigação indenização",
        "plano de saúde cobertura negativa",
        "consumidor código defesa",
        "mercado de capitais CVM",
        # Open Finance / Pix — relevant since 2021
        "Pix fraude responsabilidade banco",
        "Open Finance dados compartilhamento consentimento",
        # AML
        "lavagem de dinheiro operação suspeita",
    ],
    "STF": [
        "LGPD constitucionalidade",
        "sigilo bancário inconstitucional",
        "proteção de dados pessoais",
        "regulação financeira competência",
        # Open Finance / digital payments
        "Open Banking regulação constitucional",
    ],
}


@dataclass
class JurisprudenciaItem:
    tribunal: str                    # "STJ" or "STF"
    numero_processo: str
    classe: str                      # e.g. "REsp", "RE"
    assunto: str
    ementa: str
    data_julgamento: Optional[str]
    relator: Optional[str]
    orgao_julgador: Optional[str]
    id_fonte: str                    # canonical URL


class DataJudClient:
    """
    Client for the CNJ DataJud public API.
    Fetches recent jurisprudence from STJ and STF on compliance-relevant topics.
    """

    def __init__(self):
        self.headers = {
            "Authorization": f"ApiKey {DATAJUD_API_KEY}",
            "Content-Type": "application/json",
        }
        self.timeout = httpx.Timeout(30)

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
    )
    async def _search_page(
        self,
        tribunal: str,
        query: str,
        since: str,
        size: int,
        search_after: Optional[list] = None,
    ) -> list:
        url = TRIBUNAL_ENDPOINTS[tribunal]
        body: dict = {
            "query": {
                "bool": {
                    "must": [{"match": {"ementa": query}}],
                    "filter": [{"range": {"dataJulgamento": {"gte": since}}}],
                }
            },
            "size": size,
            "sort": [{"dataJulgamento": {"order": "desc"}}, {"_id": "asc"}],
            "_source": [
                "numeroProcesso", "classe", "assunto",
                "ementa", "dataJulgamento", "relator", "orgaoJulgador",
            ],
        }
        if search_after:
            body["search_after"] = search_after

        async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
            resp = await client.post(url, content=json.dumps(body))
            resp.raise_for_status()
            return resp.json().get("hits", {}).get("hits", [])

    def _hit_to_item(self, tribunal: str, hit: dict) -> Optional[JurisprudenciaItem]:
        src = hit.get("_source", {})
        numero = src.get("numeroProcesso", "")
        if not numero:
            return None
        classe = src.get("classe", {})
        if isinstance(classe, dict):
            classe = classe.get("descricao", "")
        assunto_raw = src.get("assunto", [])
        assunto_str = (
            assunto_raw[0].get("descricao", "") if assunto_raw and isinstance(assunto_raw[0], dict)
            else str(assunto_raw)
        )
        orgao = src.get("orgaoJulgador", {})
        if isinstance(orgao, dict):
            orgao = orgao.get("nome", "")
        relator = src.get("relator", {})
        if isinstance(relator, dict):
            relator = relator.get("nome", "")

        return JurisprudenciaItem(
            tribunal=tribunal,
            numero_processo=numero,
            classe=str(classe),
            assunto=assunto_str,
            ementa=src.get("ementa", ""),
            data_julgamento=src.get("dataJulgamento"),
            relator=relator or None,
            orgao_julgador=orgao or None,
            id_fonte=f"https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo={numero}"
            if tribunal == "STJ"
            else f"https://portal.stf.jus.br/processos/detalhe.asp?incidente={numero}",
        )

    async def fetch_jurisprudencia(
        self,
        tribunal: str,
        days: int = 180,
        page_size: int = 50,
        max_per_query: int = 500,
    ) -> List[JurisprudenciaItem]:
        """
        Fetch recent compliance-relevant decisions from the given tribunal.
        Paginates each query via search_after until exhausted or max_per_query reached.
        Returns deduplicated results across all configured queries.
        """
        if tribunal not in TRIBUNAL_ENDPOINTS:
            raise ValueError(f"Unknown tribunal: {tribunal}. Use 'STJ' or 'STF'.")

        since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        seen: set[str] = set()
        results: List[JurisprudenciaItem] = []

        for query in COMPLIANCE_QUERIES[tribunal]:
            fetched = 0
            search_after: Optional[list] = None

            while fetched < max_per_query:
                try:
                    hits = await self._search_page(
                        tribunal, query, since, page_size, search_after
                    )
                except Exception as e:
                    logger.warning("DataJud query '%s' (%s) failed: %s", query, tribunal, e)
                    break

                if not hits:
                    break

                for hit in hits:
                    item = self._hit_to_item(tribunal, hit)
                    if item and item.numero_processo not in seen:
                        seen.add(item.numero_processo)
                        results.append(item)

                fetched += len(hits)

                if len(hits) < page_size:
                    break  # Last page

                # Cursor for next page — sort values of the last hit
                search_after = hits[-1].get("sort")
                if not search_after:
                    break

        logger.info("DataJud %s: %d unique decisions retrieved", tribunal, len(results))
        return results

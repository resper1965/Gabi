import logging
from typing import List, Optional

logger = logging.getLogger("gabi.db_ingest")

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.regulatory import (
    RegulatoryDocument,
    RegulatoryVersion,
    RssItem
)
from app.models.audit import IngestRun, IngestRunItem, IngestStatus
from app.schemas.ingest import RegulatoryDocumentSchema, RssItemSchema

class DBIngester:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def ingest_rss_items(self, run: IngestRun, items: List[RssItemSchema]) -> IngestRun:
        for item_data in items:
            # Check existing
            stmt = select(RssItem).where((RssItem.guid == item_data.guid) | (RssItem.link == item_data.link))
            existing = (await self.session.execute(stmt)).scalars().first()

            if not existing:
                new_item = RssItem(**item_data.model_dump())
                self.session.add(new_item)
                run.itens_novos += 1
            else:
                run.itens_atualizados += 1 # Or just skipped for RSS

        await self.session.commit()
        return run

    async def ingest_regulatory_document(self, run: IngestRun, doc_schema: RegulatoryDocumentSchema) -> None:
        try:
            # Find doc by authority + tipo + numero
            stmt = select(RegulatoryDocument).where(
                RegulatoryDocument.authority == doc_schema.authority.value,
                RegulatoryDocument.tipo_ato == doc_schema.tipo_ato,
                RegulatoryDocument.numero == doc_schema.numero
            )
            doc = (await self.session.execute(stmt)).scalars().first()

            version_id_to_dispatch = None

            if not doc:
                # NEW Document
                doc = RegulatoryDocument(
                    authority=doc_schema.authority.value,
                    tipo_ato=doc_schema.tipo_ato,
                    numero=doc_schema.numero,
                    data_publicacao=doc_schema.data_publicacao,
                    id_fonte=doc_schema.id_fonte,
                    status=doc_schema.status
                )
                self.session.add(doc)
                await self.session.flush() # get doc.id

                # Create Version
                version = RegulatoryVersion(
                    document_id=doc.id,
                    version_hash=doc_schema.version_hash,
                    texto_integral=doc_schema.texto_integral,
                )
                self.session.add(version)
                await self.session.flush()

                doc.current_version_id = version.id

                # Mark for background AI / Embeddings processing
                version_id_to_dispatch = version.id

                run.itens_novos += 1
                self._log_item(run.id, IngestStatus.NEW, doc_schema.id_fonte, doc_schema.version_hash)

            else:
                # Document exists. Check current version hash
                curr_ver_stmt = select(RegulatoryVersion).where(RegulatoryVersion.id == doc.current_version_id)
                curr_version = (await self.session.execute(curr_ver_stmt)).scalars().first()

                if not curr_version or curr_version.version_hash != doc_schema.version_hash:
                    # UPDATED
                    new_version = RegulatoryVersion(
                        document_id=doc.id,
                        version_hash=doc_schema.version_hash,
                        texto_integral=doc_schema.texto_integral,
                    )
                    self.session.add(new_version)
                    await self.session.flush()
                    doc.current_version_id = new_version.id

                    # Mark for background AI / Embeddings processing
                    version_id_to_dispatch = new_version.id

                    run.itens_atualizados += 1
                    self._log_item(run.id, IngestStatus.UPDATED, doc_schema.id_fonte, doc_schema.version_hash)
                else:
                    # SKIPPED
                    self._log_item(run.id, IngestStatus.SKIPPED, doc_schema.id_fonte, doc_schema.version_hash)

            await self.session.commit()

            # Now that the transaction is committed, dispatch background AI tasks
            if version_id_to_dispatch:
                from app.services.processing_worker import dispatch_regulatory_processing
                dispatch_regulatory_processing(version_id_to_dispatch, doc_schema.texto_integral, doc_schema.provisions)

        except Exception as e:
            await self.session.rollback()
            run.erros += 1
            self._log_item(run.id, IngestStatus.FAILED, doc_schema.id_fonte, error_msg=str(e))
            await self.session.commit()

    def _log_item(self, run_id: int, status: IngestStatus, url: str, hash_calc: Optional[str] = None, error_msg: Optional[str] = None):
        item = IngestRunItem(
            run_id=run_id,
            status=status,
            url=url,
            hash_calculado=hash_calc,
            erro_msg=error_msg
        )
        self.session.add(item)

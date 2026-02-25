import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict

from bkj.libs.http import HttpClient
from bkj.libs.rate_limit import RateLimiter
from bkj.libs.hasher import calculate_hash
from bkj.libs.storage import Storage
from bkj.parsers.planalto_html_parser import parse_planalto_html
from bkj.parsers.legal_structure_parser import parse_legal_structure
from bkj.repositories.legal_repository import LegalRepository

from app.models.legal import LegalDocument, LegalVersion, LegalProvision, LegalDomain
from app.models.audit import IngestRun, IngestRunItem, IngestStatus, IngestSource
from sqlalchemy.ext.asyncio import AsyncSession

class PlanaltoIngester:
    def __init__(self, db: AsyncSession, storage: Storage, rate_limit_rps: float = 1.0):
        self.db = db
        self.repo = LegalRepository(db)
        self.http = HttpClient()
        self.limiter = RateLimiter(rate_limit_rps)
        self.storage = storage

    async def run_ingestion(self, run_id: int, laws: List[Dict]):
        """
        Orchestrates the ingestion of a list of laws.
        laws: [{'url': '...', 'name': 'Código Civil', 'act_type': 'Lei', 'number': '10406', 'domain': CIVIL}, ...]
        """
        for law in laws:
            url = law['url']
            print(f"[*] Ingesting: {law['name']} ({url})")
            
            await self.limiter.wait()
            
            try:
                # 1. Fetch
                raw_html = await self.http.get_text(url)
                
                # 2. Clean
                clean_text = parse_planalto_html(raw_html)
                content_hash = calculate_hash(clean_text)
                
                # 3. Storage (Save raw and normalized)
                raw_path = await self.storage.save(f"raw/{law['number']}_{content_hash[:8]}.html", raw_html)
                norm_path = await self.storage.save(f"normalized/{law['number']}_{content_hash[:8]}.txt", clean_text)
                
                # 4. Check Idempotency
                doc = await self.repo.get_document_by_url(url)
                if not doc:
                    doc = LegalDocument(
                        doc_id=str(uuid.uuid4()),
                        authority="PLANALTO",
                        act_type=law['act_type'],
                        law_number=law['number'],
                        canonical_url=url,
                        captured_at=datetime.now(timezone.utc),
                        status="vigente"
                    )
                    self.repo.add(doc)
                    await self.repo.flush()

                current_version = await self.repo.get_current_version(doc.id)
                if current_version and current_version.content_hash == content_hash:
                    await self._log_item(run_id, IngestStatus.SKIPPED, url, content_hash)
                    print(f" [=] Skipped: {law['name']} (No changes)")
                    continue

                # 5. Versioning
                await self.repo.mark_versions_not_current(doc.id)
                new_version = LegalVersion(
                    doc_id=doc.id,
                    content_hash=content_hash,
                    retrieved_at=datetime.now(timezone.utc),
                    raw_storage_path=raw_path,
                    normalized_storage_path=norm_path,
                    mime_type="text/html",
                    is_current=True
                )
                self.repo.add(new_version)
                await self.repo.flush()
                doc.current_version_id = new_version.id

                # 6. Granular Parsing
                schema_provisions = parse_legal_structure(clean_text, law_name=law['name'])
                db_provisions = []
                for p in schema_provisions:
                    db_provisions.append(LegalProvision(
                        doc_id=doc.id,
                        version_id=new_version.id,
                        structure_path=p.structure_path,
                        article_number=p.article_number,
                        paragraph=p.paragraph,
                        inciso=p.inciso,
                        alinea=p.alinea,
                        item=p.item,
                        text=p.text,
                        legal_domain=law.get('domain')
                    ))
                
                if db_provisions:
                    await self.repo.save_provisions(db_provisions)
                
                new_version.parse_metadata = {"provisions_count": len(db_provisions)}
                await self.db.commit()
                
                await self._log_item(run_id, IngestStatus.NEW if not current_version else IngestStatus.UPDATED, 
                               url, content_hash)
                print(f" [+] Success: {law['name']} ({len(db_provisions)} provisions)")

            except Exception as e:
                await self.db.rollback()
                await self._log_item(run_id, IngestStatus.FAILED, url, error_msg=str(e))
                print(f" [!] Error: {law['name']} - {e}")
                await self.db.commit()

    async def _log_item(self, run_id: int, status: IngestStatus, url: str, hash_calc: Optional[str] = None, 
                  doc_id: Optional[int] = None, version_id: Optional[int] = None, error_msg: Optional[str] = None):
        item = IngestRunItem(
            run_id=run_id,
            status=status,
            url=url,
            hash_calculado=hash_calc,
            erro_msg=error_msg
        )
        self.db.add(item)
        # Flush or let the main loop commit

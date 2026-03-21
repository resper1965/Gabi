import asyncio
import hashlib
import logging
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.law import LegislativeDocument, LegislativeVersion, LegislativeProvision, LegislativeDomain
from app.services.legal_structure_parser import parse_legal_structure, LegalProvisionSchema

class LegalIngester:
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger("gabi.legal_ingest")

    def _generate_hash(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def ingest_law(self, 
                   canonical_url: str, 
                   act_type: str, 
                   law_number: str, 
                   clean_text: str,
                   domain: Optional[LegislativeDomain] = None) -> LegislativeDocument:
        """
        Ingests a law idempotently. If the hash hasn't changed, skips provisions.
        """
        content_hash = self._generate_hash(clean_text)
        
        # 1. Find or Create Document
        stmt = select(LegislativeDocument).filter_by(canonical_url=canonical_url)
        doc = self.db.execute(stmt).scalar_one_or_none()
        
        if not doc:
            doc = LegislativeDocument(
                doc_id=str(uuid.uuid4()),
                authority="PLANALTO",
                act_type=act_type,
                law_number=law_number,
                canonical_url=canonical_url,
                captured_at=datetime.now(timezone.utc)
            )
            self.db.add(doc)
            self.db.flush() # get ID

        # 2. Check current version hash
        current_version = None
        if doc.current_version_id:
            stmt_v = select(LegislativeVersion).filter_by(id=doc.current_version_id)
            current_version = self.db.execute(stmt_v).scalar_one_or_none()

        if current_version and current_version.content_hash == content_hash:
            self.logger.debug("[%s] IDEMPOTENT: Hash unchanged (%s). Skipping parsing.", law_number, content_hash[:8])
            return doc
            
        # 3. Hash changed or new document. Create new Version
        self.logger.info("[%s] NEW VERSION: Compiling new version from Planalto...", law_number)
        
        # Mark old versions as not current
        stmt_old = select(LegislativeVersion).filter_by(doc_id=doc.id, is_current=True)
        old_versions = self.db.execute(stmt_old).scalars().all()
        for ov in old_versions:
            ov.is_current = False

        new_version = LegislativeVersion(
            doc_id=doc.id,
            content_hash=content_hash,
            retrieved_at=datetime.now(timezone.utc),
            mime_type="text/plain",
            is_current=True
        )
        self.db.add(new_version)
        self.db.flush()
        
        doc.current_version_id = new_version.id

        # 4. Parse Structure Deeply
        self.logger.info("[%s] Chunking provisions...", law_number)
        schema_provisions = parse_legal_structure(clean_text, law_name=act_type + " " + law_number)
        
        provisions_to_insert = []
        for p in schema_provisions:
            provisions_to_insert.append(LegislativeProvision(
                doc_id=doc.id,
                version_id=new_version.id,
                structure_path=p.structure_path,
                article_number=p.article_number,
                paragraph=p.paragraph,
                inciso=p.inciso,
                alinea=p.alinea,
                item=p.item,
                text=p.text,
                legal_domain=domain
            ))
            
        if provisions_to_insert:
            self.db.bulk_save_objects(provisions_to_insert)
            
        new_version.parse_metadata = {"provisions_count": len(provisions_to_insert)}
        self.db.commit()
        
        self.logger.info("[%s] SUCCESS: Saved %d provisions.", law_number, len(provisions_to_insert))
        return doc

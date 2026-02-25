from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.legal import LegalDocument, LegalVersion, LegalProvision

class LegalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_document_by_url(self, url: str) -> Optional[LegalDocument]:
        result = await self.session.execute(select(LegalDocument).filter_by(canonical_url=url))
        return result.scalar_one_or_none()

    async def get_document_by_number(self, authority: str, act_type: str, law_number: str) -> Optional[LegalDocument]:
        result = await self.session.execute(
            select(LegalDocument).filter_by(authority=authority, act_type=act_type, law_number=law_number)
        )
        return result.scalar_one_or_none()

    def add(self, entity):
        self.session.add(entity)
        return entity

    async def flush(self):
        await self.session.flush()

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()

    async def get_current_version(self, doc_id: int) -> Optional[LegalVersion]:
        result = await self.session.execute(
            select(LegalVersion).filter_by(doc_id=doc_id, is_current=True)
        )
        return result.scalar_one_or_none()

    async def mark_versions_not_current(self, doc_id: int):
        result = await self.session.execute(
            select(LegalVersion).filter_by(doc_id=doc_id, is_current=True)
        )
        old_versions = result.scalars().all()
        for ov in old_versions:
            ov.is_current = False

    async def save_provisions(self, provisions: List[LegalProvision]):
        for prov in provisions:
            self.session.add(prov)

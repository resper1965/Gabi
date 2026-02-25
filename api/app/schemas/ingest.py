import enum
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, HttpUrl, Field

class RegulatoryAuthority(str, enum.Enum):
    BACEN = "BACEN"
    CMN = "CMN"
    CVM = "CVM"

class IngestStatus(str, enum.Enum):
    NEW = "NEW"
    UPDATED = "UPDATED"
    SKIPPED = "SKIPPED"
    FAILED = "FAILED"

class ExtractedActMetadata(BaseModel):
    authority: RegulatoryAuthority
    tipo_ato: str
    numero: str
    data_publicacao: Optional[datetime] = None
    id_fonte: str
    titulo: str
    status: str = "Vigente"

class RssItemSchema(BaseModel):
    feed_origem: str
    guid: str
    titulo: str
    link: str
    data_publicacao: Optional[datetime] = None
    categoria: Optional[str] = None
    resumo: Optional[str] = None

class ProvisionSchema(BaseModel):
    structure_path: Optional[str] = None
    texto_chunk: str

class RegulatoryDocumentSchema(ExtractedActMetadata):
    version_hash: str
    texto_integral: str
    provisions: List[ProvisionSchema] = []

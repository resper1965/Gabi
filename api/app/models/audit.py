from datetime import datetime, timezone
import enum

from sqlalchemy import String, DateTime, Enum, Integer, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped

from app.models.base import Base

class IngestSource(str, enum.Enum):
    BACEN_RSS = "BACEN_RSS"
    BACEN_NORM = "BACEN_NORM"
    CMN_NORM = "CMN_NORM"
    CVM_FEED = "CVM_FEED"
    CVM_NORM = "CVM_NORM"
    SUSEP_NORM = "SUSEP_NORM"
    ANS_RSS = "ANS_RSS"
    ANS_NORM = "ANS_NORM"
    ANPD_RSS = "ANPD_RSS"
    ANPD_NORM = "ANPD_NORM"
    ANEEL_RSS = "ANEEL_RSS"
    ANEEL_NORM = "ANEEL_NORM"
    PLANALTO_NORM = "PLANALTO_NORM"

class IngestStatus(str, enum.Enum):
    NEW = "NEW"
    UPDATED = "UPDATED"
    SKIPPED = "SKIPPED"
    FAILED = "FAILED"

class IngestRun(Base):
    __tablename__ = "ingest_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    source: Mapped[IngestSource] = mapped_column(Enum(IngestSource), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    itens_novos: Mapped[int] = mapped_column(Integer, default=0)
    itens_atualizados: Mapped[int] = mapped_column(Integer, default=0)
    erros: Mapped[int] = mapped_column(Integer, default=0)

class IngestRunItem(Base):
    __tablename__ = "ingest_run_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("ingest_runs.id"), index=True)
    status: Mapped[IngestStatus] = mapped_column(Enum(IngestStatus), index=True)
    url: Mapped[str] = mapped_column(String(1024))
    hash_calculado: Mapped[str | None] = mapped_column(String(64), nullable=True)
    erro_msg: Mapped[str | None] = mapped_column(String(1024), nullable=True)

from typing import Literal
from pydantic import BaseModel

LegalDocType = Literal["law", "regulation", "contract", "policy", "precedent", "petition", "opinion", "gold_piece"]

class AgentRequest(BaseModel):
    agent: str  # auto, auditor, researcher, drafter, watcher, writer, policy_analyst, claims_analyst, regulatory_consultant
    query: str
    document_text: str | None = None
    chat_history: list[dict] | None = None
    style_profile_id: str | None = None  # For writer agent — references ghost style profile
    # Insurance-specific fields
    tenant_id: str | None = None
    client_id: str | None = None
    summary: str | None = None

class PresentationRequest(BaseModel):
    document_ids: list[str]
    title: str | None = None
    theme: str = "professional"

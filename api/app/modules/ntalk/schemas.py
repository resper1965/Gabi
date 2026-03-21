"""nTalkSQL — Pydantic request/response schemas."""

from pydantic import BaseModel


class ChatRequest(BaseModel):
    tenant_id: str
    question: str
    chat_history: list[dict] | None = None
    summary: str | None = None


class ConnectionRequest(BaseModel):
    tenant_id: str
    name: str
    host: str
    port: int = 1433
    db_name: str
    username: str
    secret_manager_ref: str

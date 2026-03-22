"""
Gabi Hub — Admin Schemas
Pydantic models for admin module.
"""

from pydantic import BaseModel

ALL_MODULES = ["ghost", "law"]

class RoleUpdate(BaseModel):
    role: str  # user, admin, superadmin

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserApproval(BaseModel):
    allowed_modules: list[str] = ALL_MODULES

class ModulesUpdate(BaseModel):
    allowed_modules: list[str]

class SeedRequest(BaseModel):
    packs: list[str]  # e.g. ["ans", "cvm", "lgpd"]
    force: bool = False

class RAGSimulationRequest(BaseModel):
    query: str
    module: str = "law"

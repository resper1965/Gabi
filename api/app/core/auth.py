"""
Gabi Hub — Firebase Auth + User Authorization
Verifies Firebase ID tokens, auto-creates users with domain-based policy,
and enforces module-level access control.
"""

from dataclasses import dataclass, field

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User

settings = get_settings()

ALL_MODULES = ["ghost", "law", "ntalk", "insightcare"]

_firebase_app = None


def _init_firebase():
    global _firebase_app
    if _firebase_app is not None:
        return

    if settings.firebase_admin_service_account:
        import json
        try:
            sa = json.loads(settings.firebase_admin_service_account)
            cred = credentials.Certificate(sa)
        except (json.JSONDecodeError, ValueError):
            cred = credentials.Certificate(settings.firebase_admin_service_account)
    else:
        cred = credentials.ApplicationDefault()

    _firebase_app = firebase_admin.initialize_app(cred)


@dataclass
class CurrentUser:
    uid: str
    email: str
    name: str | None = None
    picture: str | None = None
    role: str = "user"  # superadmin, admin, user
    status: str = "pending"  # approved, pending, blocked
    allowed_modules: list[str] = field(default_factory=list)


async def _upsert_user(decoded: dict, db: AsyncSession) -> User:
    """Find or create user from Firebase token, applying domain-based authorization policy."""
    uid = decoded["uid"]
    email = decoded.get("email", "")
    name = decoded.get("name")
    picture = decoded.get("picture")

    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()

    if user is None:
        # Determine role and status based on email domain
        domain = email.split("@")[-1].lower() if "@" in email else ""

        if email.lower() == settings.admin_email.lower():
            role = "superadmin"
            user_status = "approved"
            modules = ALL_MODULES
        elif domain == settings.auto_approve_domain.lower():
            role = "user"
            user_status = "approved"
            modules = ALL_MODULES
        else:
            role = "user"
            user_status = "pending"
            modules = []

        user = User(
            firebase_uid=uid,
            email=email,
            name=name,
            picture=picture,
            role=role,
            status=user_status,
            allowed_modules=modules,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update profile info if changed
        changed = False
        if name and user.name != name:
            user.name = name
            changed = True
        if picture and user.picture != picture:
            user.picture = picture
            changed = True
        if changed:
            await db.commit()

    return user


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """
    FastAPI dependency: verify Firebase token → upsert user → enforce status.
    """
    _init_firebase()

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido",
        )

    token = auth_header[7:]

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

    user = await _upsert_user(decoded, db)

    if user.status == "blocked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sua conta foi bloqueada. Contate o administrador.",
        )

    return CurrentUser(
        uid=user.firebase_uid,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        status=user.status,
        allowed_modules=user.allowed_modules or [],
    )


def require_role(*allowed_roles: str):
    """Dependency factory: require specific role(s). superadmin always passes."""
    async def check_role(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role == "superadmin":
            return user
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Roles necessárias: {', '.join(allowed_roles)}",
            )
        return user
    return check_role


def require_module(module_name: str):
    """Dependency factory: require access to a specific module."""
    async def check_module(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role == "superadmin":
            return user
        if user.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sua conta ainda não foi aprovada.",
            )
        if module_name not in (user.allowed_modules or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso ao módulo '{module_name}' não autorizado. Contate o administrador.",
            )
        return user
    return check_module


# ── Auth Router (GET /api/auth/me) ──

router = APIRouter()


@router.get("/me")
async def get_me(user: CurrentUser = Depends(get_current_user)):
    """Return the current authenticated user's info, status, and allowed modules."""
    return {
        "uid": user.uid,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "status": user.status,
        "allowed_modules": user.allowed_modules,
    }

"""
Gabi Hub — Firebase Auth Service
Verifies Firebase ID tokens and extracts user info.
Used as FastAPI dependency for protected routes.
"""

from dataclasses import dataclass
from functools import lru_cache

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Depends, HTTPException, Request, status

from app.config import get_settings

settings = get_settings()

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
            # Might be a file path
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
    role: str = "user"  # ghost, law, ntalk, admin


async def get_current_user(request: Request) -> CurrentUser:
    """
    FastAPI dependency: extract and verify Firebase token from Authorization header.
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

    return CurrentUser(
        uid=decoded["uid"],
        email=decoded.get("email", ""),
        name=decoded.get("name"),
        picture=decoded.get("picture"),
        role=decoded.get("role", "user"),
    )


def require_role(*allowed_roles: str):
    """Dependency factory: require specific role(s)."""
    async def check_role(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Roles necessárias: {', '.join(allowed_roles)}",
            )
        return user
    return check_role

"""Lightweight dependency stubs for auth and role checks."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.utils.auth import verify_token


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Return verified JWT claims when a bearer token is provided.

    This is intentionally database-agnostic. When no token is present, a
    lightweight anonymous placeholder is returned so the backend remains safe
    for the current tests and legacy routes.
    """

    if credentials is None:
        return {"authenticated": False, "id": None, "role": "guest"}

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    return {
        "authenticated": True,
        "id": payload.get("sub"),
        "role": payload.get("role", "guest"),
        "token_payload": payload,
    }


def require_role(*allowed_roles: str) -> Callable[..., Any]:
    """Return a placeholder role-check dependency for future protected routes."""

    async def _require_role(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        role = current_user.get("role")
        if allowed_roles and role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role",
            )
        return current_user

    return _require_role
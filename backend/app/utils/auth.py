"""
Authentication utilities: JWT token creation/verification and password hashing.
Uses bcrypt directly instead of passlib to avoid version-compatibility issues.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

import bcrypt
from jose import jwt, JWTError

from app.config import settings


def _create_token(data: Dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    secret_key = getattr(settings, "JWT_SECRET", None) or getattr(settings, "SECRET_KEY", None)
    if not secret_key:
        raise ValueError("JWT_SECRET or SECRET_KEY must be set")
    return jwt.encode(to_encode, secret_key, algorithm=settings.ALGORITHM)


def create_access_token(data: Dict) -> str:
    return _create_token(
        data,
        timedelta(minutes=int(settings.ACCESS_TOKEN_EXPIRE_MINUTES)),
    )


def create_refresh_token(data: Dict) -> str:
    refresh_expire_days = int(getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7))
    payload = {**data, "token_type": "refresh"}
    return _create_token(payload, timedelta(days=refresh_expire_days))


def verify_token(token: str) -> Optional[Dict]:
    try:
        secret_key = getattr(settings, "JWT_SECRET", None) or getattr(settings, "SECRET_KEY", None)
        if not secret_key:
            return None
        return jwt.decode(token, secret_key, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")

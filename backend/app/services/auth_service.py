"""Placeholder auth service helpers for the v1 scaffold."""

from app.models.schemas import UserCreate, UserLogin
from app.utils.auth import create_access_token


def build_registration_response(user: UserCreate) -> dict:
    return {
        "message": "User registration endpoint ready",
        "email": user.email,
        "note": "Database persistence will be integrated later",
    }


def build_login_response(user: UserLogin) -> dict:
    token = create_access_token({"sub": user.email, "role": "citizen"})
    return {"access_token": token, "token_type": "bearer"}
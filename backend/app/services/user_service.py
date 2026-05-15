"""Placeholder user service helpers for the v1 scaffold."""


def build_current_user_response(current_user: dict) -> dict:
    return {
        "message": "Current user endpoint ready",
        "user": {
            "id": current_user.get("id"),
            "role": current_user.get("role", "guest"),
            "authenticated": current_user.get("authenticated", False),
        },
        "note": "User profile persistence will be integrated later",
    }
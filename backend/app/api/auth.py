from __future__ import annotations
from typing import Optional
import base64
import json
import os
import secrets
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer

from app.utils.auth import create_access_token, create_refresh_token, hash_password, verify_password, verify_token
from app.config import settings
from app.services.sms_service import send_sms

router = APIRouter(prefix="/auth", tags=["auth"])
router_v1 = APIRouter(prefix="/api/v1/auth", tags=["auth-v1"])
router_api = APIRouter(prefix="/api/auth", tags=["auth-api"])
router_officer_auth = APIRouter(prefix="/api/v1/officer-auth", tags=["officer-auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
refresh_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/officer-auth/refresh", auto_error=False)

_OTP_STORE: dict[str, dict] = {}
_OTP_EXP_MINUTES = 5
_OTP_MAX_ATTEMPTS = 5

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, credentials
except Exception:  # pragma: no cover - optional dependency in local dev
    firebase_admin = None
    firebase_auth = None
    credentials = None


def _ensure_firebase_admin():
    if firebase_admin is None:
        raise HTTPException(
            status_code=500,
            detail="Firebase Admin SDK is not installed on backend.",
        )

    if firebase_admin._apps:
        return

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    service_account_json_b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_B64", "").strip()

    if service_account_json_b64 and not service_account_json:
        try:
            service_account_json = base64.b64decode(service_account_json_b64).decode("utf-8")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Invalid FIREBASE_SERVICE_ACCOUNT_JSON_B64: {exc}")

    # Common copy/paste format in env files: wrapped in quotes with escaped newlines.
    if service_account_json:
        if (service_account_json.startswith("'") and service_account_json.endswith("'")) or (
            service_account_json.startswith('"') and service_account_json.endswith('"')
        ):
            service_account_json = service_account_json[1:-1]
        service_account_json = service_account_json.replace("\\n", "\n")

    project_id = (
        os.getenv("FIREBASE_PROJECT_ID", "").strip()
        or getattr(settings, "FIREBASE_PROJECT_ID", "").strip()
    )
    google_app_creds = (
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
        or getattr(settings, "GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    )
    if google_app_creds and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_app_creds

    if service_account_json:
        try:
            cred = credentials.Certificate(json.loads(service_account_json))
            opts = {"projectId": project_id} if project_id else None
            firebase_admin.initialize_app(cred, opts)
            return
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Invalid Firebase service account JSON: {exc}")

    # Fall back to GOOGLE_APPLICATION_CREDENTIALS if set in environment.
    try:
        opts = {"projectId": project_id} if project_id else None
        firebase_admin.initialize_app(options=opts)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Firebase Admin initialization failed. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS. {exc}",
        )


def _verify_firebase_token(firebase_token: str) -> dict:
    if not firebase_token:
        raise HTTPException(status_code=422, detail="firebase_token is required")

    _ensure_firebase_admin()
    try:
        return firebase_auth.verify_id_token(firebase_token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {exc}")


def _supabase():
    from app.db.supabase_client import supabase
    return supabase


def _lookup_user(identifier: str) -> Optional[dict]:
    sb = _supabase()
    # Try phone first, then email
    r = sb.table("users").select("*").eq("phone", identifier).execute()
    if not r.data:
        r = sb.table("users").select("*").eq("email", identifier).execute()
    return r.data[0] if r.data else None


def _normalize_indian_phone(phone: str) -> str:
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if digits.startswith("91") and len(digits) > 10:
        digits = digits[-10:]
    if len(digits) != 10:
        raise HTTPException(status_code=422, detail="Enter a valid 10-digit Indian mobile number")
    return digits


def _issue_officer_tokens(user: dict) -> dict:
    user_id = str(user.get("user_id") or "")
    role = user.get("role", "officer")
    claims = {
        "sub": user_id or user.get("phone") or user.get("email") or "",
        "role": role,
        "user_id": user_id,
        "phone": user.get("phone", ""),
    }
    access_token = create_access_token(claims)
    refresh_token = create_refresh_token(claims)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in_minutes": int(settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "role": role,
        "name": user.get("name", "Officer"),
        "user_id": user_id,
    }


def _upsert_officer_user(phone: str, name: str = "Officer", email: str = "") -> dict:
    sb = _supabase()
    normalized = _normalize_indian_phone(phone)

    r = sb.table("users").select("*").eq("phone", normalized).execute()
    if r.data:
        user = r.data[0]
        if user.get("role") not in ("officer", "admin"):
            try:
                res = sb.table("users").update({"role": "officer", "is_verified": True}).eq("user_id", user["user_id"]).execute()
                if res and res.data:
                    return res.data[0]
            except Exception:
                user["role"] = "officer"
        return user

    temp_password = secrets.token_urlsafe(18)
    payload = {
        "phone": normalized,
        "email": email if email else f"{normalized}@officer.jansetu",
        "name": name or "Officer",
        "password_hash": hash_password(temp_password),
        "role": "officer",
        "trust_score": 60,
        "trust_level": "trusted",
        "is_verified": True,
    }
    created = sb.table("users").insert(payload).execute()
    if not created or not created.data:
        raise HTTPException(status_code=500, detail="Could not create officer profile")
    return created.data[0]


def _lookup_user_by_firebase_or_email(firebase_uid: str, email: str = "", phone: str = "") -> Optional[dict]:
    sb = _supabase()

    # Optional column: firebase_uid (fallback safely when column is absent).
    if firebase_uid:
        try:
            r = sb.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
            if r.data:
                return r.data[0]
        except Exception:
            pass

    if email:
        try:
            r = sb.table("users").select("*").eq("email", email).execute()
            if r.data:
                return r.data[0]
        except Exception:
            pass

    if phone:
        try:
            r = sb.table("users").select("*").eq("phone", phone).execute()
            if r.data:
                return r.data[0]
        except Exception:
            pass

    return None


def _create_firebase_user(
    firebase_uid: str,
    email: str = "",
    phone: str = "",
    name: str = "Citizen",
    role: str = "citizen",
) -> dict:
    sb = _supabase()
    password_seed = secrets.token_urlsafe(18)

    base_row = {
        "phone": phone or "",
        "email": email or (f"{phone}@jansetu.in" if phone else f"{firebase_uid}@firebase.jansetu"),
        "name": name or "Citizen",
        "password_hash": hash_password(password_seed),
        "role": role,
        "trust_score": 50,
        "trust_level": "new",
        "is_verified": True,
    }

    # Try with firebase_uid first; if schema doesn't have it, fallback.
    try:
        row = dict(base_row)
        row["firebase_uid"] = firebase_uid
        result = sb.table("users").insert(row).execute()
        if result and result.data:
            return result.data[0]
    except Exception:
        pass

    result = sb.table("users").insert(base_row).execute()
    if not result or not result.data:
        raise HTTPException(status_code=500, detail="Could not create user for Firebase login")
    return result.data[0]


def _promote_user_to_officer(user: dict, firebase_uid: str = "") -> dict:
    sb = _supabase()
    user_id = user.get("user_id")
    if not user_id:
        return user

    patch = {"role": "officer", "is_verified": True}
    if firebase_uid:
        patch["firebase_uid"] = firebase_uid

    try:
        result = sb.table("users").update(patch).eq("user_id", user_id).execute()
        if result and result.data:
            return result.data[0]
    except Exception:
        pass

    user["role"] = "officer"
    return user


def _build_response(user: dict) -> dict:
    user_id = str(user.get("user_id") or "")
    token_payload = {
        "sub": user_id or user.get("phone") or user.get("email") or "",
        "role": user.get("role", "citizen"),
        "user_id": user_id,
        "phone": user.get("phone", ""),
    }
    access_token = create_access_token(token_payload)
    # Real schema uses ward_id (not assigned_ward_id)
    data = {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.get("role", "citizen"),
        "name": user.get("name", "User"),
        "user_id": user_id,
        "jurisdiction_assigned": bool(user.get("ward_id") or user.get("assigned_ward_id")),
    }
    return {"success": True, **data, "data": data}


async def _register(payload: dict) -> dict:
    sb = _supabase()
    phone = payload.get("phone", "")
    email = payload.get("email", "")
    name = payload.get("name", "Citizen")
    password = payload.get("password", "")

    if not password or (not phone and not email):
        raise HTTPException(status_code=422, detail="phone/email and password are required")

    existing = None
    if phone:
        existing = sb.table("users").select("user_id").eq("phone", phone).execute()
    if not existing or not existing.data:
        if email:
            existing = sb.table("users").select("user_id").eq("email", email).execute()
    if existing and existing.data:
        raise HTTPException(status_code=400, detail="User already exists")

    result = sb.table("users").insert({
        "phone": phone,
        "email": email or f"{phone}@jansetu.in",
        "name": name,
        "password_hash": hash_password(password),
        "role": "citizen",
        "trust_score": 50,
        "trust_level": "new",
        "is_verified": False,
    }).execute()

    if not result or not result.data:
        raise HTTPException(status_code=500, detail="Registration failed")

    return {"message": "User registered successfully", "user_id": str(result.data[0]["user_id"])}


async def _login(request: Request, officer_only: bool = False) -> dict:
    body = await request.json()
    identifier = body.get("phone") or body.get("email") or ""
    password = body.get("password", "")

    if not identifier or not password:
        raise HTTPException(status_code=422, detail="phone/email and password are required")

    user = _lookup_user(identifier)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    pw_hash = user.get("password_hash", "")
    if not pw_hash:
        raise HTTPException(status_code=401, detail="Account has no password set")

    if not verify_password(password, pw_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if officer_only and user.get("role") not in ("officer", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Officer credentials required.")

    return _build_response(user)


async def _me(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub") or payload.get("user_id")
    role = payload.get("role", "citizen")

    try:
        sb = _supabase()
        r = sb.table("users").select("*").eq("user_id", user_id).execute()
        if r.data:
            u = r.data[0]
            return {
                "user_id": str(u.get("user_id") or ""),
                "name": u.get("name", "User"),
                "phone": u.get("phone", ""),
                "email": u.get("email", ""),
                "role": u.get("role", role),
                "trust_score": u.get("trust_score", 50),
                "trust_level": u.get("trust_level", "new"),
                "is_verified": u.get("is_verified", False),
            }
    except Exception:
        pass

    return {"sub": user_id, "role": role, "status": "authenticated"}


# ── Legacy /auth/* ─────────────────────────────────────────────────────────

@router.post("/register")
async def register(payload: dict):
    return await _register(payload)


@router.post("/login")
async def login(request: Request):
    return await _login(request)


@router.get("/me")
async def get_me(token: str = Depends(oauth2_scheme)):
    return await _me(token)


# ── V1 /api/v1/auth/* ─────────────────────────────────────────────────────

@router_v1.post("/register")
async def register_v1(payload: dict):
    return await _register(payload)


@router_v1.post("/login")
async def login_v1(request: Request):
    return await _login(request)


@router_v1.post("/officer-login")
async def officer_login_v1(request: Request):
    return await _login(request, officer_only=True)


@router_v1.get("/me")
async def get_me_v1(token: str = Depends(oauth2_scheme)):
    return await _me(token)


@router_api.post("/firebase-login")
async def firebase_login(request: Request):
    body = await request.json()
    decoded = _verify_firebase_token(body.get("firebase_token", ""))

    firebase_uid = decoded.get("uid", "")
    phone = body.get("phone") or decoded.get("phone_number") or ""
    email = body.get("email") or decoded.get("email") or ""
    name = body.get("name") or decoded.get("name") or "Citizen"

    user = _lookup_user_by_firebase_or_email(firebase_uid, email=email, phone=phone)
    if not user:
        user = _create_firebase_user(
            firebase_uid=firebase_uid,
            email=email,
            phone=phone,
            name=name,
            role="citizen",
        )

    response = _build_response(user)
    return {
        "jwt_token": response["access_token"],
        "role": response["role"],
        "name": response["name"],
        "user_id": response["user_id"],
    }


@router_api.post("/firebase-officer-login")
async def firebase_officer_login(request: Request):
    body = await request.json()
    decoded = _verify_firebase_token(body.get("firebase_token", ""))

    firebase_uid = decoded.get("uid", "")
    email = body.get("email") or decoded.get("email") or ""
    phone = body.get("phone") or decoded.get("phone_number") or ""
    name = body.get("name") or decoded.get("name") or "Officer"

    if not email and not phone:
        raise HTTPException(status_code=422, detail="email or phone is required")

    user = _lookup_user_by_firebase_or_email(firebase_uid, email=email, phone=phone)
    if not user:
        user = _create_firebase_user(
            firebase_uid=firebase_uid,
            email=email,
            phone=phone,
            name=name,
            role="officer",
        )

    role = user.get("role", "officer")
    if role not in ("officer", "admin"):
        user = _promote_user_to_officer(user, firebase_uid=firebase_uid)

    response = _build_response(user)
    return {
        "jwt_token": response["access_token"],
        "role": response["role"],
        "name": response["name"],
        "user_id": response["user_id"],
    }


@router_officer_auth.post("/send-otp")
async def officer_send_otp(request: Request):
    body = await request.json()
    phone = _normalize_indian_phone(body.get("phone", ""))
    name = body.get("name") or "Officer"
    email = body.get("email") or ""

    # Ensure officer profile exists/linked in Supabase.
    _upsert_officer_user(phone, name=name, email=email)

    otp = f"{random.randint(0, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=_OTP_EXP_MINUTES)
    _OTP_STORE[phone] = {"otp": otp, "expires_at": expires_at, "attempts": 0}

    sms_message = f"JanSetu Commander OTP: {otp}. Valid for {_OTP_EXP_MINUTES} minutes."
    sms_result = await send_sms(f"+91{phone}", sms_message)

    return {
        "success": True,
        "message": "OTP sent successfully",
        "phone": phone,
        "expires_in_seconds": _OTP_EXP_MINUTES * 60,
        # Dev-friendly fallback when SMS is mocked or fails.
        "dev_otp": otp if (not sms_result.get("success") or sms_result.get("mock")) else None,
    }


@router_officer_auth.post("/verify-otp")
async def officer_verify_otp(request: Request):
    body = await request.json()
    phone = _normalize_indian_phone(body.get("phone", ""))
    otp = str(body.get("otp", "")).strip()

    otp_row = _OTP_STORE.get(phone)
    if not otp_row:
        raise HTTPException(status_code=400, detail="OTP not requested or expired")

    if datetime.now(timezone.utc) > otp_row["expires_at"]:
        _OTP_STORE.pop(phone, None)
        raise HTTPException(status_code=400, detail="OTP expired")

    otp_row["attempts"] += 1
    if otp_row["attempts"] > _OTP_MAX_ATTEMPTS:
        _OTP_STORE.pop(phone, None)
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new OTP.")

    if otp_row["otp"] != otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    _OTP_STORE.pop(phone, None)
    user = _upsert_officer_user(phone)
    tokens = _issue_officer_tokens(user)
    return {"success": True, **tokens}


@router_officer_auth.post("/refresh")
async def officer_refresh(token: str = Depends(refresh_oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token required")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if payload.get("token_type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    role = payload.get("role", "officer")
    if role not in ("officer", "admin"):
        raise HTTPException(status_code=403, detail="Officer access only")

    user_id = payload.get("user_id")
    phone = payload.get("phone", "")
    name = "Officer"

    try:
        sb = _supabase()
        if user_id:
            r = sb.table("users").select("*").eq("user_id", user_id).execute()
            if r.data:
                user = r.data[0]
            else:
                user = _upsert_officer_user(phone, name=name)
        else:
            user = _upsert_officer_user(phone, name=name)
    except Exception:
        user = _upsert_officer_user(phone, name=name)

    return {"success": True, **_issue_officer_tokens(user)}

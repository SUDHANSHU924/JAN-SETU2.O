from __future__ import annotations
from typing import Optional

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.api.dependencies import require_role
from app.api.grievances import _resolve_user_id
from app.db.supabase_client import supabase
from app.models.schemas import ComplaintCreateRequest, ComplaintStatusUpdateRequest
from app.services.ai_pipeline import classify_text
from app.services.geo_mapper import get_ward_from_coordinates
from app.services.routing_engine import run_routing_engine
from app.services.sla_service import calculate_sla
from app.services.token_generator import generate_tracking_token


router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])

_COMPLAINT_CACHE: dict[str, dict[str, Any]] = {}
_COMPLAINT_TIMELINES: dict[str, list[dict[str, str]]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _store_complaint_snapshot(record: dict[str, Any]) -> None:
    complaint_id = str(record.get("complaint_id") or record.get("id") or "")
    tracking_token = str(record.get("tracking_token") or "")
    if complaint_id:
        _COMPLAINT_CACHE[complaint_id] = record
    if tracking_token:
        _COMPLAINT_CACHE[tracking_token] = record


def _append_timeline_entry(key: str, status_value: str, note: str = "", created_at: Optional[str] = None) -> None:
    if not key:
        return
    timeline = _COMPLAINT_TIMELINES.setdefault(key, [])
    timeline.append(
        {
            "status": status_value,
            "note": note or "",
            "created_at": created_at or _now_iso(),
        }
    )


def _serialize_user(user_row: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not user_row:
        return None
    return {
        "user_id": user_row.get("user_id"),
        "name": user_row.get("name") or "Citizen",
        "email": user_row.get("email"),
        "phone": user_row.get("phone"),
        "role": user_row.get("role") or "citizen",
        "trust_score": user_row.get("trust_score"),
        "trust_level": user_row.get("trust_level"),
        "is_verified": user_row.get("is_verified"),
    }


def _load_user_by_id(user_id: Optional[str]) -> Optional[dict[str, Any]]:
    if not user_id:
        return None
    try:
        result = supabase.table("users").select("*").eq("user_id", user_id).limit(1).execute()
        if result.data:
            return result.data[0]
    except Exception:
        return None
    return None


def _load_officer_by_id(officer_id: Optional[str]) -> Optional[dict[str, Any]]:
    if not officer_id:
        return None
    try:
        result = supabase.table("officer_profiles").select("*").eq("officer_id", officer_id).limit(1).execute()
        if result.data:
            return result.data[0]
    except Exception:
        return None
    return None


def _build_ai_analysis(complaint_row: dict[str, Any], snapshot: Optional[dict[str, Any]]) -> dict[str, Any]:
    snapshot = snapshot or {}
    return {
        "category": complaint_row.get("category") or snapshot.get("category") or "General",
        "predicted_category": snapshot.get("predicted_category") or complaint_row.get("category") or "General",
        "priority": complaint_row.get("priority") or snapshot.get("priority") or "medium",
        "sla_days": complaint_row.get("sla_days") or snapshot.get("sla_days") or 5.0,
        "confidence": complaint_row.get("ai_confidence") or snapshot.get("confidence") or 0.0,
        "language": snapshot.get("language") or "English",
        "address": snapshot.get("address") or complaint_row.get("address") or "",
        "media_urls": snapshot.get("media_urls") or [],
    }


def _build_timeline(complaint_row: dict[str, Any], complaint_key: Optional[str], snapshot: Optional[dict[str, Any]]) -> list[dict[str, str]]:
    snapshot = snapshot or {}
    timeline: list[dict[str, str]] = []
    created_at = complaint_row.get("created_at") or snapshot.get("created_at")
    timeline.append(
        {
            "status": "submitted",
            "note": "Complaint submitted",
            "created_at": created_at or _now_iso(),
        }
    )

    assigned_at = complaint_row.get("assigned_at") or snapshot.get("assigned_at")
    if complaint_row.get("officer_id") or snapshot.get("officer_id"):
        timeline.append(
            {
                "status": "assigned",
                "note": "Complaint assigned to an officer",
                "created_at": assigned_at or created_at or _now_iso(),
            }
        )

    current_status = str(complaint_row.get("status") or snapshot.get("status") or "submitted")
    if current_status.lower() not in {"submitted", "assigned"}:
        timeline.append(
            {
                "status": current_status,
                "note": complaint_row.get("resolution_text") or snapshot.get("note") or "Status updated",
                "created_at": complaint_row.get("resolved_at") or complaint_row.get("updated_at") or _now_iso(),
            }
        )

    cached_timeline = _COMPLAINT_TIMELINES.get(complaint_key or "", [])
    if cached_timeline:
        timeline.extend(cached_timeline)

    deduped: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()
    for item in timeline:
        marker = (item.get("status", ""), item.get("note", ""), item.get("created_at", ""))
        if marker in seen:
            continue
        seen.add(marker)
        deduped.append(item)
    return deduped


def _fetch_complaint_by_tracking_token(tracking_token: str) -> Optional[dict[str, Any]]:
    try:
        result = supabase.table("complaints").select("*").eq("tracking_token", tracking_token).limit(1).execute()
        if result.data:
            return result.data[0]
    except Exception:
        return None
    return None


def _fetch_complaint_by_id(complaint_id: str) -> Optional[dict[str, Any]]:
    try:
        result = supabase.table("complaints").select("*").eq("complaint_id", complaint_id).limit(1).execute()
        if result.data:
            return result.data[0]
    except Exception:
        return None
    return None


async def _create_complaint(
    payload: ComplaintCreateRequest,
    request: Request,
    background_tasks: Optional[BackgroundTasks] = None,
) -> dict[str, Any]:
    text = payload.text.strip()
    normalized_text = text or payload.category or "General complaint"
    ai_result = classify_text(normalized_text)
    complaint_category = payload.category or ai_result.get("category") or "General"
    priority = str(ai_result.get("priority") or "Medium").upper()
    sla_days = calculate_sla(complaint_category, priority)
    ward = get_ward_from_coordinates(payload.lat, payload.lng)
    tracking_token = generate_tracking_token(complaint_category, ward)
    auth_header = request.headers.get("authorization")
    user_id = _resolve_user_id(auth_header, "", "Citizen")

    duplicate_status = {"is_duplicate": False}
    if text:
        try:
            from app.services.duplicate_service import check_duplicate

            duplicate_status = check_duplicate(text, complaint_category)
        except Exception:
            duplicate_status = {"is_duplicate": False}

    duplicate_warning = duplicate_status if duplicate_status.get("is_duplicate") else None

    insert_payload = {
        "user_id": user_id,
        "tracking_token": tracking_token,
        "text_original": text,
        "category": complaint_category,
        "priority": priority.lower(),
        "sla_days": sla_days,
        "ai_confidence": 0.0,
        "lat": float(payload.lat),
        "lng": float(payload.lng),
        "status": "submitted",
    }

    result = supabase.table("complaints").insert(insert_payload).execute()
    complaint_row = result.data[0] if result.data else None
    if not complaint_row:
        complaint_row = _fetch_complaint_by_tracking_token(tracking_token)
    if not complaint_row:
        raise HTTPException(status_code=500, detail="Complaint insert did not return a record")

    complaint_id = str(complaint_row.get("complaint_id") or complaint_row.get("id") or "")
    snapshot = {
        "complaint_id": complaint_id,
        "tracking_token": tracking_token,
        "text": text,
        "category": complaint_category,
        "priority": priority,
        "sla_days": sla_days,
        "language": payload.language,
        "address": payload.address,
        "media_urls": list(payload.media_urls or []),
        "predicted_category": ai_result.get("category") or complaint_category,
        "confidence": 0.0,
        "created_at": complaint_row.get("created_at") or _now_iso(),
        "status": complaint_row.get("status") or "submitted",
        "user_id": user_id,
        "duplicate": bool(duplicate_warning),
        "duplicate_similarity": duplicate_warning.get("similarity") if duplicate_warning else 0.0,
        "duplicate_match": duplicate_warning.get("matched_complaint") if duplicate_warning else None,
    }
    _store_complaint_snapshot({**complaint_row, **snapshot})
    _append_timeline_entry(complaint_id or tracking_token, "submitted", "Complaint submitted", snapshot["created_at"])

    if background_tasks is not None and complaint_id:
        background_tasks.add_task(
            run_routing_engine,
            complaint_id,
            {
                "description": text,
                "category": complaint_category,
                "priority": priority,
                "sla_days": sla_days,
                "sentiment": "Neutral",
                "citizen_name": "Citizen",
                "citizen_phone": "",
                "lat": payload.lat,
                "lng": payload.lng,
                "media_urls": list(payload.media_urls or []),
                "auth_score": 0.0,
            },
        )

    return {
        "complaint_id": complaint_id,
        "tracking_token": tracking_token,
        "sla_days": sla_days,
        "status": complaint_row.get("status") or "submitted",
        "duplicate": bool(duplicate_warning),
    }


@router.post("")
@router.post("/")
async def create_complaint(payload: ComplaintCreateRequest, request: Request, background_tasks: BackgroundTasks):
    return await _create_complaint(payload, request, background_tasks)


# ── Rich officer queue (MUST be before /{tracking_token}) ─────────────────
@router.get("/queue")
async def get_complaint_queue(
    current_user: dict[str, Any] = Depends(require_role("officer", "admin")),
):
    """Return all active complaints ordered by SLA urgency. Includes citizen info."""
    from datetime import timedelta

    def _sla_hours(row: dict) -> float:
        try:
            sla_days = float(row.get("sla_days") or 5)
            created_str = str(row.get("created_at") or "")
            if created_str:
                if created_str.endswith("Z"):
                    created_str = created_str[:-1] + "+00:00"
                created = datetime.fromisoformat(created_str)
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                deadline = created + timedelta(days=sla_days)
                left = (deadline - datetime.now(timezone.utc)).total_seconds() / 3600
                return round(left, 1)
        except Exception:
            pass
        return 120.0

    try:
        r = supabase.table("complaints").select("*").not_.in_(
            "status", ["resolved", "closed", "rejected"]
        ).order("created_at", desc=True).limit(80).execute()
        rows = r.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Queue fetch error: {e}")

    items = []
    for row in rows:
        cid = str(row.get("complaint_id") or "")
        token = str(row.get("tracking_token") or "")
        short_id = f"#CMP-{cid[-4:].upper()}" if cid else token[:8]
        priority = str(row.get("priority") or "medium").lower()
        sla_h = _sla_hours(row)

        citizen: dict = {"name": row.get("citizen_name") or "Citizen", "phone": "", "email": ""}
        uid = row.get("user_id")
        if uid:
            try:
                ur = supabase.table("users").select("name,phone,email").eq("user_id", uid).limit(1).execute()
                if ur.data:
                    u = ur.data[0]
                    citizen = {
                        "name": u.get("name") or row.get("citizen_name") or "Citizen",
                        "phone": u.get("phone") or "",
                        "email": u.get("email") or "",
                    }
            except Exception:
                pass

        items.append({
            "complaint_id": cid,
            "id": short_id,
            "tracking_token": token,
            "title": row.get("text_original") or row.get("category") or "Complaint",
            "description": row.get("text_original") or "",
            "category": row.get("category") or "General",
            "cat": row.get("category") or "General",
            "department": row.get("department") or "BBMP",
            "dept": row.get("department") or "BBMP",
            "priority": priority,
            "status": str(row.get("status") or "submitted").lower(),
            "sla_hours": sla_h,
            "slaHours": sla_h,
            "sla_days": row.get("sla_days") or 5,
            "critical": priority == "high" and sla_h < 4,
            "created_at": row.get("created_at") or "",
            "resolved_at": row.get("resolved_at"),
            "citizen": citizen,
            "citizen_name": citizen["name"],
            "address": row.get("address") or "",
            "lat": row.get("lat"),
            "lng": row.get("lng"),
        })

    items.sort(key=lambda x: (0 if x["priority"] == "high" else 1 if x["priority"] == "medium" else 2, x["sla_hours"]))
    return items


@router.get("/{tracking_token}")
async def get_complaint(tracking_token: str):
    complaint_row = _fetch_complaint_by_tracking_token(tracking_token)
    snapshot = _COMPLAINT_CACHE.get(tracking_token) or {}

    if not complaint_row and not snapshot:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if not complaint_row:
        complaint_row = snapshot

    complaint_id = str(complaint_row.get("complaint_id") or complaint_row.get("id") or snapshot.get("complaint_id") or "")
    if complaint_id and not snapshot:
        snapshot = _COMPLAINT_CACHE.get(complaint_id) or snapshot

    citizen_row = _load_user_by_id(str(complaint_row.get("user_id") or snapshot.get("user_id") or ""))
    officer_row = _load_officer_by_id(str(complaint_row.get("officer_id") or snapshot.get("officer_id") or ""))
    ai_analysis = _build_ai_analysis(complaint_row, snapshot)
    timeline = _build_timeline(complaint_row, complaint_id or tracking_token, snapshot)

    complaint_payload = dict(complaint_row)
    complaint_payload.setdefault("tracking_token", tracking_token)
    complaint_payload.setdefault("complaint_id", complaint_id)

    return {
        **complaint_payload,
        "complaint": complaint_payload,
        "citizen": _serialize_user(citizen_row) or snapshot.get("citizen") or {"name": "Citizen"},
        "ai_analysis": ai_analysis,
        "officer": officer_row or snapshot.get("officer"),
        "timeline": timeline,
        "status_timeline": timeline,
    }


@router.patch("/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: str,
    payload: ComplaintStatusUpdateRequest,
    current_user: dict[str, Any] = Depends(require_role("officer", "admin")),
):
    complaint_row = _fetch_complaint_by_id(complaint_id)
    if not complaint_row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    update_payload: dict[str, Any] = {"status": payload.status}
    if payload.note:
        update_payload["resolution_text"] = payload.note
    if payload.status.lower() in {"resolved", "closed", "completed"}:
        update_payload["resolved_at"] = "now()"

    result = supabase.table("complaints").update(update_payload).eq("complaint_id", complaint_id).execute()
    updated_row = result.data[0] if result.data else {**complaint_row, **update_payload}

    complaint_key = str(updated_row.get("complaint_id") or complaint_id)
    _store_complaint_snapshot(updated_row)
    _append_timeline_entry(complaint_key, payload.status, payload.note or "Status updated")

    # Notify citizen
    citizen_user_id = complaint_row.get("user_id")
    token = complaint_row.get("tracking_token", complaint_id[:8])
    _push_notification(
        user_id=citizen_user_id,
        complaint_id=complaint_id,
        title=f"Complaint Updated 🔄",
        body=f"Your complaint {token} status changed to: {payload.status.replace('_',' ').title()}. {payload.note or ''}".strip(),
        notif_type="complaint_update",
    )

    return {
        "complaint_id": complaint_key,
        "status": payload.status,
        "note": payload.note,
        "updated_by": current_user.get("id"),
    }


@router.delete("/{complaint_id}")
async def reject_and_delete_complaint(
    complaint_id: str,
    current_user: dict[str, Any] = Depends(require_role("officer", "admin")),
):
    """Reject complaint: notify citizen, then delete from Supabase."""
    complaint_row = _fetch_complaint_by_id(complaint_id)
    if not complaint_row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    citizen_user_id = complaint_row.get("user_id")
    token = complaint_row.get("tracking_token", complaint_id[:8])

    # Push rejection notification FIRST (with complaint_id=None to avoid FK issues)
    _push_notification(
        user_id=citizen_user_id,
        complaint_id=None,  # don't link — complaint will be deleted
        title="Complaint Rejected ❌",
        body=f"Your complaint {token} has been reviewed and rejected by the officer. Please re-file if this is incorrect.",
        notif_type="complaint_rejected",
    )

    # Delete all linked notifications for this complaint (FK cascade)
    try:
        supabase.table("notifications").delete().eq("complaint_id", complaint_id).execute()
    except Exception:
        pass  # ok if none exist

    # Now safe to delete the complaint
    supabase.table("complaints").delete().eq("complaint_id", complaint_id).execute()

    # Clean local cache
    _COMPLAINT_CACHE.pop(complaint_id, None)
    _COMPLAINT_TIMELINES.pop(complaint_id, None)

    return {"message": "Complaint rejected and deleted", "complaint_id": complaint_id}


@router.post("/{complaint_id}/resolve-full")
async def resolve_complaint_full(
    complaint_id: str,
    payload: dict,
    current_user: dict[str, Any] = Depends(require_role("officer", "admin")),
):
    """Resolve complaint: mark resolved in Supabase + notify citizen."""
    complaint_row = _fetch_complaint_by_id(complaint_id)
    if not complaint_row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    resolution = payload.get("resolution", "Issue resolved by officer.")

    result = supabase.table("complaints").update({
        "status": "resolved",
        "resolution_text": resolution,
        "resolved_at": "now()",
    }).eq("complaint_id", complaint_id).execute()

    citizen_user_id = complaint_row.get("user_id")
    token = complaint_row.get("tracking_token", complaint_id[:8])

    _push_notification(
        user_id=citizen_user_id,
        complaint_id=complaint_id,
        title="Complaint Resolved ✅",
        body=f"Great news! Your complaint {token} has been resolved. {resolution}",
        notif_type="complaint_resolved",
    )

    return {"message": "Resolved", "complaint_id": complaint_id, "resolution": resolution}


def _push_notification(
    user_id: Optional[str],
    complaint_id: Optional[str],
    title: str,
    body: str,
    notif_type: str = "complaint_update",
) -> None:
    """Insert a notification row into Supabase for the citizen."""
    if not user_id:
        return
    try:
        supabase.table("notifications").insert({
            "user_id": user_id,
            "complaint_id": complaint_id,
            "title": title,
            "body": body,
            "type": notif_type,
            "is_read": False,
        }).execute()
    except Exception as exc:
        # Non-critical — log but don't fail the request
        print(f"[notifications] Failed to push: {exc}")
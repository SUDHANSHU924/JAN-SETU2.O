from __future__ import annotations
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, Request

from app.services.routing_engine import run_routing_engine
from app.services.geo_mapper import get_ward_from_coordinates
from app.services.token_generator import generate_tracking_token
from app.utils.auth import verify_token


router = APIRouter(prefix="/grievances", tags=["grievances"])
TEMP_COMPLAINTS: dict = {}
GUEST_PASSWORD_HASH = "$2b$12$n.z8fpfNHSmQZG6X4RckU.uwK843JqTDB7QSHcv2mzhMCRHypQHM2"


def _resolve_user_id(auth_header: Optional[str], citizen_phone: str, citizen_name: str) -> str:
    """Resolve a valid users.user_id for complaint persistence."""
    from app.db.supabase_client import supabase

    def _lookup_user(field: str, value: str) -> Optional[str]:
        if not value:
            return None
        result = supabase.table("users").select("user_id").eq(field, value).limit(1).execute()
        if result.data:
            return str(result.data[0]["user_id"])
        return None

    token = ""
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    if token:
        payload = verify_token(token)
        if payload:
            identifier = payload.get("sub") or ""
            resolved = _lookup_user("user_id", identifier) or _lookup_user("phone", identifier)
            if resolved:
                return resolved

    if citizen_phone:
        resolved = _lookup_user("phone", citizen_phone)
        if resolved:
            return resolved

    # Create guest user
    guest_phone = citizen_phone or "anonymous"
    guest_name = citizen_name or "Citizen"
    guest_result = supabase.table("users").insert({
        "phone": guest_phone,
        "email": f"{guest_phone}@guest.local" if guest_phone != "anonymous" else "anonymous@guest.local",
        "name": guest_name,
        "password_hash": GUEST_PASSWORD_HASH,
        "role": "citizen",
        "trust_score": 50,
        "trust_level": "new",
        "is_verified": False,
    }).execute()

    if guest_result.data:
        return str(guest_result.data[0]["user_id"])

    raise HTTPException(status_code=500, detail="Unable to resolve a user record for complaint submission")


@router.post("/")
async def submit_grievance(
    request: Request,
    title: str = Form(...),
    description: str = Form(...),
    channel: str = Form("web"),
    lat: float = Form(...),
    lng: float = Form(...),
    citizen_name: str = Form(...),
    citizen_phone: str = Form(...),
    address: str = Form(""),
    file: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = None,
):
    """Submit a citizen grievance and route it through the processing pipeline."""
    ward = get_ward_from_coordinates(float(lat), float(lng))
    tracking_token = generate_tracking_token(title or "General", ward)
    auth_header = request.headers.get("authorization")

    from app.services.ai_pipeline import classify_text, verify_image

    ai_result = {"category": "General", "priority": "Medium", "sla_days": 5.0}
    clip_result = {"verified": True, "score": 0.0}

    description_text = description or title or ""

    if description_text:
        ai_result = classify_text(description_text)
        print(f"[AI] Category: {ai_result['category']} | Priority: {ai_result['priority']} | SLA: {ai_result['sla_days']} days")

    if file and file.filename:
        try:
            image_bytes = await file.read()
            clip_result = verify_image(description_text, image_bytes)
            print(f"[AI] Image verified: {clip_result['verified']} | Score: {clip_result['score']}")
        except Exception as e:
            print(f"[AI] Image verification skipped: {e}")

    from app.services.duplicate_service import check_duplicate
    dup_result = {"is_duplicate": False, "similarity": 0.0}
    if description_text and ai_result.get("category"):
        try:
            dup_result = check_duplicate(description_text, ai_result["category"])
            print(f"[AI] Duplicate: {dup_result['is_duplicate']} | Similarity: {dup_result['similarity']}")
        except Exception as e:
            print(f"[AI] Duplicate check skipped: {e}")

    if dup_result.get("is_duplicate"):
        return {
            "status": "duplicate",
            "message": "Similar complaint already exists",
            "matched_complaint": dup_result.get("matched_complaint"),
            "similarity": dup_result.get("similarity")
        }

    try:
        from app.db.supabase_client import supabase
        user_id = _resolve_user_id(auth_header, citizen_phone, citizen_name)

        result = supabase.table("complaints").insert({
            "user_id": user_id,
            "tracking_token": tracking_token,
            "text_original": description,
            "text_english": description,
            "language_code": "en",
            "category": ai_result.get("category", "General"),
            "priority": ai_result.get("priority", "medium").lower(),
            "sla_days": ai_result.get("sla_days", 5.0),
            "ai_confidence": clip_result.get("score", 0.0),
            "auth_score": 0.0,
            "lat": float(lat),
            "lng": float(lng),
            "address": address or "",
            "status": "submitted",
            "is_public": True,
        }).execute()

        grievance_id = None
        if result.data:
            grievance_id = result.data[0].get("complaint_id") or result.data[0].get("id")

        if not grievance_id:
            lookup = supabase.table("complaints").select("complaint_id").eq("tracking_token", tracking_token).limit(1).execute()
            if lookup.data:
                grievance_id = lookup.data[0]["complaint_id"]

        if not grievance_id:
            raise RuntimeError("Complaint insert did not return a complaint_id")

    except Exception as e:
        print(f"Warning: Supabase insert failed: {str(e)}")
        grievance_id = f"temp-{uuid4()}"
        TEMP_COMPLAINTS[tracking_token] = {
            "complaint_id": grievance_id,
            "tracking_token": tracking_token,
            "text_original": description,
            "category": ai_result.get("category", "General"),
            "status": "submitted",
            "lat": float(lat),
            "lng": float(lng),
        }

    if background_tasks is not None:
        background_tasks.add_task(
            run_routing_engine,
            grievance_id,
            {
                "description": description,
                "category": ai_result.get("category", "General"),
                "priority": ai_result.get("priority", "MEDIUM").upper(),
                "sla_days": ai_result.get("sla_days", 5.0),
                "sentiment": "Neutral",
                "citizen_name": citizen_name,
                "citizen_phone": citizen_phone,
                "lat": lat,
                "lng": lng,
                "media_urls": [],
                "auth_score": 0.0
            }
        )

    return {
        "message": "Grievance submitted",
        "status": "processing",
        "grievance_id": grievance_id,
        "tracking_token": tracking_token,
    }


@router.get("/track/{token}")
async def track_complaint(token: str):
    from app.db.supabase_client import supabase

    result = supabase.table("complaints").select("*").eq("tracking_token", token).execute()
    if result.data:
        return result.data[0]

    temp = TEMP_COMPLAINTS.get(token)
    if temp:
        return temp

    raise HTTPException(status_code=404, detail="Complaint not found")


@router.get("/my")
async def my_complaints(request: Request):
    from app.db.supabase_client import supabase
    from app.utils.auth import verify_token as _vt

    token = ""
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    user_id = None
    if token:
        payload = _vt(token)
        if payload:
            user_id = payload.get("sub") or payload.get("user_id")

    try:
        query = supabase.table("complaints").select(
            "complaint_id, tracking_token, status, category, created_at, priority, text_original"
        ).order("created_at", desc=True).limit(20)
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data
    except Exception as e:
        print(f"[my_complaints] Error: {e}")
        return []


@router.get("/queue")
async def queue_grievances(priority: str = None):
    """Fetch grievances for officer queue."""
    from app.db.supabase_client import supabase

    try:
        query = supabase.table("complaints").select(
            "complaint_id, tracking_token, text_original, category, priority, status, created_at, lat, lng, sla_days, ai_confidence"
        ).order("created_at", desc=True)

        if priority and priority.lower() != "all":
            query = query.eq("priority", priority.lower())

        result = query.execute()

        formatted = []
        for item in (result.data or []):
            cid = str(item.get("complaint_id") or "")
            formatted.append({
                "id": f"#CMP-{cid[-4:].upper()}",
                "complaint_id": cid,
                "title": (item.get("text_original") or "")[:80] or "Unknown Issue",
                "cat": item.get("category") or "General",
                "dept": "BBMP",
                "citizen": "Citizen",
                "priority": (item.get("priority") or "medium").lower(),
                "slaHours": (float(item.get("sla_days") or 5.0)) * 24,
                "status": item.get("status") or "submitted",
                "critical": (item.get("priority") or "").lower() == "high",
                "tracking_token": item.get("tracking_token") or "",
            })

        return formatted
    except Exception as e:
        print(f"[ERROR] Queue fetch failed: {str(e)}")
        return []


@router.get("/test/token")
async def test_token():
    from app.services.token_generator import generate_tracking_token
    from app.services.sla_service import calculate_sla
    from app.services.geo_mapper import get_ward_from_coordinates, get_zone_room

    ward = get_ward_from_coordinates(19.12, 72.85)
    token = generate_tracking_token("Water Supply", ward)
    sla = calculate_sla("Water Supply", "HIGH")
    zone = get_zone_room(ward)
    return {"token": token, "ward": ward, "zone": zone, "sla_days": sla}


@router.post("/test/ai-classify")
async def test_classify(text: str = Form(...)):
    from app.services.ai_pipeline import classify_text
    result = classify_text(text)
    return {"input": text, "result": result}


@router.post("/test/ai-verify-image")
async def test_verify(text: str = Form(...), file: UploadFile = File(...)):
    from app.services.ai_pipeline import verify_image
    image_bytes = await file.read()
    result = verify_image(text, image_bytes)
    return {"input_text": text, "result": result}


@router.post("/test/ai-duplicate")
async def test_duplicate(text: str = Form(...), category: str = Form(...)):
    from app.services.duplicate_service import check_duplicate
    result = check_duplicate(text, category)
    return {"input": text, "result": result}


@router.post("/test/transcribe-audio")
async def transcribe_audio_route(file: UploadFile = File(...)):
    import tempfile, os, subprocess
    from app.services.ai_pipeline import transcribe_audio

    webm_path = None
    wav_path = None

    try:
        suffix = ".webm"
        if file.filename:
            ext = os.path.splitext(file.filename)[1]
            if ext:
                suffix = ext

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            webm_path = tmp.name

        wav_path = webm_path.replace(suffix, ".wav")
        if webm_path.endswith((".webm", ".ogg", ".m4a")):
            try:
                subprocess.run([
                    "ffmpeg", "-i", webm_path,
                    "-ar", "16000", "-ac", "1",
                    "-f", "wav", wav_path,
                    "-y", "-loglevel", "quiet"
                ], check=True, timeout=30)
                transcribe_path = wav_path
            except subprocess.CalledProcessError:
                transcribe_path = webm_path
        else:
            transcribe_path = webm_path

        result = transcribe_audio(transcribe_path)
        return result

    except Exception as e:
        return {"transcript": "", "success": False, "error": str(e)}

    finally:
        for path in [webm_path, wav_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass

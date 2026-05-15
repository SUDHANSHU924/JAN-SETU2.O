from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/officer", tags=["officer"])


from typing import Optional

class ResolveGrievanceRequest(BaseModel):
    resolution: str


class UpdateStatusRequest(BaseModel):
    status: str
    comment: Optional[str] = None


@router.get("/assigned")
async def get_assigned_grievances():
    from app.db.supabase_client import supabase

    result = supabase.table("complaints").select("*").eq(
        "status", "assigned"
    ).order("created_at", desc=True).execute()
    return result.data


@router.patch("/{grievance_id}/resolve")
async def resolve_grievance(grievance_id: str, request: ResolveGrievanceRequest):
    from app.db.supabase_client import supabase

    supabase.table("complaints").update({
        "status": "resolved",
        "resolution_text": request.resolution,
        "resolved_at": "now()"
    }).eq("complaint_id", grievance_id).execute()
    return {"message": "Resolved"}


@router.get("/analytics/summary")
async def analytics_summary():
    from app.db.supabase_client import supabase

    result = supabase.table("complaints").select("category, status").execute()
    return result.data

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/locations", tags=["locations"])


def _supabase():
    from app.db.supabase_client import supabase
    return supabase


@router.get("/states")
def get_states():
    try:
        result = _supabase().table("states").select("state_id, state_name, state_code").execute()
        return result.data
    except Exception:
        return []


@router.get("/districts")
def get_districts(state_id: int):
    try:
        result = _supabase().table("districts").select("district_id, district_name").eq("state_id", state_id).execute()
        return result.data
    except Exception:
        return []


@router.get("/areas")
def get_areas(district_id: int):
    try:
        result = _supabase().table("areas").select("area_id, area_name, pincode").eq("district_id", district_id).execute()
        return result.data
    except Exception:
        return []


@router.get("/wards")
def get_wards(area_id: int):
    try:
        result = _supabase().table("wards").select("ward_id, ward_number, ward_name").eq("area_id", area_id).execute()
        return result.data
    except Exception:
        return []

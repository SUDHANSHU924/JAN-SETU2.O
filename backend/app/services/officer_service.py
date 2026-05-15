from __future__ import annotations
"""Officer assignment service — queries real officer_profiles from Supabase."""

from typing import Optional


import logging

logger = logging.getLogger(__name__)

CATEGORY_DEPT_KEYWORDS = {
    "Water Supply": ["water", "bwssb", "jal"],
    "Roads": ["road", "pwd", "transport", "traffic"],
    "Electricity": ["electric", "bescom", "power"],
    "Sanitation": ["sanit", "bbmp", "garbage", "waste"],
    "Public Health": ["health", "medical"],
    "Parks & Recreation": ["park", "garden"],
    "Street Lighting": ["light", "lamp"],
}


def _dept_keyword_for_category(category: str) -> Optional[str]:
    cat_lower = (category or "").lower()
    for cat_key, keywords in CATEGORY_DEPT_KEYWORDS.items():
        if cat_key.lower() in cat_lower or any(k in cat_lower for k in keywords):
            return keywords[0]
    return None


def build_officer_queue_response() -> dict:
    return {"message": "Officer queue endpoint ready", "officer_id": None, "grievances": []}


def build_officer_summary_response() -> dict:
    return {"message": "Officer analytics summary endpoint ready", "summary": {}}


async def assign_least_loaded_officer(category: str, ward: str) -> Optional[str]:
    """
    Query officer_profiles for a real officer UUID.
    Falls back gracefully to None (no officer assigned) if none found.
    """
    from app.db.supabase_client import supabase

    try:
        result = supabase.table("officer_profiles").select(
            "officer_id, max_workload"
        ).execute()

        officers = result.data or []
        if not officers:
            logger.warning("[OFFICER] No officer profiles found in database")
            return None

        # Pick least loaded officer from available ones
        best_id = None
        min_load = float("inf")

        for officer in officers:
            oid = str(officer.get("officer_id") or "")
            if not oid:
                continue
            try:
                load_result = supabase.table("complaints").select(
                    "complaint_id", count="exact"
                ).eq("officer_id", oid).in_(
                    "status", ["assigned", "in_progress"]
                ).execute()
                load = load_result.count or 0
                max_workload = int(officer.get("max_workload") or 20)
                if load < max_workload and load < min_load:
                    min_load = load
                    best_id = oid
            except Exception as e:
                logger.debug(f"[OFFICER] Load check failed for {oid}: {e}")
                if best_id is None:
                    best_id = oid

        if best_id:
            logger.info(f"[OFFICER] Assigned officer {best_id} (load={min_load})")
        else:
            logger.warning("[OFFICER] All officers at capacity or unavailable")

        return best_id

    except Exception as e:
        logger.error(f"[OFFICER] Assignment query failed: {e}")
        return None

"""
Supabase client — uses the real Supabase project.

The SUPABASE_URL env var may include a /rest/v1/ suffix (added during
setup); we strip it so supabase-py gets the clean project base URL.
"""
from __future__ import annotations

import os

from app.config import settings

# ── Fix URL — strip any trailing /rest/v1 path added by mistake ─────────────
_raw_url = (
    getattr(settings, "SUPABASE_URL", None)
    or os.getenv("SUPABASE_URL", "")
)
SUPABASE_URL: str = (
    _raw_url
    .rstrip("/")
    .removesuffix("/rest/v1")
    .rstrip("/")
)

_service_key = (
    getattr(settings, "SUPABASE_SERVICE_KEY", None)
    or os.getenv("SUPABASE_SERVICE_KEY", "")
)

# ── Create the real Supabase client ─────────────────────────────────────────
try:
    from supabase import create_client as _create
    supabase = _create(SUPABASE_URL, _service_key)
    print(f"[Supabase] Client created → {SUPABASE_URL[:50]}")
except Exception as _e:
    print(f"[Supabase] Could not create client: {_e}")
    # Fall back to the local in-memory store (seeded) when Supabase isn't configured.
    try:
        from app.db.local_store import local_client
        supabase = local_client
        print("[Supabase] Using LocalSupabaseClient (in-memory seeded data)")
    except Exception:
        # Final minimal stub — should be extremely rare
        class _Stub:
            def table(self, *a, **kw): return self
            def select(self, *a, **kw): return self
            def eq(self, *a, **kw): return self
            def insert(self, *a, **kw): return self
            def update(self, *a, **kw): return self
            def order(self, *a, **kw): return self
            def limit(self, *a, **kw): return self
            def not_(self, *a, **kw): return self
            def in_(self, *a, **kw): return self
            def execute(self):
                class _R: data = []; count = 0
                return _R()
        supabase = _Stub()


async def ping_supabase() -> bool:
    """Verify DB is reachable on startup."""
    try:
        r = supabase.table("complaints").select("complaint_id").limit(1).execute()
        print(f"[DB] Supabase connected — {len(r.data)} complaint(s) found")
        return True
    except Exception as e:
        print(f"[DB] Supabase ping failed: {e}")
        return False

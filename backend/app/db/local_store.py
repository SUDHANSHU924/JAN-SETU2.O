from __future__ import annotations
"""
In-memory data store — fully compatible Supabase client emulator.
Used when Supabase tables are unavailable (PGRST125 / empty database).
Implements the same chained query API: table().select().eq().execute()
"""
from typing import Optional

import copy
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any


# ── Timestamp helper ────────────────────────────────────────────────────────
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


NOW = datetime.now(timezone.utc)


# ── Seed data ────────────────────────────────────────────────────────────────
_SEED_USERS = [
    {
        "user_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "phone": "9000000002",
        "email": "citizen@jansetu.in",
        "name": "Rahul Sharma",
        # Citizen@123
        "password_hash": "$2b$10$pHyzk9D87ZNQoeAKEnN.KOkQqyo6hBHJ1b.O/RmbCCtQAx0WQNLIi",
        "role": "citizen",
        "trust_score": 75,
        "trust_level": "verified",
        "is_verified": True,
        "assigned_ward_id": None,
        "created_at": (NOW - timedelta(days=30)).isoformat(),
    },
    {
        "user_id": "bbbbbbbb-0000-0000-0000-000000000002",
        "phone": "9876543210",
        "email": "officer@jansetu.in",
        "name": "Insp. Raghav Singh",
        # Commander@123
        "password_hash": "$2b$10$fLNZhqphxi2Sztw.SwCM4uawb0zeNDz4dgO7g7JD9ON5AXhuC6H7m",
        "role": "officer",
        "trust_score": 90,
        "trust_level": "trusted",
        "is_verified": True,
        "assigned_ward_id": 12,
        "created_at": (NOW - timedelta(days=90)).isoformat(),
    },
    {
        "user_id": "cccccccc-0000-0000-0000-000000000003",
        "phone": "9000000001",
        "email": "admin@jansetu.in",
        "name": "Admin Kumar",
        # Admin@123
        "password_hash": "$2b$10$/4xoml4njr0NxhBZvCxdBeUsvTlFoBNENKAUsoVrxW8w4k.vwiGwu",
        "role": "admin",
        "trust_score": 100,
        "trust_level": "trusted",
        "is_verified": True,
        "assigned_ward_id": None,
        "created_at": (NOW - timedelta(days=180)).isoformat(),
    },
]

_SEED_COMPLAINTS = [
    {
        "complaint_id": "11111111-0000-0000-0000-000000000001",
        "user_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "tracking_token": "WTR/BNG/001234",
        "text_original": "Water supply disrupted for 3 days in Ward 4. Taps completely dry.",
        "category": "Water Supply",
        "priority": "high",
        "sla_days": 2.0,
        "ai_confidence": 0.94,
        "lat": 12.9716,
        "lng": 77.5946,
        "status": "submitted",
        "officer_id": None,
        "department": "BWSSB",
        "citizen_name": "Rahul Sharma",
        "created_at": (NOW - timedelta(hours=48)).isoformat(),
        "resolved_at": None,
        "resolution_text": None,
        "assigned_at": None,
    },
    {
        "complaint_id": "22222222-0000-0000-0000-000000000002",
        "user_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "tracking_token": "RD/BNG/004521",
        "text_original": "Major pothole causing accidents on MG Road near K.R. Circle junction",
        "category": "Road & Infrastructure",
        "priority": "high",
        "sla_days": 3.0,
        "ai_confidence": 0.91,
        "lat": 12.9756,
        "lng": 77.6010,
        "status": "assigned",
        "officer_id": "bbbbbbbb-0000-0000-0000-000000000002",
        "department": "PWD",
        "citizen_name": "Priya Nair",
        "created_at": (NOW - timedelta(hours=24)).isoformat(),
        "resolved_at": None,
        "resolution_text": None,
        "assigned_at": (NOW - timedelta(hours=20)).isoformat(),
    },
    {
        "complaint_id": "33333333-0000-0000-0000-000000000003",
        "user_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "tracking_token": "SAN/BNG/007892",
        "text_original": "Garbage not collected for 5 days, foul smell and health hazard for children",
        "category": "Sanitation",
        "priority": "medium",
        "sla_days": 5.0,
        "ai_confidence": 0.87,
        "lat": 12.9800,
        "lng": 77.5900,
        "status": "in_progress",
        "officer_id": "bbbbbbbb-0000-0000-0000-000000000002",
        "department": "BBMP",
        "citizen_name": "Suresh Rao",
        "created_at": (NOW - timedelta(hours=72)).isoformat(),
        "resolved_at": None,
        "resolution_text": None,
        "assigned_at": (NOW - timedelta(hours=68)).isoformat(),
    },
    {
        "complaint_id": "44444444-0000-0000-0000-000000000004",
        "user_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "tracking_token": "ELEC/BNG/003311",
        "text_original": "Streetlight not working near Vidyamandir School — danger for children at night",
        "category": "Electricity",
        "priority": "medium",
        "sla_days": 4.0,
        "ai_confidence": 0.85,
        "lat": 12.9690,
        "lng": 77.5980,
        "status": "submitted",
        "officer_id": None,
        "department": "BESCOM",
        "citizen_name": "Anita Desai",
        "created_at": (NOW - timedelta(hours=12)).isoformat(),
        "resolved_at": None,
        "resolution_text": None,
        "assigned_at": None,
    },
    {
        "complaint_id": "55555555-0000-0000-0000-000000000005",
        "user_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "tracking_token": "PKS/BNG/009001",
        "text_original": "Park benches broken and playground equipment damaged in Cubbon Park sector",
        "category": "Parks & Recreation",
        "priority": "low",
        "sla_days": 7.0,
        "ai_confidence": 0.82,
        "lat": 12.9763,
        "lng": 77.5929,
        "status": "resolved",
        "officer_id": "bbbbbbbb-0000-0000-0000-000000000002",
        "department": "BBMP",
        "citizen_name": "Meera Iyer",
        "created_at": (NOW - timedelta(days=7)).isoformat(),
        "resolved_at": (NOW - timedelta(days=2)).isoformat(),
        "resolution_text": "Benches repaired and playground equipment replaced. Site inspection completed.",
        "assigned_at": (NOW - timedelta(days=6)).isoformat(),
    },
]

_SEED_OFFICERS = [
    {
        "officer_id": "bbbbbbbb-0000-0000-0000-000000000002",
        "badge_number": "MH/BNG/001",
        "name": "Insp. Raghav Singh",
        "email": "officer@jansetu.in",
        "phone": "9876543210",
        "role": "officer",
        "assigned_ward_id": 12,
        "district_id": 1,
        "additional_ward_ids": [],
        "created_at": (NOW - timedelta(days=90)).isoformat(),
    },
]

_SEED_STATES = [
    {"state_id": 1, "state_name": "Karnataka", "state_code": "KA"},
    {"state_id": 2, "state_name": "Maharashtra", "state_code": "MH"},
    {"state_id": 3, "state_name": "Tamil Nadu", "state_code": "TN"},
    {"state_id": 4, "state_name": "Telangana", "state_code": "TG"},
    {"state_id": 5, "state_name": "Kerala", "state_code": "KL"},
    {"state_id": 6, "state_name": "Gujarat", "state_code": "GJ"},
    {"state_id": 7, "state_name": "Delhi", "state_code": "DL"},
    {"state_id": 8, "state_name": "West Bengal", "state_code": "WB"},
    {"state_id": 9, "state_name": "Rajasthan", "state_code": "RJ"},
    {"state_id": 10, "state_name": "Uttar Pradesh", "state_code": "UP"},
]

_SEED_DISTRICTS = [
    {"district_id": 1, "district_name": "Bengaluru Urban", "state_id": 1},
    {"district_id": 2, "district_name": "Mysuru", "state_id": 1},
    {"district_id": 3, "district_name": "Mumbai City", "state_id": 2},
    {"district_id": 4, "district_name": "Pune", "state_id": 2},
    {"district_id": 5, "district_name": "Chennai", "state_id": 3},
    {"district_id": 6, "district_name": "Hyderabad", "state_id": 4},
    {"district_id": 7, "district_name": "Thiruvananthapuram", "state_id": 5},
    {"district_id": 8, "district_name": "Ahmedabad", "state_id": 6},
    {"district_id": 9, "district_name": "New Delhi", "state_id": 7},
    {"district_id": 10, "district_name": "Kolkata", "state_id": 8},
]

_SEED_AREAS = [
    {"area_id": 1, "area_name": "Indiranagar", "pincode": "560038", "district_id": 1},
    {"area_id": 2, "area_name": "Koramangala", "pincode": "560034", "district_id": 1},
    {"area_id": 3, "area_name": "Whitefield", "pincode": "560066", "district_id": 1},
    {"area_id": 4, "area_name": "Jayanagar", "pincode": "560041", "district_id": 1},
    {"area_id": 5, "area_name": "Bandra", "pincode": "400050", "district_id": 3},
    {"area_id": 6, "area_name": "Andheri", "pincode": "400069", "district_id": 3},
    {"area_id": 7, "area_name": "Banjara Hills", "pincode": "500034", "district_id": 6},
    {"area_id": 8, "area_name": "Jubilee Hills", "pincode": "500033", "district_id": 6},
]

_SEED_WARDS = [
    {"ward_id": 1,  "ward_number": "Ward-1",  "ward_name": "Indiranagar North", "area_id": 1},
    {"ward_id": 2,  "ward_number": "Ward-2",  "ward_name": "Indiranagar South", "area_id": 1},
    {"ward_id": 3,  "ward_number": "Ward-3",  "ward_name": "Koramangala Block-1", "area_id": 2},
    {"ward_id": 4,  "ward_number": "Ward-4",  "ward_name": "Koramangala Block-2", "area_id": 2},
    {"ward_id": 5,  "ward_number": "Ward-5",  "ward_name": "Whitefield East", "area_id": 3},
    {"ward_id": 6,  "ward_number": "Ward-6",  "ward_name": "Whitefield West", "area_id": 3},
    {"ward_id": 7,  "ward_number": "Ward-7",  "ward_name": "Jayanagar 4th Block", "area_id": 4},
    {"ward_id": 8,  "ward_number": "Ward-8",  "ward_name": "Jayanagar 9th Block", "area_id": 4},
    {"ward_id": 9,  "ward_number": "Ward-9",  "ward_name": "Bandra West", "area_id": 5},
    {"ward_id": 10, "ward_number": "Ward-10", "ward_name": "Andheri East", "area_id": 6},
    {"ward_id": 11, "ward_number": "Ward-11", "ward_name": "Banjara Hills A", "area_id": 7},
    {"ward_id": 12, "ward_number": "Ward-12", "ward_name": "Jubilee Hills B", "area_id": 8},
]

# ── Live tables (mutable) ────────────────────────────────────────────────────
_TABLES: dict[str, list[dict]] = {
    "users":      [copy.deepcopy(u) for u in _SEED_USERS],
    "complaints": [copy.deepcopy(c) for c in _SEED_COMPLAINTS],
    "officers":   [copy.deepcopy(o) for o in _SEED_OFFICERS],
    "states":     list(_SEED_STATES),
    "districts":  list(_SEED_DISTRICTS),
    "areas":      list(_SEED_AREAS),
    "wards":      list(_SEED_WARDS),
}

# Primary-key column per table
_PK: dict[str, str] = {
    "users":      "user_id",
    "complaints": "complaint_id",
    "officers":   "officer_id",
    "states":     "state_id",
    "districts":  "district_id",
    "areas":      "area_id",
    "wards":      "ward_id",
}


# ── Query result wrapper ─────────────────────────────────────────────────────
class _Result:
    def __init__(self, data: list[dict], count: Optional[int] = None):
        self.data = data
        self.count = count if count is not None else len(data)


# ── Not-filter proxy ─────────────────────────────────────────────────────────
class _NotFilter:
    def __init__(self, query: "_TableQuery"):
        self._q = query

    def in_(self, column: str, values: list) -> "_TableQuery":
        self._q._filters.append(("not_in", column, [str(v) for v in values]))
        return self._q


# ── TableQuery ───────────────────────────────────────────────────────────────
class _TableQuery:
    def __init__(self, table_name: str):
        self._table = table_name
        self._select_cols: str = "*"
        self._count_mode: Optional[str] = None
        self._filters: list[tuple] = []
        self._order_col: Optional[str] = None
        self._order_desc: bool = False
        self._limit_n: Optional[int] = None
        self._insert_data: Optional[dict] = None
        self._update_data: Optional[dict] = None

    # ── Chaining methods ──────────────────────────────────────────────────

    def select(self, columns: str = "*", count: Optional[str] = None) -> "_TableQuery":
        self._select_cols = columns
        self._count_mode = count
        return self

    def eq(self, column: str, value: Any) -> "_TableQuery":
        self._filters.append(("eq", column, str(value)))
        return self

    @property
    def not_(self) -> _NotFilter:
        return _NotFilter(self)

    def in_(self, column: str, values: list) -> "_TableQuery":
        self._filters.append(("in", column, [str(v) for v in values]))
        return self

    def order(self, column: str, desc: bool = False) -> "_TableQuery":
        self._order_col = column
        self._order_desc = desc
        return self

    def limit(self, n: int) -> "_TableQuery":
        self._limit_n = n
        return self

    def insert(self, data: dict) -> "_TableQuery":
        self._insert_data = data
        return self

    def update(self, data: dict) -> "_TableQuery":
        self._update_data = data
        return self

    # ── Execute ──────────────────────────────────────────────────────────

    def execute(self) -> _Result:
        if self._insert_data is not None:
            return self._do_insert()
        if self._update_data is not None:
            return self._do_update()
        return self._do_select()

    # ── Internal helpers ─────────────────────────────────────────────────

    def _rows(self) -> list[dict]:
        return _TABLES.get(self._table, [])

    def _match(self, row: dict) -> bool:
        for op, col, val in self._filters:
            row_val = str(row.get(col, ""))
            if op == "eq":
                if row_val != val:
                    return False
            elif op == "not_in":
                if row_val in val:
                    return False
            elif op == "in":
                if row_val not in val:
                    return False
        return True

    def _do_select(self) -> _Result:
        rows = [copy.deepcopy(r) for r in self._rows() if self._match(r)]
        if self._order_col:
            rows.sort(
                key=lambda r: r.get(self._order_col) or "",
                reverse=self._order_desc,
            )
        total = len(rows)
        if self._limit_n is not None:
            rows = rows[: self._limit_n]
        count = total if self._count_mode == "exact" else None
        return _Result(rows, count)

    def _do_insert(self) -> _Result:
        table_rows = _TABLES.setdefault(self._table, [])
        pk = _PK.get(self._table, "id")
        record = copy.deepcopy(self._insert_data)
        if pk not in record or not record[pk]:
            record[pk] = str(uuid.uuid4())
        if "created_at" not in record:
            record["created_at"] = _now()
        table_rows.append(record)
        return _Result([copy.deepcopy(record)])

    def _do_update(self) -> _Result:
        table_rows = _TABLES.get(self._table, [])
        updated = []
        for row in table_rows:
            if self._match(row):
                row.update(self._update_data)
                row["updated_at"] = _now()
                updated.append(copy.deepcopy(row))
        return _Result(updated)


# ── Helper: Export seed data ────────────────────────────────────────────────
def get_store_data() -> dict:
    """Return all seed data for database seeding."""
    return {
        "users": [copy.deepcopy(u) for u in _SEED_USERS],
        "complaints": [copy.deepcopy(c) for c in _SEED_COMPLAINTS],
        "officers": [copy.deepcopy(o) for o in _SEED_OFFICERS],
        "states": list(_SEED_STATES),
        "districts": list(_SEED_DISTRICTS),
        "areas": list(_SEED_AREAS),
        "wards": list(_SEED_WARDS),
    }


# ── Public LocalSupabaseClient ───────────────────────────────────────────────
class LocalSupabaseClient:
    """Drop-in replacement for the supabase-py Client."""

    def table(self, name: str) -> _TableQuery:
        return _TableQuery(name)

    # Stubs for auth / storage / rpc (not needed but prevent AttributeErrors)
    def rpc(self, fn: str, params: dict = None) -> _TableQuery:
        return _TableQuery("__rpc__")

    @property
    def auth(self):
        return self

    @property
    def storage(self):
        return self


# Singleton
local_client = LocalSupabaseClient()

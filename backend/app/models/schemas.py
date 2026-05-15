"""
Pydantic schemas for request and response payloads.

These schemas define the shapes of data exchanged via the API.
Database models (SQLAlchemy) are implemented by another teammate; these
schemas remain independent and are safe to use now for validation and
to-be-returned responses.
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthLoginRequest(BaseModel):
    phone: str
    password: str


class AuthLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    role: str
    name: str
    jurisdiction_assigned: bool = False
    assigned_ward_id: Optional[int] = None
    officer_id: Optional[str] = None


class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None


class GrievanceCreate(BaseModel):
    title: str
    description: str
    channel: str


class GrievanceResponse(BaseModel):
    id: str
    title: str
    description: str
    channel: str
    status: str


class LocationState(BaseModel):
    state_id: int
    state_name: str
    state_code: str


class LocationDistrict(BaseModel):
    district_id: int
    district_name: str


class LocationArea(BaseModel):
    area_id: int
    area_name: str
    pincode: str


class LocationWard(BaseModel):
    ward_id: int
    ward_number: str
    ward_name: str


class ComplaintCreateRequest(BaseModel):
    text: str
    lat: float
    lng: float
    language: str = "en"
    address: str = ""
    media_urls: list[str] = Field(default_factory=list)
    category: Optional[str] = None


class ComplaintStatusUpdateRequest(BaseModel):
    status: str
    note: str = ""


class OfficerJurisdictionUpdateRequest(BaseModel):
    ward_id: int
    additional_ward_ids: list[int] = Field(default_factory=list)


class OfficerProfileResponse(BaseModel):
    officer_id: str
    badge_number: Optional[str] = None
    name: str
    email: Optional[str] = None
    role: str
    assigned_ward_id: Optional[int] = None
    additional_ward_ids: list[int] = Field(default_factory=list)
    district_id: Optional[int] = None
    jurisdiction_assigned: bool = False


class ComplaintTimelineEntry(BaseModel):
    status: str
    note: str = ""
    created_at: str


class ComplaintDetailResponse(BaseModel):
    complaint_id: str
    tracking_token: str
    citizen: dict
    officer: Optional[dict]
    complaint: dict
    ai_analysis: dict
    status_timeline: list[ComplaintTimelineEntry]

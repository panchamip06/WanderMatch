"""
Pydantic schemas for Phase 6 — Matching (Solo-to-Group & Solo-to-Guide).
"""
from typing import List, Optional
from pydantic import BaseModel


class GroupMatchOut(BaseModel):
    trip_id: str
    title: str
    destination_city_id: str
    destination_city_name: str
    start_date: str
    end_date: str
    party_size: int
    current_members_count: int
    trip_mode: str
    compatibility_score: int              # 0 - 100 percentage
    match_reasons: List[str] = []         # Explainable human-readable reasons

    class Config:
        from_attributes = True


class GuideMatchOut(BaseModel):
    guide_id: str
    display_name: str
    city_id: str
    city_name: str
    languages: List[str] = []
    specialisation: str
    secondary_specialisation: Optional[str] = None
    years_experience: int
    rating: Optional[float] = None
    review_count: int
    day_rate: str
    half_day_rate: str
    currency: str
    certified: bool
    bio: str
    compatibility_score: int              # 0 - 100 percentage
    match_reasons: List[str] = []         # Explainable human-readable reasons

    class Config:
        from_attributes = True

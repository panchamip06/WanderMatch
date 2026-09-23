"""
Phase 6 — Matching API Endpoints (Solo-to-Group & Solo-to-Guide).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional
from backend.app.models.ps11 import User, UserPreference
from backend.app.schemas.matching import GroupMatchOut, GuideMatchOut
from backend.services.matching.service import matching_service

router = APIRouter(prefix="/api/matching", tags=["Matching"])


async def _resolve_user_and_pref(
    current_user: Optional[User],
    db: AsyncSession,
) -> tuple[User, Optional[UserPreference]]:
    if current_user:
        res = await db.execute(
            select(User).options(selectinload(User.preferences)).where(User.user_id == current_user.user_id)
        )
        u = res.scalar_one_or_none()
        if u:
            return u, u.preferences

    # Query the first real user with preferences from PS-11 database
    res = await db.execute(
        select(User)
        .options(selectinload(User.preferences))
        .join(UserPreference, User.user_id == UserPreference.user_id)
        .limit(1)
    )
    fallback = res.scalar_one_or_none()
    if fallback:
        return fallback, fallback.preferences

    # Fallback to any user
    res_any = await db.execute(select(User).options(selectinload(User.preferences)).limit(1))
    any_user = res_any.scalar_one_or_none()
    if any_user:
        return any_user, any_user.preferences

    # In-memory dummy if database is completely empty
    dummy = User(
        user_id="usr_0f22b1",
        display_name="Alex Carter",
        locale="en-IN",
        budget_band="mid",
        travel_style="comfort",
    )
    return dummy, None


@router.get("/groups", response_model=List[GroupMatchOut])
async def match_groups(
    limit: int = Query(15, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Find and rank compatible group trips for a solo traveller with explainable match reasons.
    Scored on language (25%), interests (35%), budget (20%), and pace (20%).
    """
    user, pref = await _resolve_user_and_pref(current_user, db)
    return await matching_service.match_solo_to_groups(user, pref, db, limit=limit)


@router.get("/guides", response_model=List[GuideMatchOut])
async def match_guides(
    city_id: Optional[str] = Query(None, description="Optional destination city ID filter"),
    language: Optional[str] = Query(None, description="Optional preferred language filter"),
    specialisation: Optional[str] = Query(None, description="Optional guide specialisation filter"),
    max_price: Optional[float] = Query(None, description="Optional maximum daily rate"),
    limit: int = Query(15, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Find and rank certified tour guides from the database with explainable match reasons.
    Scored on language match (30%), specialisation (30%), price within budget (20%), and ratings (20%).
    """
    user, pref = await _resolve_user_and_pref(current_user, db)
    return await matching_service.match_solo_to_guides(
        user=user,
        user_pref=pref,
        db=db,
        city_id=city_id,
        language=language,
        specialisation=specialisation,
        max_price=max_price,
        limit=limit,
    )

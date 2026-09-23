from datetime import datetime, timezone
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, security
from backend.app.models.ps11 import User, UserPreference
from backend.app.schemas.user import (
    UserProfile, UserSyncRequest, UserProfileUpdateRequest,
    UserLoginRequest, UserRegisterRequest, AuthResponse
)
from backend.services.auth.firebase import verify_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.get("/me", response_model=UserProfile)
@router.get("/profile", response_model=UserProfile)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Return the authenticated user profile with preferences."""
    stmt = (
        select(User)
        .where(User.user_id == current_user.user_id)
        .options(selectinload(User.preferences))
    )
    res = await db.execute(stmt)
    return res.scalar_one()

@router.post("/login", response_model=AuthResponse)
async def login(
    req: UserLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user by email or user ID and return profile + session token."""
    identifier = req.email.strip().lower()
    stmt = (
        select(User)
        .where((func.lower(User.email) == identifier) | (User.user_id == req.email.strip()))
        .options(selectinload(User.preferences))
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with identifier '{req.email}' not found. Please register an account.",
        )
    return AuthResponse(
        user=user,
        token=f"mock:{user.user_id}"
    )

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: UserRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user into `users` table and return profile + session token."""
    email_clean = req.email.strip().lower()
    stmt_check = select(User).where(func.lower(User.email) == email_clean)
    res_check = await db.execute(stmt_check)
    if res_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{req.email}' already exists.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user_id = f"usr_{uuid.uuid4().hex[:8]}"

    new_user = User(
        user_id=user_id,
        display_name=req.display_name.strip(),
        email=email_clean,
        home_city_id=req.home_city_id or "cty_c07454f1",
        home_currency=req.home_currency or "INR",
        locale=req.locale or "en-IN",
        budget_band=req.budget_band or "mid",
        travel_style=req.travel_style or "comfort",
        traveller_type=req.traveller_type or "solo",
        segment="cold_start",
        date_of_signup=today_date,
        loyalty_tier=None,
        status="active",
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(new_user)

    pref = UserPreference(
        preference_id=f"prf_{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        preferred_languages=req.locale or "en-IN",
        guide_language=req.locale or "en-IN",
        interests=req.interests or "heritage,food",
        dietary_flags=None,
        accessibility_needs=None,
        preferred_currency=req.home_currency or "INR",
        max_daily_budget="4000.00",
        max_daily_budget_currency=req.home_currency or "INR",
        pace=req.pace or "balanced",
        updated_at=now_iso,
    )
    db.add(pref)
    new_user.preferences = pref

    await db.commit()

    stmt_reload = select(User).where(User.user_id == user_id).options(selectinload(User.preferences))
    res_reload = await db.execute(stmt_reload)
    user = res_reload.scalar_one()

    return AuthResponse(
        user=user,
        token=f"mock:{user.user_id}"
    )


@router.put("/profile", response_model=UserProfile)
async def update_my_profile(
    req: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update traveller preferences and profile details."""
    now_iso = datetime.now(timezone.utc).isoformat()

    stmt = (
        select(User)
        .where(User.user_id == current_user.user_id)
        .options(selectinload(User.preferences))
    )
    res = await db.execute(stmt)
    user = res.scalar_one()

    # Update User fields
    if req.display_name is not None:
        user.display_name = req.display_name
    if req.travel_style is not None:
        user.travel_style = req.travel_style
    if req.budget_band is not None:
        user.budget_band = req.budget_band
    if req.traveller_type is not None:
        user.traveller_type = req.traveller_type
    user.updated_at = now_iso

    # Update or create UserPreference
    pref = user.preferences
    if not pref:
        pref = UserPreference(
            preference_id=f"prf_{uuid.uuid4().hex[:8]}",
            user_id=user.user_id,
            preferred_languages=req.preferred_languages or "en-IN",
            guide_language="en-IN",
            interests=req.interests or "heritage,food",
            dietary_flags=None,
            accessibility_needs=None,
            preferred_currency=user.home_currency,
            max_daily_budget="5000.00",
            max_daily_budget_currency=user.home_currency,
            pace=req.pace or "balanced",
            updated_at=now_iso,
        )
        db.add(pref)
        user.preferences = pref
    else:
        if req.pace is not None:
            pref.pace = req.pace
        if req.interests is not None:
            pref.interests = req.interests
        if req.preferred_languages is not None:
            pref.preferred_languages = req.preferred_languages
        pref.updated_at = now_iso

    await db.commit()
    stmt_reload = select(User).where(User.user_id == user.user_id).options(selectinload(User.preferences))
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalar_one()

@router.post("/sync", response_model=UserProfile)
async def sync_firebase_user(
    req: UserSyncRequest,
    auth_cred = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Sync Firebase user identity to the PostgreSQL/SQLite `users` table.
    If the user does not exist, registers them into `users`.
    """
    if not auth_cred:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
        )

    token = auth_cred.credentials
    try:
        decoded = verify_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )

    uid = decoded.get("uid")
    email = decoded.get("email") or req.email or f"{uid}@example.invalid"
    display_name = decoded.get("name") or req.display_name or f"User {uid[-6:]}"

    stmt = select(User).where(User.user_id == uid).options(selectinload(User.preferences))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    now_iso = datetime.now(timezone.utc).isoformat()
    today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if not user:
        stmt_email = select(User).where(User.email == email)
        res_email = await db.execute(stmt_email)
        existing_email_user = res_email.scalar_one_or_none()
        if existing_email_user:
            email = f"{uid}_{email}"

        user = User(
            user_id=uid if uid.startswith("usr_") else f"usr_{uuid.uuid4().hex[:8]}",
            display_name=display_name,
            email=email,
            home_city_id=req.home_city_id or "cty_c07454f1",
            home_currency="INR",
            locale=req.locale or "en-IN",
            budget_band="mid",
            travel_style="comfort",
            traveller_type=req.traveller_type or "solo",
            segment="cold_start",
            date_of_signup=today_date,
            loyalty_tier=None,
            status="active",
            created_at=now_iso,
            updated_at=now_iso,
        )
        db.add(user)

        # Also create initial default preferences
        pref = UserPreference(
            preference_id=f"prf_{uuid.uuid4().hex[:8]}",
            user_id=user.user_id,
            preferred_languages=req.locale or "en-IN",
            guide_language=req.locale or "en-IN",
            interests="heritage,food,photography",
            dietary_flags=None,
            accessibility_needs=None,
            preferred_currency="INR",
            max_daily_budget="4000.00",
            max_daily_budget_currency="INR",
            pace="balanced",
            updated_at=now_iso,
        )
        db.add(pref)
        user.preferences = pref

        await db.commit()
    else:
        if req.display_name:
            user.display_name = req.display_name
            user.updated_at = now_iso
            await db.commit()

    stmt_reload = select(User).where(User.user_id == user.user_id).options(selectinload(User.preferences))
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalar_one()

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.models.ps11 import User
from backend.services.auth.firebase import verify_token
from backend.app.core.config import settings

security = HTTPBearer(auto_error=False)

async def get_current_user_optional(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Extract and verify user from Bearer token if provided."""
    if not auth_header:
        return None

    token = auth_header.credentials
    try:
        payload = verify_token(token)
        uid = payload.get("uid")
        if not uid:
            return None

        # Look up user in system of record (PostgreSQL/SQLite)
        stmt = select(User).where(User.user_id == uid)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        return user
    except Exception:
        return None

async def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Mandatory authentication dependency."""
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.credentials
    try:
        payload = verify_token(token)
        uid = payload.get("uid")
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token does not contain a valid UID",
            )

        stmt = select(User).where(User.user_id == uid)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            if settings.FIREBASE_AUTH_MOCK:
                from datetime import datetime, timezone
                now_iso = datetime.now(timezone.utc).isoformat()
                user = User(
                    user_id=uid,
                    display_name=f"User {uid[-6:]}",
                    email=f"{uid}@example.invalid",
                    home_city_id="cty_b52d9a",
                    home_currency="INR",
                    locale="en-IN",
                    budget_band="mid",
                    travel_style="comfort",
                    traveller_type="solo",
                    segment="cold_start",
                    date_of_signup=now_iso[:10],
                    loyalty_tier=None,
                    status="active",
                    created_at=now_iso,
                    updated_at=now_iso,
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with id '{uid}' not found in system of record",
                )
        return user
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

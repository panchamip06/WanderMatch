from datetime import datetime, timezone
import uuid
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional, get_current_user
from backend.app.models.ps11 import Trip, TripMember, Itinerary, ItineraryItem, User
from backend.app.schemas.trip import (
    TripOut, TripDetailOut, CreateTripRequest, JoinTripRequest,
    CreateItineraryItemRequest, UpdateItineraryItemRequest, ItineraryItemOut
)
from backend.app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/trips", tags=["Trips"])

def parse_trip_mode(notes: Optional[str]) -> str:
    """Parse additive trip_mode tag from notes (Mode A vs Mode NA)."""
    if not notes:
        return "no_admin"
    m = re.search(r"\[mode:(admin_led|no_admin)\]", notes)
    return m.group(1) if m else "no_admin"

def build_trip_out(t: Trip) -> TripOut:
    return TripOut(
        trip_id=t.trip_id,
        owner_user_id=t.owner_user_id,
        title=t.title,
        origin_city_id=t.origin_city_id,
        destination_city_id=t.destination_city_id,
        start_date=str(t.start_date),
        end_date=str(t.end_date),
        party_size=t.party_size,
        adults=t.adults,
        children=t.children,
        trip_type=t.trip_type,
        is_group_trip=t.is_group_trip,
        trip_mode=parse_trip_mode(t.notes),
        status=t.status,
        home_currency=t.home_currency,
        notes=t.notes,
        created_at=str(t.created_at),
        updated_at=str(t.updated_at),
    )

@router.get("", response_model=List[TripOut])
async def list_trips(
    is_group: Optional[bool] = Query(True, description="Filter for group trips"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List trips from the system of record with trip_mode metadata."""
    stmt = select(Trip)
    if is_group is not None:
        stmt = stmt.where(Trip.is_group_trip == is_group)
    stmt = stmt.order_by(Trip.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    trips = result.scalars().all()
    return [build_trip_out(t) for t in trips]

@router.get("/{trip_id}", response_model=TripDetailOut)
async def get_trip_detail(
    trip_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetch trip detail with its members and active itinerary items."""
    stmt = (
        select(Trip)
        .where(Trip.trip_id == trip_id)
        .options(
            selectinload(Trip.members),
            selectinload(Trip.itineraries).selectinload(Itinerary.items),
        )
    )
    result = await db.execute(stmt)
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found",
        )

    # Find the active itinerary and sort items
    active_itn = None
    for itn in trip.itineraries:
        if itn.is_active:
            # Sort items by day_index and sort_order
            itn.items.sort(key=lambda x: (x.day_index, x.sort_order))
            active_itn = itn
            break

    trip_base = build_trip_out(trip)
    return TripDetailOut(
        **trip_base.model_dump(),
        members=trip.members,
        active_itinerary=active_itn,
    )

@router.post("", response_model=TripDetailOut, status_code=status.HTTP_201_CREATED)
async def create_trip(
    req: CreateTripRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Create a new trip container with trip_mode, base itinerary, and owner membership."""
    now_iso = datetime.now(timezone.utc).isoformat()
    trip_id = f"trp_{uuid.uuid4().hex[:8]}"

    owner_id = current_user.user_id if current_user else "usr_0f22b1"

    # Encode trip_mode in notes (Rule R1 compliant additive storage)
    notes_with_mode = f"[mode:{req.trip_mode}] {req.notes or ''}".strip()

    new_trip = Trip(
        trip_id=trip_id,
        owner_user_id=owner_id,
        title=req.title,
        origin_city_id=req.origin_city_id,
        destination_city_id=req.destination_city_id,
        start_date=req.start_date,
        end_date=req.end_date,
        party_size=req.party_size,
        adults=req.adults,
        children=req.children,
        trip_type=req.trip_type,
        is_group_trip=req.is_group_trip,
        status="planning",
        home_currency=req.home_currency,
        notes=notes_with_mode,
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(new_trip)

    # Add creator as owner member
    member = TripMember(
        member_id=f"tmb_{uuid.uuid4().hex[:8]}",
        trip_id=trip_id,
        user_id=owner_id,
        role="owner",
        joined_at=now_iso,
        share_weight=1.000,
        invited_by_user_id=None,
        status="active",
        updated_at=now_iso,
    )
    db.add(member)

    # Create base versioned itinerary
    itinerary_id = f"itn_{uuid.uuid4().hex[:8]}"
    base_itn = Itinerary(
        itinerary_id=itinerary_id,
        trip_id=trip_id,
        name=f"Base Plan — {req.title}",
        version=1,
        is_active=True,
        generated_by="user",
        total_cost="0.00",
        currency=req.home_currency,
        total_duration_minutes=0,
        total_carbon_kg=0.0,
        optimizer_weights=None,
        status="active",
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(base_itn)

    await db.commit()
    return await get_trip_detail(trip_id=trip_id, db=db)

@router.post("/{trip_id}/join")
async def join_trip(
    trip_id: str,
    req: JoinTripRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join an existing trip as a member."""
    # Check if trip exists
    stmt = select(Trip).where(Trip.trip_id == trip_id)
    res = await db.execute(stmt)
    trip = res.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Check if already a member
    stmt_mem = select(TripMember).where(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    )
    res_mem = await db.execute(stmt_mem)
    existing = res_mem.scalar_one_or_none()
    now_iso = datetime.now(timezone.utc).isoformat()

    if existing:
        return {"status": "already_member", "member_id": existing.member_id, "role": existing.role}

    new_mem = TripMember(
        member_id=f"tmb_{uuid.uuid4().hex[:8]}",
        trip_id=trip_id,
        user_id=current_user.user_id,
        role=req.role,
        joined_at=now_iso,
        share_weight=1.000,
        invited_by_user_id=trip.owner_user_id,
        status="active",
        updated_at=now_iso,
    )
    db.add(new_mem)
    await db.commit()

    # Broadcast member joined event over WebSocket
    await ws_manager.broadcast(trip_id, {
        "type": "member_joined",
        "trip_id": trip_id,
        "user_id": current_user.user_id,
        "role": req.role,
    })

    return {"status": "joined", "member_id": new_mem.member_id, "role": new_mem.role}

@router.post("/{trip_id}/itinerary/items", response_model=ItineraryItemOut, status_code=status.HTTP_201_CREATED)
async def add_itinerary_item(
    trip_id: str,
    req: CreateItineraryItemRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a new slot activity item to the trip's active itinerary.
    Bumps the itinerary version (optimistic concurrency per R1 / schema).
    """
    # Fetch active itinerary
    stmt = select(Itinerary).where(Itinerary.trip_id == trip_id, Itinerary.is_active == True)
    res = await db.execute(stmt)
    itn = res.scalar_one_or_none()
    if not itn:
        raise HTTPException(status_code=404, detail="No active itinerary found for this trip")

    # Get max sort_order for this day
    stmt_order = select(func.coalesce(func.max(ItineraryItem.sort_order), 0)).where(
        ItineraryItem.itinerary_id == itn.itinerary_id,
        ItineraryItem.day_index == req.day_index
    )
    res_order = await db.execute(stmt_order)
    max_order = res_order.scalar() or 0

    now_iso = datetime.now(timezone.utc).isoformat()
    item_id = f"itm_{uuid.uuid4().hex[:8]}"

    item_type_val = req.item_type if req.item_type in {"hotel", "flight", "poi", "package", "guide", "transfer", "meal", "free"} else "poi"

    starts_at_val = None
    if req.starts_at:
        starts_at_val = req.starts_at if "T" in req.starts_at else f"2026-10-15T{req.starts_at}:00+00:00"

    ends_at_val = None
    if req.ends_at:
        ends_at_val = req.ends_at if "T" in req.ends_at else f"2026-10-15T{req.ends_at}:00+00:00"

    new_item = ItineraryItem(
        item_id=item_id,
        itinerary_id=itn.itinerary_id,
        day_index=req.day_index,
        sort_order=max_order + 1,
        starts_at=starts_at_val,
        ends_at=ends_at_val,
        item_type=item_type_val,
        entity_type="poi",
        entity_id=None,
        title=req.title,
        cost=req.cost,
        currency=itn.currency,
        carbon_kg=1.500,
        duration_minutes=req.duration_minutes,
        source=req.source,
        explanation=req.explanation,
        locked=False,
        status="proposed",
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(new_item)

    # Bump itinerary version (optimistic concurrency)
    itn.version += 1
    itn.updated_at = now_iso

    await db.commit()
    await db.refresh(new_item)

    # Broadcast over WebSocket
    await ws_manager.broadcast(trip_id, {
        "type": "itinerary_updated",
        "trip_id": trip_id,
        "action": "item_added",
        "item_id": item_id,
        "new_version": itn.version,
    })

    return new_item

@router.patch("/{trip_id}/itinerary/items/{item_id}", response_model=ItineraryItemOut)
async def update_itinerary_item(
    trip_id: str,
    item_id: str,
    req: UpdateItineraryItemRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Update an itinerary slot item (status change, confirmation, timing)."""
    stmt = (
        select(ItineraryItem)
        .join(Itinerary)
        .where(Itinerary.trip_id == trip_id, ItineraryItem.item_id == item_id)
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Itinerary item not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    if req.status is not None:
        item.status = req.status
    if req.title is not None:
        item.title = req.title
    if req.starts_at is not None:
        item.starts_at = req.starts_at
    if req.ends_at is not None:
        item.ends_at = req.ends_at
    if req.cost is not None:
        item.cost = req.cost
    item.updated_at = now_iso

    # Bump version
    stmt_itn = select(Itinerary).where(Itinerary.itinerary_id == item.itinerary_id)
    res_itn = await db.execute(stmt_itn)
    itn = res_itn.scalar_one()
    itn.version += 1
    itn.updated_at = now_iso

    await db.commit()
    await db.refresh(item)

    await ws_manager.broadcast(trip_id, {
        "type": "itinerary_updated",
        "trip_id": trip_id,
        "action": "item_updated",
        "item_id": item_id,
        "status": item.status,
        "new_version": itn.version,
    })

    return item

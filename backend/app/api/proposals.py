from datetime import datetime, timezone, timedelta
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional
from backend.app.models.ps11 import Trip, Itinerary, ItineraryItem, Proposal, Vote, User
from backend.app.models.additive import ProposalTimer
from backend.app.schemas.proposal import (
    ProposalOut, CreateProposalRequest, ResolveProposalRequest,
    VoteDetail, ResponseWindowInfo
)
from backend.app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/trips/{trip_id}/proposals", tags=["Proposals"])

@router.get("", response_model=List[ProposalOut])
async def list_trip_proposals(
    trip_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetch all proposals for the trip with live vote tallies, voter details, and response window status."""
    # Find active itinerary for this trip
    stmt_itn = select(Itinerary.itinerary_id).where(
        Itinerary.trip_id == trip_id,
        Itinerary.is_active == True
    )
    result_itn = await db.execute(stmt_itn)
    itn_id = result_itn.scalar_one_or_none()

    if not itn_id:
        return []

    stmt = (
        select(Proposal)
        .where(Proposal.itinerary_id == itn_id)
        .options(selectinload(Proposal.votes))
        .order_by(Proposal.created_at.desc())
    )
    result = await db.execute(stmt)
    proposals = result.scalars().all()

    # Batch query ProposalTimers for all fetched proposals
    prop_ids = [p.proposal_id for p in proposals]
    timers_by_prop = {}
    if prop_ids:
        stmt_timers = select(ProposalTimer).where(ProposalTimer.proposal_id.in_(prop_ids))
        res_timers = await db.execute(stmt_timers)
        timers_by_prop = {t.proposal_id: t for t in res_timers.scalars().all()}

    output = []
    now_dt = datetime.now(timezone.utc)

    for p in proposals:
        yes = sum(1 for v in p.votes if v.value == "yes")
        no = sum(1 for v in p.votes if v.value == "no")
        abstain = sum(1 for v in p.votes if v.value == "abstain")
        no_reasons = [v.comment for v in p.votes if v.value == "no" and v.comment]

        votes_detail = [
            VoteDetail(
                vote_id=v.vote_id,
                user_id=v.user_id,
                value=v.value,
                weight=float(v.weight),
                comment=v.comment,
                cast_at=str(v.cast_at),
            )
            for v in p.votes
        ]

        timer = timers_by_prop.get(p.proposal_id)
        response_win = None
        if timer:
            try:
                dt_str = timer.expires_at.replace("Z", "+00:00")
                expires_dt = datetime.fromisoformat(dt_str)
                if expires_dt.tzinfo is None:
                    expires_dt = expires_dt.replace(tzinfo=timezone.utc)
                secs_left = max(0, int((expires_dt - now_dt).total_seconds()))
            except Exception:
                secs_left = 0

            response_win = ResponseWindowInfo(
                active=(secs_left > 0 and not timer.is_expired and p.status == "open"),
                first_no_at=timer.first_no_at,
                expires_at=timer.expires_at,
                seconds_remaining=secs_left,
            )

        output.append(ProposalOut(
            proposal_id=p.proposal_id,
            itinerary_id=p.itinerary_id,
            proposed_by_user_id=p.proposed_by_user_id,
            action=p.action,
            target_item_id=p.target_item_id,
            entity_type=p.entity_type,
            entity_id=p.entity_id,
            title=p.title,
            rationale=p.rationale,
            cost_delta=p.cost_delta,
            currency=p.currency,
            closes_at=p.closes_at,
            status=p.status,
            created_at=p.created_at,
            updated_at=p.updated_at,
            yes_votes=yes,
            no_votes=no,
            abstain_votes=abstain,
            no_reasons=no_reasons,
            votes_detail=votes_detail,
            response_window=response_win,
        ))
    return output

@router.post("", response_model=ProposalOut, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    trip_id: str,
    req: CreateProposalRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Submit a proposal for an itinerary item across 4 actions (add, remove, replace, reschedule) and broadcast."""
    # Verify valid action
    valid_actions = {"add", "remove", "replace", "reschedule"}
    if req.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{req.action}'. Must be one of: {', '.join(valid_actions)}"
        )

    # Verify trip exists
    stmt_trip = select(Trip).where(Trip.trip_id == trip_id)
    res_trip = await db.execute(stmt_trip)
    trip = res_trip.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    user_id = current_user.user_id if current_user else "usr_0f22b1"
    now = datetime.now(timezone.utc)
    closes_at = (now + timedelta(days=7)).isoformat()

    proposal_id = f"prp_{uuid.uuid4().hex[:8]}"
    new_prop = Proposal(
        proposal_id=proposal_id,
        itinerary_id=req.itinerary_id,
        proposed_by_user_id=user_id,
        action=req.action,
        target_item_id=req.target_item_id,
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        title=req.title,
        rationale=req.rationale,
        cost_delta=req.cost_delta,
        currency=req.currency,
        closes_at=closes_at,
        status="open",
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )
    db.add(new_prop)
    await db.commit()

    # Broadcast event via WebSocket
    await ws_manager.broadcast(trip_id, {
        "type": "proposal_created",
        "trip_id": trip_id,
        "proposal_id": proposal_id,
        "title": req.title,
        "action": req.action,
        "proposed_by": user_id,
    })

    return ProposalOut(
        proposal_id=proposal_id,
        itinerary_id=req.itinerary_id,
        proposed_by_user_id=user_id,
        action=req.action,
        target_item_id=req.target_item_id,
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        title=req.title,
        rationale=req.rationale,
        cost_delta=req.cost_delta,
        currency=req.currency,
        closes_at=closes_at,
        status="open",
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
        yes_votes=0,
        no_votes=0,
        abstain_votes=0,
        no_reasons=[],
        votes_detail=[],
        response_window=None,
    )

@router.post("/{proposal_id}/resolve", response_model=ProposalOut)
async def resolve_proposal(
    trip_id: str,
    proposal_id: str,
    req: ResolveProposalRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Resolve a proposal (accept or reject).
    Applies strict itinerary optimistic concurrency (validates expected_itinerary_version).
    If expected version does not match current version, raises HTTP 409 Conflict.
    When accepted: applies proposal action (add/remove/replace/reschedule), increments itinerary version,
    and broadcasts updates to all clients.
    """
    # Fetch proposal and active itinerary
    stmt_prop = (
        select(Proposal)
        .options(selectinload(Proposal.votes))
        .where(Proposal.proposal_id == proposal_id)
    )
    res_prop = await db.execute(stmt_prop)
    prop = res_prop.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if prop.status != "open":
        raise HTTPException(
            status_code=400,
            detail=f"Proposal is already '{prop.status}' and cannot be resolved again."
        )

    stmt_itn = select(Itinerary).where(
        Itinerary.trip_id == trip_id,
        Itinerary.is_active == True
    )
    res_itn = await db.execute(stmt_itn)
    itn = res_itn.scalar_one_or_none()
    if not itn:
        raise HTTPException(status_code=404, detail="Active itinerary not found for this trip")

    now_iso = datetime.now(timezone.utc).isoformat()

    if req.resolution.lower() == "accept":
        # Optimistic Concurrency Check: verify itinerary version matches
        if itn.version != req.expected_itinerary_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: Itinerary version mismatch (client expected v{req.expected_itinerary_version}, current server version is v{itn.version}). Please refresh and review latest changes before resolving.",
            )

        # Apply proposal action
        if prop.action == "add":
            # Add new itinerary item
            stmt_order = select(func.coalesce(func.max(ItineraryItem.sort_order), 0)).where(
                ItineraryItem.itinerary_id == itn.itinerary_id,
                ItineraryItem.day_index == 1
            )
            res_order = await db.execute(stmt_order)
            max_order = res_order.scalar() or 0

            new_item = ItineraryItem(
                item_id=f"itm_{uuid.uuid4().hex[:8]}",
                itinerary_id=itn.itinerary_id,
                day_index=1,
                sort_order=max_order + 1,
                starts_at="10:00",
                ends_at="12:00",
                item_type="activity",
                entity_type="activity",
                entity_id=None,
                title=prop.title,
                cost=prop.cost_delta if float(prop.cost_delta or 0) > 0 else "0.00",
                currency=prop.currency or itn.currency,
                carbon_kg=1.200,
                duration_minutes=120,
                source="proposal",
                explanation=prop.rationale,
                locked=False,
                status="confirmed",
                created_at=now_iso,
                updated_at=now_iso,
            )
            db.add(new_item)

        elif prop.action == "remove" and prop.target_item_id:
            # Mark target item as cancelled
            stmt_item = select(ItineraryItem).where(ItineraryItem.item_id == prop.target_item_id)
            res_item = await db.execute(stmt_item)
            item = res_item.scalar_one_or_none()
            if item:
                item.status = "cancelled"
                item.updated_at = now_iso

        elif prop.action == "replace" and prop.target_item_id:
            # Update target item with proposed change
            stmt_item = select(ItineraryItem).where(ItineraryItem.item_id == prop.target_item_id)
            res_item = await db.execute(stmt_item)
            item = res_item.scalar_one_or_none()
            if item:
                item.title = prop.title
                if prop.rationale:
                    item.explanation = prop.rationale
                item.status = "confirmed"
                item.updated_at = now_iso

        elif prop.action == "reschedule" and prop.target_item_id:
            stmt_item = select(ItineraryItem).where(ItineraryItem.item_id == prop.target_item_id)
            res_item = await db.execute(stmt_item)
            item = res_item.scalar_one_or_none()
            if item:
                item.status = "confirmed"
                item.updated_at = now_iso

        # Bump itinerary version (optimistic concurrency increment)
        itn.version += 1
        itn.updated_at = now_iso

        prop.status = "accepted"
        prop.updated_at = now_iso

    elif req.resolution.lower() == "reject":
        prop.status = "rejected"
        prop.updated_at = now_iso

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid resolution '{req.resolution}'. Must be 'accept' or 'reject'."
        )

    # If a proposal timer exists, mark it expired
    stmt_timer = select(ProposalTimer).where(ProposalTimer.proposal_id == proposal_id)
    res_timer = await db.execute(stmt_timer)
    timer = res_timer.scalar_one_or_none()
    if timer:
        timer.is_expired = True

    await db.commit()
    await db.refresh(prop)

    # Broadcast WebSocket updates
    await ws_manager.broadcast(trip_id, {
        "type": "proposal_resolved",
        "trip_id": trip_id,
        "proposal_id": proposal_id,
        "resolution": req.resolution.lower(),
        "status": prop.status,
        "new_version": itn.version if req.resolution.lower() == "accept" else None,
    })

    if req.resolution.lower() == "accept":
        await ws_manager.broadcast(trip_id, {
            "type": "itinerary_updated",
            "trip_id": trip_id,
            "action": f"proposal_{prop.action}",
            "proposal_id": proposal_id,
            "new_version": itn.version,
        })

    # Prepare return object
    yes = sum(1 for v in prop.votes if v.value == "yes")
    no = sum(1 for v in prop.votes if v.value == "no")
    abstain = sum(1 for v in prop.votes if v.value == "abstain")
    no_reasons = [v.comment for v in prop.votes if v.value == "no" and v.comment]
    votes_detail = [
        VoteDetail(
            vote_id=v.vote_id,
            user_id=v.user_id,
            value=v.value,
            weight=float(v.weight),
            comment=v.comment,
            cast_at=str(v.cast_at),
        )
        for v in prop.votes
    ]

    return ProposalOut(
        proposal_id=prop.proposal_id,
        itinerary_id=prop.itinerary_id,
        proposed_by_user_id=prop.proposed_by_user_id,
        action=prop.action,
        target_item_id=prop.target_item_id,
        entity_type=prop.entity_type,
        entity_id=prop.entity_id,
        title=prop.title,
        rationale=prop.rationale,
        cost_delta=prop.cost_delta,
        currency=prop.currency,
        closes_at=prop.closes_at,
        status=prop.status,
        created_at=prop.created_at,
        updated_at=prop.updated_at,
        yes_votes=yes,
        no_votes=no,
        abstain_votes=abstain,
        no_reasons=no_reasons,
        votes_detail=votes_detail,
        response_window=None,
    )

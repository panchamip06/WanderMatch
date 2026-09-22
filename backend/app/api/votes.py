from datetime import datetime, timezone, timedelta
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional
from backend.app.models.ps11 import Trip, Proposal, Vote, TripMember, User
from backend.app.models.additive import ProposalTimer
from backend.app.schemas.vote import CastVoteRequest, VoteOut
from backend.app.api.trips import parse_trip_mode
from backend.app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/trips/{trip_id}/votes", tags=["Votes"])

@router.post("", response_model=VoteOut)
async def cast_vote(
    trip_id: str,
    req: CastVoteRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Cast or update a vote on a proposal.
    Enforces that 'no' votes MUST carry a non-empty comment/reason.
    Broadcasts live vote update to all trip members over WebSocket.
    """
    # Enforce mandatory comment for No votes (Rule from Design Doc §5A)
    if req.value.lower() == "no" and (not req.comment or not req.comment.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Voting 'no' requires a mandatory typed objection reason in 'comment'.",
        )

    user_id = current_user.user_id if current_user else "usr_0f22b1"

    # Verify proposal exists
    stmt_prop = select(Proposal).where(Proposal.proposal_id == req.proposal_id)
    res_prop = await db.execute(stmt_prop)
    prop = res_prop.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Proposal not found")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Check for existing vote by this user on this proposal
    stmt_vote = select(Vote).where(
        Vote.proposal_id == req.proposal_id,
        Vote.user_id == user_id
    )
    res_vote = await db.execute(stmt_vote)
    existing_vote = res_vote.scalar_one_or_none()

    if existing_vote:
        existing_vote.value = req.value.lower()
        existing_vote.comment = req.comment
        existing_vote.updated_at = now_iso
        vote = existing_vote
    else:
        vote_id = f"vot_{uuid.uuid4().hex[:8]}"
        vote = Vote(
            vote_id=vote_id,
            proposal_id=req.proposal_id,
            user_id=user_id,
            value=req.value.lower(),
            weight=1.00,
            comment=req.comment,
            cast_at=now_iso,
            updated_at=now_iso,
        )
        db.add(vote)

    # If vote is 'no', check if trip is in Mode NA (no_admin) and if timer needs to be started
    if req.value.lower() == "no":
        stmt_trip = select(Trip).where(Trip.trip_id == trip_id)
        res_trip = await db.execute(stmt_trip)
        trip = res_trip.scalar_one_or_none()
        if trip and parse_trip_mode(trip.notes) == "no_admin":
            # Check if timer already exists for this proposal
            stmt_timer = select(ProposalTimer).where(ProposalTimer.proposal_id == req.proposal_id)
            res_timer = await db.execute(stmt_timer)
            existing_timer = res_timer.scalar_one_or_none()
            if not existing_timer:
                now_utc = datetime.now(timezone.utc)
                expires_at = (now_utc + timedelta(minutes=10)).isoformat()
                timer = ProposalTimer(
                    proposal_id=req.proposal_id,
                    trip_id=trip_id,
                    first_no_at=now_utc.isoformat(),
                    expires_at=expires_at,
                    is_expired=False,
                )
                db.add(timer)
                await ws_manager.broadcast(trip_id, {
                    "type": "response_window_started",
                    "trip_id": trip_id,
                    "proposal_id": req.proposal_id,
                    "first_no_at": timer.first_no_at,
                    "expires_at": timer.expires_at,
                    "seconds_remaining": 600,
                })

    await db.commit()
    await db.refresh(vote)

    # Re-calculate tallies for broadcast
    stmt_all_votes = select(Vote).where(Vote.proposal_id == req.proposal_id)
    res_all_votes = await db.execute(stmt_all_votes)
    all_votes = res_all_votes.scalars().all()

    yes_cnt = sum(1 for v in all_votes if v.value == "yes")
    no_cnt = sum(1 for v in all_votes if v.value == "no")
    abstain_cnt = sum(1 for v in all_votes if v.value == "abstain")
    no_reasons = [v.comment for v in all_votes if v.value == "no" and v.comment]
    votes_detail = [
        {
            "vote_id": v.vote_id,
            "user_id": v.user_id,
            "value": v.value,
            "comment": v.comment,
            "cast_at": str(v.cast_at),
        }
        for v in all_votes
    ]

    # Live WebSocket Broadcast
    await ws_manager.broadcast(trip_id, {
        "type": "vote_cast",
        "trip_id": trip_id,
        "proposal_id": req.proposal_id,
        "user_id": user_id,
        "vote": req.value.lower(),
        "comment": req.comment,
        "tallies": {
            "yes": yes_cnt,
            "no": no_cnt,
            "abstain": abstain_cnt,
        },
        "no_reasons": no_reasons,
        "votes_detail": votes_detail,
    })

    return VoteOut(
        vote_id=vote.vote_id,
        proposal_id=vote.proposal_id,
        user_id=vote.user_id,
        value=vote.value,
        weight=float(vote.weight),
        comment=vote.comment,
        cast_at=str(vote.cast_at),
        updated_at=str(vote.updated_at),
    )

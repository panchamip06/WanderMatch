"""
Phase 5 — Branch API endpoints.

Design §5A (Mode NA steps 7–12) and §6 (branches, branch_members, revision_history):

  POST /                          create a branch (multi-way: one call per distinct preference)
  GET  /                          list all branches for this trip
  GET  /{branch_id}               branch detail with members + revision count
  PATCH/{branch_id}/member-status calling user updates their own member status
  POST /{branch_id}/finalize      silence = accepted: confirm all pending members
  POST /{branch_id}/revision      AI revision for this branch (3-round soft cap)

Recursive branching: set parent_branch_id in CreateBranchRequest.
Branch status machine:
  preview -> confirmed            (all members confirmed OR finalize with no objections)
  preview -> modification_requested (any member posts modification_requested)
  preview -> rejected             (explicit branch rejection — not used by members; reserved)
"""
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional
from backend.app.models.ps11 import User, Trip
from backend.app.models.additive import Branch, BranchMember, RevisionHistory
from backend.app.schemas.branch import (
    CreateBranchRequest, BranchOut, BranchMemberOut, BranchRevisionOut,
    UpdateMemberStatusRequest,
)
from backend.app.websocket.manager import ws_manager
from backend.ai.validators.constraints import HardConstraintValidator

logger = logging.getLogger("wandermatch.branches")

router = APIRouter(prefix="/api/trips/{trip_id}/branches", tags=["Branches"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _load_branch_or_404(branch_id: str, db: AsyncSession) -> Branch:
    res = await db.execute(
        select(Branch)
        .options(selectinload(Branch.members))
        .where(Branch.branch_id == branch_id)
    )
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


async def _revision_count(branch_id: str, db: AsyncSession) -> int:
    res = await db.execute(
        select(func.count()).where(RevisionHistory.branch_id == branch_id)
    )
    return res.scalar() or 0


def _build_branch_out(branch: Branch, revision_count: int = 0) -> BranchOut:
    return BranchOut(
        branch_id=branch.branch_id,
        trip_id=branch.trip_id,
        proposal_id=branch.proposal_id,
        parent_branch_id=branch.parent_branch_id,
        title=branch.title,
        preview_deadline=branch.preview_deadline,
        status=branch.status,
        members=[
            BranchMemberOut(
                branch_member_id=m.branch_member_id,
                branch_id=m.branch_id,
                user_id=m.user_id,
                status=m.status,
                confirmed_at=m.confirmed_at,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
            for m in branch.members
        ],
        revision_count=revision_count,
        created_at=branch.created_at,
        updated_at=branch.updated_at,
    )


def _recompute_branch_status(members: List[BranchMember]) -> str:
    """
    Deterministically compute branch-level status from member statuses.
    Rules (design §5A):
      all confirmed              -> confirmed
      any modification_requested -> modification_requested
      else                       -> preview (pending members remain)
    """
    statuses = [m.status for m in members]
    if any(s == "modification_requested" for s in statuses):
        return "modification_requested"
    if statuses and all(s == "confirmed" for s in statuses):
        return "confirmed"
    return "preview"


# ---------------------------------------------------------------------------
# POST / — create branch
# ---------------------------------------------------------------------------

@router.post("", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
async def create_branch(
    trip_id: str,
    req: CreateBranchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Create one branch representing a distinct preference group.

    For multi-way branching call this endpoint once per distinct incompatible
    preference.  For recursive branching set parent_branch_id.

    Members listed in member_user_ids start with status 'pending'.
    Silence = accepted: call /finalize to confirm the branch after the window.
    """
    # Verify trip exists
    res_trip = await db.execute(select(Trip).where(Trip.trip_id == trip_id))
    if not res_trip.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Trip not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    branch_id = f"brn_{uuid.uuid4().hex[:8]}"

    branch = Branch(
        branch_id=branch_id,
        trip_id=trip_id,
        proposal_id=req.proposal_id,
        parent_branch_id=req.parent_branch_id,
        title=req.title,
        preview_deadline=req.preview_deadline,  # "" means no fixed deadline (silence model)
        status="preview",
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(branch)

    # Create BranchMember rows
    for uid in req.member_user_ids:
        bm = BranchMember(
            branch_member_id=f"brm_{uuid.uuid4().hex[:8]}",
            branch_id=branch_id,
            user_id=uid,
            status="pending",
            confirmed_at=None,
            created_at=now_iso,
            updated_at=now_iso,
        )
        db.add(bm)

    await db.commit()

    # Reload with members
    branch = await _load_branch_or_404(branch_id, db)

    await ws_manager.broadcast(trip_id, {
        "type": "branch_created",
        "trip_id": trip_id,
        "branch_id": branch_id,
        "title": req.title,
        "parent_branch_id": req.parent_branch_id,
        "proposal_id": req.proposal_id,
        "member_count": len(req.member_user_ids),
    })

    logger.info("Branch %s created for trip %s (parent=%s)", branch_id, trip_id, req.parent_branch_id)
    return _build_branch_out(branch, revision_count=0)


# ---------------------------------------------------------------------------
# GET / — list branches for trip
# ---------------------------------------------------------------------------

@router.get("", response_model=List[BranchOut])
async def list_branches(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all branches for this trip (top-level and sub-branches)."""
    res = await db.execute(
        select(Branch)
        .options(selectinload(Branch.members))
        .where(Branch.trip_id == trip_id)
        .order_by(Branch.created_at)
    )
    branches = res.scalars().all()

    # Batch revision counts
    output = []
    for b in branches:
        count = await _revision_count(b.branch_id, db)
        output.append(_build_branch_out(b, count))
    return output


# ---------------------------------------------------------------------------
# GET /{branch_id} — branch detail
# ---------------------------------------------------------------------------

@router.get("/{branch_id}", response_model=BranchOut)
async def get_branch(
    trip_id: str,
    branch_id: str,
    db: AsyncSession = Depends(get_db),
):
    branch = await _load_branch_or_404(branch_id, db)
    count = await _revision_count(branch_id, db)
    return _build_branch_out(branch, count)


# ---------------------------------------------------------------------------
# PATCH /{branch_id}/member-status — member updates their own status
# ---------------------------------------------------------------------------

@router.patch("/{branch_id}/member-status", response_model=BranchOut)
async def update_member_status(
    trip_id: str,
    branch_id: str,
    req: UpdateMemberStatusRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    The calling member sets their own status on this branch.

    Allowed values: 'confirmed' | 'modification_requested'.

    Branch-level status is recomputed from all members after update:
    - all confirmed              -> branch.status = 'confirmed'
    - any modification_requested -> branch.status = 'modification_requested'
    - otherwise                  -> 'preview'
    """
    valid_statuses = {"confirmed", "modification_requested"}
    if req.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{req.status}'. Must be one of: {valid_statuses}",
        )

    user_id = current_user.user_id if current_user else "usr_0f22b1"

    branch = await _load_branch_or_404(branch_id, db)

    # Find member row for this user
    member = next((m for m in branch.members if m.user_id == user_id), None)
    if not member:
        raise HTTPException(
            status_code=404,
            detail=f"User '{user_id}' is not a member of branch '{branch_id}'",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    member.status = req.status
    member.updated_at = now_iso
    if req.status == "confirmed":
        member.confirmed_at = now_iso

    # Recompute branch-level status
    new_branch_status = _recompute_branch_status(branch.members)
    branch.status = new_branch_status
    branch.updated_at = now_iso

    await db.commit()
    await db.refresh(branch)
    branch = await _load_branch_or_404(branch_id, db)  # reload members

    await ws_manager.broadcast(trip_id, {
        "type": "branch_member_updated",
        "trip_id": trip_id,
        "branch_id": branch_id,
        "user_id": user_id,
        "member_status": req.status,
        "branch_status": branch.status,
    })

    count = await _revision_count(branch_id, db)
    return _build_branch_out(branch, count)


# ---------------------------------------------------------------------------
# POST /{branch_id}/finalize — silence = accepted
# ---------------------------------------------------------------------------

@router.post("/{branch_id}/finalize", response_model=BranchOut)
async def finalize_branch(
    trip_id: str,
    branch_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Silence = accepted (design §5A Mode NA step 10 / edge-case table).

    Behaviour:
    - If branch is already confirmed/rejected/modification_requested -> no-op, return as-is.
    - If branch is 'preview' and NO member has 'modification_requested':
        all pending members -> confirmed; branch.status -> confirmed.
    - If branch is 'preview' and SOME member has 'modification_requested':
        branch.status -> modification_requested (forced; silence does not override objection).
    """
    branch = await _load_branch_or_404(branch_id, db)

    if branch.status != "preview":
        count = await _revision_count(branch_id, db)
        return _build_branch_out(branch, count)

    now_iso = datetime.now(timezone.utc).isoformat()
    has_objection = any(m.status == "modification_requested" for m in branch.members)

    if has_objection:
        branch.status = "modification_requested"
    else:
        # Silence = accepted
        for m in branch.members:
            if m.status == "pending":
                m.status = "confirmed"
                m.confirmed_at = now_iso
                m.updated_at = now_iso
        branch.status = "confirmed"

    branch.updated_at = now_iso
    await db.commit()
    branch = await _load_branch_or_404(branch_id, db)

    await ws_manager.broadcast(trip_id, {
        "type": "branch_finalized",
        "trip_id": trip_id,
        "branch_id": branch_id,
        "status": branch.status,
        "silence_accepted": not has_objection,
    })

    count = await _revision_count(branch_id, db)
    return _build_branch_out(branch, count)


# ---------------------------------------------------------------------------
# POST /{branch_id}/revision — AI revision on a branch (3-round cap)
# ---------------------------------------------------------------------------

@router.post("/{branch_id}/revision", response_model=BranchRevisionOut, status_code=status.HTTP_201_CREATED)
async def generate_branch_revision(
    trip_id: str,
    branch_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an AI revision for a branch alternative.

    Respects the same 3-round soft cap as proposal consensus (design §5A row 11).
    Revisions on a branch are independent of proposal-level revisions.

    Broadcasts ai_branch_revision_ready to all trip members.
    """
    branch = await _load_branch_or_404(branch_id, db)

    prior_rounds = await _revision_count(branch_id, db)
    next_round = prior_rounds + 1

    cap_ok, cap_reason = HardConstraintValidator.check_round_cap(next_round)
    if not cap_ok:
        raise HTTPException(status_code=422, detail=cap_reason)

    # Mark any earlier active revisions as superseded
    if prior_rounds > 0:
        res_active = await db.execute(
            select(RevisionHistory).where(
                RevisionHistory.branch_id == branch_id,
                RevisionHistory.status == "active",
            )
        )
        for old_rev in res_active.scalars().all():
            old_rev.status = "superseded"

    # Build slot_data from branch context
    slot_data = {
        "title": branch.title,
        "cost": "0.00",
        "currency": "INR",
        "duration_minutes": 120,
    }

    # Gather modification reasons from members (if any)
    no_reasons = [
        f"Member {m.user_id} requested modification"
        for m in branch.members
        if m.status == "modification_requested"
    ]

    from backend.ai.service import consensus_service as service
    candidate = await service.generate_candidate(
        slot_data=slot_data,
        proposals=[{"title": branch.title, "rationale": "Branch alternative"}],
        no_reasons=no_reasons,
        voter_ids=[m.user_id for m in branch.members],
    )
    valid, reason = await service.validate_candidate(slot_data, candidate)

    if not valid:
        # Regenerate once (same policy as proposal consensus)
        candidate = await service.generate_candidate(
            slot_data=slot_data,
            proposals=[{"title": branch.title, "rationale": "Branch alternative"}],
            no_reasons=no_reasons,
            voter_ids=[m.user_id for m in branch.members],
        )
        valid, reason = await service.validate_candidate(slot_data, candidate)

    candidate_with_meta = {
        **candidate,
        "_constraint_valid": valid,
        "_constraint_reason": reason,
    }

    revision_id = f"rev_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    rev = RevisionHistory(
        revision_id=revision_id,
        proposal_id=None,
        branch_id=branch_id,
        round_number=next_round,
        ai_candidate_json=json.dumps(candidate_with_meta, ensure_ascii=False),
        created_by="ai_planner",
        status="active",
        created_at=now_iso,
    )
    db.add(rev)
    await db.commit()

    await ws_manager.broadcast(trip_id, {
        "type": "ai_branch_revision_ready",
        "trip_id": trip_id,
        "branch_id": branch_id,
        "revision_id": revision_id,
        "round_number": next_round,
        "candidate": candidate,
        "constraint_valid": valid,
        "constraint_reason": reason,
    })

    logger.info(
        "Branch revision round %d generated for branch %s (trip %s, valid=%s)",
        next_round, branch_id, trip_id, valid,
    )

    return BranchRevisionOut(
        revision_id=revision_id,
        branch_id=branch_id,
        round_number=next_round,
        ai_candidate_json=json.dumps(candidate_with_meta, ensure_ascii=False),
        constraint_valid=valid,
        constraint_reason=reason,
        status="active",
        created_at=now_iso,
    )

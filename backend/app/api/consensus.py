"""
Phase 4 — AI Consensus API endpoints.

Endpoints (all under /api/trips/{trip_id}/proposals/{proposal_id}/consensus):
  POST /invoke        — generate an AI common-ground candidate (Mode A: admin; Mode NA: auto)
  GET  /candidates    — list all revision rounds for this proposal
  POST /branch-trigger — classify keep_blending vs branch

Design §5A flow:
  Proposal → No + reason → timer → POST /invoke → candidate validated → stored in
  revision_history → ai_candidate_ready broadcast → re-vote via existing /votes endpoint.
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
from backend.app.models.ps11 import (
    Proposal, Vote, ItineraryItem, Itinerary, User,
)
from backend.app.models.additive import RevisionHistory, ProposalTimer
from backend.app.schemas.consensus import (
    AICandidate, AICandidateOut, BranchTriggerOut, InvokeConsensusRequest,
)
from backend.app.websocket.manager import ws_manager
from backend.ai.validators.constraints import HardConstraintValidator

logger = logging.getLogger("wandermatch.consensus")

router = APIRouter(
    prefix="/api/trips/{trip_id}/proposals/{proposal_id}/consensus",
    tags=["AI Consensus"],
)

# Lazy import to avoid loading LLM settings at module import time
def _get_service():
    from backend.ai.service import consensus_service
    return consensus_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _load_slot_data(proposal: Proposal, db: AsyncSession) -> dict:
    """Build the slot_data dict that validators and the LLM prompt need."""
    slot: Optional[ItineraryItem] = None
    if proposal.target_item_id:
        res = await db.execute(
            select(ItineraryItem).where(ItineraryItem.item_id == proposal.target_item_id)
        )
        slot = res.scalar_one_or_none()

    if slot:
        return {
            "title": slot.title,
            "cost": slot.cost or "0.00",
            "currency": slot.currency or proposal.currency or "INR",
            "duration_minutes": slot.duration_minutes or 120,
        }
    # Fall back to proposal data if no target item (action=add)
    return {
        "title": proposal.title,
        "cost": proposal.cost_delta or "0.00",
        "currency": proposal.currency or "INR",
        "duration_minutes": 120,
    }


async def _get_proposal_or_404(proposal_id: str, db: AsyncSession) -> Proposal:
    res = await db.execute(
        select(Proposal)
        .options(selectinload(Proposal.votes))
        .where(Proposal.proposal_id == proposal_id)
    )
    prop = res.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return prop


async def _current_round(proposal_id: str, db: AsyncSession) -> int:
    """Return the number of existing RevisionHistory rows for this proposal."""
    res = await db.execute(
        select(func.count()).where(RevisionHistory.proposal_id == proposal_id)
    )
    return res.scalar() or 0


def _build_candidate_out(rev: RevisionHistory) -> AICandidateOut:
    candidate_dict = json.loads(rev.ai_candidate_json)
    # The JSON stores the full candidate + constraint_valid + constraint_reason
    constraint_valid = candidate_dict.pop("_constraint_valid", True)
    constraint_reason = candidate_dict.pop("_constraint_reason", "Valid")
    return AICandidateOut(
        revision_id=rev.revision_id,
        proposal_id=rev.proposal_id,
        round_number=rev.round_number,
        candidate=AICandidate(**candidate_dict),
        constraint_valid=constraint_valid,
        constraint_reason=constraint_reason,
        status=rev.status,
        created_at=rev.created_at,
    )


# ---------------------------------------------------------------------------
# POST /invoke — generate AI common-ground candidate
# ---------------------------------------------------------------------------

@router.post("/invoke", response_model=AICandidateOut, status_code=status.HTTP_201_CREATED)
async def invoke_consensus(
    trip_id: str,
    proposal_id: str,
    req: InvokeConsensusRequest = InvokeConsensusRequest(),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a blended AI common-ground candidate for this proposal.

    Mode A  — admin invokes manually after reviewing No votes.
    Mode NA — called after the 10-minute window fires (first No → timer → invoke).

    Guards:
    • Proposal must be 'open'.
    • At least one No vote must exist (there is disagreement to resolve).
    • Round cap: max 3 rounds per design §5A (HTTP 422 when exceeded).

    The candidate is validated by HardConstraintValidator; if invalid it is
    regenerated once.  The result (valid or best-effort) is stored in
    revision_history and broadcast as ai_candidate_ready.
    """
    prop = await _get_proposal_or_404(proposal_id, db)

    if prop.status != "open":
        raise HTTPException(
            status_code=400,
            detail=f"Proposal is '{prop.status}'; AI consensus only applies to open proposals.",
        )

    # Gather votes
    no_votes = [v for v in prop.votes if v.value == "no"]
    if not no_votes:
        raise HTTPException(
            status_code=422,
            detail="No 'no' votes found on this proposal; consensus is not needed yet.",
        )

    no_reasons: List[str] = [v.comment for v in no_votes if v.comment]
    voter_ids: List[str] = [v.user_id for v in no_votes]

    # Round cap check
    prior_rounds = await _current_round(proposal_id, db)
    next_round = prior_rounds + 1
    cap_ok, cap_reason = HardConstraintValidator.check_round_cap(next_round)
    if not cap_ok:
        raise HTTPException(status_code=422, detail=cap_reason)

    # Mark any earlier active revisions as superseded
    if prior_rounds > 0:
        res_active = await db.execute(
            select(RevisionHistory).where(
                RevisionHistory.proposal_id == proposal_id,
                RevisionHistory.status == "active",
            )
        )
        for old_rev in res_active.scalars().all():
            old_rev.status = "superseded"

    # Load slot context
    slot_data = await _load_slot_data(prop, db)

    # Proposals list for the prompt
    proposals_for_prompt = [{"title": prop.title, "rationale": prop.rationale or ""}]

    service = _get_service()

    # --- Generate candidate ---
    candidate = await service.generate_candidate(
        slot_data=slot_data,
        proposals=proposals_for_prompt,
        no_reasons=no_reasons,
        voter_ids=voter_ids,
    )

    # --- Validate ---
    valid, reason = await service.validate_candidate(slot_data, candidate)

    if not valid:
        logger.info(
            "Round %d candidate for proposal %s failed validation (%s); regenerating once",
            next_round, proposal_id, reason,
        )
        # Regenerate once (design §10 Risk row 1: "regenerate once; then branch/admin review")
        candidate = await service.generate_candidate(
            slot_data=slot_data,
            proposals=proposals_for_prompt,
            no_reasons=no_reasons,
            voter_ids=voter_ids,
        )
        valid, reason = await service.validate_candidate(slot_data, candidate)
        if not valid:
            logger.warning(
                "Round %d regenerated candidate still invalid for proposal %s: %s",
                next_round, proposal_id, reason,
            )

    # --- Persist to revision_history ---
    # Store constraint metadata inside the JSON blob for AICandidateOut
    candidate_with_meta = {**candidate, "_constraint_valid": valid, "_constraint_reason": reason}

    revision_id = f"rev_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    rev = RevisionHistory(
        revision_id=revision_id,
        proposal_id=proposal_id,
        branch_id=None,
        round_number=next_round,
        ai_candidate_json=json.dumps(candidate_with_meta, ensure_ascii=False),
        created_by="ai_planner",
        status="active",
        created_at=now_iso,
    )
    db.add(rev)

    # Update ProposalTimer round counter if timer exists
    res_timer = await db.execute(
        select(ProposalTimer).where(ProposalTimer.proposal_id == proposal_id)
    )
    timer = res_timer.scalar_one_or_none()
    if timer:
        timer.ai_round_number = next_round

    await db.commit()

    # --- WebSocket broadcast ---
    await ws_manager.broadcast(trip_id, {
        "type": "ai_candidate_ready",
        "trip_id": trip_id,
        "proposal_id": proposal_id,
        "revision_id": revision_id,
        "round_number": next_round,
        "candidate": candidate,
        "constraint_valid": valid,
        "constraint_reason": reason,
    })

    logger.info(
        "AI candidate round %d generated for proposal %s (trip %s, valid=%s)",
        next_round, proposal_id, trip_id, valid,
    )

    return _build_candidate_out(rev)


# ---------------------------------------------------------------------------
# GET /candidates — list all revisions for this proposal
# ---------------------------------------------------------------------------

@router.get("/candidates", response_model=List[AICandidateOut])
async def list_candidates(
    trip_id: str,
    proposal_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all AI revision rounds for this proposal, ordered by round_number."""
    # Verify proposal exists
    await _get_proposal_or_404(proposal_id, db)

    res = await db.execute(
        select(RevisionHistory)
        .where(RevisionHistory.proposal_id == proposal_id)
        .order_by(RevisionHistory.round_number)
    )
    revisions = res.scalars().all()
    return [_build_candidate_out(r) for r in revisions]


# ---------------------------------------------------------------------------
# POST /branch-trigger — classify keep_blending vs branch
# ---------------------------------------------------------------------------

@router.post("/branch-trigger", response_model=BranchTriggerOut)
async def classify_branch_trigger(
    trip_id: str,
    proposal_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Classify whether remaining objections require branching or further blending.

    Reads the latest active AI candidate from revision_history and the proposal's
    No reasons, then calls the branch-trigger classifier.
    """
    prop = await _get_proposal_or_404(proposal_id, db)

    no_reasons: List[str] = [v.comment for v in prop.votes if v.value == "no" and v.comment]
    if not no_reasons:
        raise HTTPException(
            status_code=422,
            detail="No 'no' votes with reasons found; branch-trigger classification requires at least one.",
        )

    # Fetch latest active candidate
    res = await db.execute(
        select(RevisionHistory)
        .where(
            RevisionHistory.proposal_id == proposal_id,
            RevisionHistory.status == "active",
        )
        .order_by(RevisionHistory.round_number.desc())
    )
    latest = res.scalars().first()

    candidate: dict = {}
    if latest:
        stored = json.loads(latest.ai_candidate_json)
        # Strip internal meta keys before passing to classifier
        candidate = {k: v for k, v in stored.items() if not k.startswith("_")}

    service = _get_service()
    result = await service.classify_branch_trigger(candidate, no_reasons)

    return BranchTriggerOut(**result)

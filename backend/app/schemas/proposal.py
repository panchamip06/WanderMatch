from pydantic import BaseModel
from typing import Optional, List

class VoteDetail(BaseModel):
    vote_id: str
    user_id: str
    value: str  # 'yes', 'no', 'abstain'
    weight: float
    comment: Optional[str] = None
    cast_at: str

class ResponseWindowInfo(BaseModel):
    active: bool
    first_no_at: Optional[str] = None
    expires_at: Optional[str] = None
    seconds_remaining: int = 0

class ProposalOut(BaseModel):
    proposal_id: str
    itinerary_id: str
    proposed_by_user_id: str
    action: str
    target_item_id: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    title: str
    rationale: Optional[str] = None
    cost_delta: str
    currency: str
    closes_at: str
    status: str
    created_at: str
    updated_at: str
    # Live vote tallies
    yes_votes: int = 0
    no_votes: int = 0
    abstain_votes: int = 0
    no_reasons: List[str] = []
    # Member vote visibility & response window
    votes_detail: List[VoteDetail] = []
    response_window: Optional[ResponseWindowInfo] = None

    class Config:
        from_attributes = True

class CreateProposalRequest(BaseModel):
    itinerary_id: str
    action: str  # add, remove, replace, reschedule
    target_item_id: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    title: str
    rationale: Optional[str] = None
    cost_delta: str = "0.00"
    currency: str = "INR"

class ResolveProposalRequest(BaseModel):
    resolution: str  # "accept" or "reject"
    expected_itinerary_version: int

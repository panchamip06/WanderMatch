"""
Pydantic schemas for Phase 4 — AI Consensus endpoints.
"""
from typing import List, Optional
from pydantic import BaseModel


class AICandidate(BaseModel):
    """Structured AI-generated common-ground candidate (matches COMMON_GROUND prompt schema)."""
    title: str
    rationale: str
    cost_delta: str
    currency: str
    duration_minutes: int
    adjustments: List[str] = []
    accommodated_users: List[str] = []


class AICandidateOut(BaseModel):
    """API response for a stored AI revision round."""
    revision_id: str
    proposal_id: str
    round_number: int
    candidate: AICandidate
    constraint_valid: bool
    constraint_reason: str
    status: str          # active | accepted | superseded | rejected
    created_at: str

    class Config:
        from_attributes = True


class BranchTriggerOut(BaseModel):
    """Result of the branch-trigger classification."""
    action: str                         # "keep_blending" | "branch"
    reason: str
    suggested_branches: List[str] = []


class InvokeConsensusRequest(BaseModel):
    """Optional body for POST /invoke — callers may override slot_data if needed."""
    # In practice the endpoint loads slot_data from DB; body is kept minimal.
    notes: Optional[str] = None         # free-text context from admin (Mode A)

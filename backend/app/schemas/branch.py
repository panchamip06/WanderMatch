"""
Pydantic schemas for Phase 5 — Branching and Trip Chat.
"""
from typing import List, Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Branch schemas
# ---------------------------------------------------------------------------

class CreateBranchRequest(BaseModel):
    title: str
    proposal_id: Optional[str] = None          # originating proposal (nullable for sub-branches)
    parent_branch_id: Optional[str] = None     # set for recursive branches
    member_user_ids: List[str] = []            # users assigned to this branch
    preview_deadline: str = ""                 # ISO-8601 or "" (silence = accepted at any time)


class BranchMemberOut(BaseModel):
    branch_member_id: str
    branch_id: str
    user_id: str
    status: str                                # pending | confirmed | modification_requested
    confirmed_at: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class BranchRevisionOut(BaseModel):
    revision_id: str
    branch_id: str
    round_number: int
    ai_candidate_json: str
    constraint_valid: bool
    constraint_reason: str
    status: str                                # active | accepted | superseded | rejected
    created_at: str


class BranchOut(BaseModel):
    branch_id: str
    trip_id: str
    proposal_id: Optional[str] = None
    parent_branch_id: Optional[str] = None
    title: str
    preview_deadline: str
    status: str                                # preview | confirmed | rejected | modification_requested
    members: List[BranchMemberOut] = []
    revision_count: int = 0
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class UpdateMemberStatusRequest(BaseModel):
    status: str                                # "confirmed" | "modification_requested"


# ---------------------------------------------------------------------------
# Chat schemas
# ---------------------------------------------------------------------------

class ChatMessageRequest(BaseModel):
    body: str
    is_unanimous_override: bool = False


class ChatMessageOut(BaseModel):
    message_id: str
    trip_id: str
    user_id: str
    body: str
    is_unanimous_override: bool
    sent_at: str

    class Config:
        from_attributes = True

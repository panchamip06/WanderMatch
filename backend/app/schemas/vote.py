from pydantic import BaseModel, field_validator, ValidationInfo
from typing import Optional

class CastVoteRequest(BaseModel):
    proposal_id: str
    value: str  # 'yes', 'no', 'abstain'
    comment: Optional[str] = None

    @field_validator("comment")
    @classmethod
    def validate_no_reason(cls, v: Optional[str], info: ValidationInfo) -> Optional[str]:
        val = info.data.get("value")
        if val == "no":
            if not v or not v.strip():
                raise ValueError("Voting 'no' requires a mandatory typed reason in comment.")
        return v

class VoteOut(BaseModel):
    vote_id: str
    proposal_id: str
    user_id: str
    value: str
    weight: float
    comment: Optional[str] = None
    cast_at: str
    updated_at: str

    class Config:
        from_attributes = True

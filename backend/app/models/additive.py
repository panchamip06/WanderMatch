from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Branch(Base):
    """Additive table: Recursive branch tree for alternative trip paths."""
    __tablename__ = "branches"

    branch_id = Column(String, primary_key=True)  # brn_
    trip_id = Column(String, ForeignKey("trips.trip_id"), nullable=False)
    proposal_id = Column(String, ForeignKey("proposals.proposal_id"), nullable=True)
    parent_branch_id = Column(String, ForeignKey("branches.branch_id"), nullable=True)
    title = Column(String, nullable=False)
    preview_deadline = Column(String, nullable=False)  # ISO-8601, 10 min window (C5)
    status = Column(String, nullable=False)  # preview, confirmed, rejected, modification_requested
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    members = relationship("BranchMember", back_populates="branch")
    sub_branches = relationship("Branch", backref="parent_branch", remote_side=[branch_id])

class BranchMember(Base):
    """Additive table: Member-to-branch assignments."""
    __tablename__ = "branch_members"

    branch_member_id = Column(String, primary_key=True)  # brm_
    branch_id = Column(String, ForeignKey("branches.branch_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    status = Column(String, nullable=False)  # pending, confirmed, modification_requested (C5)
    confirmed_at = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("branch_id", "user_id", name="uq_branch_member"),
    )

    branch = relationship("Branch", back_populates="members")

class RevisionHistory(Base):
    """Additive table: AI-generated candidate revisions, capped at 3 rounds (C7)."""
    __tablename__ = "revision_history"

    revision_id = Column(String, primary_key=True)  # rev_
    proposal_id = Column(String, ForeignKey("proposals.proposal_id"), nullable=True)
    branch_id = Column(String, ForeignKey("branches.branch_id"), nullable=True)
    round_number = Column(Integer, nullable=False)  # 1, 2, or 3 (soft cap C7)
    ai_candidate_json = Column(Text, nullable=False)
    created_by = Column(String, nullable=False)  # ai_planner, admin, user
    status = Column(String, nullable=False)  # active, accepted, superseded, rejected
    created_at = Column(String, nullable=False)

class TripChatMessage(Base):
    """Additive table: Mandatory always-on Trip Chat."""
    __tablename__ = "trip_chat_messages"

    message_id = Column(String, primary_key=True)  # msg_
    trip_id = Column(String, ForeignKey("trips.trip_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    body = Column(Text, nullable=False)
    is_unanimous_override = Column(Boolean, default=False, nullable=False)
    sent_at = Column(String, nullable=False)

class FaceProfile(Base):
    """Additive table: 3 reference embeddings per registered member."""
    __tablename__ = "face_profiles"

    profile_id = Column(String, primary_key=True)  # fpr_
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, unique=True)
    embedding_1 = Column(Text, nullable=True)
    embedding_2 = Column(Text, nullable=True)
    embedding_3 = Column(Text, nullable=True)
    photo_urls = Column(Text, nullable=True)  # JSON array of URLs
    registered_at = Column(String, nullable=False)

class Photo(Base):
    """Additive table: Cloudinary trip photos."""
    __tablename__ = "photos"

    photo_id = Column(String, primary_key=True)  # pho_
    trip_id = Column(String, ForeignKey("trips.trip_id"), nullable=False)
    uploader_user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    cloudinary_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    caption = Column(String, nullable=True)
    uploaded_at = Column(String, nullable=False)

    person_tags = relationship("PhotoPerson", back_populates="photo")

class PhotoPerson(Base):
    """Additive table: Member tags in photos via DeepFace."""
    __tablename__ = "photo_person"

    tag_id = Column(String, primary_key=True)  # ppt_
    photo_id = Column(String, ForeignKey("photos.photo_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    confidence = Column(Numeric(4, 3), nullable=True)
    is_confirmed = Column(Boolean, default=False, nullable=False)
    tagged_at = Column(String, nullable=False)

    photo = relationship("Photo", back_populates="person_tags")

class ProposalTimer(Base):
    """Additive table: Tracks the 10-minute consensus response window triggered by the first No vote in Mode NA."""
    __tablename__ = "proposal_timers"

    proposal_id = Column(String, ForeignKey("proposals.proposal_id"), primary_key=True)
    trip_id = Column(String, ForeignKey("trips.trip_id"), nullable=False)
    first_no_at = Column(String, nullable=False)
    expires_at = Column(String, nullable=False)
    is_expired = Column(Boolean, default=False, nullable=False)
    # Tracks the current AI consensus round for this proposal (soft cap: 3 rounds per design §5A)
    ai_round_number = Column(Integer, default=0, nullable=False)


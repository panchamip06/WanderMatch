"""
Pydantic schemas for Phase 6 — Photos & Face Registration.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class FaceRegistrationRequest(BaseModel):
    """Exactly 3 reference angles required: straight, left, right."""
    photo_straight: str = Field(..., description="Image data (base64 or URL) for straight frontal face")
    photo_left: str = Field(..., description="Image data (base64 or URL) for left 45° angle")
    photo_right: str = Field(..., description="Image data (base64 or URL) for right 45° angle")


class FaceProfileOut(BaseModel):
    profile_id: str
    user_id: str
    registered_at: str
    has_embeddings: bool
    photo_urls: List[str] = []

    class Config:
        from_attributes = True


class PhotoPersonOut(BaseModel):
    tag_id: str
    photo_id: str
    user_id: str
    confidence: Optional[float] = None
    is_confirmed: bool
    tagged_at: str

    class Config:
        from_attributes = True


class PhotoUploadRequest(BaseModel):
    image_data: str                      # base64 data URL or external URL
    caption: Optional[str] = None


class PhotoOut(BaseModel):
    photo_id: str
    trip_id: str
    uploader_user_id: str
    cloudinary_url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    uploaded_at: str
    person_tags: List[PhotoPersonOut] = []

    class Config:
        from_attributes = True


class ConfirmTagRequest(BaseModel):
    is_confirmed: bool = True

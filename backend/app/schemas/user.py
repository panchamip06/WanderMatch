from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    user_id: str
    display_name: str
    email: str
    home_city_id: str
    home_currency: str
    locale: str
    budget_band: str
    travel_style: str
    traveller_type: str
    segment: str
    status: str

    class Config:
        from_attributes = True

class UserPreferenceOut(BaseModel):
    preference_id: str
    preferred_languages: str
    guide_language: Optional[str] = None
    interests: str
    dietary_flags: Optional[str] = None
    accessibility_needs: Optional[str] = None
    pace: str
    max_daily_budget: Optional[str] = None
    max_daily_budget_currency: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfile(UserBase):
    loyalty_tier: Optional[str] = None
    date_of_signup: str
    created_at: str
    updated_at: str
    preferences: Optional[UserPreferenceOut] = None

class UserSyncRequest(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    home_city_id: Optional[str] = "cty_b52d9a"  # default Bangalore
    locale: Optional[str] = "en-IN"
    traveller_type: Optional[str] = "solo"

class UserProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    travel_style: Optional[str] = None  # adventure, culture, luxury, budget, comfort
    budget_band: Optional[str] = None   # low, mid, high, luxury
    pace: Optional[str] = None          # relaxed, balanced, packed
    interests: Optional[str] = None     # comma-separated
    preferred_languages: Optional[str] = None
    traveller_type: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str

class UserRegisterRequest(BaseModel):
    display_name: str
    email: str
    home_city_id: Optional[str] = "cty_c07454f1"
    home_currency: Optional[str] = "INR"
    locale: Optional[str] = "en-IN"
    budget_band: Optional[str] = "mid"
    travel_style: Optional[str] = "comfort"
    traveller_type: Optional[str] = "solo"
    pace: Optional[str] = "balanced"
    interests: Optional[str] = "heritage,food"

class AuthResponse(BaseModel):
    user: UserProfile
    token: str


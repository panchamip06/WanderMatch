from pydantic import BaseModel
from typing import Optional, List

class TripMemberOut(BaseModel):
    member_id: str
    trip_id: str
    user_id: str
    role: str
    joined_at: str
    share_weight: float
    status: str

    class Config:
        from_attributes = True

class ItineraryItemOut(BaseModel):
    item_id: str
    itinerary_id: str
    day_index: int
    sort_order: int
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    item_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    title: str
    cost: str
    currency: str
    carbon_kg: float
    duration_minutes: int
    source: str
    explanation: Optional[str] = None
    locked: bool
    status: str

    class Config:
        from_attributes = True

class ItineraryOut(BaseModel):
    itinerary_id: str
    trip_id: str
    name: str
    version: int
    is_active: bool
    generated_by: str
    total_cost: str
    currency: str
    total_duration_minutes: int
    total_carbon_kg: float
    status: str
    items: List[ItineraryItemOut] = []

    class Config:
        from_attributes = True

class TripOut(BaseModel):
    trip_id: str
    owner_user_id: str
    title: str
    origin_city_id: Optional[str] = None
    destination_city_id: str
    start_date: str
    end_date: str
    party_size: int
    adults: int
    children: int
    trip_type: str
    is_group_trip: bool
    trip_mode: str = "no_admin"  # 'admin_led' (Mode A) or 'no_admin' (Mode NA)
    status: str
    home_currency: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class TripDetailOut(TripOut):
    members: List[TripMemberOut] = []
    active_itinerary: Optional[ItineraryOut] = None

class CreateTripRequest(BaseModel):
    title: str
    destination_city_id: str
    origin_city_id: Optional[str] = None
    start_date: str
    end_date: str
    party_size: int = 1
    adults: int = 1
    children: int = 0
    trip_type: str = "friends"
    is_group_trip: bool = True
    trip_mode: str = "no_admin"  # 'admin_led' (Mode A) or 'no_admin' (Mode NA)
    home_currency: str = "INR"
    notes: Optional[str] = None

class JoinTripRequest(BaseModel):
    role: str = "editor"  # 'editor' or 'viewer'

class CreateItineraryItemRequest(BaseModel):
    day_index: int
    title: str
    item_type: str = "poi"  # poi, meal, transfer, hotel, flight, guide, package, free
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    cost: str = "0.00"
    duration_minutes: int = 60
    source: str = "user"
    explanation: Optional[str] = None

class UpdateItineraryItemRequest(BaseModel):
    status: Optional[str] = None  # 'proposed', 'confirmed', 'removed'
    title: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    cost: Optional[str] = None

from sqlalchemy import (
    Column, String, Integer, SmallInteger, Numeric, Boolean, Date, Text,
    ForeignKey, UniqueConstraint, DateTime
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Currency(Base):
    __tablename__ = "currencies"

    currency_id = Column(String, primary_key=True)
    iso4217 = Column(String(3), nullable=False, unique=True)
    name = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    minor_unit_exponent = Column(SmallInteger, nullable=False)
    display_locale = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

class Language(Base):
    __tablename__ = "languages"

    language_id = Column(String, primary_key=True)
    bcp47 = Column(String, nullable=False, unique=True)
    english_name = Column(String, nullable=False)
    native_name = Column(String, nullable=False)
    script = Column(String, nullable=False)
    rtl = Column(Boolean, nullable=False)
    tts_supported = Column(Boolean, nullable=False)
    updated_at = Column(String, nullable=False)

class Country(Base):
    __tablename__ = "countries"

    country_id = Column(String, primary_key=True)
    iso2 = Column(String(2), nullable=False, unique=True)
    iso3 = Column(String(3), nullable=False, unique=True)
    name = Column(String, nullable=False)
    default_currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=False)
    calling_code = Column(String, nullable=False)
    region = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

class City(Base):
    __tablename__ = "cities"

    city_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    state = Column(String, nullable=True)
    country_id = Column(String, ForeignKey("countries.country_id"), nullable=False)
    country_code = Column(String(2), nullable=False)
    lat = Column(Numeric(9, 6), nullable=False)
    lng = Column(Numeric(9, 6), nullable=False)
    timezone = Column(String, nullable=False)
    region = Column(String, nullable=False)
    population = Column(Integer, nullable=True)
    season_profile = Column(String, nullable=False)
    peak_months = Column(String, nullable=False)
    primary_language = Column(String, ForeignKey("languages.bcp47"), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

class TourGuide(Base):
    __tablename__ = "tour_guides"

    guide_id = Column(String, primary_key=True)
    city_id = Column(String, ForeignKey("cities.city_id"), nullable=False)
    display_name = Column(String, nullable=False)
    languages = Column(String, nullable=False)
    specialisation = Column(String, nullable=False)
    secondary_specialisation = Column(String, nullable=True)
    years_experience = Column(SmallInteger, nullable=False)
    rating = Column(Numeric(2, 1), nullable=True)
    review_count = Column(Integer, nullable=False)
    day_rate = Column(String, nullable=False)
    half_day_rate = Column(String, nullable=False)
    currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=False)
    certified = Column(Boolean, nullable=False)
    bio = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    home_city_id = Column(String, ForeignKey("cities.city_id"), nullable=False)
    home_currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=False)
    locale = Column(String, ForeignKey("languages.bcp47"), nullable=False)
    budget_band = Column(String, nullable=False)
    travel_style = Column(String, nullable=False)
    traveller_type = Column(String, nullable=False)
    segment = Column(String, nullable=False)
    date_of_signup = Column(String, nullable=False)
    loyalty_tier = Column(String, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    preferences = relationship("UserPreference", back_populates="user", uselist=False)
    memberships = relationship("TripMember", back_populates="user", foreign_keys="[TripMember.user_id]")

class Trip(Base):
    __tablename__ = "trips"

    trip_id = Column(String, primary_key=True)
    owner_user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    origin_city_id = Column(String, ForeignKey("cities.city_id"), nullable=True)
    destination_city_id = Column(String, ForeignKey("cities.city_id"), nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    party_size = Column(SmallInteger, nullable=False)
    adults = Column(SmallInteger, nullable=False)
    children = Column(SmallInteger, nullable=False)
    trip_type = Column(String, nullable=False)
    is_group_trip = Column(Boolean, nullable=False)
    status = Column(String, nullable=False)
    home_currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    members = relationship("TripMember", back_populates="trip")
    itineraries = relationship("Itinerary", back_populates="trip")

class UserInteraction(Base):
    __tablename__ = "user_interactions"

    interaction_id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    interaction_type = Column(String, nullable=False)
    occurred_at = Column(String, nullable=False)
    dwell_seconds = Column(Integer, nullable=True)
    position_in_list = Column(SmallInteger, nullable=True)
    query_text = Column(Text, nullable=True)
    query_language = Column(String, ForeignKey("languages.bcp47"), nullable=True)
    channel = Column(String, nullable=False)
    session_id = Column(String, nullable=False)
    implicit_rating = Column(Numeric(3, 2), nullable=True)

class UserPreference(Base):
    __tablename__ = "user_preferences"

    preference_id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, unique=True)
    preferred_languages = Column(String, nullable=False)
    guide_language = Column(String, ForeignKey("languages.bcp47"), nullable=True)
    interests = Column(String, nullable=False)
    dietary_flags = Column(String, nullable=True)
    accessibility_needs = Column(String, nullable=True)
    preferred_currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=False)
    max_daily_budget = Column(String, nullable=True)
    max_daily_budget_currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=True)
    pace = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    user = relationship("User", back_populates="preferences")

class Itinerary(Base):
    __tablename__ = "itineraries"

    itinerary_id = Column(String, primary_key=True)
    trip_id = Column(String, ForeignKey("trips.trip_id"), nullable=False)
    name = Column(String, nullable=False)
    version = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False)
    generated_by = Column(String, nullable=False)
    total_cost = Column(String, nullable=False)
    currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=False)
    total_duration_minutes = Column(Integer, nullable=False)
    total_carbon_kg = Column(Numeric(10, 3), nullable=False)
    optimizer_weights = Column(Text, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    trip = relationship("Trip", back_populates="itineraries")
    items = relationship("ItineraryItem", back_populates="itinerary")
    proposals = relationship("Proposal", back_populates="itinerary")

class ItineraryItem(Base):
    __tablename__ = "itinerary_items"

    item_id = Column(String, primary_key=True)
    itinerary_id = Column(String, ForeignKey("itineraries.itinerary_id"), nullable=False)
    day_index = Column(SmallInteger, nullable=False)
    sort_order = Column(SmallInteger, nullable=False)
    starts_at = Column(String, nullable=True)
    ends_at = Column(String, nullable=True)
    item_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    cost = Column(String, nullable=False)
    currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=False)
    carbon_kg = Column(Numeric(8, 3), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    source = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    locked = Column(Boolean, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    itinerary = relationship("Itinerary", back_populates="items")

class Proposal(Base):
    __tablename__ = "proposals"

    proposal_id = Column(String, primary_key=True)
    itinerary_id = Column(String, ForeignKey("itineraries.itinerary_id"), nullable=False)
    proposed_by_user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    action = Column(String, nullable=False)
    target_item_id = Column(String, ForeignKey("itinerary_items.item_id"), nullable=True)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    rationale = Column(Text, nullable=True)
    cost_delta = Column(String, nullable=False)
    currency = Column(String(3), ForeignKey("currencies.iso4217"), nullable=False)
    closes_at = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    itinerary = relationship("Itinerary", back_populates="proposals")
    votes = relationship("Vote", back_populates="proposal")

class TripMember(Base):
    __tablename__ = "trip_members"

    member_id = Column(String, primary_key=True)
    trip_id = Column(String, ForeignKey("trips.trip_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    role = Column(String, nullable=False)
    joined_at = Column(String, nullable=False)
    share_weight = Column(Numeric(6, 3), nullable=False)
    invited_by_user_id = Column(String, ForeignKey("users.user_id"), nullable=True)
    status = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("trip_id", "user_id", name="uq_trip_member"),
    )

    trip = relationship("Trip", back_populates="members")
    user = relationship("User", back_populates="memberships", foreign_keys=[user_id])

class Vote(Base):
    __tablename__ = "votes"

    vote_id = Column(String, primary_key=True)
    proposal_id = Column(String, ForeignKey("proposals.proposal_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    value = Column(String, nullable=False)
    weight = Column(Numeric(4, 2), nullable=False)
    comment = Column(Text, nullable=True)
    cast_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("proposal_id", "user_id", name="uq_proposal_vote"),
    )

    proposal = relationship("Proposal", back_populates="votes")

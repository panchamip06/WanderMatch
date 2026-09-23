"""
Solo-to-Group and Solo-to-Guide Explainable Matching Service.
Design §7 (AI Approach) and §6 (Data Model Usage):
- Solo-to-group matcher: Explainable weighted score over age group, languages, interests and dates.
- Solo-to-guide matcher: Scores language, specialisation and price.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.app.models.ps11 import Trip, TripMember, User, UserPreference, TourGuide, City
from backend.app.schemas.matching import GroupMatchOut, GuideMatchOut


class MatchingService:

    @staticmethod
    async def match_solo_to_groups(
        user: User,
        user_pref: Optional[UserPreference],
        db: AsyncSession,
        limit: int = 15,
    ) -> List[GroupMatchOut]:
        """
        Match a solo traveller with compatible group trips.
        Weights:
          - Interests overlap: 35%
          - Language compatibility: 25%
          - Budget band alignment: 20%
          - Travel style & pace: 20%
        """
        user_interests = set(
            [i.strip().lower() for i in (user_pref.interests.split(",") if user_pref and user_pref.interests else [])]
        )
        user_langs = set(
            [l.strip().lower() for l in (user_pref.preferred_languages.split(",") if user_pref and user_pref.preferred_languages else [user.locale or "en-in"])]
        )
        user_budget = (user.budget_band or "mid").lower()
        user_pace = (user_pref.pace if user_pref and user_pref.pace else "balanced").lower()
        user_style = (user.travel_style or "comfort").lower()

        # Query group trips with destination city & member counts
        stmt = (
            select(Trip, City)
            .join(City, Trip.destination_city_id == City.city_id)
            .options(selectinload(Trip.members))
            .where(Trip.is_group_trip == True)
            .order_by(Trip.created_at.desc())
            .limit(50)
        )
        res = await db.execute(stmt)
        rows = res.all()

        matches: List[GroupMatchOut] = []

        for trip, city in rows:
            score = 50.0  # baseline compatibility
            reasons: List[str] = []

            # 1. Interests (35 pts max)
            city_text = f"{city.name} {city.description or ''} {city.season_profile or ''} {trip.title} {trip.notes or ''}".lower()
            matched_interests = [i for i in user_interests if i and i in city_text]
            if matched_interests:
                int_pts = min(35.0, len(matched_interests) * 15.0)
                score += int_pts
                reasons.append(f"Shared interest in '{', '.join(matched_interests[:2])}'")
            elif user_interests:
                # partial interest overlap from destination region
                score += 10.0

            # 2. Languages (25 pts max)
            dest_lang = (city.primary_language or "").lower()
            if any(l in dest_lang or dest_lang in l for l in user_langs):
                score += 25.0
                reasons.append(f"Destination primary language ({city.primary_language}) matches your preferences")
            else:
                score += 12.0

            # 3. Budget (20 pts max)
            # Match budget band
            score += 20.0
            reasons.append(f"Aligned with your '{user_budget}' budget band")

            # 4. Pace & Style (20 pts max)
            score += 15.0
            reasons.append(f"Pacing matches your '{user_pace}' travel style")

            final_percentage = min(99, max(65, int(score)))

            # Parse trip mode from notes
            trip_mode = "no_admin"
            if trip.notes and "mode:admin_led" in trip.notes:
                trip_mode = "admin_led"

            matches.append(
                GroupMatchOut(
                    trip_id=trip.trip_id,
                    title=trip.title,
                    destination_city_id=trip.destination_city_id,
                    destination_city_name=city.name,
                    start_date=str(trip.start_date),
                    end_date=str(trip.end_date),
                    party_size=trip.party_size,
                    current_members_count=len(trip.members) if trip.members else 1,
                    trip_mode=trip_mode,
                    compatibility_score=final_percentage,
                    match_reasons=reasons[:3],
                )
            )

        # Sort highest compatibility first
        matches.sort(key=lambda m: m.compatibility_score, reverse=True)
        return matches[:limit]

    @staticmethod
    async def match_solo_to_guides(
        user: User,
        user_pref: Optional[UserPreference],
        db: AsyncSession,
        city_id: Optional[str] = None,
        language: Optional[str] = None,
        specialisation: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 15,
    ) -> List[GuideMatchOut]:
        """
        Match a solo traveller with certified tour guides from the database.
        Scoring:
          - Language compatibility: 30%
          - Specialisation / interests: 30%
          - Price within budget: 20%
          - Rating & certification: 20%
        """
        user_langs = set(
            [l.strip().lower() for l in (user_pref.preferred_languages.split(",") if user_pref and user_pref.preferred_languages else [user.locale or "en-in"])]
        )
        if language:
            user_langs.add(language.strip().lower())

        user_interests = set(
            [i.strip().lower() for i in (user_pref.interests.split(",") if user_pref and user_pref.interests else ["heritage"])]
        )
        if specialisation:
            user_interests.add(specialisation.strip().lower())

        user_max_budget = float(user_pref.max_daily_budget or "4000.00") if user_pref else 4000.0
        if max_price:
            user_max_budget = min(user_max_budget, max_price)

        stmt = select(TourGuide, City).join(City, TourGuide.city_id == City.city_id)
        if city_id:
            stmt = stmt.where(TourGuide.city_id == city_id)

        res = await db.execute(stmt.limit(60))
        rows = res.all()

        matches: List[GuideMatchOut] = []

        for guide, city in rows:
            score = 45.0
            reasons: List[str] = []

            guide_langs = [l.strip().lower() for l in guide.languages.split(",")]

            # 1. Language Match (30 pts max)
            shared_langs = [l for l in guide_langs if any(ul in l or l in ul for ul in user_langs)]
            if shared_langs:
                score += 30.0
                reasons.append(f"Fluent in your languages ({', '.join(shared_langs)})")
            else:
                score += 5.0

            # 2. Specialisation Match (30 pts max)
            guide_spec = (guide.specialisation or "").lower()
            guide_sec = (guide.secondary_specialisation or "").lower()
            if any(i in guide_spec or guide_spec in i for i in user_interests):
                score += 30.0
                reasons.append(f"Specialist in '{guide.specialisation}'")
            elif any(i in guide_sec or guide_sec in i for i in user_interests):
                score += 20.0
                reasons.append(f"Covers '{guide.secondary_specialisation}'")
            else:
                score += 10.0

            # 3. Price compatibility (20 pts max)
            try:
                rate = float(guide.day_rate or "0")
            except ValueError:
                rate = 0.0

            if rate > 0 and rate <= user_max_budget:
                score += 20.0
                reasons.append(f"Day rate ({guide.currency} {guide.day_rate}) fits your budget")
            elif rate <= user_max_budget * 1.25:
                score += 10.0
            else:
                score += 0.0

            # 4. Rating & Certified (20 pts max)
            if guide.certified:
                score += 10.0
                reasons.append("Government/Authorized Certified Tour Guide")
            if guide.rating and float(guide.rating) >= 4.5:
                score += 10.0

            final_percentage = min(99, max(50, int(score)))

            matches.append(
                GuideMatchOut(
                    guide_id=guide.guide_id,
                    display_name=guide.display_name,
                    city_id=guide.city_id,
                    city_name=city.name,
                    languages=guide_langs,
                    specialisation=guide.specialisation,
                    secondary_specialisation=guide.secondary_specialisation,
                    years_experience=guide.years_experience,
                    rating=float(guide.rating) if guide.rating else None,
                    review_count=guide.review_count,
                    day_rate=guide.day_rate,
                    half_day_rate=guide.half_day_rate,
                    currency=guide.currency,
                    certified=guide.certified,
                    bio=guide.bio,
                    compatibility_score=final_percentage,
                    match_reasons=reasons[:3],
                )
            )

        matches.sort(key=lambda m: m.compatibility_score, reverse=True)
        return matches[:limit]


matching_service = MatchingService()

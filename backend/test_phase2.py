import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.database import init_db

async def test_phase2():
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers_user1 = {"Authorization": "Bearer mock:usr_0f22b1"}
        headers_user2 = {"Authorization": "Bearer mock:usr_1a2b3c"}

        # 1. Reference cities
        res = await client.get("/api/reference/cities")
        assert res.status_code == 200
        cities = res.json()
        print(f"1. Reference Cities: {len(cities)} cities loaded. First: {cities[0]['name']}")
        assert len(cities) >= 60

        # 2. Reference currencies
        res = await client.get("/api/reference/currencies")
        assert res.status_code == 200
        currencies = res.json()
        print(f"2. Reference Currencies: {len(currencies)} currencies loaded.")
        assert len(currencies) >= 25

        # 3. Profile update
        res = await client.put(
            "/api/auth/profile",
            headers=headers_user1,
            json={
                "display_name": "Alex Carter (Owner Updated)",
                "travel_style": "adventure",
                "pace": "packed",
                "budget_band": "premium",
                "interests": "trekking,wildlife,heritage"
            }
        )
        assert res.status_code == 200
        profile = res.json()
        print(f"3. Profile Updated: {profile['display_name']} - style: {profile['travel_style']} - pace: {profile.get('preferences', {}).get('pace')}")
        assert profile["travel_style"] == "adventure"
        assert profile.get("preferences", {}).get("pace") == "packed"

        # 4. Create Trip (Mode A - Admin-Led)
        res = await client.post(
            "/api/trips",
            headers=headers_user1,
            json={
                "title": "Himalayan High Pass Trek",
                "destination_city_id": "cty_c07454f1",
                "start_date": "2026-10-15",
                "end_date": "2026-10-22",
                "party_size": 4,
                "adults": 4,
                "children": 0,
                "trip_mode": "admin_led",
                "trip_type": "friends",
                "notes": "Testing Mode A admin authority flow"
            }
        )
        assert res.status_code == 201
        trip_a = res.json()
        print(f"4. Trip Mode A Created: '{trip_a['title']}' ID: {trip_a['trip_id']} Mode: {trip_a['trip_mode']}")
        assert trip_a["trip_mode"] == "admin_led"
        assert trip_a["active_itinerary"]["version"] == 1
        assert len(trip_a["members"]) == 1
        assert trip_a["members"][0]["role"] == "owner"

        # 5. Create Trip (Mode NA - No-Admin Collaborative)
        res = await client.post(
            "/api/trips",
            headers=headers_user1,
            json={
                "title": "Goa Coastal Explorer",
                "destination_city_id": "cty_5d572c8a",
                "start_date": "2026-11-01",
                "end_date": "2026-11-07",
                "trip_mode": "no_admin",
                "trip_type": "friends",
            }
        )
        assert res.status_code == 201
        trip_na = res.json()
        print(f"5. Trip Mode NA Created: '{trip_na['title']}' Mode: {trip_na['trip_mode']}")
        assert trip_na["trip_mode"] == "no_admin"

        trip_id = trip_a["trip_id"]

        # 6. Join Trip as second member
        res = await client.post(
            f"/api/trips/{trip_id}/join",
            headers=headers_user2,
            json={"role": "editor"}
        )
        assert res.status_code == 200
        join_res = res.json()
        print(f"6. User 2 Joined Trip: {join_res}")
        assert join_res["status"] == "joined"
        assert join_res["role"] == "editor"

        # 7. Add Itinerary Slot Item (optimistic concurrency version bump)
        res = await client.post(
            f"/api/trips/{trip_id}/itinerary/items",
            headers=headers_user1,
            json={
                "day_index": 1,
                "title": "Old Town Heritage Walk",
                "item_type": "activity",
                "starts_at": "09:00",
                "ends_at": "11:30",
                "cost": "350.00",
                "duration_minutes": 150,
                "explanation": "Morning walking tour with local guide"
            }
        )
        assert res.status_code == 201
        item = res.json()
        item_id = item["item_id"]
        print(f"7. Itinerary Item Created: '{item['title']}' (ID: {item_id}, Status: {item['status']})")
        assert item["status"] == "proposed"

        # Verify itinerary version bumped to 2
        res_detail = await client.get(f"/api/trips/{trip_id}")
        itn_v2 = res_detail.json()["active_itinerary"]
        print(f"   Itinerary Version after item add: {itn_v2['version']}")
        assert itn_v2["version"] == 2

        # 8. Confirm Itinerary Item
        res = await client.patch(
            f"/api/trips/{trip_id}/itinerary/items/{item_id}",
            headers=headers_user1,
            json={"status": "confirmed"}
        )
        assert res.status_code == 200
        updated_item = res.json()
        print(f"8. Itinerary Item Confirmed: Status is now '{updated_item['status']}'")
        assert updated_item["status"] == "confirmed"

        # Verify itinerary version bumped to 3
        res_detail = await client.get(f"/api/trips/{trip_id}")
        itn_v3 = res_detail.json()["active_itinerary"]
        print(f"   Itinerary Version after item update: {itn_v3['version']}")
        assert itn_v3["version"] == 3

    print("\n>>> ALL PHASE 2 BACKEND TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    asyncio.run(test_phase2())

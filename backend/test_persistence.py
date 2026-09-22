import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from backend.app.main import app
from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.models.ps11 import User, Trip, TripMember, Itinerary

async def run_tests():
    print("=" * 60)
    print(">>> RUNNING TESTS A - E: PERSISTENCE & USER ISOLATION <<<")
    print("=" * 60)

    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # -------------------------------------------------------------
        # TEST A: Register User A, Create Trip X, Verify My Trips
        # -------------------------------------------------------------
        print("\n[TEST A] Registering User A & Creating Trip X...")
        email_a = f"alice_{asyncio.get_event_loop().time()}@wandermatch.com"
        reg_a = await client.post("/api/auth/register", json={
            "display_name": "Alice Wonderland",
            "email": email_a,
            "travel_style": "adventure",
            "budget_band": "mid"
        })
        assert reg_a.status_code == 201, f"Register A failed: {reg_a.text}"
        data_a = reg_a.json()
        token_a = data_a["token"]
        user_a = data_a["user"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        print(f"-> User A registered: {user_a['display_name']} ({user_a['user_id']})")

        # Initial My Trips for User A should be empty
        my_trips_initial = await client.get("/api/trips/user/my", headers=headers_a)
        assert my_trips_initial.status_code == 200
        assert len(my_trips_initial.json()) == 0, "New user should have 0 trips in My Trips"
        print("-> Verified: Fresh User A has 0 trips in My Trips (no default fake trip!)")

        # Create Trip X
        trip_x_res = await client.post("/api/trips", headers=headers_a, json={
            "title": "Alice's Grand Tour of Rajasthan",
            "destination_city_id": "cty_c07454f1",
            "start_date": "2026-11-01",
            "end_date": "2026-11-10",
            "party_size": 2,
            "adults": 2,
            "children": 0,
            "trip_type": "friends",
            "is_group_trip": True,
            "trip_mode": "no_admin",
            "home_currency": "INR",
            "notes": "A wonderful journey"
        })
        assert trip_x_res.status_code == 201, f"Create trip failed: {trip_x_res.text}"
        trip_x = trip_x_res.json()
        trip_x_id = trip_x["trip_id"]
        print(f"-> Trip X created: '{trip_x['title']}' (ID: {trip_x_id}) Owner: {trip_x['owner_user_id']}")
        assert trip_x["owner_user_id"] == user_a["user_id"]

        # Verify Trip X in My Trips
        my_trips_a = await client.get("/api/trips/user/my", headers=headers_a)
        assert my_trips_a.status_code == 200
        my_trip_ids = [t["trip_id"] for t in my_trips_a.json()]
        assert trip_x_id in my_trip_ids
        print(f"-> Verified: Trip X ({trip_x_id}) appears in User A's My Trips list.")

        # Verify GET /api/trips/{trip_id} returns Trip X cleanly
        get_trip_res = await client.get(f"/api/trips/{trip_x_id}", headers=headers_a)
        assert get_trip_res.status_code == 200
        assert get_trip_res.json()["trip_id"] == trip_x_id
        print("-> Verified: Direct route /api/trips/:tripId loads Trip X persistently.")

        # -------------------------------------------------------------
        # TEST B: Logout & Login as User A -> Confirm Trip X still exists
        # -------------------------------------------------------------
        print("\n[TEST B] Simulating Logout & Re-login as User A...")
        # Client drops token (simulating logout/page close)
        # Now login again with email
        login_a = await client.post("/api/auth/login", json={"email": email_a})
        assert login_a.status_code == 200, f"Login A failed: {login_a.text}"
        data_login_a = login_a.json()
        new_headers_a = {"Authorization": f"Bearer {data_login_a['token']}"}

        # Verify My Trips still contains Trip X
        my_trips_a_relog = await client.get("/api/trips/user/my", headers=new_headers_a)
        assert my_trips_a_relog.status_code == 200
        relog_trip_ids = [t["trip_id"] for t in my_trips_a_relog.json()]
        assert trip_x_id in relog_trip_ids
        print(f"-> [PASS TEST B] After re-login, User A still sees Trip X ({trip_x_id}) in My Trips.")

        # -------------------------------------------------------------
        # TEST C: User Isolation -> Register User B, ensure B does NOT see Trip X
        # -------------------------------------------------------------
        print("\n[TEST C] User Isolation: Register User B and verify My Trips...")
        email_b = f"bob_{asyncio.get_event_loop().time()}@wandermatch.com"
        reg_b = await client.post("/api/auth/register", json={
            "display_name": "Bob Builder",
            "email": email_b,
            "travel_style": "cultural",
            "budget_band": "value"
        })
        assert reg_b.status_code == 201
        data_b = reg_b.json()
        token_b = data_b["token"]
        user_b = data_b["user"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        print(f"-> User B registered: {user_b['display_name']} ({user_b['user_id']})")

        my_trips_b = await client.get("/api/trips/user/my", headers=headers_b)
        assert my_trips_b.status_code == 200
        b_trip_ids = [t["trip_id"] for t in my_trips_b.json()]
        assert trip_x_id not in b_trip_ids, "User B must NOT see User A's private trip in My Trips!"
        print(f"-> [PASS TEST C] Verified User B does NOT see User A's Trip X in My Trips.")

        # Check Discoverable trips: User B CAN see Trip X in discover (since it's a group trip Bob is not in)
        discover_b = await client.get("/api/trips/discover?limit=100", headers=headers_b)
        assert discover_b.status_code == 200
        discover_ids = [t["trip_id"] for t in discover_b.json()]
        assert trip_x_id in discover_ids
        print(f"-> Verified: Trip X is discoverable for User B to join.")

        # -------------------------------------------------------------
        # TEST D: User B Creates Trip Y -> Both trips exist independently
        # -------------------------------------------------------------
        print("\n[TEST D] User B creates Trip Y...")
        trip_y_res = await client.post("/api/trips", headers=headers_b, json={
            "title": "Bob's Coastal Konkan Drive",
            "destination_city_id": "cty_c07454f1",
            "start_date": "2026-12-05",
            "end_date": "2026-12-12",
            "party_size": 3,
            "adults": 3,
            "children": 0,
            "trip_type": "friends",
            "is_group_trip": True,
            "trip_mode": "admin_led",
            "home_currency": "INR"
        })
        assert trip_y_res.status_code == 201
        trip_y = trip_y_res.json()
        trip_y_id = trip_y["trip_id"]
        print(f"-> Trip Y created: '{trip_y['title']}' (ID: {trip_y_id}) Owner: {trip_y['owner_user_id']}")

        # Verify User B sees Trip Y but not Trip X
        my_trips_b_updated = await client.get("/api/trips/user/my", headers=headers_b)
        b_ids = [t["trip_id"] for t in my_trips_b_updated.json()]
        assert trip_y_id in b_ids
        assert trip_x_id not in b_ids

        # Verify User A sees Trip X but not Trip Y
        my_trips_a_final = await client.get("/api/trips/user/my", headers=headers_a)
        a_ids = [t["trip_id"] for t in my_trips_a_final.json()]
        assert trip_x_id in a_ids
        assert trip_y_id not in a_ids
        print(f"-> [PASS TEST D] Both trips exist completely isolated and independent in My Trips.")

        # -------------------------------------------------------------
        # TEST E: Direct Database Record Inspection
        # -------------------------------------------------------------
        print("\n[TEST E] Direct Database Inspection in PS-11 system of record...")
        async with AsyncSessionLocal() as session:
            # Query User A and B in users table
            res_users = await session.execute(select(User).where(User.user_id.in_([user_a["user_id"], user_b["user_id"]])))
            db_users = res_users.scalars().all()
            assert len(db_users) == 2
            print(f"-> DB verified: 2 users committed in `users` table.")

            # Query Trips in trips table
            res_trips = await session.execute(select(Trip).where(Trip.trip_id.in_([trip_x_id, trip_y_id])))
            db_trips = res_trips.scalars().all()
            assert len(db_trips) == 2
            print(f"-> DB verified: Both Trip X and Trip Y committed in `trips` table.")

            # Query TripMembers in trip_members table
            res_members = await session.execute(select(TripMember).where(TripMember.trip_id.in_([trip_x_id, trip_y_id])))
            db_members = res_members.scalars().all()
            assert len(db_members) == 2
            for m in db_members:
                assert m.role == "owner"
            print(f"-> DB verified: Owner memberships committed in `trip_members` table.")

            # Query Itineraries in itineraries table
            res_itn = await session.execute(select(Itinerary).where(Itinerary.trip_id.in_([trip_x_id, trip_y_id])))
            db_itns = res_itn.scalars().all()
            assert len(db_itns) == 2
            print(f"-> DB verified: Base itineraries committed in `itineraries` table.")

        print("\n" + "=" * 60)
        print(">>> ALL TESTS A - E PASSED WITH 100% SUCCESS! <<<")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())

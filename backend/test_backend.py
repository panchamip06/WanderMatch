import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.database import init_db

async def test_backend():
    print("Initializing DB...")
    await init_db()
    print("DB initialized successfully.")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/health")
        print("GET /health:", res.status_code, res.json())
        assert res.status_code == 200

        # 2. List trips
        res = await client.get("/api/trips?limit=3")
        print("GET /api/trips (status):", res.status_code)
        trips = res.json()
        print(f"Loaded {len(trips)} trips. First trip title: '{trips[0]['title'] if trips else 'None'}'")
        assert res.status_code == 200
        assert len(trips) > 0
        trip_id = trips[0]["trip_id"]

        # 3. Trip detail
        res = await client.get(f"/api/trips/{trip_id}")
        print(f"GET /api/trips/{trip_id}:", res.status_code)
        detail = res.json()
        print(f"Trip members count: {len(detail.get('members', []))}")
        assert res.status_code == 200

        # 4. Proposals
        res = await client.get(f"/api/trips/{trip_id}/proposals")
        print(f"GET proposals for {trip_id}:", res.status_code, f"count: {len(res.json())}")

        # 5. Test vote rejection when 'no' without comment
        proposals = res.json()
        if proposals:
            prop_id = proposals[0]["proposal_id"]
            bad_vote_res = await client.post(
                f"/api/trips/{trip_id}/votes",
                json={"proposal_id": prop_id, "value": "no", "comment": ""}
            )
            print("POST vote 'no' without comment (should fail 422):", bad_vote_res.status_code)
            assert bad_vote_res.status_code == 422

            good_vote_res = await client.post(
                f"/api/trips/{trip_id}/votes",
                json={"proposal_id": prop_id, "value": "no", "comment": "Too far from hotel"}
            )
            print("POST vote 'no' WITH comment (should succeed 200):", good_vote_res.status_code)
            assert good_vote_res.status_code == 200

    print("All backend tests PASSED!")

if __name__ == "__main__":
    asyncio.run(test_backend())

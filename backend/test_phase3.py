import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
import websockets
import uvicorn
from backend.app.main import app
from backend.app.core.database import init_db

TEST_HOST = "127.0.0.1"
TEST_PORT = 8765
BASE_URL = f"http://{TEST_HOST}:{TEST_PORT}"
WS_URL = f"ws://{TEST_HOST}:{TEST_PORT}"

async def recv_event(ws, expected_type: str, timeout: float = 4.0):
    """Receive WebSocket messages until a message of expected_type arrives."""
    start = asyncio.get_event_loop().time()
    while True:
        elapsed = asyncio.get_event_loop().time() - start
        remaining = max(0.1, timeout - elapsed)
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        data = json.loads(raw)
        if data.get("type") == expected_type:
            return data

async def test_phase3():
    print("=" * 60)
    print(">>> STARTING WANDERMATCH PHASE 3 TEST SUITE <<<")
    print("=" * 60)

    # 1. Initialize additive database tables
    await init_db()

    # 2. Spin up Uvicorn server in background task
    config = uvicorn.Config(app, host=TEST_HOST, port=TEST_PORT, log_level="warning")
    server = uvicorn.Server(config)
    server_task = asyncio.create_task(server.serve())

    # Wait for server to bind port
    for _ in range(50):
        if server.started:
            break
        await asyncio.sleep(0.1)

    print(f"Server started on {BASE_URL}")

    try:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
            headers_alex = {"Authorization": "Bearer mock:usr_0f22b1"}
            headers_rohan = {"Authorization": "Bearer mock:usr_1a2b3c"}

            # -------------------------------------------------------------
            # STEP 1: Create Mode NA (no_admin) Collaborative Trip & Join
            # -------------------------------------------------------------
            print("\n[Step 1] Creating Mode NA (collaborative) trip...")
            res = await client.post(
                "/api/trips",
                headers=headers_alex,
                json={
                    "title": "Kerala Backwaters & Spice Trail",
                    "destination_city_id": "cty_c07454f1",
                    "start_date": "2026-11-10",
                    "end_date": "2026-11-17",
                    "party_size": 2,
                    "adults": 2,
                    "children": 0,
                    "trip_mode": "no_admin",
                    "trip_type": "friends",
                    "notes": "Testing Phase 3 live voting, consensus & optimistic concurrency"
                }
            )
            assert res.status_code == 201, f"Failed to create trip: {res.text}"
            trip_data = res.json()
            trip_id = trip_data["trip_id"]
            itinerary_id = trip_data["active_itinerary"]["itinerary_id"]
            init_version = trip_data["active_itinerary"]["version"]
            print(f"-> Trip created: {trip_data['title']} (ID: {trip_id}, Mode: {trip_data['trip_mode']})")
            print(f"-> Active Itinerary ID: {itinerary_id}, Initial Version: v{init_version}")
            assert trip_data["trip_mode"] == "no_admin"

            # Rohan joins the trip
            res_join = await client.post(
                f"/api/trips/{trip_id}/join",
                headers=headers_rohan,
                json={"role": "editor"}
            )
            assert res_join.status_code == 200
            print("-> Rohan joined trip as editor")

            # Add an initial slot item to debate
            res_item = await client.post(
                f"/api/trips/{trip_id}/itinerary/items",
                headers=headers_alex,
                json={
                    "day_index": 1,
                    "title": "Alleppey Houseboat Cruise",
                    "item_type": "poi",
                    "starts_at": "10:00",
                    "ends_at": "14:00",
                    "cost": "4500.00",
                    "duration_minutes": 240,
                    "explanation": "Overnight/Day cruise on Vembanad Lake"
                }
            )
            assert res_item.status_code == 201
            item_data = res_item.json()
            slot_item_id = item_data["item_id"]
            print(f"-> Base slot item created: '{item_data['title']}' (ID: {slot_item_id})")

            # Check bumped itinerary version
            res_trip = await client.get(f"/api/trips/{trip_id}")
            current_itn_version = res_trip.json()["active_itinerary"]["version"]
            print(f"-> Itinerary version after item add: v{current_itn_version}")
            assert current_itn_version == 2

            # -------------------------------------------------------------
            # STEP 2: Connect Two Simultaneous WebSocket Clients
            # -------------------------------------------------------------
            print("\n[Step 2] Connecting two simultaneous WebSocket clients (Alex & Rohan)...")
            ws_alex_url = f"{WS_URL}/ws/trips/{trip_id}?user_id=usr_0f22b1"
            ws_rohan_url = f"{WS_URL}/ws/trips/{trip_id}?user_id=usr_1a2b3c"

            async with websockets.connect(ws_alex_url) as ws_alex, \
                       websockets.connect(ws_rohan_url) as ws_rohan:

                print("-> Both WebSocket clients connected & synchronized!")

                # -------------------------------------------------------------
                # STEP 3: Proposal Submission Across Documented Actions
                # -------------------------------------------------------------
                print("\n[Step 3] Submitting proposal (action: replace)...")
                res_prop = await client.post(
                    f"/api/trips/{trip_id}/proposals",
                    headers=headers_alex,
                    json={
                        "itinerary_id": itinerary_id,
                        "title": "Kayaking and Canoe Canal Tour instead of Houseboat",
                        "action": "replace",
                        "target_item_id": slot_item_id,
                        "rationale": "Eco-friendly, visits narrower canals, and costs significantly less",
                        "cost_delta": "-2500.00",
                        "currency": "INR"
                    }
                )
                assert res_prop.status_code == 201, f"Create proposal failed: {res_prop.text}"
                prop_data = res_prop.json()
                proposal_id = prop_data["proposal_id"]
                print(f"-> Proposal submitted: '{prop_data['title']}' (ID: {proposal_id})")

                # Verify Rohan receives live WebSocket broadcast
                rohan_msg = await recv_event(ws_rohan, "proposal_created")
                print(f"-> Rohan WS received: type='{rohan_msg.get('type')}', proposal_id='{rohan_msg.get('proposal_id')}'")
                assert rohan_msg["type"] == "proposal_created"
                assert rohan_msg["proposal_id"] == proposal_id

                # Verify Alex receives live WebSocket broadcast
                alex_msg = await recv_event(ws_alex, "proposal_created")
                assert alex_msg["type"] == "proposal_created"

                # Test submission of other documented actions (add, remove, reschedule)
                for action in ["add", "remove", "reschedule"]:
                    res_extra = await client.post(
                        f"/api/trips/{trip_id}/proposals",
                        headers=headers_alex,
                        json={
                            "itinerary_id": itinerary_id,
                            "title": f"Test Proposal for action {action}",
                            "action": action,
                            "target_item_id": slot_item_id if action != "add" else None,
                        }
                    )
                    assert res_extra.status_code == 201
                    print(f"-> Action '{action}' proposal submitted successfully (ID: {res_extra.json()['proposal_id']})")
                    # Receive broadcasts on both clients
                    await recv_event(ws_rohan, "proposal_created")
                    await recv_event(ws_alex, "proposal_created")

                # -------------------------------------------------------------
                # STEP 4: Yes / No / Abstain Voting & Mandatory No Reason
                # -------------------------------------------------------------
                print("\n[Step 4] Testing Voting Rules & Mandatory No Reason...")

                # 4a. Rohan votes YES
                res_vote1 = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=headers_rohan,
                    json={
                        "proposal_id": proposal_id,
                        "value": "yes",
                        "comment": "Sounds great and more adventurous!"
                    }
                )
                assert res_vote1.status_code == 200
                print("-> Rohan voted YES")

                # Verify Alex receives live vote_cast broadcast
                alex_vote_msg = await recv_event(ws_alex, "vote_cast")
                print(f"-> Alex WS received vote_cast: tallies={alex_vote_msg['tallies']}")
                assert alex_vote_msg["type"] == "vote_cast"
                assert alex_vote_msg["tallies"]["yes"] == 1
                assert alex_vote_msg["tallies"]["no"] == 0

                # 4b. Alex attempts to vote NO WITHOUT comment -> MUST FAIL (422)
                print("-> Alex attempts to vote NO without comment (testing mandatory typed objection rule)...")
                res_invalid_no = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=headers_alex,
                    json={
                        "proposal_id": proposal_id,
                        "value": "no",
                        "comment": ""  # EMPTY
                    }
                )
                assert res_invalid_no.status_code == 422, f"Expected 422 for empty No comment, got {res_invalid_no.status_code}"
                print("-> [VERIFIED] HTTP 422 Unprocessable Entity returned for No vote without typed objection!")

                # 4c. Alex votes NO WITH typed comment in Mode NA -> Triggers 10-Minute Response Window
                print("-> Alex votes NO with mandatory comment (triggers Mode NA 10-minute response window)...")
                res_valid_no = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=headers_alex,
                    json={
                        "proposal_id": proposal_id,
                        "value": "no",
                        "comment": "Some members cannot swim; kayak tour is risky without life jackets."
                    }
                )
                assert res_valid_no.status_code == 200

                # Verify WebSocket broadcast includes response_window_started
                win_msg = await recv_event(ws_rohan, "response_window_started")
                assert win_msg["seconds_remaining"] == 600
                print(f"-> [VERIFIED] 10-minute response window active: {win_msg['expires_at']}")

                # Verify vote_cast event received
                vote_msg = await recv_event(ws_rohan, "vote_cast")
                assert vote_msg["tallies"]["no"] == 1
                print("-> [VERIFIED] Rohan received live vote_cast with tallies")

                # -------------------------------------------------------------
                # STEP 5: Proposal & Vote Visibility (Who Voted What)
                # -------------------------------------------------------------
                print("\n[Step 5] Checking Proposal & Vote Visibility...")
                res_proposals = await client.get(f"/api/trips/{trip_id}/proposals")
                assert res_proposals.status_code == 200
                all_props = res_proposals.json()
                target_p = next(p for p in all_props if p["proposal_id"] == proposal_id)

                print(f"-> Proposal: {target_p['title']}")
                print(f"   Tallies: Yes={target_p['yes_votes']}, No={target_p['no_votes']}, Abstain={target_p['abstain_votes']}")
                print(f"   Stated Objections: {target_p['no_reasons']}")
                print(f"   Response Window Active: {target_p['response_window']['active']}, Seconds Remaining: {target_p['response_window']['seconds_remaining']}")
                print(f"   Member Votes Detail: {[{v['user_id']: v['value']} for v in target_p['votes_detail']]}")

                assert target_p["yes_votes"] == 1
                assert target_p["no_votes"] == 1
                assert len(target_p["no_reasons"]) == 1
                assert "cannot swim" in target_p["no_reasons"][0]
                assert target_p["response_window"]["active"] is True
                assert len(target_p["votes_detail"]) == 2

                # -------------------------------------------------------------
                # STEP 6: Itinerary Optimistic Concurrency
                # -------------------------------------------------------------
                print("\n[Step 6] Testing Itinerary Optimistic Concurrency...")

                # 6a. Attempt to resolve with STALE expected version (e.g. 1 when server is at 2)
                stale_version = 1
                print(f"-> Attempting resolution with stale version v{stale_version} (server current is v{current_itn_version})...")
                res_conflict = await client.post(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/resolve",
                    headers=headers_alex,
                    json={
                        "resolution": "accept",
                        "expected_itinerary_version": stale_version
                    }
                )
                print(f"-> Server response status: {res_conflict.status_code}")
                assert res_conflict.status_code == 409, f"Expected 409 Conflict, got {res_conflict.status_code}"
                print(f"-> [VERIFIED] HTTP 409 Conflict detail: {res_conflict.json()['detail']}")

                # 6b. Resolve with CORRECT expected version
                print(f"-> Resolving proposal with correct expected version v{current_itn_version}...")
                res_accept = await client.post(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/resolve",
                    headers=headers_alex,
                    json={
                        "resolution": "accept",
                        "expected_itinerary_version": current_itn_version
                    }
                )
                assert res_accept.status_code == 200, f"Accept failed: {res_accept.text}"
                accepted_prop = res_accept.json()
                print(f"-> Proposal resolved status: '{accepted_prop['status']}'")
                assert accepted_prop["status"] == "accepted"

                # Verify both clients receive proposal_resolved and itinerary_updated
                resolved_event = await recv_event(ws_rohan, "proposal_resolved")
                itn_event = await recv_event(ws_rohan, "itinerary_updated")
                print(f"-> Rohan WS received: {resolved_event['type']} (status: {resolved_event['status']})")
                print(f"-> Rohan WS received: {itn_event['type']} (new_version: {itn_event['new_version']})")
                assert resolved_event["status"] == "accepted"
                assert itn_event["new_version"] == current_itn_version + 1

                # Verify itinerary version was incremented on server
                res_trip_after = await client.get(f"/api/trips/{trip_id}")
                new_version = res_trip_after.json()["active_itinerary"]["version"]
                print(f"-> Itinerary version successfully bumped to v{new_version} (was v{current_itn_version})")
                assert new_version == current_itn_version + 1

                # Verify target slot item was updated
                slot_items = res_trip_after.json()["active_itinerary"]["items"]
                updated_slot = next(i for i in slot_items if i["item_id"] == slot_item_id)
                print(f"-> Target slot title after replace resolution: '{updated_slot['title']}' (status: {updated_slot['status']})")
                assert updated_slot["title"] == prop_data["title"]
                assert updated_slot["status"] == "confirmed"

    finally:
        # Shutdown test server cleanly
        server.should_exit = True
        await server_task

    print("\n" + "=" * 60)
    print(">>> ALL PHASE 3 BACKEND TESTS PASSED WITH 100% SUCCESS! <<<")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_phase3())

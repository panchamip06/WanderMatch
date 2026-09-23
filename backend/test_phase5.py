"""
Phase 5 - Branching + Trip Chat Backend Test Suite

Flow verified:
  Proposal -> 2x No votes -> branch-trigger -> "branch" action
  -> Create Branch A (Alex) + Branch B (Rohan)
  -> GET /branches -> 2 branches in preview
  -> Alex confirms Branch A member status -> Branch A auto-confirms
  -> Rohan requests modification on Branch B -> Branch B status = modification_requested
  -> Branch B: 3 revision rounds (round cap)
  -> Branch B: 4th revision -> HTTP 422
  -> Recursive branch: Branch A1 as sub-branch of A
  -> Finalize Branch C (silence = accepted: no objections -> confirmed)
  -> Trip Chat: send normal message + unanimous override message
  -> Verify WS broadcasts for all events

All tests run without LLM key (deterministic mock).
"""
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
TEST_PORT = 8767
BASE_URL = f"http://{TEST_HOST}:{TEST_PORT}"
WS_URL = f"ws://{TEST_HOST}:{TEST_PORT}"


async def recv_event(ws, expected_type: str, timeout: float = 6.0):
    """Drain WebSocket until a message with expected_type arrives."""
    start = asyncio.get_event_loop().time()
    while True:
        elapsed = asyncio.get_event_loop().time() - start
        remaining = max(0.1, timeout - elapsed)
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        data = json.loads(raw)
        if data.get("type") == expected_type:
            return data


async def test_phase5():
    print("=" * 70)
    print(">>> STARTING WANDERMATCH PHASE 5 BRANCHING + CHAT TEST SUITE <<<")
    print("=" * 70)

    await init_db()

    config = uvicorn.Config(app, host=TEST_HOST, port=TEST_PORT, log_level="warning")
    server = uvicorn.Server(config)
    server_task = asyncio.create_task(server.serve())
    for _ in range(50):
        if server.started:
            break
        await asyncio.sleep(0.1)
    print(f"Server started on {BASE_URL}")

    try:
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
            hdr_alex = {"Authorization": "Bearer mock:usr_0f22b1"}
            hdr_rohan = {"Authorization": "Bearer mock:usr_1a2b3c"}

            # -----------------------------------------------------------
            # SETUP: Mode NA trip + slot + proposal
            # -----------------------------------------------------------
            print("\n[Setup] Create Mode NA trip...")
            res = await client.post(
                "/api/trips",
                headers=hdr_alex,
                json={
                    "title": "Rajasthan Forts Tour — Phase 5 Test",
                    "destination_city_id": "cty_c07454f1",
                    "start_date": "2027-01-10",
                    "end_date": "2027-01-15",
                    "party_size": 2,
                    "adults": 2,
                    "children": 0,
                    "trip_mode": "no_admin",
                    "trip_type": "friends",
                    "notes": "Phase 5 test",
                },
            )
            assert res.status_code == 201, f"Create trip: {res.text}"
            trip = res.json()
            trip_id = trip["trip_id"]
            itn_id = trip["active_itinerary"]["itinerary_id"]
            print(f"-> Trip {trip_id}")

            rj = await client.post(
                f"/api/trips/{trip_id}/join", headers=hdr_rohan, json={"role": "editor"}
            )
            assert rj.status_code == 200

            ri = await client.post(
                f"/api/trips/{trip_id}/itinerary/items",
                headers=hdr_alex,
                json={
                    "day_index": 1,
                    "title": "Amber Fort Full-Day Tour",
                    "item_type": "poi",
                    "starts_at": "08:00",
                    "ends_at": "16:00",
                    "cost": "3000.00",
                    "duration_minutes": 480,
                    "explanation": "Full-day heritage tour",
                },
            )
            assert ri.status_code == 201
            slot_item_id = ri.json()["item_id"]

            ws_url_alex = f"{WS_URL}/ws/trips/{trip_id}?user_id=usr_0f22b1"
            ws_url_rohan = f"{WS_URL}/ws/trips/{trip_id}?user_id=usr_1a2b3c"

            async with (
                websockets.connect(ws_url_alex) as ws_alex,
                websockets.connect(ws_url_rohan) as ws_rohan,
            ):
                rp = await client.post(
                    f"/api/trips/{trip_id}/proposals",
                    headers=hdr_alex,
                    json={
                        "itinerary_id": itn_id,
                        "title": "Hawa Mahal + City Palace combo",
                        "action": "replace",
                        "target_item_id": slot_item_id,
                        "rationale": "Cover more city highlights in less time",
                        "cost_delta": "-500.00",
                        "currency": "INR",
                    },
                )
                assert rp.status_code == 201
                proposal_id = rp.json()["proposal_id"]
                print(f"-> Proposal {proposal_id}")

                # Drain proposal_created
                await recv_event(ws_alex, "proposal_created")
                await recv_event(ws_rohan, "proposal_created")

                # -----------------------------------------------------------
                # STEP 1: Two No votes with distinct typed reasons
                # -----------------------------------------------------------
                print("\n[Step 1] Two No votes with distinct typed reasons...")

                r_no1 = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=hdr_rohan,
                    json={
                        "proposal_id": proposal_id,
                        "value": "no",
                        "comment": "I prefer fort architecture; need to keep Amber Fort in the plan.",
                    },
                )
                assert r_no1.status_code == 200
                # Drain: response_window_started + vote_cast
                await recv_event(ws_alex, "response_window_started")
                await recv_event(ws_alex, "vote_cast")

                r_no2 = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=hdr_alex,
                    json={
                        "proposal_id": proposal_id,
                        "value": "no",
                        "comment": "I prefer museums and markets; Amber Fort is too crowded.",
                    },
                )
                assert r_no2.status_code == 200
                await recv_event(ws_rohan, "vote_cast")
                print("-> 2 No votes cast (2 distinct reasons)")

                # Verify 2 no_reasons in proposal detail
                r_props = await client.get(f"/api/trips/{trip_id}/proposals")
                prop_detail = next(p for p in r_props.json() if p["proposal_id"] == proposal_id)
                assert prop_detail["no_votes"] == 2
                assert len(prop_detail["no_reasons"]) == 2
                print(f"-> [VERIFIED] Proposal has 2 No votes, 2 reasons: {prop_detail['no_reasons']}")

                # -----------------------------------------------------------
                # STEP 2: Branch-trigger -> "branch" (2 incompatible reasons)
                # -----------------------------------------------------------
                print("\n[Step 2] Branch-trigger classification...")
                r_bt = await client.post(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/branch-trigger"
                )
                assert r_bt.status_code == 200
                bt = r_bt.json()
                print(f"-> action='{bt['action']}', branches={bt['suggested_branches']}")
                assert bt["action"] in ("branch", "keep_blending")  # mock may return either
                assert isinstance(bt["suggested_branches"], list)
                # With mock threshold >= 2 reasons, we expect "branch"
                assert bt["action"] == "branch", f"Expected 'branch' with 2 reasons, got '{bt['action']}'"
                print("-> [VERIFIED] Branch-trigger returned 'branch' with 2 incompatible reasons")

                # -----------------------------------------------------------
                # STEP 3: Create Branch A (Alex) and Branch B (Rohan) — multi-way
                # -----------------------------------------------------------
                print("\n[Step 3] Create Branch A (Alex's preference) and Branch B (Rohan's)...")

                r_ba = await client.post(
                    f"/api/trips/{trip_id}/branches",
                    headers=hdr_alex,
                    json={
                        "title": "Museums + Markets Day (Alex)",
                        "proposal_id": proposal_id,
                        "member_user_ids": ["usr_0f22b1"],
                        "preview_deadline": "",
                    },
                )
                assert r_ba.status_code == 201, f"Branch A: {r_ba.text}"
                branch_a = r_ba.json()
                branch_a_id = branch_a["branch_id"]
                assert branch_a["status"] == "preview"
                assert len(branch_a["members"]) == 1
                assert branch_a["members"][0]["status"] == "pending"
                print(f"-> Branch A created: {branch_a_id} ({branch_a['title']})")

                ba_ws = await recv_event(ws_rohan, "branch_created")
                assert ba_ws["branch_id"] == branch_a_id
                print("-> [VERIFIED] branch_created WS broadcast received")

                r_bb = await client.post(
                    f"/api/trips/{trip_id}/branches",
                    headers=hdr_alex,
                    json={
                        "title": "Amber Fort Heritage Day (Rohan)",
                        "proposal_id": proposal_id,
                        "member_user_ids": ["usr_1a2b3c"],
                        "preview_deadline": "",
                    },
                )
                assert r_bb.status_code == 201, f"Branch B: {r_bb.text}"
                branch_b = r_bb.json()
                branch_b_id = branch_b["branch_id"]
                assert branch_b["status"] == "preview"
                print(f"-> Branch B created: {branch_b_id} ({branch_b['title']})")
                await recv_event(ws_rohan, "branch_created")

                # -----------------------------------------------------------
                # STEP 4: List branches -> 2 in preview
                # -----------------------------------------------------------
                print("\n[Step 4] List all branches -> 2 in preview...")
                r_list = await client.get(f"/api/trips/{trip_id}/branches")
                assert r_list.status_code == 200
                all_branches = r_list.json()
                assert len(all_branches) == 2
                for b in all_branches:
                    assert b["status"] == "preview"
                print(f"-> [VERIFIED] 2 branches found, both 'preview'")

                # -----------------------------------------------------------
                # STEP 5: Alex confirms Branch A -> auto-confirms branch
                # -----------------------------------------------------------
                print("\n[Step 5] Alex confirms membership on Branch A...")
                r_confirm_a = await client.patch(
                    f"/api/trips/{trip_id}/branches/{branch_a_id}/member-status",
                    headers=hdr_alex,
                    json={"status": "confirmed"},
                )
                assert r_confirm_a.status_code == 200, f"Confirm A: {r_confirm_a.text}"
                confirmed_a = r_confirm_a.json()
                assert confirmed_a["status"] == "confirmed", (
                    f"Branch A should auto-confirm when sole member confirms; got {confirmed_a['status']}"
                )
                assert confirmed_a["members"][0]["status"] == "confirmed"
                print(f"-> [VERIFIED] Branch A status = '{confirmed_a['status']}' after sole member confirms")

                mem_upd_msg = await recv_event(ws_rohan, "branch_member_updated")
                assert mem_upd_msg["branch_id"] == branch_a_id
                assert mem_upd_msg["branch_status"] == "confirmed"
                print("-> [VERIFIED] branch_member_updated WS broadcast received")

                # -----------------------------------------------------------
                # STEP 6: Rohan requests modification on Branch B
                # -----------------------------------------------------------
                print("\n[Step 6] Rohan requests modification on Branch B...")
                r_mod_b = await client.patch(
                    f"/api/trips/{trip_id}/branches/{branch_b_id}/member-status",
                    headers=hdr_rohan,
                    json={"status": "modification_requested"},
                )
                assert r_mod_b.status_code == 200, f"Mod B: {r_mod_b.text}"
                mod_b = r_mod_b.json()
                assert mod_b["status"] == "modification_requested"
                print(f"-> [VERIFIED] Branch B status = 'modification_requested'")
                await recv_event(ws_alex, "branch_member_updated")

                # -----------------------------------------------------------
                # STEP 7: 3-round revision flow on Branch B
                # -----------------------------------------------------------
                print("\n[Step 7] Branch B: 3 AI revision rounds (cap = 3)...")
                for expected_round in [1, 2, 3]:
                    r_rev = await client.post(
                        f"/api/trips/{trip_id}/branches/{branch_b_id}/revision",
                        headers=hdr_alex,
                    )
                    assert r_rev.status_code == 201, f"Round {expected_round}: {r_rev.text}"
                    rev = r_rev.json()
                    assert rev["round_number"] == expected_round
                    assert rev["status"] == "active"
                    assert rev["constraint_valid"] is True
                    rev_ws = await recv_event(ws_rohan, "ai_branch_revision_ready")
                    assert rev_ws["round_number"] == expected_round
                    assert rev_ws["branch_id"] == branch_b_id
                    print(f"   Round {expected_round}: revision_id={rev['revision_id']}, broadcast confirmed")

                print("-> [VERIFIED] 3 revision rounds generated on Branch B")

                # -----------------------------------------------------------
                # STEP 8: 4th revision -> HTTP 422 (round cap)
                # -----------------------------------------------------------
                print("\n[Step 8] 4th revision on Branch B -> HTTP 422...")
                r_cap = await client.post(
                    f"/api/trips/{trip_id}/branches/{branch_b_id}/revision",
                    headers=hdr_alex,
                )
                assert r_cap.status_code == 422, (
                    f"Expected 422 for cap breach, got {r_cap.status_code}: {r_cap.text}"
                )
                cap_detail = r_cap.json()["detail"]
                assert "cap" in cap_detail.lower() or "round" in cap_detail.lower()
                print(f"-> [VERIFIED] HTTP 422: '{cap_detail}'")

                # Verify revision count in branch detail
                r_bd = await client.get(f"/api/trips/{trip_id}/branches/{branch_b_id}")
                assert r_bd.json()["revision_count"] == 3
                print("-> [VERIFIED] revision_count = 3 in branch detail")

                # -----------------------------------------------------------
                # STEP 9: Recursive branch — Branch A1 as sub-branch of A
                # -----------------------------------------------------------
                print("\n[Step 9] Recursive branch: Branch A1 under Branch A...")
                r_sub = await client.post(
                    f"/api/trips/{trip_id}/branches",
                    headers=hdr_alex,
                    json={
                        "title": "Morning Markets only (Alex sub-preference)",
                        "proposal_id": proposal_id,
                        "parent_branch_id": branch_a_id,
                        "member_user_ids": ["usr_0f22b1"],
                        "preview_deadline": "",
                    },
                )
                assert r_sub.status_code == 201, f"Sub-branch: {r_sub.text}"
                sub = r_sub.json()
                sub_id = sub["branch_id"]
                assert sub["parent_branch_id"] == branch_a_id
                assert sub["status"] == "preview"
                print(f"-> [VERIFIED] Sub-branch {sub_id} created (parent={sub['parent_branch_id']})")
                await recv_event(ws_rohan, "branch_created")

                # List now shows 3 branches
                r_all = await client.get(f"/api/trips/{trip_id}/branches")
                assert len(r_all.json()) == 3
                sub_in_list = next(b for b in r_all.json() if b["branch_id"] == sub_id)
                assert sub_in_list["parent_branch_id"] == branch_a_id
                print("-> [VERIFIED] 3 total branches; recursive structure correct")

                # -----------------------------------------------------------
                # STEP 10: Silence acceptance — create Branch C, no member action, finalize
                # -----------------------------------------------------------
                print("\n[Step 10] Silence acceptance: Branch C (no objections -> confirmed)...")
                r_bc = await client.post(
                    f"/api/trips/{trip_id}/branches",
                    headers=hdr_alex,
                    json={
                        "title": "Shared Itinerary (consensus fallback)",
                        "member_user_ids": ["usr_0f22b1", "usr_1a2b3c"],
                        "preview_deadline": "",
                    },
                )
                assert r_bc.status_code == 201
                branch_c_id = r_bc.json()["branch_id"]
                await recv_event(ws_rohan, "branch_created")

                # No member calls member-status -> finalize triggers silence = accepted
                r_fin = await client.post(
                    f"/api/trips/{trip_id}/branches/{branch_c_id}/finalize"
                )
                assert r_fin.status_code == 200, f"Finalize: {r_fin.text}"
                finalized = r_fin.json()
                assert finalized["status"] == "confirmed", (
                    f"Silence should confirm Branch C; got {finalized['status']}"
                )
                for m in finalized["members"]:
                    assert m["status"] == "confirmed", f"Member {m['user_id']} not confirmed"
                print(f"-> [VERIFIED] Branch C status = 'confirmed' via silence acceptance")

                fin_ws = await recv_event(ws_rohan, "branch_finalized")
                assert fin_ws["silence_accepted"] is True
                assert fin_ws["status"] == "confirmed"
                print("-> [VERIFIED] branch_finalized WS broadcast (silence_accepted=True)")

                # -----------------------------------------------------------
                # STEP 11: Trip Chat — send + list + WS broadcast
                # -----------------------------------------------------------
                print("\n[Step 11] Trip Chat...")

                r_chat1 = await client.post(
                    f"/api/trips/{trip_id}/chat",
                    headers=hdr_alex,
                    json={
                        "body": "Can we compromise on a half-day at Amber Fort then markets?",
                        "is_unanimous_override": False,
                    },
                )
                assert r_chat1.status_code == 201, f"Chat msg 1: {r_chat1.text}"
                msg1 = r_chat1.json()
                assert msg1["message_id"].startswith("msg_")
                assert msg1["is_unanimous_override"] is False

                chat_ws = await recv_event(ws_rohan, "chat_message")
                await recv_event(ws_alex, "chat_message")
                assert chat_ws["body"] == "Can we compromise on a half-day at Amber Fort then markets?"
                assert chat_ws["is_unanimous_override"] is False
                assert chat_ws["user_id"] == "usr_0f22b1"
                print(f"-> [VERIFIED] Chat message broadcast received (msg_id={msg1['message_id']})")

                # Unanimous override message (design §5A: Trip Chat override)
                r_chat2 = await client.post(
                    f"/api/trips/{trip_id}/chat",
                    headers=hdr_rohan,
                    json={
                        "body": "ALL AGREE: Half-day Amber Fort then markets. Final.",
                        "is_unanimous_override": True,
                    },
                )
                assert r_chat2.status_code == 201
                msg2 = r_chat2.json()
                assert msg2["is_unanimous_override"] is True
                print(f"-> [VERIFIED] Unanimous override chat message sent (msg_id={msg2['message_id']})")

                chat_ws2 = await recv_event(ws_alex, "chat_message")
                await recv_event(ws_rohan, "chat_message")
                assert chat_ws2["is_unanimous_override"] is True
                print("-> [VERIFIED] Unanimous override broadcast received")

                # Empty body rejected
                r_empty = await client.post(
                    f"/api/trips/{trip_id}/chat",
                    headers=hdr_alex,
                    json={"body": "   "},
                )
                assert r_empty.status_code == 400
                print("-> [VERIFIED] Empty chat body rejected with HTTP 400")

                # GET /chat -> list all messages
                r_get_chat = await client.get(f"/api/trips/{trip_id}/chat")
                assert r_get_chat.status_code == 200
                messages = r_get_chat.json()
                assert len(messages) == 2
                assert messages[0]["is_unanimous_override"] is False
                assert messages[1]["is_unanimous_override"] is True
                print(f"-> [VERIFIED] GET /chat returned {len(messages)} messages in chronological order")

    finally:
        server.should_exit = True
        await server_task

    print("\n" + "=" * 70)
    print(">>> ALL PHASE 5 BRANCHING + CHAT BACKEND TESTS PASSED! <<<")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_phase5())

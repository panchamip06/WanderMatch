"""
Phase 4 — AI Consensus Backend Test Suite

Flow verified:
  Proposal → No + typed reason → POST /consensus/invoke
  → AICandidateOut (round 1) → GET /candidates → round_number=1
  → Round cap: 4th invoke → HTTP 422
  → POST /branch-trigger → BranchTriggerOut
  → Re-vote via existing /votes endpoint → vote_cast broadcast

Tested for both Mode NA (no_admin) and Mode A (admin-led) trips.
No LLM key required — ConsensusService uses deterministic mock when
LLM_API_KEY is absent.
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
TEST_PORT = 8766   # different port from Phase 3 to avoid conflicts
BASE_URL = f"http://{TEST_HOST}:{TEST_PORT}"
WS_URL = f"ws://{TEST_HOST}:{TEST_PORT}"


async def recv_event(ws, expected_type: str, timeout: float = 6.0):
    """Receive WebSocket messages until one with expected_type arrives."""
    import asyncio as _asyncio
    start = _asyncio.get_event_loop().time()
    while True:
        elapsed = _asyncio.get_event_loop().time() - start
        remaining = max(0.1, timeout - elapsed)
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        data = json.loads(raw)
        if data.get("type") == expected_type:
            return data


async def test_phase4():
    print("=" * 65)
    print(">>> STARTING WANDERMATCH PHASE 4 AI CONSENSUS TEST SUITE <<<")
    print("=" * 65)

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
            headers_alex = {"Authorization": "Bearer mock:usr_0f22b1"}
            headers_rohan = {"Authorization": "Bearer mock:usr_1a2b3c"}

            # ---------------------------------------------------------------
            # === MODE NA PATH ===
            # ---------------------------------------------------------------
            print("\n[Mode NA] Creating collaborative (no_admin) trip...")
            res = await client.post(
                "/api/trips",
                headers=headers_alex,
                json={
                    "title": "Goa Beach Hopping — AI Consensus Test",
                    "destination_city_id": "cty_c07454f1",
                    "start_date": "2026-12-01",
                    "end_date": "2026-12-05",
                    "party_size": 2,
                    "adults": 2,
                    "children": 0,
                    "trip_mode": "no_admin",
                    "trip_type": "friends",
                    "notes": "Phase 4 AI consensus test",
                },
            )
            assert res.status_code == 201, f"Create trip failed: {res.text}"
            trip = res.json()
            trip_id = trip["trip_id"]
            itinerary_id = trip["active_itinerary"]["itinerary_id"]
            itn_version = trip["active_itinerary"]["version"]
            print(f"-> Trip {trip_id} (Mode NA)")

            # Rohan joins
            rj = await client.post(f"/api/trips/{trip_id}/join", headers=headers_rohan, json={"role": "editor"})
            assert rj.status_code == 200

            # Add base itinerary item
            ri = await client.post(
                f"/api/trips/{trip_id}/itinerary/items",
                headers=headers_alex,
                json={
                    "day_index": 1,
                    "title": "Baga Beach Sunset Party",
                    "item_type": "activity",
                    "starts_at": "17:00",
                    "ends_at": "21:00",
                    "cost": "2000.00",
                    "duration_minutes": 240,
                    "explanation": "Beach party at Baga",
                },
            )
            assert ri.status_code == 201
            slot_item_id = ri.json()["item_id"]
            # Refresh version after item add
            rt = await client.get(f"/api/trips/{trip_id}")
            itn_version = rt.json()["active_itinerary"]["version"]
            print(f"-> Slot item {slot_item_id}, itinerary v{itn_version}")

            ws_url_alex = f"{WS_URL}/ws/trips/{trip_id}?user_id=usr_0f22b1"
            ws_url_rohan = f"{WS_URL}/ws/trips/{trip_id}?user_id=usr_1a2b3c"

            async with (
                websockets.connect(ws_url_alex) as ws_alex,
                websockets.connect(ws_url_rohan) as ws_rohan,
            ):
                # -----------------------------------------------------------------
                # STEP 1: Submit proposal
                # -----------------------------------------------------------------
                print("\n[Step 1] Submit proposal...")
                rp = await client.post(
                    f"/api/trips/{trip_id}/proposals",
                    headers=headers_alex,
                    json={
                        "itinerary_id": itinerary_id,
                        "title": "Kayaking at Calangute instead of Baga Party",
                        "action": "replace",
                        "target_item_id": slot_item_id,
                        "rationale": "Quieter; more eco-friendly; family-safe",
                        "cost_delta": "-800.00",
                        "currency": "INR",
                    },
                )
                assert rp.status_code == 201, f"Create proposal failed: {rp.text}"
                proposal_id = rp.json()["proposal_id"]
                print(f"-> Proposal {proposal_id}")
                await recv_event(ws_rohan, "proposal_created")
                await recv_event(ws_alex, "proposal_created")

                # -----------------------------------------------------------------
                # STEP 2: Rohan votes Yes; Alex votes No with typed reason
                # -----------------------------------------------------------------
                print("\n[Step 2] Vote Yes (Rohan) then No with reason (Alex)...")
                r_yes = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=headers_rohan,
                    json={"proposal_id": proposal_id, "value": "yes", "comment": "Looks great!"},
                )
                assert r_yes.status_code == 200
                await recv_event(ws_alex, "vote_cast")

                r_no = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=headers_alex,
                    json={
                        "proposal_id": proposal_id,
                        "value": "no",
                        "comment": "Some members cannot kayak; need life-jacket rental to be included.",
                    },
                )
                assert r_no.status_code == 200

                # Expect response_window_started (Mode NA → timer triggered)
                win_msg = await recv_event(ws_rohan, "response_window_started")
                assert win_msg["seconds_remaining"] == 600
                print(f"-> [VERIFIED] 10-min window started: {win_msg['expires_at']}")
                await recv_event(ws_rohan, "vote_cast")
                print("-> [VERIFIED] No vote cast with reason broadcast")

                # -----------------------------------------------------------------
                # STEP 3: POST /consensus/invoke → AI candidate (Round 1)
                # -----------------------------------------------------------------
                print("\n[Step 3] POST /consensus/invoke → AI candidate (Round 1)...")
                r_inv = await client.post(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/invoke",
                    headers=headers_alex,
                )
                assert r_inv.status_code == 201, f"Invoke failed: {r_inv.text}"
                inv_data = r_inv.json()
                print(f"-> revision_id={inv_data['revision_id']}, round={inv_data['round_number']}")
                print(f"   candidate title: '{inv_data['candidate']['title']}'")
                print(f"   adjustments: {inv_data['candidate']['adjustments']}")
                print(f"   constraint_valid={inv_data['constraint_valid']}, reason='{inv_data['constraint_reason']}'")

                assert inv_data["round_number"] == 1
                assert inv_data["status"] == "active"
                assert inv_data["candidate"]["title"], "Candidate title must not be empty"
                assert isinstance(inv_data["candidate"]["adjustments"], list)
                assert inv_data["constraint_valid"] is True, (
                    f"Mock candidate should always be valid; got: {inv_data['constraint_reason']}"
                )

                # Verify ai_candidate_ready WebSocket broadcast
                ai_msg = await recv_event(ws_rohan, "ai_candidate_ready")
                assert ai_msg["round_number"] == 1
                assert ai_msg["proposal_id"] == proposal_id
                print("-> [VERIFIED] ai_candidate_ready broadcast received")

                # -----------------------------------------------------------------
                # STEP 4: GET /candidates → round 1 listed
                # -----------------------------------------------------------------
                print("\n[Step 4] GET /candidates → verify round 1 stored...")
                r_cands = await client.get(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/candidates"
                )
                assert r_cands.status_code == 200
                cands = r_cands.json()
                assert len(cands) == 1
                assert cands[0]["round_number"] == 1
                assert cands[0]["status"] == "active"
                print(f"-> [VERIFIED] 1 candidate stored, round={cands[0]['round_number']}")

                # -----------------------------------------------------------------
                # STEP 5: Round 2 and Round 3 (invoke again)
                # -----------------------------------------------------------------
                print("\n[Step 5] Invoke Round 2 and Round 3...")
                for expected_round in [2, 3]:
                    r2 = await client.post(
                        f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/invoke",
                        headers=headers_alex,
                    )
                    assert r2.status_code == 201, f"Round {expected_round} invoke failed: {r2.text}"
                    assert r2.json()["round_number"] == expected_round
                    await recv_event(ws_rohan, "ai_candidate_ready")
                    print(f"-> Round {expected_round} candidate generated and broadcast")

                # Verify all 3 rounds are listed (latest 2 superseded, newest active)
                r_all = await client.get(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/candidates"
                )
                all_cands = r_all.json()
                assert len(all_cands) == 3
                statuses = {c["round_number"]: c["status"] for c in all_cands}
                assert statuses[1] == "superseded"
                assert statuses[2] == "superseded"
                assert statuses[3] == "active"
                print("-> [VERIFIED] Rounds 1–2 superseded; Round 3 active")

                # -----------------------------------------------------------------
                # STEP 6: 4th invoke → HTTP 422 (round cap)
                # -----------------------------------------------------------------
                print("\n[Step 6] 4th invoke → should fail with HTTP 422 (revision cap)...")
                r4 = await client.post(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/invoke",
                    headers=headers_alex,
                )
                assert r4.status_code == 422, f"Expected 422 for cap breach, got {r4.status_code}: {r4.text}"
                detail = r4.json()["detail"]
                print(f"-> [VERIFIED] HTTP 422: '{detail}'")
                assert "cap" in detail.lower() or "round" in detail.lower()

                # -----------------------------------------------------------------
                # STEP 7: POST /branch-trigger
                # -----------------------------------------------------------------
                print("\n[Step 7] POST /branch-trigger → classify keep_blending vs branch...")
                r_bt = await client.post(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/branch-trigger"
                )
                assert r_bt.status_code == 200, f"Branch-trigger failed: {r_bt.text}"
                bt = r_bt.json()
                print(f"-> action='{bt['action']}', reason='{bt['reason']}'")
                print(f"   suggested_branches={bt['suggested_branches']}")
                assert bt["action"] in ("keep_blending", "branch")
                assert bt["reason"]
                assert isinstance(bt["suggested_branches"], list)
                print("-> [VERIFIED] Branch-trigger classification returned valid structure")

                # -----------------------------------------------------------------
                # STEP 8: Re-vote using existing /votes endpoint (candidate shown → re-vote)
                # -----------------------------------------------------------------
                print("\n[Step 8] Re-vote on proposal after seeing AI candidate...")
                r_revote = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=headers_rohan,
                    json={
                        "proposal_id": proposal_id,
                        "value": "yes",
                        "comment": "AI candidate with life-jacket inclusion looks good now!",
                    },
                )
                assert r_revote.status_code == 200
                revote_msg = await recv_event(ws_alex, "vote_cast")
                assert revote_msg["tallies"]["yes"] >= 1
                print(f"-> [VERIFIED] Re-vote broadcast: tallies={revote_msg['tallies']}")

            # ---------------------------------------------------------------
            # === MODE A PATH ===
            # ---------------------------------------------------------------
            print("\n\n[Mode A] Creating admin-led trip...")
            res_a = await client.post(
                "/api/trips",
                headers=headers_alex,
                json={
                    "title": "Mode A Admin Test Trip",
                    "destination_city_id": "cty_c07454f1",
                    "start_date": "2026-12-10",
                    "end_date": "2026-12-12",
                    "party_size": 2,
                    "adults": 2,
                    "children": 0,
                    "trip_mode": "admin",
                    "trip_type": "family",
                    "notes": "Phase 4 Mode A test",
                },
            )
            assert res_a.status_code == 201, f"Mode A trip failed: {res_a.text}"
            trip_a = res_a.json()
            trip_id_a = trip_a["trip_id"]
            itn_id_a = trip_a["active_itinerary"]["itinerary_id"]
            print(f"-> Trip {trip_id_a} (Mode A)")

            rj_a = await client.post(
                f"/api/trips/{trip_id_a}/join", headers=headers_rohan, json={"role": "editor"}
            )
            assert rj_a.status_code == 200

            ri_a = await client.post(
                f"/api/trips/{trip_id_a}/itinerary/items",
                headers=headers_alex,
                json={
                    "day_index": 1,
                    "title": "Basilica of Bom Jesus Tour",
                    "item_type": "poi",
                    "starts_at": "09:00",
                    "ends_at": "11:00",
                    "cost": "500.00",
                    "duration_minutes": 120,
                    "explanation": "Heritage UNESCO site",
                },
            )
            assert ri_a.status_code == 201
            slot_a = ri_a.json()["item_id"]

            rp_a = await client.post(
                f"/api/trips/{trip_id_a}/proposals",
                headers=headers_rohan,
                json={
                    "itinerary_id": itn_id_a,
                    "title": "Old Goa Churches Walking Tour",
                    "action": "replace",
                    "target_item_id": slot_a,
                    "rationale": "Covers more ground in same time",
                    "cost_delta": "100.00",
                    "currency": "INR",
                },
            )
            assert rp_a.status_code == 201
            pid_a = rp_a.json()["proposal_id"]

            # Vote No (Mode A — no timer started; admin will invoke AI manually)
            r_no_a = await client.post(
                f"/api/trips/{trip_id_a}/votes",
                headers=headers_rohan,
                json={
                    "proposal_id": pid_a,
                    "value": "no",
                    "comment": "Some members have mobility issues; cannot do long walks.",
                },
            )
            assert r_no_a.status_code == 200

            # Admin (Alex) manually invokes AI — Mode A step 4
            print("[Mode A] Admin invokes AI consensus manually...")
            r_inv_a = await client.post(
                f"/api/trips/{trip_id_a}/proposals/{pid_a}/consensus/invoke",
                headers=headers_alex,
            )
            assert r_inv_a.status_code == 201, f"Mode A invoke failed: {r_inv_a.text}"
            inv_a = r_inv_a.json()
            print(f"-> [Mode A] AI candidate round {inv_a['round_number']}: '{inv_a['candidate']['title']}'")
            assert inv_a["round_number"] == 1
            assert inv_a["constraint_valid"] is True
            print("-> [VERIFIED] Mode A admin AI invocation successful")

    finally:
        server.should_exit = True
        await server_task

    print("\n" + "=" * 65)
    print(">>> ALL PHASE 4 AI CONSENSUS BACKEND TESTS PASSED! <<<")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(test_phase4())

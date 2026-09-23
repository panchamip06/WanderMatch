"""
Phase 7 — Full System End-to-End Integration & Regression Test Suite.

End-to-End Journey Verified:
Landing/Health -> Auth & Profile -> Dashboard -> Create Trip (Mode NA) ->
Join Trip (User 2) -> Multi-day Itinerary Builder & Versioning ->
Proposal Submission -> Mandatory Typed No-Reason -> 10-min Timer Window ->
AI Consensus Candidate Generation & Validation -> Branching Trigger & Branches ->
Silence Acceptance -> Mandatory Trip Chat & Unanimous Override ->
Solo Matching (Groups & Guides) -> 3-Angle Face Registration (ArcFace) ->
Cloudinary Photo Upload -> 0.68 Threshold Face Tagging -> My Photos Personal Album ->
Tag Confirmation -> Multi-Client WebSocket Sync -> Re-login Database Persistence.
"""
import asyncio
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2
import httpx
import numpy as np
import websockets
import uvicorn

from backend.app.main import app
from backend.app.core.database import init_db
from backend.services.face.service import face_service

TEST_HOST = "127.0.0.1"
TEST_PORT = 8769
BASE_URL = f"http://{TEST_HOST}:{TEST_PORT}"
WS_URL = f"ws://{TEST_HOST}:{TEST_PORT}"


async def recv_event(ws, expected_type: str, timeout: float = 6.0, predicate=None):
    """Drain WebSocket until message with expected_type (and optional predicate) arrives."""
    start = asyncio.get_event_loop().time()
    while True:
        elapsed = asyncio.get_event_loop().time() - start
        remaining = max(0.1, timeout - elapsed)
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        data = json.loads(raw)
        if data.get("type") == expected_type:
            if predicate is None or predicate(data):
                return data


def create_synthetic_face_image(filename: str, intensity: int = 180):
    """Generate a test face image with an elliptical face shape."""
    img = np.zeros((160, 160, 3), dtype=np.uint8)
    cv2.ellipse(img, (80, 80), (50, 65), 0, 0, 360, (intensity, intensity, intensity), -1)
    cv2.circle(img, (60, 65), 10, (50, 50, 50), -1)
    cv2.circle(img, (100, 65), 10, (50, 50, 50), -1)
    cv2.ellipse(img, (80, 110), (25, 10), 0, 0, 180, (40, 40, 40), -1)
    cv2.imwrite(filename, img)
    return filename


async def test_phase7_e2e():
    print("=" * 75)
    print(">>> STARTING WANDERMATCH PHASE 7 FULL SYSTEM E2E INTEGRATION TEST <<<")
    print("=" * 75)

    await init_db()

    # Launch server on port 8769
    config = uvicorn.Config(app, host=TEST_HOST, port=TEST_PORT, log_level="warning")
    server = uvicorn.Server(config)
    server_task = asyncio.create_task(server.serve())

    # Wait for server startup
    for _ in range(50):
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"{BASE_URL}/docs")
                if res.status_code == 200:
                    break
        except Exception:
            await asyncio.sleep(0.1)

    print(">>> Uvicorn test server online at", BASE_URL)

    # Auth credentials for simulated users
    user1_id = "usr_0f22b1"  # Alex Carter
    user2_id = "usr_1a2b3c"  # Rohan Mehta
    hdr_alex = {"Authorization": f"Bearer mock:{user1_id}"}
    hdr_rohan = {"Authorization": f"Bearer mock:{user2_id}"}

    # Synthetic test face image files
    img_straight = create_synthetic_face_image("e2e_face_straight.jpg", 185)
    img_left = create_synthetic_face_image("e2e_face_left.jpg", 175)
    img_right = create_synthetic_face_image("e2e_face_right.jpg", 180)

    try:
        async with httpx.AsyncClient(base_url=BASE_URL) as client:

            # ---------------------------------------------------------------
            # STAGE 1: Health & Reference Data Inspection
            # ---------------------------------------------------------------
            print("\n[Stage 1] System Health & Reference Data...")
            res_health = await client.get("/api/health")
            assert res_health.status_code == 200
            print("-> Backend Health Status:", res_health.json())

            res_cities = await client.get("/api/reference/cities")
            assert res_cities.status_code == 200
            cities = res_cities.json()
            assert len(cities) >= 60, f"Expected at least 60 cities, got {len(cities)}"
            print(f"-> Reference Cities: {len(cities)} verified in PS-11 database.")

            res_curr = await client.get("/api/reference/currencies")
            assert res_curr.status_code == 200
            currencies = res_curr.json()
            assert len(currencies) >= 25
            print(f"-> Reference Currencies: {len(currencies)} verified.")

            # ---------------------------------------------------------------
            # STAGE 2: Auth, Permissions & Profile Persistence
            # ---------------------------------------------------------------
            print("\n[Stage 2] Authentication, Permissions & Profile Updates...")
            # Update User 1 profile
            res_prof_update = await client.put(
                "/api/auth/profile",
                headers=hdr_alex,
                json={
                    "display_name": "Alex Carter (E2E Verified)",
                    "travel_style": "adventure",
                    "pace": "packed",
                    "budget_band": "premium",
                    "interests": "hiking,heritage,wildlife,photography",
                },
            )
            assert res_prof_update.status_code == 200
            updated_prof = res_prof_update.json()
            assert updated_prof["display_name"] == "Alex Carter (E2E Verified)"
            assert updated_prof["travel_style"] == "adventure"
            print("-> Alex profile successfully updated.")

            # Verify database persistence on re-fetch
            res_prof_check = await client.get("/api/auth/profile", headers=hdr_alex)
            assert res_prof_check.status_code == 200
            assert res_prof_check.json()["display_name"] == "Alex Carter (E2E Verified)"
            print("-> [VERIFIED] Profile changes persisted in database across requests.")

            # ---------------------------------------------------------------
            # STAGE 3: Trip Creation & Member Join (Mode NA - Collaborative)
            # ---------------------------------------------------------------
            print("\n[Stage 3] Create Mode NA Trip & Add Members...")
            res_trip = await client.post(
                "/api/trips",
                headers=hdr_alex,
                json={
                    "title": "Rajasthan Heritage & Desert Odyssey",
                    "destination_city_id": "cty_c07454f1",  # Jaipur
                    "start_date": "2027-02-10",
                    "end_date": "2027-02-18",
                    "party_size": 3,
                    "adults": 3,
                    "children": 0,
                    "trip_mode": "no_admin",
                    "trip_type": "friends",
                    "notes": "E2E full system verification trip",
                },
            )
            assert res_trip.status_code == 201, f"Create trip failed: {res_trip.text}"
            trip = res_trip.json()
            trip_id = trip["trip_id"]
            itinerary_id = trip["active_itinerary"]["itinerary_id"]
            print(f"-> Created Trip '{trip['title']}' (ID: {trip_id}, Mode: {trip['trip_mode']})")
            print(f"-> Active Itinerary: {itinerary_id} (Version: v{trip['active_itinerary']['version']})")

            # User 2 joins trip
            res_join = await client.post(
                f"/api/trips/{trip_id}/join",
                headers=hdr_rohan,
                json={"role": "editor"},
            )
            assert res_join.status_code == 200
            print("-> Rohan joined trip as editor.")

            # Verify both users are members
            res_detail = await client.get(f"/api/trips/{trip_id}", headers=hdr_alex)
            assert res_detail.status_code == 200
            member_ids = [m["user_id"] for m in res_detail.json()["members"]]
            assert user1_id in member_ids and user2_id in member_ids
            print("-> [VERIFIED] Both Alex and Rohan present in trip member roster.")

            # ---------------------------------------------------------------
            # STAGE 4: Itinerary Building & Concurrency Versioning
            # ---------------------------------------------------------------
            print("\n[Stage 4] Itinerary Slot Addition & Version Bumping...")
            res_item1 = await client.post(
                f"/api/trips/{trip_id}/itinerary/items",
                headers=hdr_alex,
                json={
                    "day_index": 1,
                    "title": "Amber Fort Guided Walking Tour",
                    "item_type": "poi",
                    "starts_at": "09:00",
                    "ends_at": "13:00",
                    "cost": "2500.00",
                    "duration_minutes": 240,
                    "explanation": "Morning heritage tour of Amber Fort courtyard",
                },
            )
            assert res_item1.status_code == 201
            item1 = res_item1.json()
            slot_id = item1["item_id"]
            print(f"-> Added slot '{item1['title']}' (ID: {slot_id})")

            # Check version bumped from 1 to 2
            res_trip_v2 = await client.get(f"/api/trips/{trip_id}", headers=hdr_alex)
            current_v = res_trip_v2.json()["active_itinerary"]["version"]
            assert current_v == 2, f"Expected version 2, got {current_v}"
            print(f"-> [VERIFIED] Itinerary version successfully bumped to v{current_v}.")

            # ---------------------------------------------------------------
            # STAGE 5: Simultaneous WebSockets, Proposals & Voting
            # ---------------------------------------------------------------
            print("\n[Stage 5] WebSockets, Proposals & Mandatory No-Reason Voting...")
            ws_url_alex = f"{WS_URL}/ws/trips/{trip_id}?user_id={user1_id}"
            ws_url_rohan = f"{WS_URL}/ws/trips/{trip_id}?user_id={user2_id}"

            async with websockets.connect(ws_url_alex) as ws_alex, websockets.connect(ws_url_rohan) as ws_rohan:
                print("-> Both WebSockets connected to trip channel.")

                # Rohan creates a replace proposal
                res_prop = await client.post(
                    f"/api/trips/{trip_id}/proposals",
                    headers=hdr_rohan,
                    json={
                        "itinerary_id": itinerary_id,
                        "action": "replace",
                        "target_item_id": slot_id,
                        "title": "Nahargarh Fort & Cycling Expedition",
                        "cost_delta": "300.00",
                        "currency": "INR",
                        "rationale": "More active outdoor morning experience with panoramic views",
                    },
                )
                assert res_prop.status_code == 201, f"Create proposal failed: {res_prop.text}"
                proposal = res_prop.json()
                proposal_id = proposal["proposal_id"]
                print(f"-> Rohan proposed replace: '{proposal['title']}' (ID: {proposal_id})")

                # Both clients receive WS event
                ws_event_alex = await recv_event(ws_alex, "proposal_created")
                assert ws_event_alex["proposal_id"] == proposal_id
                print("-> [VERIFIED] Alex received real-time proposal_created WS event.")

                # Rohan votes YES
                res_vote_yes = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=hdr_rohan,
                    json={"proposal_id": proposal_id, "value": "yes"},
                )
                assert res_vote_yes.status_code == 200

                # Alex attempts NO vote WITHOUT comment (testing validation)
                res_vote_no_blank = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=hdr_alex,
                    json={"proposal_id": proposal_id, "value": "no", "comment": ""},
                )
                assert res_vote_no_blank.status_code == 422
                print("-> [VERIFIED] Blank No vote rejected with HTTP 422 (mandatory reason enforced).")

                # Alex votes NO WITH typed reason
                objection_text = "Some group members have knee pain and cannot do cycling; prefer museum walking tour."
                res_vote_no = await client.post(
                    f"/api/trips/{trip_id}/votes",
                    headers=hdr_alex,
                    json={"proposal_id": proposal_id, "value": "no", "comment": objection_text},
                )
                win_msg = await recv_event(ws_rohan, "response_window_started")
                assert win_msg["seconds_remaining"] == 600
                print(f"-> [VERIFIED] Alex voted NO with objection. 10-min window triggered: {win_msg['expires_at']}")

                # Verify proposal detail shows response window active
                res_props = await client.get(f"/api/trips/{trip_id}/proposals", headers=hdr_alex)
                assert res_props.status_code == 200
                curr_prop = next(p for p in res_props.json() if p["proposal_id"] == proposal_id)
                assert curr_prop["response_window"]["active"] is True
                assert len(curr_prop["no_reasons"]) == 1
                assert "knee pain" in curr_prop["no_reasons"][0]

                # ---------------------------------------------------------------
                # STAGE 6: AI Consensus Planner Flow
                # ---------------------------------------------------------------
                print("\n[Stage 6] AI Consensus Synthesis & Hard-Constraint Validation...")
                res_ai = await client.post(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/invoke",
                    headers=hdr_alex,
                )
                assert res_ai.status_code == 201
                ai_cand = res_ai.json()
                print(f"-> Generated AI Candidate Round {ai_cand['round_number']}: '{ai_cand['candidate']['title']}'")
                print(f"   Constraint Valid: {ai_cand['constraint_valid']}")

                assert ai_cand["constraint_valid"] is True
                assert ai_cand["round_number"] == 1

                # WS broadcast received
                ws_ai_event = await recv_event(ws_rohan, "ai_candidate_ready")
                assert ws_ai_event["proposal_id"] == proposal_id
                print("-> [VERIFIED] Rohan received ai_candidate_ready WS broadcast.")

                # ---------------------------------------------------------------
                # STAGE 7: Parallel Branching & Silence Acceptance
                # ---------------------------------------------------------------
                print("\n[Stage 7] Branch-Trigger Classification & Branching Engine...")
                res_trigger = await client.post(
                    f"/api/trips/{trip_id}/proposals/{proposal_id}/consensus/branch-trigger",
                    headers=hdr_alex,
                )
                assert res_trigger.status_code == 200
                trigger_data = res_trigger.json()
                print(f"-> Branch Trigger Action: '{trigger_data['action']}' - Reason: {trigger_data['reason']}")

                # Create Branch A (Alex's Heritage Walk)
                res_branch_a = await client.post(
                    f"/api/trips/{trip_id}/branches",
                    headers=hdr_alex,
                    json={
                        "title": "Heritage Route (Alex)",
                        "proposal_id": proposal_id,
                        "member_user_ids": [user1_id],
                        "preview_deadline": "",
                    },
                )
                assert res_branch_a.status_code == 201, f"Branch A create failed: {res_branch_a.text}"
                branch_a = res_branch_a.json()
                branch_a_id = branch_a["branch_id"]
                print(f"-> Created Branch A: '{branch_a['title']}' (ID: {branch_a_id})")

                # Alex confirms participation on Branch A
                res_conf_a = await client.patch(
                    f"/api/trips/{trip_id}/branches/{branch_a_id}/member-status",
                    headers=hdr_alex,
                    json={"status": "confirmed"},
                )
                assert res_conf_a.status_code == 200
                assert res_conf_a.json()["status"] == "confirmed"
                print("-> [VERIFIED] Branch A auto-confirmed upon member confirmation.")

                # Create Branch B (Rohan's Cycling Route)
                res_branch_b = await client.post(
                    f"/api/trips/{trip_id}/branches",
                    headers=hdr_rohan,
                    json={
                        "title": "Active Cycling Route (Rohan)",
                        "proposal_id": proposal_id,
                        "member_user_ids": [user2_id],
                        "preview_deadline": "",
                    },
                )
                assert res_branch_b.status_code == 201, f"Branch B create failed: {res_branch_b.text}"
                branch_b_id = res_branch_b.json()["branch_id"]

                # Rohan requests modification on Branch B
                res_mod_b = await client.patch(
                    f"/api/trips/{trip_id}/branches/{branch_b_id}/member-status",
                    headers=hdr_rohan,
                    json={"status": "modification_requested"},
                )
                assert res_mod_b.status_code == 200
                assert res_mod_b.json()["status"] == "modification_requested"
                print("-> [VERIFIED] Branch B marked as 'modification_requested'.")

                # Create Branch C to test Silence Acceptance
                res_branch_c = await client.post(
                    f"/api/trips/{trip_id}/branches",
                    headers=hdr_alex,
                    json={
                        "title": "Evening Bazaar Tour (Branch C)",
                        "proposal_id": proposal_id,
                        "member_user_ids": [user1_id, user2_id],
                        "preview_deadline": "",
                    },
                )
                assert res_branch_c.status_code == 201
                branch_c_id = res_branch_c.json()["branch_id"]

                # Finalize Branch C with silence = accepted (no objections -> confirmed)
                res_fin_c = await client.post(
                    f"/api/trips/{trip_id}/branches/{branch_c_id}/finalize",
                    headers=hdr_alex,
                )
                assert res_fin_c.status_code == 200
                assert res_fin_c.json()["status"] == "confirmed"
                fin_ws = await recv_event(ws_rohan, "branch_finalized")
                assert fin_ws["silence_accepted"] is True
                assert fin_ws["status"] == "confirmed"
                print("-> [VERIFIED] Branch C confirmed via Silence = Accepted rule.")

                # ---------------------------------------------------------------
                # STAGE 8: Mandatory Trip Chat & Unanimous Override
                # ---------------------------------------------------------------
                print("\n[Stage 8] Mandatory Trip Chat & Unanimous Override...")
                # Regular message
                res_chat1 = await client.post(
                    f"/api/trips/{trip_id}/chat",
                    headers=hdr_alex,
                    json={"body": "Hey team, let's meet at the main gate at 8:30 AM."},
                )
                assert res_chat1.status_code == 201
                ws_chat_event = await recv_event(ws_rohan, "chat_message")
                assert ws_chat_event["user_id"] == user1_id
                await recv_event(ws_alex, "chat_message")
                print("-> [VERIFIED] Chat message broadcast received via WebSocket.")

                # Unanimous Override message
                res_chat2 = await client.post(
                    f"/api/trips/{trip_id}/chat",
                    headers=hdr_rohan,
                    json={
                        "body": "UNANIMOUS OVERRIDE: We all agreed to proceed with Branch A and meet for dinner!",
                        "is_unanimous_override": True,
                    },
                )
                assert res_chat2.status_code == 201
                ws_override_event = await recv_event(
                    ws_alex, "chat_message", predicate=lambda d: d.get("is_unanimous_override") is True
                )
                assert ws_override_event["is_unanimous_override"] is True
                print("-> [VERIFIED] Unanimous override message sent and broadcast.")

                # Verify chat history retrieval
                res_chat_hist = await client.get(f"/api/trips/{trip_id}/chat", headers=hdr_alex)
                assert res_chat_hist.status_code == 200
                chat_msgs = res_chat_hist.json()
                assert len(chat_msgs) >= 2
                assert any(m["is_unanimous_override"] for m in chat_msgs)
                print(f"-> [VERIFIED] Trip chat history preserved ({len(chat_msgs)} messages).")

                # ---------------------------------------------------------------
                # STAGE 9: Solo Matching (Groups & Certified Guides)
                # ---------------------------------------------------------------
                print("\n[Stage 9] Solo Matching Engine (Real DB Data)...")
                res_m_groups = await client.get("/api/matching/groups?limit=6", headers=hdr_alex)
                assert res_m_groups.status_code == 200
                m_groups = res_m_groups.json()
                assert len(m_groups) > 0
                top_group = m_groups[0]
                print(f"-> Top Group Match: '{top_group['title']}' ({top_group['compatibility_score']}%)")
                print(f"   Reasons: {top_group['match_reasons']}")
                assert len(top_group["match_reasons"]) > 0

                res_m_guides = await client.get("/api/matching/guides?limit=6", headers=hdr_alex)
                assert res_m_guides.status_code == 200
                m_guides = res_m_guides.json()
                assert len(m_guides) > 0
                top_guide = m_guides[0]
                print(f"-> Top Guide Match: {top_guide['display_name']} ({top_guide['specialisation']}) - {top_guide['compatibility_score']}%")
                print(f"   Reasons: {top_guide['match_reasons']}")
                assert top_guide["certified"] is not None

                # ---------------------------------------------------------------
                # STAGE 10: Face Registration with 3 Reference Angles
                # ---------------------------------------------------------------
                print("\n[Stage 10] 3-Angle Face Registration (Live ArcFace)...")
                print(f"-> DeepFace Available: {face_service.is_live_deepface_available()}")

                res_face_reg = await client.post(
                    f"/api/face/register?user_id={user1_id}",
                    headers=hdr_alex,
                    json={
                        "photo_straight": img_straight,
                        "photo_left": img_left,
                        "photo_right": img_right,
                    },
                )
                assert res_face_reg.status_code == 201, f"Face reg failed: {res_face_reg.text}"
                f_profile = res_face_reg.json()
                assert f_profile["user_id"] == user1_id
                assert f_profile["has_embeddings"] is True
                assert len(f_profile["photo_urls"]) == 3
                print("-> [VERIFIED] Face profile registered with 3 reference angles.")

                # Verify GET /api/face/profile
                res_f_prof = await client.get(f"/api/face/profile?user_id={user1_id}", headers=hdr_alex)
                assert res_f_prof.status_code == 200
                assert res_f_prof.json()["has_embeddings"] is True

                # ---------------------------------------------------------------
                # STAGE 11: Trip Photo Upload, 0.68 Threshold & Face Recognition
                # ---------------------------------------------------------------
                print("\n[Stage 11] Photo Upload, Cloudinary CDN & 0.68 Threshold Recognition...")
                res_photo_up = await client.post(
                    f"/api/trips/{trip_id}/photos?user_id={user1_id}",
                    headers=hdr_alex,
                    json={
                        "image_data": img_straight,
                        "caption": "Summit celebration at sunset over Jaipur",
                    },
                )
                assert res_photo_up.status_code == 201
                photo = res_photo_up.json()
                photo_id = photo["photo_id"]
                print(f"-> Photo uploaded (ID: {photo_id})")
                print(f"   Cloudinary URL: {photo['cloudinary_url']}")
                print(f"   Thumbnail URL: {photo['thumbnail_url']}")

                # Verify WS broadcast
                ws_photo_event = await recv_event(ws_rohan, "photo_uploaded")
                assert ws_photo_event["photo_id"] == photo_id
                print("-> [VERIFIED] Rohan received photo_uploaded event over WebSocket.")

                # Verify Face Tagging against Alex's profile (confidence >= 0.68)
                tags = photo.get("person_tags", [])
                assert len(tags) > 0, "Expected face tag for matching reference image"
                tag = tags[0]
                assert tag["user_id"] == user1_id
                assert tag["confidence"] >= 0.68
                print(f"-> [VERIFIED] Alex recognized and tagged with confidence: {tag['confidence']:.3f} (>= 0.68).")

                # Test Low-Confidence Face Recognition (Cosine Similarity < 0.68 must remain Unknown)
                dissimilar_vec = [1.0 if i == 0 else 0.0 for i in range(512)]
                sim_res = face_service.match_face(
                    dissimilar_vec,
                    [
                        {
                            "user_id": user1_id,
                            "embedding_1": json.dumps([0.0 if i == 0 else 1.0 / math.sqrt(511) for i in range(512)]),
                        }
                    ],
                    threshold=0.68,
                )
                assert sim_res["matched"] is False
                assert sim_res["user_id"] == "Unknown"
                print("-> [VERIFIED] 0.68 Threshold strictly enforced: low-confidence faces remain 'Unknown'.")

                # ---------------------------------------------------------------
                # STAGE 12: My Photos Personal Album & Tag Confirmation
                # ---------------------------------------------------------------
                print("\n[Stage 12] My Photos Personal Album & Tag Confirmation...")
                res_my_photos = await client.get(f"/api/photos/my?user_id={user1_id}", headers=hdr_alex)
                assert res_my_photos.status_code == 200
                my_photos = res_my_photos.json()
                assert len(my_photos) > 0
                assert any(p["photo_id"] == photo_id for p in my_photos)
                print(f"-> [VERIFIED] Photo appears in Alex's personal album ({len(my_photos)} photos).")

                # Confirm tag
                tag_id = tag["tag_id"]
                res_tag_confirm = await client.patch(
                    f"/api/photos/{photo_id}/tags/{tag_id}/confirm",
                    headers=hdr_alex,
                    json={"is_confirmed": True},
                )
                assert res_tag_confirm.status_code == 200
                assert res_tag_confirm.json()["is_confirmed"] is True
                print("-> [VERIFIED] Tag confirmed and updated.")

            # ---------------------------------------------------------------
            # STAGE 13: Simulated Re-Login & Cross-Session Persistence
            # ---------------------------------------------------------------
            print("\n[Stage 13] Cross-Session Persistence Verification...")
            # Create a completely fresh client session simulating browser refresh / new device
            async with httpx.AsyncClient(base_url=BASE_URL) as fresh_client:
                # Re-fetch trip
                res_re_trip = await fresh_client.get(f"/api/trips/{trip_id}", headers=hdr_alex)
                assert res_re_trip.status_code == 200
                fresh_trip = res_re_trip.json()
                assert fresh_trip["title"] == "Rajasthan Heritage & Desert Odyssey"
                assert fresh_trip["active_itinerary"]["version"] == 2
                assert len(fresh_trip["members"]) == 2

                # Re-fetch branches
                res_re_branches = await fresh_client.get(f"/api/trips/{trip_id}/branches", headers=hdr_alex)
                assert res_re_branches.status_code == 200
                fresh_branches = res_re_branches.json()
                assert len(fresh_branches) == 3

                # Re-fetch chat messages
                res_re_chat = await fresh_client.get(f"/api/trips/{trip_id}/chat", headers=hdr_alex)
                assert res_re_chat.status_code == 200
                assert len(res_re_chat.json()) >= 2

                # Re-fetch My Photos
                res_re_photos = await fresh_client.get(f"/api/photos/my?user_id={user1_id}", headers=hdr_alex)
                assert res_re_photos.status_code == 200
                fresh_my_photos = res_re_photos.json()
                assert any(p["photo_id"] == photo_id for p in fresh_my_photos)

                print("-> [VERIFIED] All trips, members, branches, chat, and photos perfectly persisted!")

        print("\n" + "=" * 75)
        print(">>> ALL PHASE 7 FULL SYSTEM E2E INTEGRATION TESTS PASSED 100%! <<<")
        print("=" * 75)

    finally:
        # Cleanup files and stop server
        for f in [img_straight, img_left, img_right]:
            p = Path(f)
            if p.exists():
                p.unlink()

        server.should_exit = True
        await server_task


if __name__ == "__main__":
    asyncio.run(test_phase7_e2e())

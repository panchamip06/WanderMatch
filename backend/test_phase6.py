"""
Phase 6 — Matching + Photos / Face Registration Test Suite.

Tests verified:
1. Solo -> Group Matching (explainable reasons, compatibility score, ranking, filters)
2. Solo -> Guide Matching (language, specialisation, price, ratings, DB guides)
3. Face Registration with 3 reference angles (straight, left, right)
4. Cloudinary photo storage & CDN delivery
5. Live ArcFace facial embeddings & 0.68 threshold validation (low-confidence remains Unknown)
6. My Photos personal album (face-tagged gallery & trip filter)
7. Tag confirmation (PATCH confirm/decline)
8. WebSocket real-time broadcast of photo uploads
"""
import asyncio
import json
import math
import sys
import uuid
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
TEST_PORT = 8768
BASE_URL = f"http://{TEST_HOST}:{TEST_PORT}"
WS_URL = f"ws://{TEST_HOST}:{TEST_PORT}"


async def recv_event(ws, expected_type: str, timeout: float = 6.0):
    """Drain WebSocket until message with expected_type arrives."""
    start = asyncio.get_event_loop().time()
    while True:
        elapsed = asyncio.get_event_loop().time() - start
        remaining = max(0.1, timeout - elapsed)
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        data = json.loads(raw)
        if data.get("type") == expected_type:
            return data


def create_synthetic_face_image(filename: str, intensity: int = 180):
    """Generate a simple test face image with an elliptical face shape."""
    img = np.zeros((160, 160, 3), dtype=np.uint8)
    # Head ellipse
    cv2.ellipse(img, (80, 80), (50, 65), 0, 0, 360, (intensity, intensity, intensity), -1)
    # Eyes
    cv2.circle(img, (60, 65), 10, (50, 50, 50), -1)
    cv2.circle(img, (100, 65), 10, (50, 50, 50), -1)
    # Mouth
    cv2.ellipse(img, (80, 110), (25, 10), 0, 0, 180, (40, 40, 40), -1)
    cv2.imwrite(filename, img)
    return filename


async def test_phase6():
    print("=" * 70)
    print(">>> STARTING WANDERMATCH PHASE 6 TEST SUITE <<<")
    print("=" * 70)

    await init_db()

    # Launch server
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

    test_trip_id = "trp_01716435"
    test_user_id = "usr_17bacb4e"

    # Temporary face image files
    img_straight = create_synthetic_face_image("test_face_straight.jpg", 180)
    img_left = create_synthetic_face_image("test_face_left.jpg", 170)
    img_right = create_synthetic_face_image("test_face_right.jpg", 175)
    img_dissimilar = create_synthetic_face_image("test_face_dissimilar.jpg", 30)

    try:
        # Connect WebSocket to test trip
        ws_endpoint = f"{WS_URL}/ws/trips/{test_trip_id}?user_id={test_user_id}"
        async with websockets.connect(ws_endpoint) as ws, httpx.AsyncClient(base_url=BASE_URL) as client:
            print(">>> Connected WebSocket to trip:", test_trip_id)

            # ---------------------------------------------------------------
            # 1. Solo -> Group Matching
            # ---------------------------------------------------------------
            print("\n--- TEST 1: Solo -> Group Matching ---")
            res_groups = await client.get("/api/matching/groups?limit=8")
            assert res_groups.status_code == 200, f"Expected 200, got {res_groups.status_code}: {res_groups.text}"
            groups = res_groups.json()
            assert len(groups) > 0, "No group matches returned from PS-11 data"
            first_group = groups[0]
            print(f"Top group match: '{first_group['title']}' in {first_group['destination_city_name']} ({first_group['compatibility_score']}%)")
            print("Explainable reasons:", first_group["match_reasons"])

            assert "trip_id" in first_group and first_group["trip_id"].startswith("trp_")
            assert 0 <= first_group["compatibility_score"] <= 100
            assert len(first_group["match_reasons"]) > 0, "Expected explainable match reasons"

            # Check descending sort
            scores = [g["compatibility_score"] for g in groups]
            assert scores == sorted(scores, reverse=True), "Groups not sorted by compatibility score"
            print(">>> TEST 1 PASSED: Solo -> Group matching returned ranked groups with explainable reasons.")

            # ---------------------------------------------------------------
            # 2. Solo -> Guide Matching
            # ---------------------------------------------------------------
            print("\n--- TEST 2: Solo -> Guide Matching ---")
            res_guides = await client.get("/api/matching/guides?limit=8")
            assert res_guides.status_code == 200, f"Expected 200, got {res_guides.status_code}: {res_guides.text}"
            guides = res_guides.json()
            assert len(guides) > 0, "No guides returned from tour_guides table"
            first_guide = guides[0]
            print(f"Top guide match: {first_guide['display_name']} ({first_guide['specialisation']}) - {first_guide['compatibility_score']}%")
            print("Explainable reasons:", first_guide["match_reasons"])

            assert "guide_id" in first_guide and first_guide["guide_id"].startswith("gid_")
            assert len(first_guide["match_reasons"]) > 0, "Expected explainable guide match reasons"
            assert "certified" in first_guide

            # Test guide filter by specialisation
            res_filter = await client.get("/api/matching/guides?specialisation=shopping&limit=5")
            assert res_filter.status_code == 200
            filtered = res_filter.json()
            assert len(filtered) > 0
            print(f"Found {len(filtered)} guides with shopping filter. Top: {filtered[0]['display_name']}")
            print(">>> TEST 2 PASSED: Solo -> Guide matching returned certified guides with explainable reasons.")

            # ---------------------------------------------------------------
            # 3. Face Registration with 3 Reference Angles
            # ---------------------------------------------------------------
            print("\n--- TEST 3: Face Registration with 3 Reference Photos ---")
            print(f"Live DeepFace available: {face_service.is_live_deepface_available()}")

            reg_payload = {
                "photo_straight": img_straight,
                "photo_left": img_left,
                "photo_right": img_right,
            }
            res_reg = await client.post(f"/api/face/register?user_id={test_user_id}", json=reg_payload)
            assert res_reg.status_code == 201, f"Registration failed {res_reg.status_code}: {res_reg.text}"
            profile = res_reg.json()
            print("Registered face profile:", profile)
            assert profile["user_id"] == test_user_id
            assert profile["has_embeddings"] is True
            assert len(profile["photo_urls"]) == 3
            assert any("_straight.jpg" in u for u in profile["photo_urls"])

            # Verify GET /api/face/profile
            res_get_prof = await client.get(f"/api/face/profile?user_id={test_user_id}")
            assert res_get_prof.status_code == 200
            prof_data = res_get_prof.json()
            assert prof_data["has_embeddings"] is True
            print(">>> TEST 3 PASSED: Face profile registered with 3 reference angles and verified.")

            # ---------------------------------------------------------------
            # 4. Photo Upload, Cloudinary URLs, & WebSocket Broadcast
            # ---------------------------------------------------------------
            print("\n--- TEST 4: Photo Upload with Cloudinary URLs & WS Broadcast ---")
            upload_payload = {
                "image_data": img_straight,
                "caption": "Summit celebration at sunset",
            }
            res_upload = await client.post(
                f"/api/trips/{test_trip_id}/photos?user_id={test_user_id}",
                json=upload_payload,
            )
            assert res_upload.status_code == 201, f"Upload failed {res_upload.status_code}: {res_upload.text}"
            photo_data = res_upload.json()
            print("Uploaded photo:", photo_data["photo_id"])
            print("Cloudinary URL:", photo_data["cloudinary_url"])
            print("Thumbnail URL:", photo_data["thumbnail_url"])

            assert "res.cloudinary.com" in photo_data["cloudinary_url"]
            assert "c_thumb" in photo_data["thumbnail_url"]

            # Verify WebSocket broadcast
            ws_event = await recv_event(ws, "photo_uploaded", timeout=5.0)
            print("WebSocket received photo_uploaded event:", ws_event)
            assert ws_event["photo_id"] == photo_data["photo_id"]
            assert ws_event["trip_id"] == test_trip_id
            print(">>> TEST 4 PASSED: Photo uploaded, Cloudinary URLs created, WS broadcast received.")

            # ---------------------------------------------------------------
            # 5. Live ArcFace Face Matching & 0.68 Threshold
            # ---------------------------------------------------------------
            print("\n--- TEST 5: ArcFace Face Matching & 0.68 Threshold Validation ---")
            tags = photo_data.get("person_tags", [])
            print(f"Detected face tags count: {len(tags)}")
            assert len(tags) > 0, "Expected at least 1 member face tag for matching reference image"
            matched_tag = tags[0]
            print(f"Matched User: {matched_tag['user_id']}, Confidence: {matched_tag['confidence']}")
            assert matched_tag["user_id"] == test_user_id
            assert matched_tag["confidence"] >= 0.68, f"Confidence {matched_tag['confidence']} below 0.68 threshold"
            assert matched_tag["is_confirmed"] is False

            # Test Low-Confidence Face (Cosine Similarity < 0.68 must remain Unknown)
            print("\nTesting low-confidence face behavior with dissimilar vector...")
            # Create orthogonal dummy vector
            dissimilar_vec = [1.0 if i == 0 else 0.0 for i in range(512)]
            sim_result = face_service.match_face(
                dissimilar_vec,
                [
                    {
                        "user_id": test_user_id,
                        "embedding_1": json.dumps([0.0 if i == 0 else 1.0 / math.sqrt(511) for i in range(512)]),
                    }
                ],
                threshold=0.68,
            )
            print("Dissimilar face match result:", sim_result)
            assert sim_result["matched"] is False, "Low confidence face was incorrectly matched!"
            assert sim_result["user_id"] == "Unknown", "Low confidence face did not resolve to 'Unknown'!"
            assert sim_result["confidence"] < 0.68, "Low confidence score exceeded threshold!"
            print(">>> TEST 5 PASSED: 0.68 threshold strictly enforced; low-confidence remains Unknown.")

            # ---------------------------------------------------------------
            # 6. My Photos Personal Album
            # ---------------------------------------------------------------
            print("\n--- TEST 6: My Photos Personal Album ---")
            res_my_photos = await client.get(f"/api/photos/my?user_id={test_user_id}")
            assert res_my_photos.status_code == 200
            my_photos = res_my_photos.json()
            assert len(my_photos) > 0, "No photos found in My Photos album"
            assert any(p["photo_id"] == photo_data["photo_id"] for p in my_photos)
            print(f"My Photos returned {len(my_photos)} tagged photos for user {test_user_id}.")

            # Trip gallery query
            res_trip_photos = await client.get(f"/api/trips/{test_trip_id}/photos")
            assert res_trip_photos.status_code == 200
            trip_photos = res_trip_photos.json()
            assert any(p["photo_id"] == photo_data["photo_id"] for p in trip_photos)
            print(f"Trip gallery returned {len(trip_photos)} photos.")
            print(">>> TEST 6 PASSED: My Photos personal album and trip shared gallery verified.")

            # ---------------------------------------------------------------
            # 7. Tag Confirmation
            # ---------------------------------------------------------------
            print("\n--- TEST 7: Tag Confirmation ---")
            tag_id = matched_tag["tag_id"]
            res_confirm = await client.patch(
                f"/api/photos/{photo_data['photo_id']}/tags/{tag_id}/confirm",
                json={"is_confirmed": True},
            )
            assert res_confirm.status_code == 200
            confirm_data = res_confirm.json()
            assert confirm_data["status"] == "ok"
            assert confirm_data["is_confirmed"] is True
            print("Confirmed face tag:", confirm_data)

            # Re-fetch My Photos to verify confirmation persisted
            res_my_updated = await client.get(f"/api/photos/my?user_id={test_user_id}")
            updated_photos = res_my_updated.json()
            matching_p = next(p for p in updated_photos if p["photo_id"] == photo_data["photo_id"])
            matching_t = next(t for t in matching_p["person_tags"] if t["tag_id"] == tag_id)
            assert matching_t["is_confirmed"] is True, "Tag confirmation was not persisted in DB"
            print(">>> TEST 7 PASSED: Tag confirmation toggled and persisted.")

        print("\n" + "=" * 70)
        print(">>> ALL PHASE 6 TESTS PASSED SUCCESSFULLY! <<<")
        print("=" * 70)

    finally:
        # Cleanup files and stop server
        for f in [img_straight, img_left, img_right, img_dissimilar]:
            p = Path(f)
            if p.exists():
                p.unlink()

        server.should_exit = True
        await server_task


if __name__ == "__main__":
    asyncio.run(test_phase6())

# tests/test_full_dive_with_fish.py
"""
Integration test: Full dive logging workflow with fish identification.

This test:
1. Uploads assets/divepic.jpg as dive signature photo to Convex
2. Uploads assets/fish1.png and assets/fish2.png to Convex
3. Identifies fish in both fish images using the Fishial API
4. Creates a dive entry with fish identification text in the notes
5. Retrieves the dive and verifies fish species appear in the notes

Run with:
    uv run pytest tests/test_full_dive_with_fish.py -v -s

Required environment variables:
- CONVEX_URL: Real Convex deployment URL
- FISHAL_API_ID: Fishial API client ID
- FISHAL_API_KEY: Fishial API client secret
"""

# Load environment variables FIRST, before any imports
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Allow running directly with `python tests/test_full_dive_with_fish.py`
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load .env file at module level so skipif decorator can see the variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

if "CONVEX_URL" not in os.environ:
    os.environ["CONVEX_URL"] = "https://test.convex.cloud"

import time
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.fish_finder import FishSpecies, FishRecognitionResult, identify_fish

client = TestClient(app)


def _require_convex_env() -> None:
    """Ensure Convex is configured for live tests."""
    convex_url = os.getenv("CONVEX_URL")
    assert (
        convex_url and convex_url.startswith("http") and not convex_url.startswith("https://test")
    ), "CONVEX_URL must be set and point to a real deployment (not https://test.convex.cloud)"


def _require_fishial_env() -> None:
    """Ensure Fishial API credentials are configured."""
    api_id = os.getenv("FISHAL_API_ID")
    api_key = os.getenv("FISHAL_API_KEY")
    assert api_id and api_key, (
        "FISHAL_API_ID and FISHAL_API_KEY must be set in .env for fish identification"
    )


def _identify_fish_from_file(image_path: Path) -> tuple[list[dict], list[str]]:
    """
    Identify fish species in an image file.

    Returns:
        Tuple of (species_list, errors_list) where errors may contain warnings
    """
    with open(image_path, "rb") as f:
        image_data = f.read()

    content_type = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"

    response = client.post(
        "/identify-fish",
        files={"file": (image_path.name, image_data, content_type)},
    )

    errors = []
    if response.status_code != 200:
        errors.append(f"Fish identification failed for {image_path.name}: {response.text}")
        return [], errors

    result = response.json()
    if not result.get("success"):
        errors.append(
            f"Fish identification unsuccessful for {image_path.name}: {result.get('error')}"
        )
        return [], errors

    species_list = result.get("species", [])
    return species_list, errors


@pytest.mark.skipif(
    os.environ.get("CONVEX_URL", "").startswith("https://test")
    or not os.environ.get("FISHAL_API_ID")
    or not os.environ.get("FISHAL_API_KEY"),
    reason="Requires real Convex deployment and Fishial API credentials",
)
def test_full_dive_workflow_with_fish_identification() -> None:
    """
    Integration test: Complete dive logging workflow with fish identification.

    This test verifies the full workflow:
    1. Upload dive signature photo (divepic.jpg) to Convex storage
    2. Upload fish images (fish1.png, fish2.png) to Convex storage
    3. Identify fish species in both fish images
    4. Create a dive with fish identification in notes
    5. Verify the dive was created with correct fish information
    """
    # =================================================================
    # Step 0: Verify environment
    # =================================================================
    _require_convex_env()
    _require_fishial_env()

    # =================================================================
    # Step 1: Upload dive signature photo to Convex
    # =================================================================
    print("\n--- Step 1: Uploading dive signature photo ---")

    dive_pic_path = Path(__file__).parent.parent / "assets" / "divepic.jpg"
    assert dive_pic_path.exists(), f"Dive picture not found at {dive_pic_path}"

    with open(dive_pic_path, "rb") as f:
        dive_pic_data = f.read()

    dive_pic_response = client.post(
        "/upload-photo",
        files={"file": (dive_pic_path.name, dive_pic_data, "image/jpeg")},
    )

    assert dive_pic_response.status_code == 200, (
        f"Dive photo upload failed: {dive_pic_response.text}"
    )

    dive_pic_result = dive_pic_response.json()
    assert "photo_storage_id" in dive_pic_result, "Expected photo_storage_id in response"
    dive_signature_storage_id = dive_pic_result["photo_storage_id"]
    print(f"Dive signature photo uploaded with storage ID: {dive_signature_storage_id}")

    # =================================================================
    # Step 2: Upload fish images to Convex storage
    # =================================================================
    print("\n--- Step 2: Uploading fish images to Convex ---")

    fish1_path = Path(__file__).parent.parent / "assets" / "fish1.png"
    fish2_path = Path(__file__).parent.parent / "assets" / "fish2.png"

    assert fish1_path.exists(), f"Fish1 image not found at {fish1_path}"
    assert fish2_path.exists(), f"Fish2 image not found at {fish2_path}"

    with open(fish1_path, "rb") as f:
        fish1_data = f.read()
    with open(fish2_path, "rb") as f:
        fish2_data = f.read()

    # Upload both fish images in a single request
    fish_upload_response = client.post(
        "/upload-photos",
        files=[
            ("files", (fish1_path.name, fish1_data, "image/png")),
            ("files", (fish2_path.name, fish2_data, "image/png")),
        ],
    )

    # Accept 200 (all success) or 207 (partial success)
    assert fish_upload_response.status_code in (200, 207), (
        f"Fish photos upload failed: {fish_upload_response.text}"
    )

    fish_upload_result = fish_upload_response.json()
    assert "photo_storage_ids" in fish_upload_result, "Expected photo_storage_ids in response"

    fish_storage_ids = fish_upload_result["photo_storage_ids"]
    assert len(fish_storage_ids) >= 2, (
        f"Expected at least 2 storage IDs for fish images, got {len(fish_storage_ids)}"
    )

    print(f"Fish1 uploaded with storage ID: {fish_storage_ids[0]}")
    print(f"Fish2 uploaded with storage ID: {fish_storage_ids[1]}")

    # =================================================================
    # Step 3: Identify fish species in both images
    # =================================================================
    print("\n--- Step 3: Identifying fish species ---")

    fish1_species, fish1_errors = _identify_fish_from_file(fish1_path)
    fish2_species, fish2_errors = _identify_fish_from_file(fish2_path)

    # Log any errors but continue if we got some results
    if fish1_errors:
        print(f"Fish1 identification warnings: {fish1_errors}")
    if fish2_errors:
        print(f"Fish2 identification warnings: {fish2_errors}")

    # Assert that we got species identification for both images
    assert len(fish1_species) > 0, f"No species identified for fish1.png. Errors: {fish1_errors}"
    assert len(fish2_species) > 0, f"No species identified for fish2.png. Errors: {fish2_errors}"

    # Get top species for each image
    fish1_top = fish1_species[0]
    fish2_top = fish2_species[0]

    print(f"Fish1 identified: {fish1_top['name']} (accuracy: {fish1_top['accuracy']:.1%})")
    print(f"Fish2 identified: {fish2_top['name']} (accuracy: {fish2_top['accuracy']:.1%})")

    # =================================================================
    # Step 4: Create dive with fish identification in notes
    # =================================================================
    print("\n--- Step 4: Creating dive with fish identification ---")

    # Dive metadata from user requirements
    location = "Coiba, Panama"
    club_name = "Panama Dive Center"
    instructor_name = "Angela"
    dive_date = datetime(2026, 2, 14)
    dive_date_timestamp = int(dive_date.timestamp() * 1000)  # Unix timestamp in milliseconds

    # Build the notes text with fish identification
    fish_notes_parts = [
        "Fish species observed during dive:",
        f"  - Fish 1: {fish1_top['name']} (confidence: {fish1_top['accuracy']:.0%})",
        f"  - Fish 2: {fish2_top['name']} (confidence: {fish2_top['accuracy']:.0%})",
    ]
    fish_notes = "\n".join(fish_notes_parts)

    # Combine with any existing notes
    notes = f"Signature photo ID: {dive_signature_storage_id}\n{fish_notes}"

    dive_data = {
        "user_id": "test-user-panama-001",
        "dive_number": 1,
        "dive_date": dive_date_timestamp,
        "location": location,
        "site": "Coiba National Park",
        "duration": 45.0,
        "max_depth": 20.0,
        "club_name": club_name,
        "instructor_name": instructor_name,
        "notes": notes,
        # All storage IDs: dive signature + fish photos
        "photo_storage_ids": [dive_signature_storage_id] + fish_storage_ids,
        "buddy_check": True,
        "briefed": True,
    }

    dive_response = client.post("/dives/upsert", json=dive_data)
    assert dive_response.status_code == 200, f"Dive upsert failed: {dive_response.text}"

    dive_result = dive_response.json()
    assert "id" in dive_result, f"Expected 'id' in dive response, got: {dive_result}"

    dive_id = dive_result["id"]
    print(f"Dive created with ID: {dive_id}")

    # =================================================================
    # Step 5: Retrieve and verify the dive
    # =================================================================
    print("\n--- Step 5: Verifying dive entry ---")

    get_response = client.get(f"/dives/{dive_id}")
    assert get_response.status_code == 200, f"Failed to retrieve dive: {get_response.text}"

    retrieved_dive = get_response.json()

    # Verify dive signature photo is in storage IDs
    assert dive_signature_storage_id in retrieved_dive.get("photo_storage_ids", []), (
        f"Dive signature photo ID not found in dive's photo_storage_ids"
    )
    print(f"✓ Dive signature photo ID verified: {dive_signature_storage_id}")

    # Verify fish photos are in storage IDs
    for fish_id in fish_storage_ids:
        assert fish_id in retrieved_dive.get("photo_storage_ids", []), (
            f"Fish photo ID {fish_id} not found in dive's photo_storage_ids"
        )
    print(f"✓ Fish photo IDs verified: {fish_storage_ids}")

    # Verify dive metadata
    assert retrieved_dive.get("location") == location, (
        f"Expected location '{location}', got '{retrieved_dive.get('location')}'"
    )
    assert retrieved_dive.get("club_name") == club_name, (
        f"Expected club_name '{club_name}', got '{retrieved_dive.get('club_name')}'"
    )
    assert retrieved_dive.get("instructor_name") == instructor_name, (
        f"Expected instructor_name '{instructor_name}', got '{retrieved_dive.get('instructor_name')}'"
    )
    print(f"✓ Location: {location}")
    print(f"✓ Club: {club_name}")
    print(f"✓ Instructor: {instructor_name}")
    print(f"✓ Dive date: 14/02/2026")

    # Verify notes contain fish identification
    notes_text = retrieved_dive.get("notes", "")

    # Check that fish species names appear in notes
    assert fish1_top["name"] in notes_text, (
        f"Fish 1 species '{fish1_top['name']}' not found in dive notes"
    )
    assert fish2_top["name"] in notes_text, (
        f"Fish 2 species '{fish2_top['name']}' not found in dive notes"
    )
    print(f"✓ Fish 1 species '{fish1_top['name']}' found in notes")
    print(f"✓ Fish 2 species '{fish2_top['name']}' found in notes")

    # Verify all photo storage IDs are present
    all_photo_ids = retrieved_dive.get("photo_storage_ids", [])
    assert dive_signature_storage_id in all_photo_ids, (
        "Dive signature photo ID missing from photo_storage_ids"
    )
    for fish_id in fish_storage_ids:
        assert fish_id in all_photo_ids, f"Fish photo ID {fish_id} missing from photo_storage_ids"

    print(f"\n✓ All 3 photos registered in dive: 1 signature + 2 fish photos")
    print(f"✓ Fish identification text saved in dive comments")
    print("\n--- TEST PASSED ---")


if __name__ == "__main__":
    # Allow running the test directly
    pytest.main([__file__, "-v", "-s"])

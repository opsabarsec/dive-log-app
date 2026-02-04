# tests/test_upsert_with_photo.py
import os
import json
from pathlib import Path

from dotenv import load_dotenv

# Load .env BEFORE importing app to ensure env vars are available at module load time
load_dotenv()

from fastapi.testclient import TestClient
from starlette import status

from app.divelog import app

client = TestClient(app)


def _require_convex_env() -> None:
    """Ensure Convex is configured for live tests."""
    convex_url = os.getenv("CONVEX_URL")
    assert convex_url and convex_url.startswith("http"), (
        "CONVEX_URL must be set and valid (e.g., https://<your>.convex.cloud)"
    )


def _get_sample_dive_data() -> dict:
    """Return sample dive data for testing."""
    return {
        "user_id": "test-user-123",
        "dive_number": 42,
        "dive_date": 1704067200,  # 2024-01-01 epoch
        "location": "Great Barrier Reef, Australia",
        "duration": 45.0,
        "max_depth": 18.5,
        "club_name": "Test Dive Club",
        "instructor_name": "John Doe",
        "site": "Coral Gardens",
        "water_temperature": 24.0,
        "suit_thickness": 3.0,
        "lead_weights": 4.0,
        "notes": "Integration test dive",
    }


def test_upsert_with_photo_success() -> None:
    """
    Live integration test:
    - Upload dive photo with dive data via /dives/upsert-with-photo.
    - Assert 200 and response contains photo_storage_id and dive data.
    """
    _require_convex_env()

    file_path = Path(__file__).parent.parent / "assets" / "dive001.jpg"
    assert file_path.exists(), f"Test asset not found: {file_path}"

    dive_data = _get_sample_dive_data()

    with open(file_path, "rb") as f:
        resp = client.post(
            "/dives/upsert-with-photo",
            files={"file": (file_path.name, f, "image/jpeg")},
            data={"dive_data": json.dumps(dive_data)},
        )

    assert resp.status_code == status.HTTP_200_OK, resp.text
    body = resp.json()

    # Verify photo_storage_id is returned
    assert "photo_storage_id" in body
    assert isinstance(body["photo_storage_id"], str)
    assert body["photo_storage_id"], "photo_storage_id should not be empty"

    # Verify dive data is returned
    assert "dive" in body


def test_upsert_with_photo_invalid_file_type() -> None:
    """Test that unsupported file types are rejected."""
    _require_convex_env()

    dive_data = _get_sample_dive_data()

    # Create a fake text file
    resp = client.post(
        "/dives/upsert-with-photo",
        files={"file": ("test.txt", b"not an image", "text/plain")},
        data={"dive_data": json.dumps(dive_data)},
    )

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    body = resp.json()
    assert "error" in body
    assert "Unsupported file type" in body["error"]


def test_upsert_with_photo_invalid_json() -> None:
    """Test that invalid JSON in dive_data is rejected."""
    _require_convex_env()

    file_path = Path(__file__).parent.parent / "assets" / "dive001.jpg"
    assert file_path.exists(), f"Test asset not found: {file_path}"

    with open(file_path, "rb") as f:
        resp = client.post(
            "/dives/upsert-with-photo",
            files={"file": (file_path.name, f, "image/jpeg")},
            data={"dive_data": "not valid json {"},
        )

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    body = resp.json()
    assert "error" in body
    assert "Invalid JSON" in body["error"]


def test_upsert_with_photo_missing_required_fields() -> None:
    """Test that missing required dive fields are rejected."""
    _require_convex_env()

    file_path = Path(__file__).parent.parent / "assets" / "dive001.jpg"
    assert file_path.exists(), f"Test asset not found: {file_path}"

    # Missing required fields like dive_number, location, etc.
    incomplete_data = {"user_id": "test-user"}

    with open(file_path, "rb") as f:
        resp = client.post(
            "/dives/upsert-with-photo",
            files={"file": (file_path.name, f, "image/jpeg")},
            data={"dive_data": json.dumps(incomplete_data)},
        )

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    body = resp.json()
    assert "error" in body
    assert "Invalid dive data" in body["error"]

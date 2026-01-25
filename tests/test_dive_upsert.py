import os
import time

# Set dummy CONVEX_URL for tests BEFORE importing app
if "CONVEX_URL" not in os.environ:
    os.environ["CONVEX_URL"] = "https://test.convex.cloud"

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.main import app

client = TestClient(app)


@pytest.fixture
def mock_convex_response():
    """Mock successful Convex response"""
    return {"value": {"id": "test_dive_id_123", "action": "inserted"}}


@pytest.fixture
def valid_dive_data():
    """Valid dive data for testing"""
    return {
        "user_id": "test-user-123",
        "dive_number": 1,
        "dive_date": int(time.time() * 1000),
        "location": "Portofino, Italy",
        "latitude": 44.3036653,
        "longitude": 9.2093446,
        "site": "Cristo degli Abissi",
        "duration": 45.0,
        "max_depth": 20.0,
        "temperature": 18.5,
        "water_type": "saltwater",
        "visibility": 15.0,
        "weather": "sunny",
        "suit_thickness": 5.0,
        "lead_weights": 4.0,
        "club_name": "Portofino Divers",
        "club_website": "https://portofinodivers.com",
        "instructor_name": "Marco Rossi",
        "notes": "Amazing dive at the Christ of the Abyss statue",
        "photo_storage_id": "photo_123",
        "buddy_ids": ["buddy-1", "buddy-2"],
        "equipment": ["BCD", "Regulator", "Wetsuit"],
        # logged_at and updated_at are server-generated
    }


@pytest.fixture
def minimal_dive_data():
    """Minimal required dive data"""
    return {
        "user_id": "test-user-456",
        "dive_number": 2,
        "dive_date": int(time.time() * 1000),
        "location": "Red Sea",
        "duration": 30.0,
        "max_depth": 15.0,
        "water_type": "saltwater",
        "buddy_ids": [],
        "equipment": [],
        # logged_at and updated_at are server-generated
    }


def test_upsert_dive_success(valid_dive_data, mock_convex_response):
    """Test successful dive upsert with all fields"""
    with patch("httpx.AsyncClient") as mock_client:
        # Mock the httpx response
        mock_response = MagicMock()
        mock_response.json = MagicMock(return_value=mock_convex_response)
        mock_response.raise_for_status = MagicMock()

        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        response = client.post("/dives/upsert", json=valid_dive_data)

        assert response.status_code == 200
        assert response.json() == mock_convex_response["value"]

        # Verify the Convex API was called
        mock_client.return_value.__aenter__.return_value.post.assert_called_once()


def test_upsert_dive_minimal_fields(minimal_dive_data, mock_convex_response):
    """Test upsert with only required fields"""
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.json = MagicMock(return_value=mock_convex_response)
        mock_response.raise_for_status = MagicMock()

        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        response = client.post("/dives/upsert", json=minimal_dive_data)

        assert response.status_code == 200
        assert response.json() == mock_convex_response["value"]


def test_upsert_dive_server_managed_timestamps(valid_dive_data):
    """Test that logged_at and updated_at are NOT sent (server-managed)"""
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.json = MagicMock(return_value={"value": {"id": "123", "action": "updated"}})
        mock_response.raise_for_status = MagicMock()

        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        response = client.post("/dives/upsert", json=valid_dive_data)

        # Get the actual payload sent to Convex
        call_args = mock_client.return_value.__aenter__.return_value.post.call_args
        sent_payload = call_args.kwargs["json"]["args"]

        # Verify logged_at and updated_at are NOT in the payload (server-managed)
        assert "logged_at" not in sent_payload
        assert "updated_at" not in sent_payload
        assert response.status_code == 200


def test_upsert_dive_missing_required_field():
    """Test validation error when required field is missing"""
    invalid_data = {
        "user_id": "test-user",
        "dive_number": 1,
        # Missing required fields like dive_date, location, duration, etc.
    }

    response = client.post("/dives/upsert", json=invalid_data)

    assert response.status_code == 422  # Validation error


def test_upsert_dive_invalid_types():
    """Test validation error with invalid field types"""
    invalid_data = {
        "user_id": "test-user",
        "dive_number": "not-a-number",  # Should be int
        "dive_date": "invalid-date",  # Should be int
        "location": "Test Location",
        "duration": "not-a-float",  # Should be float
        "max_depth": "not-a-float",  # Should be float
        "water_type": "saltwater",
        "buddy_ids": [],
        "equipment": [],
        "logged_at": int(time.time() * 1000),
        "updated_at": int(time.time() * 1000),
    }

    response = client.post("/dives/upsert", json=invalid_data)

    assert response.status_code == 422


def test_upsert_dive_empty_arrays():
    """Test that empty arrays for buddy_ids and equipment are valid"""
    dive_data = {
        "user_id": "test-user",
        "dive_number": 1,
        "dive_date": int(time.time() * 1000),
        "location": "Test Location",
        "duration": 30.0,
        "max_depth": 15.0,
        "water_type": "saltwater",
        "buddy_ids": [],  # Empty is valid
        "equipment": [],  # Empty is valid
    }

    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.json = MagicMock(return_value={"value": {"id": "123", "action": "inserted"}})
        mock_response.raise_for_status = MagicMock()

        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        response = client.post("/dives/upsert", json=dive_data)

        assert response.status_code == 200


def test_upsert_dive_convex_api_call_format(valid_dive_data):
    """Test that the Convex API is called with correct format"""
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.json = MagicMock(return_value={"value": {"id": "123", "action": "inserted"}})
        mock_response.raise_for_status = MagicMock()

        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        response = client.post("/dives/upsert", json=valid_dive_data)

        # Verify the API call format
        call_args = mock_client.return_value.__aenter__.return_value.post.call_args
        payload = call_args.kwargs["json"]
        print(payload)
        assert payload["path"] == "dives:upsertDive"
        assert payload["format"] == "json"
        assert "args" in payload
        assert payload["args"]["user_id"] == valid_dive_data["user_id"]
        assert payload["args"]["dive_number"] == valid_dive_data["dive_number"]
        assert response.status_code == 200


def test_post_and_retrieve_dive():
    """Test posting a dive and then retrieving it by ID"""
    # Create dive data with dive_number 1 (0001)
    dive_data = {
        "user_id": "test-user-001",
        "dive_number": 1,
        "dive_date": 1769212800000,
        "location": "Great Barrier Reef, Australia",
        "latitude": -18.2871,
        "longitude": 147.6992,
        "site": "Cod Hole",
        "duration": 52.0,
        "max_depth": 25.0,
        "temperature": 26.0,
        "water_type": "saltwater",
        "visibility": 30.0,
        "weather": "sunny",
        "suit_thickness": 3.0,
        "lead_weights": 2.0,
        "club_name": "Cairns Dive Adventures",
        "club_website": "https://cairnsdive.com",
        "instructor_name": "Steve Irwin Jr",
        "notes": "Amazing dive with giant potato cod!",
        "photo_storage_id": "photo_001_gbr",
        "buddy_ids": ["buddy-001"],
        "equipment": ["BCD", "Regulator", "Wetsuit", "Fins"],
    }

    # Mock ID returned from Convex after insertion
    created_dive_id = "kg2test001dive123456789abc"

    with patch("httpx.AsyncClient") as mock_client:
        # Setup mock responses list for sequential calls
        mock_post_context = mock_client.return_value.__aenter__.return_value

        # Mock response for POST /dives/upsert
        mock_upsert_response = MagicMock()
        mock_upsert_response.json = MagicMock(
            return_value={"value": {"id": created_dive_id, "action": "inserted"}}
        )
        mock_upsert_response.raise_for_status = MagicMock()

        # Mock response for GET /dives/{id}
        mock_get_response = MagicMock()
        # The retrieved dive should include all the data plus Convex fields
        retrieved_dive = {
            "_id": created_dive_id,
            "_creationTime": 1769295983026,
            **{k: v for k, v in dive_data.items() if k not in ["logged_at", "updated_at"]},
            "logged_at": 1769295983026,
            "updated_at": 1769295983026,
        }
        mock_get_response.json = MagicMock(return_value={"value": retrieved_dive})
        mock_get_response.raise_for_status = MagicMock()

        # Set up the mock to return different responses for each call
        mock_post_context.post = AsyncMock(side_effect=[mock_upsert_response, mock_get_response])

        # Step 1: POST the dive
        post_response = client.post("/dives/upsert", json=dive_data)

        assert post_response.status_code == 200
        assert post_response.json()["id"] == created_dive_id
        assert post_response.json()["action"] == "inserted"

        # Step 2: GET the dive by ID
        get_response = client.get(f"/dives/{created_dive_id}")

        assert get_response.status_code == 200
        retrieved_data = get_response.json()

        # Verify the retrieved data matches what we posted
        assert retrieved_data["_id"] == created_dive_id
        assert retrieved_data["user_id"] == dive_data["user_id"]
        assert retrieved_data["dive_number"] == dive_data["dive_number"]
        assert retrieved_data["location"] == dive_data["location"]
        assert retrieved_data["site"] == dive_data["site"]
        assert retrieved_data["duration"] == dive_data["duration"]
        assert retrieved_data["max_depth"] == dive_data["max_depth"]
        assert retrieved_data["club_name"] == dive_data["club_name"]
        assert retrieved_data["notes"] == dive_data["notes"]

        # Verify both API calls were made
        assert mock_post_context.post.call_count == 2

        # Verify first call was to upsertDive mutation
        first_call = mock_post_context.post.call_args_list[0]
        assert first_call.kwargs["json"]["path"] == "dives:upsertDive"

        # Verify second call was to getDiveById query
        second_call = mock_post_context.post.call_args_list[1]
        assert second_call.kwargs["json"]["path"] == "dives:getDiveById"
        assert second_call.kwargs["json"]["args"]["id"] == created_dive_id


def test_get_dive_not_found():
    """Test GET endpoint returns 404 for non-existent dive"""
    non_existent_id = "kg2nonexistent123456789"

    with patch("httpx.AsyncClient") as mock_client:
        # Mock response returning None (dive not found)
        mock_response = MagicMock()
        mock_response.json = MagicMock(return_value={"value": None})
        mock_response.raise_for_status = MagicMock()

        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        response = client.get(f"/dives/{non_existent_id}")

        assert response.status_code == 404
        assert "error" in response.json()
        assert non_existent_id in response.json()["error"]


@pytest.mark.skipif(
    os.environ.get("CONVEX_URL", "").startswith("https://test"),
    reason="Requires real Convex deployment (set CONVEX_URL env var)",
)
def test_post_and_retrieve_dive_real_convex():
    """
    Integration test: Actually post to Convex and retrieve the data.
    Requires real Convex deployment - set CONVEX_URL environment variable.
    Run with: CONVEX_URL=https://your-deployment.convex.cloud pytest -k real_convex

    Flags explanation:
    -v = verbose output
    -s = show print statements (so you can see the dive ID and confirmation messages)
    -k real_convex = only run tests matching "real_convex"
    The test will:

    POST a dive with all fields to your real Convex database
    Retrieve it using the GET endpoint
    Verify all data matches
    Print the dive ID and confirmation

    """
    # Create dive data with dive_number 1 (0001)
    dive_data = {
        "user_id": "test-user-integration-001",
        "dive_number": 1,
        "dive_date": 1769212800000,
        "location": "Great Barrier Reef, Australia",
        "latitude": -18.2871,
        "longitude": 147.6992,
        "site": "Cod Hole",
        "duration": 52.0,
        "max_depth": 25.0,
        "temperature": 26.0,
        "water_type": "saltwater",
        "visibility": 30.0,
        "weather": "sunny",
        "suit_thickness": 3.0,
        "lead_weights": 2.0,
        "club_name": "Cairns Dive Adventures",
        "club_website": "https://cairnsdive.com",
        "instructor_name": "Steve Irwin Jr",
        "notes": "Integration test dive - Amazing dive with giant potato cod!",
        "photo_storage_id": "photo_integration_001_gbr",
        "buddy_ids": ["buddy-integration-001"],
        "equipment": ["BCD", "Regulator", "Wetsuit", "Fins"],
    }

    # Step 1: POST the dive to real Convex
    post_response = client.post("/dives/upsert", json=dive_data)

    assert post_response.status_code == 200
    response_data = post_response.json()
    assert "id" in response_data
    assert response_data["action"] in ["inserted", "updated"]

    created_dive_id = response_data["id"]
    print(f"\nCreated dive with ID: {created_dive_id}")

    # Step 2: GET the dive by ID from real Convex
    get_response = client.get(f"/dives/{created_dive_id}")

    assert get_response.status_code == 200
    retrieved_data = get_response.json()

    # Verify the retrieved data matches what we posted
    assert retrieved_data["_id"] == created_dive_id
    assert retrieved_data["user_id"] == dive_data["user_id"]
    assert retrieved_data["dive_number"] == dive_data["dive_number"]
    assert retrieved_data["location"] == dive_data["location"]
    assert retrieved_data["site"] == dive_data["site"]
    assert retrieved_data["duration"] == dive_data["duration"]
    assert retrieved_data["max_depth"] == dive_data["max_depth"]
    assert retrieved_data["temperature"] == dive_data["temperature"]
    assert retrieved_data["water_type"] == dive_data["water_type"]
    assert retrieved_data["visibility"] == dive_data["visibility"]
    assert retrieved_data["weather"] == dive_data["weather"]
    assert retrieved_data["suit_thickness"] == dive_data["suit_thickness"]
    assert retrieved_data["lead_weights"] == dive_data["lead_weights"]
    assert retrieved_data["club_name"] == dive_data["club_name"]
    assert retrieved_data["club_website"] == dive_data["club_website"]
    assert retrieved_data["instructor_name"] == dive_data["instructor_name"]
    assert retrieved_data["notes"] == dive_data["notes"]
    assert retrieved_data["photo_storage_id"] == dive_data["photo_storage_id"]
    assert retrieved_data["buddy_ids"] == dive_data["buddy_ids"]
    assert retrieved_data["equipment"] == dive_data["equipment"]

    # Verify Convex metadata fields exist
    assert "_id" in retrieved_data
    assert "_creationTime" in retrieved_data
    assert "logged_at" in retrieved_data
    assert "updated_at" in retrieved_data

    print("Successfully verified dive data from Convex!")
    print(f"Dive location: {retrieved_data['location']}")
    print(f"Dive site: {retrieved_data['site']}")
    print(f"Max depth: {retrieved_data['max_depth']}m")


# commands for teh integration test:

# Windows Command Prompt (cmd):
# set CONVEX_URL=https://friendly-finch-619.convex.cloud && uv run pytest tests/test_dive_upsert.py::test_post_and_retrieve_dive_real_convex -v -s

# Windows PowerShell:
# $env:CONVEX_URL="https://friendly-finch-619.convex.cloud"; uv run pytest tests/test_dive_upsert.py::test_post_and_retrieve_dive_real_convex -v -s

# Git Bash / Linux / macOS:
# CONVEX_URL=https://friendly-finch-619.convex.cloud uv run pytest tests/test_dive_upsert.py::test_post_and_retrieve_dive_real_convex -v -s

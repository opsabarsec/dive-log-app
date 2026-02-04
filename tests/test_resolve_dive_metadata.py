# tests/test_resolve_dive_metadata.py
import os
from unittest.mock import patch, AsyncMock

from dotenv import load_dotenv

# Load .env before importing app to ensure env vars are available at module load time
load_dotenv()

from fastapi.testclient import TestClient
from starlette import status

from app.main import app


client = TestClient(app)


def test_resolve_dive_metadata_happy_path() -> None:
    """Test successful resolution of coordinates and club website."""
    payload = {"location_name": "Lady Elliot Island", "club_name": "Portofino Divers"}

    with (
        patch("app.main.get_coordinates_async", new_callable=AsyncMock) as mock_geo,
        patch("app.main.search_club_website") as mock_club,
    ):
        # Mock geolocation returns [lon, lat]
        mock_geo.return_value = [152.715, -24.112]
        mock_club.return_value = {"success": True, "club_website": "https://portofinodivers.com"}

        resp = client.post("/resolve-dive-metadata", json=payload)
        assert resp.status_code == status.HTTP_200_OK

        body = resp.json()
        assert body["location_name"] == "Lady Elliot Island"
        assert body["coordinates"] == {"latitude": -24.112, "longitude": 152.715}
        assert body["osm_link"].startswith(
            "https://www.openstreetmap.org/?mlat=-24.112&mlon=152.715#map=16/"
        )
        assert body["club_name"] == "Portofino Divers"
        assert body["club_website"] == "https://portofinodivers.com"


def test_resolve_dive_metadata_partial_failure() -> None:
    """Test when both geolocation and club lookup fail."""
    payload = {"location_name": "Unknown Place", "club_name": "Unknown Club"}

    with (
        patch("app.main.get_coordinates_async", new_callable=AsyncMock) as mock_geo,
        patch("app.main.search_club_website") as mock_club,
    ):
        mock_geo.return_value = None
        mock_club.return_value = {"success": False, "error": "No results"}

        resp = client.post("/resolve-dive-metadata", json=payload)
        assert resp.status_code == status.HTTP_200_OK

        body = resp.json()
        assert body["coordinates"] is None
        assert body["osm_link"] is None
        assert body["club_website"] is None


def test_resolve_dive_metadata_only_location_found() -> None:
    """Test when only geolocation succeeds."""
    payload = {"location_name": "Great Barrier Reef", "club_name": "Nonexistent Club"}

    with (
        patch("app.main.get_coordinates_async", new_callable=AsyncMock) as mock_geo,
        patch("app.main.search_club_website") as mock_club,
    ):
        mock_geo.return_value = [145.7, -16.5]
        mock_club.return_value = {"success": False, "error": "No results"}

        resp = client.post("/resolve-dive-metadata", json=payload)
        assert resp.status_code == status.HTTP_200_OK

        body = resp.json()
        assert body["coordinates"] == {"latitude": -16.5, "longitude": 145.7}
        assert body["osm_link"] is not None
        assert body["club_website"] is None


def test_resolve_dive_metadata_only_club_found() -> None:
    """Test when only club lookup succeeds."""
    payload = {"location_name": "Unknown Location", "club_name": "PADI Dive Center"}

    with (
        patch("app.main.get_coordinates_async", new_callable=AsyncMock) as mock_geo,
        patch("app.main.search_club_website") as mock_club,
    ):
        mock_geo.return_value = None
        mock_club.return_value = {"success": True, "club_website": "https://padi.com"}

        resp = client.post("/resolve-dive-metadata", json=payload)
        assert resp.status_code == status.HTTP_200_OK

        body = resp.json()
        assert body["coordinates"] is None
        assert body["osm_link"] is None
        assert body["club_website"] == "https://padi.com"

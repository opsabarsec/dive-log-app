from typing import Optional, Any
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
import os


# Service imports
from app.services.geolocation import get_coordinates_async
from app.services.search_club_website import search_club_website
from dotenv import load_dotenv
# app/main.py (or wherever your FastAPI app lives)

# Load .env file
env_path = ".env"
load_dotenv(env_path)

app = FastAPI()
# ---------------------------------------------------------
# Search Club Endpoint
# ---------------------------------------------------------

CONVEX_URL = os.environ["CONVEX_URL"]  # e.g. https://my-app-123.convex.cloud
CONVEX_GENERATE_URL_FN = os.getenv("CONVEX_GENERATE_URL_FN", "files:generateUploadUrl")
CONVEX_AUTH_TOKEN = os.getenv("CONVEX_AUTH_TOKEN", "").strip()  # optional (Convex auth)



class DiveInput(BaseModel):
    """Dive data for combined upload endpoint (photo_storage_id auto-filled)."""
    user_id: str
    dive_number: int
    dive_date: int
    location: str
    duration: float
    max_depth: float
    club_name: str
    instructor_name: str

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    osm_link: Optional[str] = None
    site: Optional[str] = None
    temperature: Optional[float] = None
    visibility: Optional[float] = None
    weather: Optional[str] = None
    suit_thickness: Optional[float] = None
    lead_weights: Optional[float] = None
    club_website: Optional[str] = None
    notes: Optional[str] = None

    buddy_check: bool = Field(default=True, serialization_alias="Buddy_check")
    briefed: bool = Field(default=True, serialization_alias="Briefed")


class Dive(DiveInput):
    """Full dive model including photo_storage_id."""
    photo_storage_id: str


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class ResolveMetadataResponse(BaseModel):
    location_name: str
    coordinates: Optional[Coordinates] = None
    osm_link: Optional[str] = None
    club_name: str
    club_website: Optional[str] = None

class ResolveMetadataRequest(BaseModel):
    location_name: str
    club_name: str


@app.get("/search-club")
def search_club(q: str = Query(..., description="Club name")) -> Any:
    result = search_club_website(q)
    if result.get("success"):
        return result
    return JSONResponse(
        status_code=404 if "No results" in result.get("error", "") else 500,
        content=result,
    )
    
# ---------------------------------------------------------
# Combined Metadata Resolver
# ---------------------------------------------------------

@app.post("/resolve-dive-metadata", response_model=ResolveMetadataResponse)
async def resolve_dive_metadata(payload: ResolveMetadataRequest) -> ResolveMetadataResponse:
    """
    Resolve:
    - coordinates + OSM link from location_name
    - club_website from club_name
    """

    # --- Geolocation ---
    lat, lon = None, None
    osm_link = None

    try:
        coords = await get_coordinates_async(payload.location_name)
        if coords:
            lon, lat = coords
            osm_link = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}"
    except Exception:
        pass

    # --- Club website lookup ---
    club_website = None
    try:
        result = search_club_website(payload.club_name)
        if result.get("success") and result.get("club_website"):
            club_website = result["club_website"]
    except Exception:
        pass

    return ResolveMetadataResponse(
        location_name=payload.location_name,
        coordinates=Coordinates(latitude=lat, longitude=lon)
        if lat is not None and lon is not None
        else None,
        osm_link=osm_link,
        club_name=payload.club_name,
        club_website=club_website,
    )
    


# ---------------------------------------------------------
# Upsert Dive
# ---------------------------------------------------------


@app.post("/dives/upsert")
async def upsert_dive(dive: Dive) -> Any:
    """
    Upsert dive into Convex.
    Automatically enriches:
    - coordinates
    - OSM link
    - club website (if not provided)
    """

    # Fill missing geolocation data
    if dive.latitude is None or dive.longitude is None:
        try:
            coords = await get_coordinates_async(dive.location)
            if coords:
                dive.longitude, dive.latitude = coords
        except Exception:
            pass

    # Always generate OSM link if coords found
    if dive.latitude and dive.longitude:
        lat, lon = dive.latitude, dive.longitude
        dive.osm_link = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}"

    # Fill missing club website
    if dive.club_website is None and dive.club_name:
        try:
            result = search_club_website(dive.club_name)
            if result.get("success") and result.get("club_website"):
                dive.club_website = result["club_website"]
        except Exception:
            pass

    payload = dive.model_dump(by_alias=True)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CONVEX_URL}/api/mutation",
            json={
                "path": "dives:upsertDive",
                "args": payload,
                "format": "json",
            },
        )
        resp.raise_for_status()
        result = resp.json()

    if "error" in result:
        return JSONResponse(
            status_code=400, content={"error": result["error"], "convex_error": True}
        )

    return result.get("value", result)
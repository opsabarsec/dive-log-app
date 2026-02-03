from typing import Optional, Any
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
import os
import uvicorn

# Service imports
from app.services.geolocation import get_coordinates_async
from app.services.search_club_website import search_club_website
from dotenv import load_dotenv

# Load .env file
env_path = ".env"
load_dotenv(env_path)


CONVEX_URL = os.environ["CONVEX_URL"]
print(CONVEX_URL)

app = FastAPI()


# ---------------------------
# Pydantic Models
# ---------------------------


class Dive(BaseModel):
    # Required fields
    user_id: str
    dive_number: int
    dive_date: int
    location: str
    duration: float
    max_depth: float
    club_name: str
    instructor_name: str
    photo_storage_id: str

    # Optional fields
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

    # Flags
    buddy_check: bool = Field(default=True, serialization_alias="Buddy_check")
    briefed: bool = Field(default=True, serialization_alias="Briefed")


class ResolveMetadataRequest(BaseModel):
    location_name: str
    club_name: str


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class ResolveMetadataResponse(BaseModel):
    location_name: str
    coordinates: Optional[Coordinates] = None
    osm_link: Optional[str] = None
    club_name: str
    club_website: Optional[str] = None


# ---------------------------
# Endpoints
# ---------------------------


@app.post("/resolve-dive-metadata", response_model=ResolveMetadataResponse)
async def resolve_dive_metadata(payload: ResolveMetadataRequest) -> ResolveMetadataResponse:
    """
    Combined endpoint:
      - Resolves geolocation (lat/lon + OSM link) from location_name
      - Resolves club website from club_name
    """

    # --- Geolocation ---
    lat = None
    lon = None
    osm_link = None

    try:
        coords = await get_coordinates_async(payload.location_name)
        if coords:
            lon, lat = coords
            osm_link = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}"
    except Exception:
        pass

    # --- Club website ---
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


@app.post("/dives/upsert")
async def upsert_dive(dive: Dive) -> Any:
    """
    Stores or updates a dive in Convex.
    Automatically enriches missing geolocation info and OSM link.
    """

    # Auto-fill coordinates if missing
    if dive.latitude is None or dive.longitude is None:
        try:
            coords = await get_coordinates_async(dive.location)
            if coords:
                dive.longitude, dive.latitude = coords
        except Exception:
            pass

    # Always generate OSM link if coordinates exist
    if dive.latitude is not None and dive.longitude is not None:
        lat, lon = dive.latitude, dive.longitude
        dive.osm_link = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}"

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

    # Convex errors
    if "error" in result:
        return JSONResponse(
            status_code=400,
            content={"error": result["error"], "convex_error": True},
        )

    return result.get("value", result)


@app.get("/dives/{dive_id}")
async def get_dive_by_id(dive_id: str) -> Any:
    """Retrieve a dive document by ID from Convex."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CONVEX_URL}/api/query",
            json={
                "path": "dives:getDiveById",
                "args": {"id": dive_id},
                "format": "json",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    if "error" in data:
        return JSONResponse(
            status_code=400,
            content={"error": data["error"], "convex_error": True},
        )

    result = data.get("value")
    if result is None:
        return JSONResponse(
            status_code=404,
            content={"error": f"Dive with id '{dive_id}' not found"},
        )

    return result


@app.get("/search-club")
def search_club(q: str = Query(..., description="Club name")) -> Any:
    """Search for a dive club website."""
    result = search_club_website(q)
    if result.get("success"):
        return result
    return JSONResponse(
        status_code=404 if "No results" in result.get("error", "") else 500,
        content=result,
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

from typing import Optional, Any
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
import os
import uvicorn

# Import services
from .services.geolocation import get_coordinates_async
from .services.search_club_website import search_club_website


app = FastAPI()

# Convex base URL (e.g., "https://friendly-finch-619.convex.cloud")
CONVEX_URL = os.environ["CONVEX_URL"]


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

    # Flags (using serialization_alias to match Convex PascalCase field names)
    buddy_check: bool = Field(default=True, serialization_alias="Buddy_check")
    briefed: bool = Field(default=True, serialization_alias="Briefed")


@app.post("/dives/upsert")
async def upsert_dive(dive: Dive) -> Any:
    """
    Upsert a dive record into Convex.
    - Automatically resolves coordinates using Nominatim if missing.
    - Always generates an OpenStreetMap visualization link when coordinates are present.
    """
    # --- Geolocation auto-fill ---
    try:
        if dive.latitude is None or dive.longitude is None:
            coords = await get_coordinates_async(dive.location)
            if coords:
                # coords are [lon, lat]
                dive.longitude, dive.latitude = coords
    except Exception:
        # If geolocation fails, proceed without blocking the upsert
        pass

    # --- OSM link from coordinates (if available) ---
    if dive.latitude is not None and dive.longitude is not None:
        lat = dive.latitude
        lon = dive.longitude
        dive.osm_link = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}"

    # Prepare payload for Convex (respects aliases e.g., Buddy_check / Briefed)
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

    # Handle Convex error responses
    if "error" in result:
        return JSONResponse(
            status_code=400, content={"error": result["error"], "convex_error": True}
        )

    return result.get("value", result)


@app.get("/dives/{dive_id}")
async def get_dive_by_id(dive_id: str) -> Any:
    """Get a single dive by its Convex document ID."""
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
        response_data = resp.json()

    # Handle Convex error responses
    if "error" in response_data:
        return JSONResponse(
            status_code=400,
            content={"error": response_data["error"], "convex_error": True},
        )

    result = response_data.get("value")
    if result is None:
        return JSONResponse(
            status_code=404, content={"error": f"Dive with id '{dive_id}' not found"}
        )

    return result


@app.get("/search-club")
def search_club(q: str = Query(..., description="Club name")) -> Any:
    """
    Simple helper endpoint to search a club website.
    """
    result = search_club_website(q)
    if result["success"]:
        return result
    return JSONResponse(status_code=404 if "No results" in result["error"] else 500, content=result)


if __name__ == "__main__":
    # Run the FastAPI app (development)
    uvicorn.run(app, host="0.0.0.0", port=8000)

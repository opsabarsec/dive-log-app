from typing import Optional, Any
from fastapi import FastAPI, Query, UploadFile, File, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
import os
import uvicorn

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
# Pydantic Models
# ---------------------------------------------------------


class Dive(BaseModel):
    user_id: str
    dive_number: int
    dive_date: int
    location: str
    duration: float
    max_depth: float
    club_name: str
    instructor_name: str
    photo_storage_id: str  # REQUIRED - now comes from `/upload-photo`

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


# ---------------------------------------------------------
# File upload: Upload a photo to Convex storage
# ---------------------------------------------------------

app = FastAPI()

CONVEX_URL = os.environ["CONVEX_URL"]  # e.g. https://my-app-123.convex.cloud
CONVEX_GENERATE_URL_FN = os.getenv("CONVEX_GENERATE_URL_FN", "files:generateUploadUrl")
CONVEX_AUTH_TOKEN = os.getenv("CONVEX_AUTH_TOKEN", "").strip()  # optional (Convex auth)


@app.post("/upload-photo", response_model=None)
async def upload_photo(file: UploadFile = File(...)) -> dict[str, str] | JSONResponse:
    allowed = {"image/png", "image/jpeg", "image/bmp"}
    if file.content_type not in allowed:
        return JSONResponse(
            status_code=400, content={"error": f"Unsupported file type: {file.content_type}"}
        )

    file_bytes = await file.read()

    # STEP 1
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Content-Type": "application/json"}
            if CONVEX_AUTH_TOKEN:
                headers["Authorization"] = f"Bearer {CONVEX_AUTH_TOKEN}"

            url_resp = await client.post(
                f"{CONVEX_URL}/api/run/files.js/generateUploadUrl",
                headers=headers,
                json={"args": {}, "format": "json"},
            )
            url_resp.raise_for_status()

            result = url_resp.json()
            signed_url = result.get("value")  # ✅ .value wrapper
            if not signed_url or not isinstance(signed_url, str):
                return JSONResponse(status_code=500, content={"error": f"Invalid URL: {result}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Mutation failed: {str(e)}"})

    # STEP 2
    try:
        async with httpx.AsyncClient() as client:
            upload_headers = {"Content-Type": file.content_type}
            upload_resp = await client.post(
                signed_url, headers=upload_headers, content=file_bytes
            )  # ✅ POST
            upload_resp.raise_for_status()

            result = upload_resp.json()
            storage_id = result.get("storageId")
            if not storage_id:
                return JSONResponse(
                    status_code=500, content={"error": "No storageId", "result": result}
                )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Upload failed: {str(e)}"})

    return {"photo_storage_id": storage_id}


# ---------------------------------------------------------
# Combined Metadata Resolver
# ---------------------------------------------------------


@app.get("/download-photo/{storage_id}", response_model=None)
async def download_photo(storage_id: str) -> Response | JSONResponse:
    """
    Download an image stored in Convex using its storage ID.

    Input:
        storage_id (str): The Convex storage ID returned by /upload-photo.

    Output:
        - Response with image bytes (content-type preserved)
        - JSONResponse with error details if the file cannot be retrieved
    """

    # Step 1: Request metadata from Convex
    try:
        async with httpx.AsyncClient() as client:
            meta_resp = await client.get(f"{CONVEX_URL}/api/storage/{storage_id}/metadata")
            meta_resp.raise_for_status()
            meta = meta_resp.json()
    except Exception:
        return JSONResponse(
            status_code=404,
            content={"error": f"Could not find metadata for storage ID '{storage_id}'"},
        )

    content_type = meta.get("contentType")
    size = meta.get("size")

    if not content_type:
        return JSONResponse(
            status_code=500, content={"error": "Convex metadata missing 'contentType'"}
        )

    # Step 2: Stream the file bytes from Convex
    try:
        async with httpx.AsyncClient() as client:
            file_resp = await client.get(f"{CONVEX_URL}/api/storage/{storage_id}")
            file_resp.raise_for_status()
            file_bytes = file_resp.content
    except Exception:
        return JSONResponse(
            status_code=500, content={"error": f"Failed to download file with ID '{storage_id}'"}
        )

    # Step 3: Return actual file bytes with correct MIME type
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={
            "Content-Length": str(size) if size is not None else str(len(file_bytes)),
            "Content-Disposition": f'inline; filename="{storage_id}"',
        },
    )


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


# ---------------------------------------------------------
# Get Dive by ID
# ---------------------------------------------------------


@app.get("/dives/{dive_id}")
async def get_dive_by_id(dive_id: str) -> Any:
    """Retrieve a dive from Convex."""
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
        return JSONResponse(status_code=400, content={"error": data["error"], "convex_error": True})

    result = data.get("value")
    if result is None:
        return JSONResponse(
            status_code=404, content={"error": f"Dive with id '{dive_id}' not found"}
        )

    return result


# ---------------------------------------------------------
# Search Club Endpoint
# ---------------------------------------------------------


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
# Run
# ---------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

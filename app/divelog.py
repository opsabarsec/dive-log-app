from typing import Optional, Any, Union
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Response, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
import httpx
import os
import json
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


class DiveInput(BaseModel):
    """Dive data for combined upload endpoint (photo_storage_id auto-filled)."""

    user_id: str
    dive_number: int
    dive_date: Union[int, str]  # Accepts epoch (int) or "YYYY-MM-DD" string
    location: str
    duration: float
    max_depth: float
    club_name: str
    instructor_name: str
    mode: str = "scubadiving"

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    osm_link: Optional[str] = None
    site: Optional[str] = None
    water_temperature: Optional[float] = None
    suit_thickness: Optional[float] = None
    lead_weights: Optional[float] = None
    club_website: Optional[str] = None
    notes: Optional[str] = None

    buddy_check: bool = Field(default=True, serialization_alias="Buddy_check")
    briefed: bool = Field(default=True, serialization_alias="Briefed")

    @field_validator("dive_date", mode="before")
    @classmethod
    def parse_dive_date(cls, v: Union[int, str]) -> int:
        """Convert 'YYYY-MM-DD' string to epoch timestamp, or pass through int."""
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            try:
                dt = datetime.strptime(v, "%Y-%m-%d")
                return int(dt.timestamp())
            except ValueError:
                raise ValueError(f"Invalid date format: {v}. Use 'YYYY-MM-DD' or epoch timestamp.")
        raise ValueError(f"dive_date must be int or string, got {type(v)}")

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        if v not in ["scubadiving", "freediving"]:
            raise ValueError(f"mode must be 'scubadiving' or 'freediving', got {v}")
        return v


class Dive(DiveInput):
    """Full dive model including photo_storage_id."""

    photo_storage_id: str


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


# ---------------------------------------------------------
# Resolve Dive Metadata
# ---------------------------------------------------------


@app.post("/resolve-dive-metadata", response_model=ResolveMetadataResponse)
async def resolve_dive_metadata(payload: ResolveMetadataRequest) -> ResolveMetadataResponse:
    """
    Resolve metadata for a dive before submission.

    - Coordinates + OSM link from location_name
    - Club website from club_name

    Use this endpoint to preview resolved data in the frontend
    before submitting via /dives/upsert-with-photo.
    """
    lat, lon = None, None
    osm_link = None

    try:
        coords = await get_coordinates_async(payload.location_name)
        if coords:
            lon, lat = coords
            osm_link = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}"
    except Exception:
        pass

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
# Upsert dive data and photo
# ---------------------------------------------------------


@app.post("/dives/upsert-with-photo", response_model=None)
async def upsert_dive_with_photo(
    file: UploadFile = File(..., description="Dive photo (JPEG, PNG, BMP)"),
    dive_data: str = Form(..., description="Dive data as JSON string"),
) -> dict[str, Any] | JSONResponse:
    """
    Combined endpoint: upload photo and upsert dive data in one request.

    - Accepts multipart form with photo file and dive JSON
    - Uploads photo to Convex storage
    - Auto-enriches coordinates, OSM link, and club website
    - Upserts dive with linked photo_storage_id

    Example curl:
        curl -X POST /dives/upsert-with-photo \
            -F "file=@dive.jpg" \
            -F 'dive_data={"user_id":"u1","dive_number":1,...}'
    """
    # 1. Validate file type
    allowed = {"image/png", "image/jpeg", "image/bmp"}
    if file.content_type not in allowed:
        return JSONResponse(
            status_code=400, content={"error": f"Unsupported file type: {file.content_type}"}
        )

    # 2. Parse dive data JSON
    try:
        dive_dict = json.loads(dive_data)
        dive_input = DiveInput(**dive_dict)
    except json.JSONDecodeError as e:
        return JSONResponse(status_code=400, content={"error": f"Invalid JSON: {str(e)}"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Invalid dive data: {str(e)}"})

    # 3. Upload photo to Convex storage
    file_bytes = await file.read()

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
            signed_url = url_resp.json().get("value")
            if not signed_url:
                return JSONResponse(status_code=500, content={"error": "Failed to get upload URL"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Upload URL failed: {str(e)}"})

    try:
        async with httpx.AsyncClient() as client:
            upload_resp = await client.post(
                signed_url,
                headers={"Content-Type": file.content_type},
                content=file_bytes,
            )
            upload_resp.raise_for_status()
            storage_id = upload_resp.json().get("storageId")
            if not storage_id:
                return JSONResponse(status_code=500, content={"error": "No storageId returned"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Photo upload failed: {str(e)}"})

    # 4. Create full Dive with photo_storage_id
    dive = Dive(**dive_input.model_dump(), photo_storage_id=storage_id)

    # 5. Enrich with geolocation
    if dive.latitude is None or dive.longitude is None:
        try:
            coords = await get_coordinates_async(dive.location)
            if coords:
                dive.longitude, dive.latitude = coords
        except Exception:
            pass

    if dive.latitude and dive.longitude:
        dive.osm_link = f"https://www.openstreetmap.org/?mlat={dive.latitude}&mlon={dive.longitude}#map=16/{dive.latitude}/{dive.longitude}"

    # 6. Enrich with club website
    if dive.club_website is None and dive.club_name:
        try:
            result = search_club_website(dive.club_name)
            if result.get("success") and result.get("url"):
                dive.club_website = result["url"]
        except Exception:
            pass

    # 7. Upsert to Convex
    payload = dive.model_dump(by_alias=True, exclude_none=True)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CONVEX_URL}/api/mutation",
            json={"path": "dives:upsertDive", "args": payload, "format": "json"},
        )
        resp.raise_for_status()
        result = resp.json()

    # Check for Convex errors in multiple formats
    if "error" in result:
        return JSONResponse(
            status_code=400, content={"error": result["error"], "convex_error": True}
        )

    if result.get("status") == "error":
        return JSONResponse(
            status_code=400,
            content={
                "error": result.get("errorMessage", "Unknown Convex error"),
                "convex_error": True,
            },
        )

    # Extract the actual mutation result from Convex response
    dive_result = result.get("value", result)

    # Ensure the result has an id field
    if not isinstance(dive_result, dict) or "id" not in dive_result:
        return JSONResponse(
            status_code=500,
            content={"error": f"Invalid response from Convex: {dive_result}", "convex_error": True},
        )

    return {
        "photo_storage_id": storage_id,
        "dive": dive_result,
    }


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
# Run
# ---------------------------------------------------------


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

![Dive Log App Hero Image](./assets/hero-dive.jpg)

Dive log app. Get your own free and Open Source dive logger without having to buy again a paper booklet.

# 🐬 DiveLog Backend

A FastAPI backend for managing scuba dive logs, powered by Convex as the database, with built‑in geolocation, club website lookup, and automated metadata enrichment.

This backend is designed to support a modern dive‑logging application where the user can enter intuitive, human‑friendly information (e.g., **“Lady Elliot Island”**, **“Portofino Divers”**) and the server automatically resolves:

*   🌍 Geographic coordinates via **Nominatim (OpenStreetMap)**
*   🗺️ OpenStreetMap visualization links
*   🏢 Dive club website using a custom scraper service
*   🗃️ Stable storage in **Convex** via typed schemas and mutations

***

## ✨ Features

### ✅ **Dive Upsert API**

Create or update a dive entry using `/dives/upsert`.  
The backend will automatically:

*   Geocode the location (if missing latitude/longitude)
*   Generate an OpenStreetMap link (`osm_link`)
*   Validate all required dive metadata
*   Store the dive record in your Convex deployment

### 🌍 **Geolocation Service**

Located in `app/services/geolocation.py`, featuring:

*   Nominatim search for coordinates
*   1 request/second rate limiting
*   24h in-memory caching
*   Automatic OSM link builder
*   Helpful User-Agent and optional email per Nominatim policy

### 🔍 **Dive Club Website Search**

The endpoint `/search-club` searches the internet for the official website of a dive club.

### 📷 **Photo Upload & Storage**

Upload dive photos as proof of your dive—a digital replacement for the traditional stamp in paper logbooks. Photos are stored in Convex's built-in file storage and linked to dive records.

*   **POST `/upload-photo`** — Upload an image (JPEG, PNG, BMP) and receive a `photo_storage_id`
*   **GET `/download-photo/{storage_id}`** — Retrieve a stored photo by its storage ID
*   The `photo_storage_id` is a **required field** when creating/updating dives via `/dives/upsert`

**Workflow:**
1.  Upload a photo via `/upload-photo`
2.  Receive the `photo_storage_id` in the response
3.  Include this ID when submitting the dive record

### 🔗 **Combined Metadata Resolver**

The endpoint `/resolve-dive-metadata` takes:

```json
{
  "location_name": "Portofino, Italy",
  "club_name": "Portofino Divers"
}
```

and returns:

*   Latitude & longitude
*   OpenStreetMap link
*   Club website
*   Cleaned metadata

Perfect for auto‑filling frontend die log forms.

***

## 🏗️ Project Structure

    app/
     ├── __init__.py
     ├── main.py                       # FastAPI app & endpoints (incl. photo upload/download)
     └── services/
           ├── geolocation.py          # async geocoder + caching + OSM link builder
           └── search_club_website.py  # dive club website scraper
    convex/
     ├── schema.ts                     # Convex schema (dives table with photo_storage_id)
     ├── dives.ts                      # Convex mutations & queries
     └── files.ts                      # Convex file storage (generateUploadUrl mutation)
    tests/
     ├── __init__.py
     ├── convex_storage_inspector.py   # utility to inspect/download stored files
     ├── convex_test.py
     ├── test_dive_upsert.py
     ├── test_resolve_dive_metadata.py
     └── test_upload_photo.py          # photo upload integration tests

***

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<repo>.git
cd <repo>
```

### 2. Create a virtual environment

```bash
uv venv
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
```

### 3. Install dependencies

```bash
uv pip install -r requirements.txt
```

***

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
CONVEX_URL=https://<your-convex-deployment>.convex.cloud
MY_EMAIL=you@example.com
```

*   `MY_EMAIL` is used for Nominatim User‑Agent compliance
*   `CONVEX_URL` points to your Convex instance

***

## ▶️ Running the Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 🧪 Testing

Run all tests:

```bash
uv run pytest -v
```

Run integration tests with real Convex:

```bash
CONVEX_URL=https://friendly-finch-619.convex.cloud uv run pytest -k real_convex -v -s
```

***

## 📡 API Endpoints Overview

### **POST /upload-photo**

Upload a dive photo (JPEG, PNG, BMP). Returns `{ "photo_storage_id": "..." }`.

### **GET /download-photo/{storage_id}**

Download a stored photo by its Convex storage ID.

### **POST /resolve-dive-metadata**

Returns coordinates, OSM link, and website for a given location & club.

### **POST /dives/upsert**

Creates or updates a dive record in Convex. Requires `photo_storage_id` from `/upload-photo`.

### **GET /dives/{id}**

Retrieves a stored dive (includes photo_storage_id for fetching the photo).

### **GET /search-club?q=Club Name**

Returns the official dive club website, if found.

***

## 🗺️ How Geolocation Works

Your backend uses:

*   `aiohttp` for async HTTP requests
*   Rate limiter to avoid Nominatim blocking
*   In-memory TTL cache
*   Cleaned user input (`location_name`)
*   Automatic OSM link generation

Example link:

    https://www.openstreetmap.org/?mlat=44.303&mlon=9.209#map=16/44.303/9.209

***

## 🏛️ Convex Integration

Dive schema includes:

*   Required dive metadata
*   Optional attributes (notes, site, temperature, etc.)
*   Auto-updated fields: `logged_at`, `updated_at`
*   `osm_link` for map visualization
*   `photo_storage_id` (required) — links to Convex file storage

**File Storage:**
*   Photos are stored in Convex's built-in file storage
*   `files.ts` exposes a `generateUploadUrl` mutation for secure uploads
*   Storage IDs are stable references to uploaded files

Convex table is typed and indexed via `schema.ts` and `dives.ts`.

Deploy updated schema:

```bash
npx convex deploy
```

***

## 🤖 Combined Metadata Workflow

The frontend can now:

1.  Call `/resolve-dive-metadata` with location & club name
2.  Pre-fill the dive form with returned metadata
3.  Submit the completed dive via `/dives/upsert`

Smooth user experience + clean backend = 💙

***

## 📦 Roadmap

*   🌐 Add Redis-backed geolocation cache
*   🧭 Add bounding box or multi-match geolocation
*   📍 Full dive-site database integration
*   🔐 API keys & auth layer
*   🗺️ Built-in static map previews
*   📊 Analytics on dive locations

***

## Contributing

Contributions are welcome! Please follow the standard GitHub flow:

1.  Fork the repository
2.  Create a feature branch
3.  Commit your changes
4.  Push to the branch
5.  Create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open a GitHub issue or contact the maintainer.

## Author

Marco Berta - <https://github.com/opsabarsec>

***

**Stay safe and happy diving!** 🐠🌊🌍
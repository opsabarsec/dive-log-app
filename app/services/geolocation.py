# app/services/geolocation.py

import os
import aiohttp
import warnings
from typing import Optional, List


def _build_user_agent(app_name: str = "DiveLog", app_version: str = "1.0") -> str:
    email = os.getenv("MY_EMAIL")
    if not email:
        warnings.warn("MY_EMAIL not set — using fallback User-Agent.")
        contact = "unspecified"
    else:
        contact = email
    return f"{app_name}/{app_version} (contact: {contact})"


async def get_coordinates_async(location_name: str) -> Optional[List[float]]:
    headers = {"User-Agent": _build_user_agent()}

    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": location_name, "format": "json", "limit": 1}

    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.get(url, params=params) as resp:
            resp.raise_for_status()
            data = await resp.json()

    if not data:
        return None

    try:
        lon = float(data[0]["lon"])
        lat = float(data[0]["lat"])
        return [lon, lat]
    except Exception as error:
        print(f"An error occurred: {error}")
        return None


async def get_osm_link_async(location_name: str, zoom: int = 16) -> Optional[str]:
    coords = await get_coordinates_async(location_name)
    if not coords:
        return None

    lon, lat = coords
    return f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map={zoom}/{lat}/{lon}"

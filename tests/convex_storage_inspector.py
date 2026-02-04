# tests/convex_storage_inspector.py

import os
import asyncio
from typing import Any, Dict, List, Optional
import httpx


CONVEX_URL: Optional[str] = os.getenv("CONVEX_URL")
if not CONVEX_URL:
    raise RuntimeError("CONVEX_URL environment variable is not set.")


# ---------------------------------------------------------------
# 1) Query Convex for documents containing storage IDs
# ---------------------------------------------------------------
async def fetch_storage_ids(query_path: str, args: Dict[str, Any]) -> List[str]:
    """
    Call a Convex query function and extract storage IDs from returned documents.

    Returns:
        List[str]: A list of found storage ID strings.
    """
    url: str = f"{CONVEX_URL}/api/query"

    async with httpx.AsyncClient() as client:
        resp: httpx.Response = await client.post(
            url, json={"path": query_path, "args": args, "format": "json"}
        )
        resp.raise_for_status()
        data: Dict[str, Any] = resp.json()

    if "value" not in data:
        return []

    docs: Any = data["value"]
    ids: set[str] = set()

    for d in docs:
        if isinstance(d, dict):
            if "photo_storage_id" in d:
                ids.add(d["photo_storage_id"])
            if "storageId" in d:
                ids.add(d["storageId"])

    return list(ids)


# ---------------------------------------------------------------
# 2) Fetch metadata for a given storageId
# ---------------------------------------------------------------
async def fetch_metadata(storage_id: str) -> Dict[str, Any]:
    """
    Fetch metadata for a given storage ID from Convex.

    Returns:
        Dict[str, Any]: Metadata including contentType, size, etc.
    """
    url: str = f"{CONVEX_URL}/api/storage/{storage_id}/metadata"

    async with httpx.AsyncClient() as client:
        resp: httpx.Response = await client.get(url)
        resp.raise_for_status()
        meta: Dict[str, Any] = resp.json()

    return meta


# ---------------------------------------------------------------
# 3) Download file bytes for a given storageId
# ---------------------------------------------------------------
async def download_file(storage_id: str, save_to: Optional[str] = None) -> bytes:
    """
    Download file bytes for a Convex storage ID.

    Returns:
        bytes: The downloaded file.
    """
    url: str = f"{CONVEX_URL}/api/storage/{storage_id}"

    async with httpx.AsyncClient() as client:
        resp: httpx.Response = await client.get(url)
        resp.raise_for_status()
        data: bytes = resp.content

    if save_to:
        with open(save_to, "wb") as f:
            f.write(data)

    return data


# ---------------------------------------------------------------
# 4) Small helper used in your tests
# ---------------------------------------------------------------
async def get_one_storage_id() -> str:
    """
    Convenience wrapper that returns the first available storageId in the database,
    or an empty string if none are found.
    """
    ids: List[str] = await fetch_storage_ids("dives:listDives", {})
    return ids[0] if ids else ""


# ---------------------------------------------------------------
# MAIN ENTRYPOINT
# ---------------------------------------------------------------
async def main() -> None:
    """
    CLI entrypoint for manually inspecting stored files in Convex.
    """
    print(f"Using CONVEX_URL: {CONVEX_URL}")

    storage_ids: List[str] = await fetch_storage_ids("dives:listDives", {})

    if not storage_ids:
        print("No storage IDs found.")
        return

    print("\nFound storage IDs:")
    for sid in storage_ids:
        print("  •", sid)

    print("\nMetadata:")
    for sid in storage_ids:
        try:
            meta: Dict[str, Any] = await fetch_metadata(sid)
            print(f"  {sid}: {meta}")
        except Exception as e:
            print(f"  Failed to fetch metadata for {sid}: {e}")

    print("\nDownloading...")
    os.makedirs("downloaded_convex_files", exist_ok=True)

    for sid in storage_ids:
        out_path: str = f"downloaded_convex_files/{sid}"
        try:
            await download_file(sid, save_to=out_path)
            print(f"  Saved → {out_path}")
        except Exception as e:
            print(f"  Download failed for {sid}: {e}")

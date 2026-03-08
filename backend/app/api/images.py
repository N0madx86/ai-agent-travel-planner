import logging
import asyncio
from fastapi import APIRouter, Query
from typing import List
from app.services.image_scraper import get_place_images, get_place_image, FALLBACK_IMAGES

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/place")
async def get_image_for_place(
    q:           str = Query(..., description="Place or keyword to search for"),
    destination: str = Query("",  description="Optional destination context"),
):
    """Returns a single image URL for a given place (compat endpoint)."""
    url = await get_place_image(q, destination_hint=destination)
    return {"url": url, "query": q}


@router.get("/destination")
async def get_destination_images(
    q:     str = Query(..., description="Destination name e.g. 'Bali, Indonesia'"),
    count: int = Query(6,  ge=1, le=10, description="Number of images to return"),
):
    """
    Returns multiple image URLs for a destination.
    Used by the Snapshots gallery card on the trip detail page.
    Fetches a variety of images using enriched sub-queries.
    """
    # Use varied sub-queries to get diverse images
    sub_queries = [
        q,
        f"{q} landmark",
        f"{q} beach",
        f"{q} street food",
        f"{q} nature",
        f"{q} culture",
    ]

    # Fetch images in parallel
    tasks = [get_place_images(sub, destination_hint=q, count=2) for sub in sub_queries[:count]]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_urls: List[str] = []
    seen: set = set()

    for urls in results:
        if isinstance(urls, Exception):
            logger.error(f"Image fetch task failed: {urls}")
            continue
        for url in urls:
            if url not in seen and len(all_urls) < count:
                seen.add(url)
                all_urls.append(url)

    # Padding with varied fallbacks if still too few
    # (prevents Snapshot Card from being invisible by ensuring images.length > 0)
    if len(all_urls) < 3:
        for fb in FALLBACK_IMAGES:
            if fb not in seen and len(all_urls) < 6:
                seen.add(fb)
                all_urls.append(fb)

    return {"images": all_urls, "destination": q, "count": len(all_urls)}

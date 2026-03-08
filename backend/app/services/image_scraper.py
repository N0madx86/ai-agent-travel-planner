from app.core.config import settings
import requests
import logging
import asyncio
import random
from typing import Optional, List

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
UNSPLASH_ACCESS_KEY = settings.UNSPLASH_ACCESS_KEY
UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos"

# In-memory cache
_image_cache: dict[str, List[str]] = {}

FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80",
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80",
    "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80",
    "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&q=80",
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
    "https://images.unsplash.com/photo-1516483601948-9bda060ef8e5?w=800&q=80",
]

HEADERS = {
    "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}",
    "Accept-Version": "v1",
}

# Different query angles for the same place — rotated to avoid cached defaults
QUERY_VARIANTS = [
    "{place} landmark",
    "{place} cityscape",
    "{place} scenery",
    "{place} tourism",
    "{place} architecture",
    "{place} street",
    "{place} nature",
    "{place} aerial view",
]


# ── Core fetch (Sync wrapper) ────────────────────────────────────────────────
def _fetch_unsplash_images_raw(
    query: str,
    max_images: int = 5,
    page: int = 1,
    orientation: str = "landscape",
    order_by: str = "relevant",
) -> list[dict]:
    """Fetch images from Unsplash for a given query string."""
    params = {
        "query": query,
        "per_page": max_images,
        "page": page,
        "orientation": orientation,
        "order_by": order_by,
        "content_filter": "high",
    }

    try:
        response = requests.get(
            UNSPLASH_SEARCH_URL,
            headers=HEADERS,
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        images = []
        for photo in data.get("results", []):
            images.append({
                "url": photo["urls"]["regular"],
                "thumb": photo["urls"]["small"],
                "full": photo["urls"]["full"],
                "alt": photo.get("alt_description") or query,
                "photographer": photo["user"]["name"],
                "photographer_url": photo["user"]["links"]["html"],
                "source_link": photo["links"]["html"],
                "blur_hash": photo.get("blur_hash"),
                "location": photo.get("location", {}).get("name", ""),
                "photo_id": photo["id"],
            })

        return images

    except Exception as e:
        logger.error(f"[Unsplash API] Error: {e}")
    return []


# ── Internal Logic (Sync) ────────────────────────────────────────────────────
def _get_varied_location_images_sync(
    location: str,
    max_images: int = 5,
    seed: Optional[int] = None,
) -> list[str]:
    """Sync implementation of specialized randomized fetching logic."""
    rng = random.Random(seed)

    # Pick 3 random query variants
    variants = rng.sample(QUERY_VARIANTS, k=min(3, len(QUERY_VARIANTS)))
    queries = [v.replace("{place}", location) for v in variants]

    all_images = []
    seen_ids = set()

    for query in queries:
        if len(all_images) >= max_images:
            break

        # Randomize page (1–3)
        page = rng.randint(1, 3)
        imgs = _fetch_unsplash_images_raw(query, max_images=max_images, page=page)

        for img in imgs:
            if img["photo_id"] not in seen_ids:
                seen_ids.add(img["photo_id"])
                all_images.append(img)

        # Retry page 1 if needed
        if not imgs and page > 1:
            imgs = _fetch_unsplash_images_raw(query, max_images=max_images, page=1)
            for img in imgs:
                if img["photo_id"] not in seen_ids:
                    seen_ids.add(img["photo_id"])
                    all_images.append(img)

    rng.shuffle(all_images)
    # Extract only URLs for compatibility with current app flow
    return [img["url"] for img in all_images[:max_images]]


# ── Async Entry Points (Used by app) ──────────────────────────────────────────
async def get_place_images(query: str, destination_hint: str = "", count: int = 4) -> List[str]:
    """
    Main entry point. Fetches fresh, varied images for a location.
    """
    if not query or not query.strip():
        return FALLBACK_IMAGES[:count]

    # Note: We use a more dynamic cache key or skip cache for 'freshness'
    # But for performance, we'll keep a simpler cache key.
    cache_key = f"unsplash_varied_v1|{query.strip().lower()}|{destination_hint.strip().lower()}|{count}"
    if cache_key in _image_cache:
        return _image_cache[cache_key]

    location = f"{query}, {destination_hint}".strip(", ")
    
    loop = asyncio.get_event_loop()
    # No seed by default for max variety on every call
    urls = await loop.run_in_executor(None, _get_varied_location_images_sync, location, count)

    if not urls:
        urls = FALLBACK_IMAGES[:count]

    _image_cache[cache_key] = urls
    return urls


async def get_place_image(query: str, destination_hint: str = "") -> str:
    """Compat: return a single image URL."""
    results = await get_place_images(query, destination_hint, count=1)
    return results[0] if results else FALLBACK_IMAGES[0]

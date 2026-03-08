import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.getcwd())

from app.services.image_scraper import get_place_images
from typing import List

async def test_logic():
    q = "Bali"
    count = 6
    sub_queries = [
        q,
        f"{q} landmark",
        f"{q} beach",
        f"{q} street food",
        f"{q} nature",
        f"{q} culture",
    ]

    all_urls: List[str] = []
    seen: set = set()

    for sub in sub_queries[:count]:
        print(f"Searching for: {sub}")
        urls = await get_place_images(sub, destination_hint=q, count=2)
        print(f"Found {len(urls)} urls for {sub}")
        for url in urls:
            if url not in seen and len(all_urls) < count:
                seen.add(url)
                all_urls.append(url)
        if len(all_urls) >= count:
            break
    
    print(f"Final results: {len(all_urls)}")
    for url in all_urls:
        print(f" - {url}")

if __name__ == "__main__":
    asyncio.run(test_logic())

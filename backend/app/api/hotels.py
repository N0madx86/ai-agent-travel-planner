from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
from datetime import date
import asyncio
import json
import logging

from app.models.hotel import Hotel
from app.core.database import get_session
from app.services.hotel_scraper import scraper
from app.services.ai_service import ai_service

router = APIRouter()
logger = logging.getLogger(__name__)

class HotelSearchRequest(BaseModel):
    destination: str
    checkin: date
    checkout: date
    budget: str = "Mid-range"  # Add budget for Deep Search
    max_results: int = 5      # AI returns strictly 5

    max_pages: int = 3        # Number of Booking.com pages to scrape


@router.get("/search/status")
async def search_status():
    """Lightweight endpoint polled by frontend to keep connection alive during scraping"""
    return {"status": "ok"}

@router.get("/search/stream")
async def search_stream():
    """
    SSE endpoint — streams search log updates to the frontend.
    The frontend opens this as an EventSource before submitting the search.
    """
    async def event_generator():
        last_index = 0
        # Poll for up to 10 minutes (600 s) max
        for _ in range(600):
            await asyncio.sleep(1)
            logs_file = scraper.search_logs_file
            if not logs_file.exists():
                continue
            try:
                with open(logs_file, 'r', encoding='utf-8') as f:
                    logs = json.load(f)
            except Exception:
                continue

            # Push any new log entries
            new_entries = logs[last_index:]
            for entry in new_entries:
                yield f"data: {json.dumps(entry)}\n\n"
            last_index = len(logs)

            # Check for completion
            if logs:
                last_msg = logs[-1].get("message", "")
                if "Deep Search complete" in last_msg or "Deep Search failed" in last_msg or "Cache hit" in last_msg:
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    return

        # Fallback timeout
        yield f"data: {json.dumps({'done': True, 'timeout': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

@router.post("/search")
async def search_hotels(request: HotelSearchRequest, session: AsyncSession = Depends(get_session)):
    """Deep Search for hotels with AI curation"""
    try:
        # 1. Scrape multiple pages (or serve from cache)
        logger.info(f"Starting Deep Search for {request.destination}, budget: {request.budget}")
        scraped_hotels = await scraper.search_hotels(
            destination=request.destination,
            checkin=request.checkin.isoformat(),
            checkout=request.checkout.isoformat(),
            budget=request.budget,
            max_pages=request.max_pages
        )

        if not scraped_hotels:
            scraper._add_log("Deep Search failed: No hotels found. The site may be blocking automated access.")
            raise HTTPException(
                status_code=503,
                detail="Hotel search is temporarily unavailable. Booking.com may be blocking our request. Please try again in a few minutes."
            )
        
        # 2. Add AI analysis log
        scraper._add_log("Analyzing results with AI...")
        
        # 3. Curate hotels using AI
        hotels_data = await ai_service.curate_hotels(
            budget=request.budget,
            hotels_file_path=str(scraper.current_search_file),
            checkin_date=request.checkin.isoformat(),
            checkout_date=request.checkout.isoformat()
        )

        
        # 4. Clean up temporary JSON
        scraper.clear_current_search()
        
        if not hotels_data:
            scraper._add_log("AI analysis returned no hotels — returning empty list.")
            logger.warning("curate_hotels returned empty list")
            return []

        scraper._add_log(f"Deep Search complete. Selected {len(hotels_data)} best hotels.")
        logger.info(f"Saving {len(hotels_data)} hotels to DB...")

        # 5. Save curated hotels to database and return
        hotels = []
        for hotel_data in hotels_data:
            hotel = Hotel(**hotel_data)
            session.add(hotel)
            hotels.append(hotel)

        await session.commit()
        logger.info("DB commit successful")

        for hotel in hotels:
            await session.refresh(hotel)

        logger.info(f"Returning {len(hotels)} hotels to frontend")
        return hotels
        
    except Exception as e:
        await session.rollback()
        scraper._add_log(f"Deep Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching hotels: {str(e)}")

@router.get("/", response_model=List[Hotel])
async def get_all_hotels(session: AsyncSession = Depends(get_session)):
    """Get all hotels from database"""
    from sqlmodel import select
    result = await session.execute(select(Hotel))
    return result.scalars().all()

@router.delete("/cache")
async def clear_cache():
    """Clear hotel search logs and destination cache"""
    import shutil
    from pathlib import Path
    from app.core.config import settings
    
    search_dir = Path(settings.CACHE_DIR) / "search"
    hotel_cache_dir = Path(settings.CACHE_DIR) / "hotels"

    for d in [search_dir, hotel_cache_dir]:
        if d.exists():
            shutil.rmtree(d)
            d.mkdir(parents=True)
    
    return {"message": "Hotel search cache cleared successfully"}

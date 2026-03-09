from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
from datetime import date
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
    max_results: int = 5      # AI returns top 5
    max_pages: int = 2        # Number of Booking.com pages to scrape (keep low on free tier)

@router.post("/search")
async def search_hotels(request: HotelSearchRequest, session: AsyncSession = Depends(get_session)):
    """Deep Search for hotels with AI curation"""
    try:
        # 1. Scrape multiple pages (creates current_search.json)
        logger.info(f"Starting Deep Search for {request.destination}, budget: {request.budget}")
        scraped_hotels = await scraper.search_hotels(
            destination=request.destination,
            checkin=request.checkin.isoformat(),
            checkout=request.checkout.isoformat(),
            max_pages=request.max_pages
        )

        # If scraping returned nothing (blocked or no results), fail gracefully
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
            checkout_date=request.checkout.isoformat(),
            max_results=request.max_results
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

        # Refresh all hotels to get their IDs
        for hotel in hotels:
            await session.refresh(hotel)

        logger.info(f"Returning {len(hotels)} hotels to frontend")
        return hotels
        
    except Exception as e:
        await session.rollback()
        scraper._add_log(f"Deep Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching hotels: {str(e)}")

@router.get("/search/status")
async def search_status():
    """Get the current progress of the hotel deep search"""
    logs_file = scraper.search_logs_file
    if not logs_file.exists():
         return {"logs": [], "is_complete": False}
        
    try:
        with open(logs_file, 'r', encoding='utf-8') as f:
            logs = json.load(f)
            
        # Determine if search is fully complete
        is_complete = False
        if logs:
            last_message = logs[-1].get("message", "")
            if "Deep Search complete" in last_message or "Deep Search failed" in last_message:
                is_complete = True
                
        return {"logs": logs, "is_complete": is_complete}
    except Exception:
         return {"logs": [], "is_complete": False}

@router.get("/", response_model=List[Hotel])
async def get_all_hotels(session: AsyncSession = Depends(get_session)):
    """Get all hotels from database"""
    from sqlmodel import select
    result = await session.execute(select(Hotel))
    return result.scalars().all()

@router.delete("/cache")
async def clear_cache():
    """Clear hotel search logs container"""
    import shutil
    from pathlib import Path
    from app.core.config import settings
    
    search_dir = Path(settings.CACHE_DIR) / "search"
    if search_dir.exists():
        shutil.rmtree(search_dir)
        search_dir.mkdir(parents=True)
    
    return {"message": "Hotel search cache cleared successfully"}

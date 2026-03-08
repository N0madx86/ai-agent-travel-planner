from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.trip import Trip
from app.models.itinerary import Itinerary
from app.core.database import get_session
from app.services.ai_service import ai_service

router = APIRouter()

@router.post("/generate/{trip_id}", response_model=Itinerary)
async def generate_itinerary(trip_id: int, session: AsyncSession = Depends(get_session)):
    """Generate AI itinerary for a trip"""
    trip = await session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Check if itinerary already exists
    result = await session.execute(
        select(Itinerary).where(Itinerary.trip_id == trip_id)
    )
    existing = result.scalars().first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Itinerary already exists for this trip. Delete it first to regenerate."
        )
    
    # Generate content
    content = await ai_service.generate_itinerary(trip)
    
    # Save itinerary
    itinerary = Itinerary(trip_id=trip.id, content=content)
    session.add(itinerary)
    await session.commit()
    await session.refresh(itinerary)
    
    return itinerary

@router.get("/{trip_id}", response_model=Itinerary)
async def get_itinerary(trip_id: int, session: AsyncSession = Depends(get_session)):
    """Get itinerary for a trip"""
    result = await session.execute(
        select(Itinerary).where(Itinerary.trip_id == trip_id)
    )
    itinerary = result.scalars().first()
    
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    
    return itinerary

@router.delete("/{trip_id}")
async def delete_itinerary(trip_id: int, session: AsyncSession = Depends(get_session)):
    """Delete itinerary for a trip"""
    result = await session.execute(
        select(Itinerary).where(Itinerary.trip_id == trip_id)
    )
    itinerary = result.scalars().first()
    
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    
    await session.delete(itinerary)
    await session.commit()
    return {"message": "Itinerary deleted successfully"}

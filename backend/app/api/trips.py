from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List, Optional
from app.models.trip import Trip, TripCreate
from app.core.database import get_session

router = APIRouter()

@router.post("/", response_model=Trip)
async def create_trip(trip_in: TripCreate, session: AsyncSession = Depends(get_session)):
    """Create a new trip"""
    trip = Trip.model_validate(trip_in)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


@router.get("/", response_model=List[Trip])
async def get_trips(session_id: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    """Get trips - filtered by session_id if provided"""
    query = select(Trip)
    if session_id:
        query = query.where(Trip.session_id == session_id)
    result = await session.execute(query)
    return result.scalars().all()

@router.get("/{trip_id}", response_model=Trip)
async def get_trip(trip_id: int, session: AsyncSession = Depends(get_session)):
    """Get a specific trip"""
    trip = await session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@router.put("/{trip_id}", response_model=Trip)
async def update_trip(trip_id: int, trip_update: TripCreate, session: AsyncSession = Depends(get_session)):
    """Update a trip"""
    trip = await session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Update fields from the validated request model
    update_data = trip_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(trip, key, value)
    
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


@router.delete("/{trip_id}")
async def delete_trip(trip_id: int, session: AsyncSession = Depends(get_session)):
    """Delete a trip"""
    trip = await session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    await session.delete(trip)
    await session.commit()
    return {"message": "Trip deleted successfully"}

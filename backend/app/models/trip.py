from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field


class TripBase(SQLModel):
    """Base Trip model with shared fields"""
    destination: str
    start_date: date
    end_date: date
    budget: str  # "Budget", "Mid-range", "Luxury"
    interests: str  # Comma-separated
    travelers: int = 1
    session_id: Optional[str] = None  # Browser session identifier for user isolation

class TripCreate(TripBase):
    """Model for creating a new trip (request body)"""
    pass

class Trip(TripBase, table=True):
    """Trip model for storing in database"""
    __tablename__ = "trips"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


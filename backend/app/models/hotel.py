from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Hotel(SQLModel, table=True):
    """Hotel model for storing scraped hotel data"""
    __tablename__ = "hotels"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    location: str
    price_per_night: float
    currency: str = "INR"
    rating: Optional[float] = None
    image_url: Optional[str] = None
    booking_url: Optional[str] = None
    source: str = "booking.com"
    created_at: datetime = Field(default_factory=datetime.utcnow)

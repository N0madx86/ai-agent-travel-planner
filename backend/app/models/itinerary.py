from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Itinerary(SQLModel, table=True):
    """Itinerary model for storing AI-generated travel plans"""
    __tablename__ = "itineraries"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trips.id")
    content: str  # Markdown content from AI
    created_at: datetime = Field(default_factory=datetime.utcnow)

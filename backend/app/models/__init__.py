"""
Models package - Database models for the travel planner
"""

from .hotel import Hotel
from .trip import Trip
from .itinerary import Itinerary

__all__ = ["Hotel", "Trip", "Itinerary"]

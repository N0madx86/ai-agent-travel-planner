import asyncio
from datetime import date, timedelta
from app.models.trip import Trip
from app.services.ai_service import ai_service
import os
import sys

# Force UTF-8 encoding for Windows terminal output
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def test_itinerary():
    print("Testing AIService.generate_itinerary with OpenRouter...")
    
    trip = Trip(
        destination="Tokyo",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=3),
        budget="Mid-range",
        interests="Food, Anime, History",
        travelers=2
    )
    
    try:
        itinerary = await ai_service.generate_itinerary(trip)
        print("\nGenerated Itinerary Preview:")
        print("-" * 30)
        print(itinerary[:500] + "...")
        print("-" * 30)
        
        if "Tokyo" in itinerary and len(itinerary) > 100:
            print("\nSUCCESS: Itinerary generated successfully via OpenRouter.")
        else:
            print("\nFAILURE: Itinerary generation failed or returned empty.")
            
    except Exception as e:
        print(f"\nFAILURE: An error occurred: {e}")

if __name__ == "__main__":
    # Ensure we are in backend dir
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(test_itinerary())

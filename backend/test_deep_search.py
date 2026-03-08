import asyncio
import httpx
from datetime import date, timedelta

BASE_URL = "http://localhost:8000"

async def test_deep_search():
    async with httpx.AsyncClient(timeout=300.0) as client:
        print("\n" + "="*60)
        print("TESTING DEEP SEARCH PIPELINE")
        print("="*60)
        
        # We will test grabbing just max_pages=1 to speed up test
        req_body = {
            "destination": "Goa",
            "checkin": str(date.today() + timedelta(days=30)),
            "checkout": str(date.today() + timedelta(days=34)), # 4 nights
            "budget": "10000",
            "max_results": 2, 
            "max_pages": 1    
        }
        
        print(f"Requesting Deep Search for {req_body['destination']} ...")
        
        response = await client.post(f"{BASE_URL}/api/hotels/search", json=req_body)
        
        if response.status_code == 200:
            hotels = response.json()
            print(f"Deep Search successful! Returned {len(hotels)} curated hotels:")
            for hotel in hotels:
                print(f" - {hotel['name']} @ INR {hotel['price_per_night']}/night (Rating: {hotel.get('rating')})")
        else:
            print(f"Error: {response.text}")

        # Fetch logs
        print("\nFetching logs...")
        logs_res = await client.get(f"{BASE_URL}/api/hotels/search/status")
        if logs_res.status_code == 200:
            data = logs_res.json()
            print(f"Progress complete flag: {data.get('is_complete')}")
            for log in data.get("logs", []):
                print(f"LOG: {log['message']}")

if __name__ == "__main__":
    asyncio.run(test_deep_search())

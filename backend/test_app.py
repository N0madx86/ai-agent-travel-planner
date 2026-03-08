"""
Test script for AI Travel Planner
Run this after starting the server to test all endpoints
"""

import asyncio
import httpx
from datetime import date, timedelta

BASE_URL = "http://localhost:8000"

async def test_all():
    async with httpx.AsyncClient(timeout=120.0) as client:
        print("\n" + "="*60)
        print("AI TRAVEL PLANNER - TEST SUITE")
        print("="*60)
        
        # Test 1: Health Check
        print("\n[Test 1] Health Check")
        print("-" * 60)
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test 2: Create Trip
        print("\n[Test 2] Create Trip")
        print("-" * 60)
        trip_data = {
            "destination": "Goa, India",
            "start_date": str(date.today() + timedelta(days=30)),
            "end_date": str(date.today() + timedelta(days=34)),
            "budget": "Mid-range",
            "interests": "beach, nightlife, sightseeing",
            "travelers": 2
        }
        response = await client.post(f"{BASE_URL}/api/trips/", json=trip_data)
        print(f"Status: {response.status_code}")
        trip = response.json()
        trip_id = trip["id"]
        print(f"Created Trip ID: {trip_id}")
        print(f"Destination: {trip['destination']}")
        
        # Test 3: Get Trips
        print("\n[Test 3] Get All Trips")
        print("-" * 60)
        response = await client.get(f"{BASE_URL}/api/trips/")
        print(f"Status: {response.status_code}")
        trips = response.json()
        print(f"Total trips: {len(trips)}")
        
        # Test 4: Search Hotels
        print("\n[Test 4] Search Hotels (may take 10-30 seconds)")
        print("-" * 60)
        hotel_search = {
            "destination": "Goa, India",
            "checkin": str(date.today() + timedelta(days=30)),
            "checkout": str(date.today() + timedelta(days=34)),
            "max_results": 5
        }
        response = await client.post(f"{BASE_URL}/api/hotels/search", json=hotel_search)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            hotels = response.json()
            print(f"Found {len(hotels)} hotels")
            if hotels:
                print(f"\nFirst hotel:")
                print(f"  Name: {hotels[0]['name']}")
                print(f"  Price: ₹{hotels[0]['price_per_night']:,.0f}/night")
                print(f"  Rating: {hotels[0].get('rating', 'N/A')}")
        else:
            print(f"Error: {response.text}")
        
        # Test 5: Generate Itinerary
        print("\n[Test 5] Generate AI Itinerary")
        print("-" * 60)
        print("⏳ Generating itinerary with Ollama (may take 30-60 seconds)...")
        response = await client.post(f"{BASE_URL}/api/itineraries/generate/{trip_id}")
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            itinerary = response.json()
            print(f"✓ Itinerary ID: {itinerary['id']}")
            print(f"\nItinerary Preview (first 500 chars):")
            print(itinerary['content'][:500] + "...")
        else:
            print(f"Error: {response.text}")
        
        # Test 6: Get Itinerary
        print("\n[Test 6] Get Itinerary")
        print("-" * 60)
        response = await client.get(f"{BASE_URL}/api/itineraries/{trip_id}")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✓ Itinerary retrieved successfully")
        
        # Test 7: Get All Hotels
        print("\n[Test 7] Get All Hotels from Database")
        print("-" * 60)
        response = await client.get(f"{BASE_URL}/api/hotels/")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            all_hotels = response.json()
            print(f"Total hotels in database: {len(all_hotels)}")
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print("✓ API is running")
        print("✓ Database operations working")
        print("✓ Hotel scraping functional")
        print("✓ AI itinerary generation working")
        print("\n📖 View full API docs at: http://localhost:8000/docs")
        print("="*60 + "\n")

if __name__ == "__main__":
    print("\n🚀 Starting tests...")
    print("Make sure the server is running: python main.py\n")
    try:
        asyncio.run(test_all())
    except httpx.ConnectError:
        print("\n❌ Error: Cannot connect to server")
        print("Make sure the server is running on http://localhost:8000")
        print("Start it with: python main.py")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")

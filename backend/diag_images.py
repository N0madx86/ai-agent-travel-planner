import asyncio
import httpx

async def diag_images():
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = "http://localhost:8000/api/images/destination"
        print(f"Testing URL: {url}?q=Bali")
        try:
            resp = await client.get(url, params={"q": "Bali", "count": 6})
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print(f"Found {len(data.get('images', []))} images.")
                for i, img in enumerate(data.get('images', [])):
                    print(f" - {img}")
            else:
                print(f"Error: {resp.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(diag_images())

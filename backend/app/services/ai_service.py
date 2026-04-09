import httpx
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional
from app.core.config import settings
from app.models.trip import Trip

# Attempt to import Gemini
try:
    from google import genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

class AIService:
    """AI integrations for travel planning"""
    
    def __init__(self):
        self.gemini_client = None
        if genai and settings.GEMINI_API_KEY:
            try:
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Gemini Client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")
    
    async def _call_openrouter(self, prompt: str, model: Optional[str] = None, use_reasoning: bool = True) -> Optional[str]:
        """Internal helper to call OpenRouter API with 1 retry on transient errors"""
        if not settings.OPENROUTER_API_KEY:
            return None

        # Use the configured model if none provided
        target_model = model or settings.OPENROUTER_MODEL or "openai/gpt-oss-20b:free"

        for attempt in range(2):  # Try up to 2 times
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    payload = {
                        "model": target_model,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ]
                    }

                    # GPT-OSS-20B and Stepfun reasoning support
                    if use_reasoning and ("stepfun" in target_model or "gpt-oss-20b" in target_model):
                        payload["reasoning"] = {"enabled": True}

                    response = await client.post(
                        url="https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        data=json.dumps(payload)
                    )
                    response.raise_for_status()
                    result = response.json()

                    message = result['choices'][0]['message']
                    content = message.get('content', '').strip()

                    # If content is empty but reasoning is present, we might want to handle it (though usually it's in content)
                    if not content and 'reasoning_details' in message:
                        logger.info("Found reasoning_details but no content, using reasoning as content")
                        content = message.get('reasoning_details', '').strip()

                    return content
            except Exception as e:
                logger.error(f"OpenRouter call failed (attempt {attempt + 1}/2): {e}")
                if attempt == 0:
                    import asyncio
                    await asyncio.sleep(2)  # Brief pause before retry
                    continue
                return None

    async def generate_itinerary(self, trip: Trip) -> str:
        """Generate travel itinerary using OpenRouter (gpt-4o-mini)"""
        days = (trip.end_date - trip.start_date).days
        
        prompt = f"""You are a travel guide for {trip.destination}. Dates: {trip.start_date} to {trip.end_date}. Budget: {trip.budget}. Travelers: {trip.travelers}. Interests: {trip.interests}.

Strict Rules:
- Max 2 concise sentences per activity. Real place names only.
- The Day-by-Day section must contain ONLY activities and food — absolutely NO tips, advice, or money-saving suggestions. Tips belong ONLY in the Budget Tips and Good to Know sections.
- Strict section order: Highlights → Day-by-Day → Budget Tips → Good to Know.
- DO NOT include a 'Trip Overview' section.

Structure:
## 🗺️ Destination Highlights
5-7 must-see place names with one sentence each.

## 📅 Day-by-Day Itinerary
### Day 1: [Title]
**Morning:** [Activity description only - no tips]
**Afternoon:** [Activity description only - no tips]
**Evening:** [Activity description only - no tips]
🍽️ **Eat:** [Restaurant name] - [What to order]
...

## 💡 Budget Tips
3 practical money-saving ideas.

## 📝 Good to Know
3 local culture/safety tips."""

        result = await self._call_openrouter(prompt)
        if result:
            return result
            
        # Fallback to Gemini if OpenRouter fails
        if self.gemini_client:
            logger.info("Falling back to Gemini for itinerary generation")
            try:
                response = self.gemini_client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=prompt
                )
                return response.text
            except Exception as e:
                logger.error(f"Gemini fallback failed: {e}")

        return "Error: Failed to generate itinerary. Please check API configuration."

    async def curate_hotels(self, budget: str, hotels_file_path: str, checkin_date: str = "", checkout_date: str = "") -> List[Dict]:
        """
        Use OpenRouter or Gemini to select the best hotels based on budget from the scraped data.
        Falls back to a naive selection if no AI is available.
        """
        STRICT_MAX = 5  # User requirement: exactly 5 hotels
        
        current_search_file = Path(hotels_file_path)
        if not current_search_file.exists():
            logger.error(f"Hotels file not found: {hotels_file_path}")
            return []
            
        try:
            with open(current_search_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                hotels = data.get("hotels", [])
        except Exception as e:
            logger.error(f"Error reading hotels file: {e}")
            return []
            
        if not hotels:
            return []

        # Remove duplicate hotels
        unique_hotels_dict = {h['name']: h for h in hotels}
        unique_hotels = list(unique_hotels_dict.values())

        
        # Prepare context for AI models
        # Minimal fields to save tokens
        hotels_context = []
        for h in unique_hotels:
            entry = {
                "n": h["name"],
                "p": round(h["price_per_night"]),
                "r": h["rating"],
                "l": h.get("address") or h["location"],   # prefer full address for context
            }
            hotels_context.append(entry)
            
        nights_str = f"The stay is from {checkin_date} to {checkout_date}. Calculate total nights to determine total stay price." if checkin_date and checkout_date else "Consider the price per night if exact dates are missing."

            
        prompt = f"""
        You are an expert travel agent. Select exactly 5 hotels from the list below — one per category.

        User budget: "{budget}" (TOTAL stay budget, not per night). {nights_str}

        Evaluation criteria — apply ALL four strictly to every selection:
        1. Budget match   — price must align with the "{budget}" level
        2. Rating         — higher scores preferred within budget tier  
        3. Location       — proximity/relevance to the searched area
        4. Value for money — best rating-to-price ratio

        Budget tier guide:
        - "Luxury"/"Premium"  → highest-priced, top-rated (4-5 star equivalent)
        - "Mid-range"         → solid quality, reasonable price — not cheapest, not priciest
        - "Budget"/"Economy"  → most affordable, rating ≥ 6.5
        - Numeric (e.g. "5000") → max TOTAL price = price_per_night × nights

        {len(hotels_context)} properties to choose from (n=name, p=price/night INR, r=rating/10, l=location):
        {json.dumps(hotels_context, ensure_ascii=False)}

        Assign EXACTLY one of these categories to each selected hotel (each category used once):
        - "Best Overall"   → Best balance of all 4 criteria (ideal for first-timers)
        - "Budget Pick"    → Cheapest reliable option, rating ≥ 6.5 (for budget travellers)
        - "Best Location"  → Most central / closest to the area (for foodies & explorers)
        - "Highest Rated"  → Top review score regardless of price (for quality-conscious travellers)
        - "Best Value"     → Best rating-to-price ratio (for smart spenders)

        Rules:
        - All 5 categories must appear exactly once
        - If fewer than 5 hotels exist, assign as many categories as there are hotels
        - Names must exactly match the JSON data above
        - Return ONLY a raw JSON array of objects, no markdown:
        [{{"name": "Hotel A", "category": "Best Overall"}}, ...]
        """

        if settings.OPENROUTER_API_KEY:
            logger.info(f"Using OpenRouter to curate best {STRICT_MAX} hotels for budget: {budget}")

            response_text = await self._call_openrouter(prompt)
            logger.info(f"OpenRouter raw response (first 300 chars): {repr(response_text[:300]) if response_text else 'EMPTY'}")
            if response_text:
                # Robust extraction: find the JSON array regardless of surrounding text
                start = response_text.find('[')
                end = response_text.rfind(']')
                if start != -1 and end != -1 and end > start:
                    response_text = response_text[start:end + 1]
                else:
                    logger.error(f"Could not find JSON array in OpenRouter response: {repr(response_text[:200])}")
                    response_text = None

            if response_text:
                try:
                    selected = json.loads(response_text)
                    if not isinstance(selected, list):
                        raise ValueError("Response was not a JSON array")

                    logger.info(f"AI selected hotels: {selected}")
                    curated_hotels = self._build_curated(selected, unique_hotels)
                    logger.info(f"Returning {len(curated_hotels)} curated hotels")
                    return curated_hotels

                except Exception as e:
                    logger.error(f"Failed to parse OpenRouter response: {e} | text: {repr(response_text[:200])}")

        if not self.gemini_client or not settings.GEMINI_API_KEY:
            logger.warning("No AI API configured. Returning top 5 hotels with default categories.")
            return self._assign_default_categories(unique_hotels[:STRICT_MAX])
            
        logger.info(f"Using Gemini to curate best {STRICT_MAX} hotels out of {len(unique_hotels)} for budget: {budget}")

        
        try:
            response = self.gemini_client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
            )
            
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            selected = json.loads(response_text)
            if not isinstance(selected, list):
                raise ValueError("Response was not a JSON array")

            return self._build_curated(selected, unique_hotels)
            
        except Exception as e:
            logger.error(f"Gemini curation failed: {e}. Falling back to default selection.")
            return self._assign_default_categories(unique_hotels[:STRICT_MAX])


    # ── Curation helpers ─────────────────────────────────────────────────────

    _DEFAULT_CATEGORIES = [
        "Best Overall", "Budget Pick", "Best Location", "Highest Rated", "Best Value"
    ]

    def _build_curated(self, selected: list, unique_hotels: list) -> list:
        """
        Map AI response (list of {name, category} dicts OR plain name strings)
        back to full hotel dicts, injecting the category field.
        """
        STRICT_MAX = 5
        hotel_by_name = {h["name"]: h for h in unique_hotels}

        curated: list = []
        used_names: set = set()

        for item in selected:
            if isinstance(item, dict):
                name = item.get("name", "")
                category = item.get("category", "")
            else:
                # Fallback: plain string (old format)
                name = str(item)
                category = self._DEFAULT_CATEGORIES[len(curated)] if len(curated) < len(self._DEFAULT_CATEGORIES) else ""

            hotel = hotel_by_name.get(name)
            if hotel and name not in used_names:
                h = dict(hotel)  # copy so we don't mutate cache
                h["category"] = category
                curated.append(h)
                used_names.add(name)

        # Pad with remaining hotels if AI returned fewer than STRICT_MAX
        if len(curated) < STRICT_MAX:
            for h in unique_hotels:
                if h["name"] not in used_names and len(curated) < STRICT_MAX:

                    hc = dict(h)
                    idx = len(curated)
                    hc["category"] = self._DEFAULT_CATEGORIES[idx] if idx < len(self._DEFAULT_CATEGORIES) else ""
                    curated.append(hc)
                    used_names.add(h["name"])
        return curated

    def _assign_default_categories(self, hotels: list) -> list:
        """Assign default category labels positionally when no AI is available."""
        result = []
        for i, h in enumerate(hotels):
            hc = dict(h)
            hc["category"] = self._DEFAULT_CATEGORIES[i] if i < len(self._DEFAULT_CATEGORIES) else ""
            result.append(hc)
        return result

ai_service = AIService()

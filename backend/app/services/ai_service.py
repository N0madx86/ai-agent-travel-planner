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
    
    async def _call_openrouter(self, prompt: str, model: str = "stepfun/step-3.5-flash:free", use_reasoning: bool = False) -> Optional[str]:
        """Internal helper to call OpenRouter API"""
        if not settings.OPENROUTER_API_KEY:
            return None
            
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
                
                # Stepfun specific: reasoning support
                if use_reasoning and "stepfun" in model:
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
            logger.error(f"OpenRouter call failed: {e}")
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

    async def curate_hotels(self, budget: str, hotels_file_path: str, checkin_date: str = "", checkout_date: str = "", max_results: int = 5) -> List[Dict]:
        """
        Use OpenRouter or Gemini to select the best hotels based on budget from the scraped data.
        Falls back to a naive selection if no AI is available.
        """
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
            hotels_context.append({
                "n": h["name"],
                "p": round(h["price_per_night"]),
                "r": h["rating"],
                "l": h["location"]
            })
            
        nights_str = f"The stay is from {checkin_date} to {checkout_date}. You must calculate the total nights to determine the total stay price." if checkin_date and checkout_date else "Consider the price per night if exact dates are missing."
            
        prompt = f"""
        You are an expert travel agent. The user is looking for a hotel.
        Their budget level or constraint is verbatim: "{budget}". This refers to the TOTAL budget for the entire stay, not per night.
        {nights_str}
        
        I have scraped a list of {len(hotels_context)} properties. Here is the JSON data:
        {json.dumps(hotels_context, ensure_ascii=False)}
        
        Please select the top {max_results} absolute best hotels from this list that fit the "{budget}" constraint.
        - Rules:
        1. If "{budget}" contains a specific number (e.g., "5000" or "under 10000"), you MUST treat it as a strict maximum TOTAL price constraint. Calculate Total Price = price_per_night * number_of_nights. STRICTLY FILTER OUT any hotels where the total price is greater than the parsed budget.
        2. Consider both price constraint and highest rating. Ensure your recommendations are valid and exist in the provided JSON array.
        3. If the budget is heavily unrealistic and ZERO hotels qualify, return an empty array [].
        
        Return ONLY a raw JSON array containing exactly the names of the selected hotels as strings (up to {max_results}).
        Example: ["Hotel A", "Hotel B", "Hotel C"]
        Do not include markdown blocks, just the JSON array.
        """

        if settings.OPENROUTER_API_KEY:
            logger.info(f"Using OpenRouter (gpt-4o-mini) to curate best {max_results} hotels for budget: {budget}")
            response_text = await self._call_openrouter(prompt)
            if response_text:
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                try:
                    selected_names = json.loads(response_text)
                    if not isinstance(selected_names, list):
                        raise ValueError("Response was not a JSON array")
                        
                    curated_hotels = []
                    for name in selected_names:
                        for h in unique_hotels:
                            if h["name"] == name:
                                curated_hotels.append(h)
                                break
                                
                    if len(curated_hotels) < max_results:
                        for h in unique_hotels:
                            if h not in curated_hotels and len(curated_hotels) < max_results:
                                curated_hotels.append(h)
                                
                    return curated_hotels
                except Exception as e:
                    logger.error(f"Failed to parse OpenRouter response: {e}")

        if not self.gemini_client or not settings.GEMINI_API_KEY:
            logger.warning("No AI API (OpenRouter/Gemini) configured. Returning top 5 hotels by default.")
            return unique_hotels[:max_results]
            
        logger.info(f"Using Gemini to curate best {max_results} hotels out of {len(unique_hotels)} for budget: {budget}")
        
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
            
            selected_names = json.loads(response_text)
            
            if not isinstance(selected_names, list):
                raise ValueError("Response was not a JSON array")
                
            curated_hotels = []
            for name in selected_names:
                for h in unique_hotels:
                    if h["name"] == name:
                        curated_hotels.append(h)
                        break
                        
            if len(curated_hotels) < max_results:
                for h in unique_hotels:
                    if h not in curated_hotels and len(curated_hotels) < max_results:
                        curated_hotels.append(h)
                        
            return curated_hotels
            
        except Exception as e:
            logger.error(f"Gemini curation failed: {e}. Falling back to default selection.")
            return unique_hotels[:max_results]

ai_service = AIService()

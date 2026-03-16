"""
Hotel Scraper for Booking.com
Fully integrated with the travel planner app
"""

import asyncio
import json
import random
import re
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Union
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from playwright_stealth import stealth_async
import logging
import os

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── Rotation pools ────────────────────────────────────────────────────────────
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
]

LOCALES = ['en-IN', 'en-US', 'en-GB', 'en-AU']

TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Singapore']
# ─────────────────────────────────────────────────────────────────────────────


class HotelScraper:
    """Asynchronous Booking.com scraper with caching and stealth rotation"""
    
    def __init__(self):
        self.search_dir = Path(settings.CACHE_DIR) / "search"
        self.hotel_cache_dir = Path(settings.CACHE_DIR) / "hotels"
        self.search_dir.mkdir(parents=True, exist_ok=True)
        self.hotel_cache_dir.mkdir(parents=True, exist_ok=True)
        self.current_search_file = self.search_dir / "current_search.json"
        self.search_logs_file = self.search_dir / "search_logs.json"
        logger.info(f"HotelScraper initialized with search dir: {self.search_dir}")

    # ── Cache helpers ─────────────────────────────────────────────────────────

    def _get_cache_key(self, destination: str) -> str:
        """Normalise a destination string into a safe filename key (Option A)."""
        return re.sub(r'[^a-z0-9_]', '_', destination.lower().strip())

    def _load_from_cache(self, key: str) -> Optional[List[Dict]]:
        """Return cached hotels if fresh (< CACHE_TTL_HOURS old), else None."""
        cache_file = self.hotel_cache_dir / f"{key}.json"
        if not cache_file.exists():
            return None
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            cached_at = datetime.fromisoformat(data["timestamp"])
            age_hours = (datetime.now() - cached_at).total_seconds() / 3600
            if age_hours < settings.CACHE_TTL_HOURS:
                hotels = data.get("hotels", [])
                logger.info(f"Cache hit for '{key}' — returning {len(hotels)} hotels (age {age_hours:.1f}h)")
                self._add_log(f"Cache hit — returning {len(hotels)} pre-cached hotels instantly.")
                return hotels
            else:
                logger.info(f"Cache expired for '{key}' (age {age_hours:.1f}h) — will re-scrape")
                return None
        except Exception as e:
            logger.warning(f"Cache read error for '{key}': {e}")
            return None

    def _save_to_cache(self, key: str, hotels: List[Dict]):
        """Persist raw scraped hotels to destination cache file."""
        cache_file = self.hotel_cache_dir / f"{key}.json"
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "destination_key": key,
                    "total_hotels": len(hotels),
                    "hotels": hotels,
                }, f, ensure_ascii=False, indent=2)
            logger.info(f"Saved {len(hotels)} hotels to cache for '{key}'")
        except Exception as e:
            logger.warning(f"Cache write error for '{key}': {e}")

    # ── Log helpers ───────────────────────────────────────────────────────────
        
    def _init_logs(self):
        """Initialize empty search logs"""
        try:
            with open(self.search_logs_file, 'w', encoding='utf-8') as f:
                json.dump([], f)
        except Exception as e:
            logger.error(f"Error initializing logs: {e}")

    def _add_log(self, message: str, hotels_found: int = 0):
        """Append a log entry to search logs"""
        try:
            logs = []
            if self.search_logs_file.exists():
                with open(self.search_logs_file, 'r', encoding='utf-8') as f:
                    try:
                        logs = json.load(f)
                    except json.JSONDecodeError:
                        logs = []
            
            logs.append({
                "timestamp": datetime.now().isoformat(),
                "message": message,
                "hotels_found": hotels_found
            })
            
            with open(self.search_logs_file, 'w', encoding='utf-8') as f:
                json.dump(logs, f, indent=2)
                
            logger.info(message)
        except Exception as e:
            logger.error(f"Error writing to logs: {e}")

    def _save_current_search(self, hotels: List[Dict]):
        """Save raw scraped results to temporary file"""
        try:
            with open(self.current_search_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "total_hotels": len(hotels),
                    "hotels": hotels
                }, f, ensure_ascii=False, indent=2)
            self._add_log(f"Saved {len(hotels)} raw hotels to container.", len(hotels))
        except Exception as e:
            logger.error(f"Error saving current search: {e}")

    def clear_current_search(self):
        """Delete temporary search file after AI finishes"""
        try:
            if self.current_search_file.exists():
                os.remove(self.current_search_file)
                self._add_log("Cleaned up temporary search container.")
        except Exception as e:
            logger.error(f"Error cleaning up current search: {e}")

    # ── Public search entry point ─────────────────────────────────────────────

    async def search_hotels(
        self, 
        destination: str, 
        checkin: Union[datetime, str], 
        checkout: Union[datetime, str], 
        budget: str = "Mid-range",
        max_pages: int = 5
    ) -> List[Dict]:
        """
        Deep Search for hotels. Returns cached results if fresh,
        otherwise scrapes Booking.com and caches the output.
        """
        self._init_logs()
        self._add_log(f"Starting search for {destination} (budget: {budget})...")

        # ── Step 1: Check destination cache ──────────────────────────────────
        cache_key = self._get_cache_key(destination)
        cached = self._load_from_cache(cache_key)
        if cached is not None:
            # Serve from cache — still save to current_search.json for AI
            self._save_current_search(cached)
            return cached

        # ── Step 2: Cache miss — scrape live ─────────────────────────────────
        if isinstance(checkin, str):
            try:
                checkin_dt = datetime.fromisoformat(checkin.replace('Z', '+00:00'))
            except:
                checkin_dt = datetime.strptime(checkin, '%Y-%m-%d')
        else:
            checkin_dt = checkin
            
        if isinstance(checkout, str):
            try:
                checkout_dt = datetime.fromisoformat(checkout.replace('Z', '+00:00'))
            except:
                checkout_dt = datetime.strptime(checkout, '%Y-%m-%d')
        else:
            checkout_dt = checkout
        
        hotels = await asyncio.to_thread(
            self._run_scrape_booking_sync,
            destination, checkin_dt, checkout_dt, budget, max_pages
        )
        
        if hotels:
            self._save_to_cache(cache_key, hotels)
            self._save_current_search(hotels)
        
        return hotels
    
    def _run_scrape_booking_sync(self, destination, checkin, checkout, budget, max_pages):
        """Run the async scraper in a dedicated event loop"""
        import sys
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self._scrape_booking(destination, checkin, checkout, budget, max_pages)
            )
        finally:
            loop.close()
    
    async def _scrape_booking(
        self, 
        destination: str, 
        checkin: datetime, 
        checkout: datetime, 
        budget: str = "Mid-range",
        max_pages: int = 2
    ) -> List[Dict]:
        """Scrape Booking.com sequentially with stealth and context rotation"""
        
        checkin_str = checkin.strftime('%Y-%m-%d')
        checkout_str = checkout.strftime('%Y-%m-%d')
        base_url = self._build_url(destination, checkin_str, checkout_str, budget)
        
        nights = (checkout - checkin).days
        if nights < 1:
            nights = 1

        # ── Pick rotated identity for this session ────────────────────────────
        ua = random.choice(USER_AGENTS)
        locale = random.choice(LOCALES)
        timezone = random.choice(TIMEZONES)
        logger.info(f"Scrape identity — UA: {ua[:40]}…  locale: {locale}  tz: {timezone}")

        self._add_log(f"Launching scrape for {destination} ({max_pages} pages)...")
        
        all_hotels = []

        # ── Start Xvfb virtual display for headful mode on Linux ──────────────
        display_proc = None
        import sys
        if sys.platform != 'win32':
            try:
                display_proc = subprocess.Popen(
                    ['Xvfb', ':99', '-screen', '0', '1920x1080x24', '-ac'],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
                os.environ['DISPLAY'] = ':99'
                await asyncio.sleep(1)
                logger.info("Xvfb virtual display started for headful mode")
            except Exception as e:
                logger.warning(f"Could not start Xvfb, falling back to headless: {e}")
                display_proc = None

        use_headless = display_proc is None

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=use_headless,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-software-rasterizer',
                        '--disable-extensions',
                    ]
                )

                # ── Rotated context ───────────────────────────────────────────
                context = await browser.new_context(
                    user_agent=ua,
                    viewport={'width': 1920, 'height': 1080},
                    locale=locale,
                    timezone_id=timezone,
                    extra_http_headers={
                        'Accept-Language': 'en-US,en;q=0.9',
                    }
                )

                page = await context.new_page()
                await stealth_async(page)

                for page_num in range(1, max_pages + 1):
                    if page_num > 1:
                        await asyncio.sleep(3)

                    offset = (page_num - 1) * 25
                    url = f"{base_url}&offset={offset}"
                    self._add_log(f"Scraping page {page_num} (offset {offset})...")

                    try:
                        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                        await asyncio.sleep(2)

                        try:
                            await page.wait_for_selector('[data-testid="property-card"]', timeout=15000)
                        except PlaywrightTimeout:
                            self._add_log(f"Page {page_num}: no property cards found.")
                            continue

                        cards = await page.query_selector_all('[data-testid="property-card"]')
                        for card in cards:
                            hotel = await self._extract_hotel_data(card, nights)
                            if hotel:
                                all_hotels.append(hotel)

                        self._add_log(f"Page {page_num}: found {len(cards)} hotels.")

                    except Exception as e:
                        logger.error(f"Error scraping page {page_num}: {e}")
                        continue

                await context.close()
                await browser.close()
        finally:
            if display_proc:
                display_proc.terminate()

        # De-duplicate by URL path (more reliable than name — same hotel can appear
        # on multiple pages with identical names but Booking adds different tracking params).
        # Strip query string so only the stable path (/hotel/in/...) is compared.
        # Fall back to name if booking_url is empty.
        unique_hotels = []
        seen_keys: set = set()
        for h in all_hotels:
            url = h.get("booking_url", "")
            if url:
                from urllib.parse import urlparse
                key = urlparse(url).path  # e.g. /hotel/in/goa-golden-palace.en-gb.html
            else:
                key = h["name"]
            if key not in seen_keys:
                unique_hotels.append(h)
                seen_keys.add(key)

        self._add_log(f"Scrape complete. Found {len(unique_hotels)} unique hotels.", len(unique_hotels))
        return unique_hotels
    
    async def _extract_hotel_data(self, card, nights: int = 1) -> Optional[Dict]:
        """Extract hotel data matching Hotel model schema"""
        try:
            name_elem = await card.query_selector('[data-testid="title"]')
            name = await name_elem.inner_text() if name_elem else "Unknown Hotel"
            name = name.strip()
            
            price_elem = await card.query_selector('[data-testid="price-and-discounted-price"]')
            price_text = await price_elem.inner_text() if price_elem else "0"
            price_digits = ''.join(filter(str.isdigit, price_text))
            total_price = float(price_digits) if price_digits else 0.0
            price = total_price / nights if nights > 0 else total_price
            
            rating_elem = await card.query_selector('[data-testid="review-score"] div')
            rating_text = await rating_elem.inner_text() if rating_elem else None
            rating = None
            
            if rating_text:
                rating_text = rating_text.replace(',', '.')
                rating_clean = ''.join(c for c in rating_text if c.isdigit() or c == '.')
                try:
                    rating = float(rating_clean) if rating_clean else None
                    if rating and rating > 10:
                        rating = rating / 10.0
                except ValueError:
                    rating = None
            
            location_elem = await card.query_selector('[data-testid="distance"]')
            location = await location_elem.inner_text() if location_elem else f"Near {name.split()[0]}"
            location = location.strip()
            
            img_elem = await card.query_selector('[data-testid="image"]')
            img_url = None
            if img_elem:
                img_url = await img_elem.get_attribute('src')
                if not img_url:
                    img_url = await img_elem.get_attribute('data-src')
            
            link_elem = await card.query_selector('a[data-testid="title-link"]')
            link = await link_elem.get_attribute('href') if link_elem else ""
            
            if link and not link.startswith('http'):
                link = f"https://www.booking.com{link}"
            
            return {
                "name": name,
                "location": location,
                "price_per_night": price,
                "currency": "INR",
                "rating": rating,
                "image_url": img_url,
                "booking_url": link if link else "",
                "source": "booking.com"
            }
            
        except Exception:
            return None
    
    def _build_url(self, destination: str, checkin: str, checkout: str, budget: str = "Mid-range") -> str:
        base = "https://www.booking.com/searchresults.html"
        budget_lower = budget.lower()
        
        params = [
            f"ss={destination.replace(' ', '+')}",
            f"checkin={checkin}",
            f"checkout={checkout}",
            "group_adults=2",
            "no_rooms=1",
            "selected_currency=INR",
            "lang=en-us",
        ]
        
        if any(kw in budget_lower for kw in ['luxur', 'premium', 'high']):
            params.append("order=price_desc")
        elif any(kw in budget_lower for kw in ['budget', 'cheap', 'economy', 'low']):
            params.append("order=price")
        
        return f"{base}?{'&'.join(params)}"


# Global instance
scraper = HotelScraper()

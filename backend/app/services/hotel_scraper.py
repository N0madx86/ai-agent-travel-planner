"""
Hotel Scraper for Booking.com
Fully integrated with the travel planner app
"""

import asyncio
import json
import random
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Union
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from playwright_stealth import stealth_async
import logging
import os

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rotating user agent pool — realistic Chrome versions on Windows/Mac
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]


class HotelScraper:
    """Asynchronous Booking.com scraper for Deep Search workflow"""
    
    def __init__(self):
        self.search_dir = Path(settings.CACHE_DIR) / "search"
        self.search_dir.mkdir(parents=True, exist_ok=True)
        self.current_search_file = self.search_dir / "current_search.json"
        self.search_logs_file = self.search_dir / "search_logs.json"
        logger.info(f"HotelScraper initialized with search dir: {self.search_dir}")
        
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

    async def search_hotels(
        self, 
        destination: str, 
        checkin: Union[datetime, str], 
        checkout: Union[datetime, str], 
        max_pages: int = 5
    ) -> List[Dict]:
        """
        Deep Search for hotels scraping multiple pages
        """
        self._init_logs()
        self._add_log(f"Starting Deep Search for {destination}...")

        # Convert strings to datetime if necessary
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
        
        # Offload scraping to a separate thread with its own ProactorEventLoop
        hotels = await asyncio.to_thread(
            self._run_scrape_booking_sync,
            destination, checkin_dt, checkout_dt, max_pages
        )
        
        # Save to container for AI to read
        if hotels:
            self._save_current_search(hotels)
        
        return hotels
    
    def _run_scrape_booking_sync(self, destination, checkin, checkout, max_pages):
        """Run the async scraper in a dedicated event loop"""
        import sys
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self._scrape_booking(destination, checkin, checkout, max_pages)
            )
        finally:
            loop.close()
    
    async def _scrape_booking(
        self, 
        destination: str, 
        checkin: datetime, 
        checkout: datetime, 
        max_pages: int = 2
    ) -> List[Dict]:
        """Scrape Booking.com sequentially, mimicking human browsing"""
        
        checkin_str = checkin.strftime('%Y-%m-%d')
        checkout_str = checkout.strftime('%Y-%m-%d')
        base_url = self._build_url(destination, checkin_str, checkout_str)
        
        nights = (checkout - checkin).days
        if nights < 1:
            nights = 1

        self._add_log(f"Launching sequential scrape for {destination} ({max_pages} pages)...")
        
        all_hotels = []

        # ── Start Xvfb virtual display for headful mode on Linux ──
        display_proc = None
        import sys
        if sys.platform != 'win32':
            try:
                display_proc = subprocess.Popen(
                    ['Xvfb', ':99', '-screen', '0', '1920x1080x24', '-ac'],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
                os.environ['DISPLAY'] = ':99'
                await asyncio.sleep(1)  # Give Xvfb time to start
                logger.info("Xvfb virtual display started for headful mode")
            except Exception as e:
                logger.warning(f"Could not start Xvfb, falling back to headless: {e}")
                display_proc = None

        use_headless = display_proc is None

        # ── Realistic Google referral URL ──
        dest_query = destination.replace(' ', '+')
        google_referer = f"https://www.google.com/search?q=hotels+in+{dest_query}&num=10"

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
                        '--window-size=1920,1080',
                    ]
                )

                # ── Rich browser fingerprint ──
                context = await browser.new_context(
                    user_agent=random.choice(USER_AGENTS),
                    viewport={'width': 1920, 'height': 1080},
                    locale='en-IN',
                    timezone_id='Asia/Kolkata',
                    geolocation={'latitude': 19.0760, 'longitude': 72.8777},  # Mumbai
                    permissions=['geolocation'],
                    color_scheme='light',
                    extra_http_headers={
                        'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8,hi;q=0.7',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Referer': google_referer,
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'cross-site',
                        'Sec-Fetch-User': '?1',
                    }
                )

                page = await context.new_page()
                await stealth_async(page)

                # ── Scrape pages sequentially ──
                for page_num in range(1, max_pages + 1):
                    if page_num > 1:
                        delay = random.uniform(3, 6)
                        self._add_log(f"Waiting {delay:.1f}s before next page...")
                        await asyncio.sleep(delay)

                    offset = (page_num - 1) * 25
                    url = f"{base_url}&offset={offset}"
                    self._add_log(f"Scraping page {page_num} (offset {offset})...")

                    try:
                        await page.goto(url, wait_until='domcontentloaded', timeout=30000)

                        # Human-like: random scroll after load (isolated — failure here must NOT abort extraction)
                        try:
                            await asyncio.sleep(random.uniform(1.5, 3))
                            scroll_amount = random.randint(300, 800)
                            await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
                            await asyncio.sleep(random.uniform(0.5, 1.5))
                        except Exception as scroll_err:
                            logger.warning(f"Page {page_num}: scroll failed (continuing extraction): {scroll_err}")

                        try:
                            await page.wait_for_selector('[data-testid="property-card"]', timeout=15000)
                        except PlaywrightTimeout:
                            self._add_log(f"Page {page_num}: no property cards found (may be blocked).")
                            continue

                        cards = await page.query_selector_all('[data-testid="property-card"]')
                        for card in cards:
                            hotel = await self._extract_hotel_data(card, nights)
                            if hotel:
                                all_hotels.append(hotel)

                        self._add_log(f"Page {page_num}: found {len(cards)} hotels so far.")

                    except Exception as e:
                        logger.error(f"Error scraping page {page_num}: {e}")
                        continue

                await context.close()
                await browser.close()
        finally:
            if display_proc:
                display_proc.terminate()

        # De-duplicate results by name
        unique_hotels = []
        seen_names = set()
        for h in all_hotels:
            if h["name"] not in seen_names:
                unique_hotels.append(h)
                seen_names.add(h["name"])

        self._add_log(f"Sequential scrape complete. Found {len(unique_hotels)} unique hotels.", len(unique_hotels))
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
    
    def _build_url(self, destination: str, checkin: str, checkout: str) -> str:
        base = "https://www.booking.com/searchresults.html"
        params = [
            f"ss={destination.replace(' ', '+')}",
            f"checkin={checkin}",
            f"checkout={checkout}",
            "group_adults=2",
            "no_rooms=1",
            "selected_currency=INR",
            "lang=en-us"
        ]
        return f"{base}?{'&'.join(params)}"


# Global instance
scraper = HotelScraper()

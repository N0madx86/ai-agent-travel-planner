import asyncio
import sys
sys.path.append('d:/Projects/AATP/backend')
from app.services.hotel_scraper import scraper
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--disable-blink-features=AutomationControlled'])
        context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080},
                locale='en-IN'
            )
        page = await context.new_page()
        await page.set_extra_http_headers({
            "Accept-Language": "en-US,en;q=0.9",
        })
        url = scraper._build_url('Delhi', '2026-03-05', '2026-03-07')
        await page.goto(url, wait_until='domcontentloaded')
        await page.wait_for_selector('[data-testid="property-card"]', timeout=30000)
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(4)
        html = await page.evaluate('''() => {
            const btns = document.querySelectorAll('button');
            const loadMore = Array.from(btns).find(b => b.innerText.toLowerCase().includes('load more'));
            if (loadMore) return "Found Load More button: " + loadMore.outerHTML;
            const nextBtns = document.querySelectorAll('button[aria-label*="Next"], a[aria-label*="Next"], button:has-text("Next"), a:has-text("Next")');
            if (nextBtns.length) return "Found Next button: " + nextBtns[0].outerHTML;
            return 'Neither Load More nor Next button found';
        }''')
        print(html)
        await browser.close()
asyncio.run(test())

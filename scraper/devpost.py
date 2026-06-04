import time
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from scraper.config import DEVPOST_BASE_URL, DEVPOST_INDIA_URL

def scrape_page(page_url, scroll_count=3):
    print(f"Starting Playwright scraper for: {page_url}")
    hackathons = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Set a realistic user agent
        page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        
        try:
            page.goto(page_url)
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_timeout(3000) # Wait 3 seconds for initial render
            
            # Scroll down multiple times to load lazy content
            for i in range(scroll_count):
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(2000) # Wait 2 seconds between scrolls
                
            content = page.content()
            soup = BeautifulSoup(content, 'html.parser')
            tiles = soup.select('.hackathon-tile')
            print(f"Scraped {len(tiles)} tiles from {page_url}")
            
            for tile in tiles:
                try:
                    # Title
                    title_elem = tile.select_one('h3')
                    title = title_elem.text.strip() if title_elem else ""
                    if not title:
                        continue
                        
                    # URL
                    anchor = tile.select_one('.tile-anchor')
                    url = anchor['href'] if anchor and anchor.has_attr('href') else ""
                    if not url:
                        continue
                    # Clean up URL parameters
                    if '?' in url:
                        url = url.split('?')[0]
                        
                    # Parse info-with-icon blocks
                    location = ""
                    host = ""
                    dates = ""
                    tags = []
                    
                    info_blocks = tile.select('.info-with-icon')
                    for block in info_blocks:
                        icon = block.select_one('i')
                        if not icon:
                            continue
                        icon_classes = icon.get('class', [])
                        
                        info_div = block.select_one('.info')
                        if not info_div:
                            continue
                            
                        # Location (fa-globe or fa-map-marker)
                        if any('fa-globe' in c or 'fa-map-marker' in c for c in icon_classes):
                            location = info_div.text.strip()
                        # Host (fa-flag)
                        elif any('fa-flag' in c for c in icon_classes):
                            host = info_div.text.strip()
                            # Clean host if it includes checkmark text
                            if "Google" in host:
                                host = "Google"
                        # Dates (fa-calendar)
                        elif any('fa-calendar' in c for c in icon_classes):
                            dates = info_div.text.strip()
                        # Tags (fa-tags)
                        elif any('fa-tags' in c for c in icon_classes):
                            tag_spans = info_div.select('.theme-label')
                            if tag_spans:
                                tags = [span.text.strip() for span in tag_spans]
                            else:
                                tags = [t.strip() for t in info_div.text.split() if t.strip()]

                    # Prize
                    prize_elem = tile.select_one('.prize-amount')
                    prize = prize_elem.text.strip() if prize_elem else ""
                    
                    hackathons.append({
                        "title": title,
                        "url": url,
                        "location": location,
                        "host": host,
                        "dates": dates,
                        "tags": tags,
                        "prize": prize
                    })
                except Exception as tile_err:
                    print(f"Error parsing tile: {tile_err}")
                    
        except Exception as err:
            print(f"Error loading page {page_url}: {err}")
        finally:
            browser.close()
            
    return hackathons

def scrape_devpost():
    # Fetch global/online listings
    global_hackathons = scrape_page(DEVPOST_BASE_URL, scroll_count=3)
    
    # Fetch India-specific listings
    india_hackathons = scrape_page(DEVPOST_INDIA_URL, scroll_count=3)
    
    # Combine lists and remove duplicates by URL
    combined = []
    seen_urls = set()
    for h in global_hackathons + india_hackathons:
        if h['url'] not in seen_urls:
            seen_urls.add(h['url'])
            combined.append(h)
            
    print(f"Scraped total of {len(combined)} unique hackathons from Devpost.")
    return combined

if __name__ == "__main__":
    # Quick test
    res = scrape_devpost()
    for h in res[:3]:
        print(h)

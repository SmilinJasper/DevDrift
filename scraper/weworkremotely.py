import urllib.request
import xml.etree.ElementTree as ET
from scraper.config import SEARCH_KEYWORDS

# We use the Programming category RSS feed for more relevant results
WWR_RSS_URL = "https://weworkremotely.com/categories/remote-programming-jobs.rss"

def scrape_weworkremotely() -> list[dict]:
    """
    Fetches the WeWorkRemotely RSS feed for programming jobs, parses the XML,
    and returns a list of raw job dictionaries.
    """
    print(f"  [WeWorkRemotely] Fetching RSS feed from {WWR_RSS_URL}...")
    req = urllib.request.Request(WWR_RSS_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    try:
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
    except Exception as e:
        print(f"  [WeWorkRemotely] ERROR fetching feed: {e}")
        return []

    try:
        root = ET.fromstring(xml_data)
    except Exception as e:
        print(f"  [WeWorkRemotely] ERROR parsing XML: {e}")
        return []
        
    results = []
    
    # Iterate over all items in the RSS channel
    for item in root.findall('.//item'):
        title = item.findtext('title') or ""
        description = item.findtext('description') or ""
        link = item.findtext('link') or ""
        pub_date = item.findtext('pubDate') or ""
        category = item.findtext('category') or ""
        
        # Minimal keyword filtering to keep it relevant to SEARCH_KEYWORDS
        # If SEARCH_KEYWORDS contains "software", we keep it. The Programming feed is 99% relevant anyway.
        text_to_search = (title + " " + description).lower()
        matches_keyword = False
        for kw in SEARCH_KEYWORDS:
            if kw.lower() in text_to_search:
                matches_keyword = True
                break
                
        # If it doesn't strictly match a keyword but it's from the programming feed, 
        # we can still include it as it's highly likely to be a SWE job. We'll include all.
        
        results.append({
            "_source": "weworkremotely",
            "title": title,
            "description": description,
            "link": link,
            "pubDate": pub_date,
            "category": category
        })
        
    print(f"  [WeWorkRemotely] Extracted {len(results)} jobs from RSS.")
    return results

if __name__ == "__main__":
    jobs = scrape_weworkremotely()
    import json
    for j in jobs[:2]:
        print(json.dumps(j, indent=2))

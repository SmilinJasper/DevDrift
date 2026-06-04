import urllib.request
import json
import xml.etree.ElementTree as ET
import re
from scraper.config import WWR_RSS_URL, ARBEITNOW_API_URL

# Regex pattern for whole-word matching of internships/junior positions
INTERN_REGEX = re.compile(r'\b(intern|internship|co-op|coop|junior)\b', re.IGNORECASE)

def get_request_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

def scrape_wwr():
    print("Fetching We Work Remotely Programming RSS feed...")
    jobs = []
    
    req = urllib.request.Request(WWR_RSS_URL, headers=get_request_headers())
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            items = root.findall('.//item')
            print(f"Parsed {len(items)} jobs from We Work Remotely RSS.")
            
            for item in items:
                raw_title = item.find('title').text if item.find('title') is not None else ""
                description = item.find('description').text if item.find('description') is not None else ""
                link = item.find('link').text if item.find('link') is not None else ""
                pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
                
                # Check keyword filter
                text_to_search = f"{raw_title} {description}"
                if INTERN_REGEX.search(text_to_search):
                    # Parse company and role from raw title "Company: Role"
                    company = "Remote Company"
                    title = raw_title
                    if ":" in raw_title:
                        parts = raw_title.split(":", 1)
                        company = parts[0].strip()
                        title = parts[1].strip()
                        
                    jobs.append({
                        "title": title,
                        "url": link,
                        "description": description,
                        "location": "Remote",
                        "is_remote": True,
                        "tags": ["Programming", "Remote"],
                        "company": company,
                        "pub_date": pub_date
                    })
    except Exception as e:
        print(f"Error scraping We Work Remotely: {e}")
        
    print(f"Filtered to {len(jobs)} internships/junior roles from We Work Remotely.")
    return jobs

def scrape_arbeitnow():
    print("Fetching Arbeitnow JSON API...")
    jobs = []
    
    req = urllib.request.Request(ARBEITNOW_API_URL, headers=get_request_headers())
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            raw_jobs = data.get('data', [])
            print(f"Parsed {len(raw_jobs)} jobs from Arbeitnow API.")
            
            for rj in raw_jobs:
                title = rj.get('title', '')
                description = rj.get('description', '')
                
                # Check keyword filter
                text_to_search = f"{title} {description}"
                if INTERN_REGEX.search(text_to_search):
                    # Convert created_at epoch to string if needed
                    created_at = rj.get('created_at', '')
                    pub_date = str(created_at) if created_at else ""
                    
                    jobs.append({
                        "title": title,
                        "url": rj.get('url', ''),
                        "description": description,
                        "location": rj.get('location', 'Remote'),
                        "is_remote": rj.get('remote', False),
                        "tags": rj.get('tags', []),
                        "company": rj.get('company_name', ''),
                        "pub_date": pub_date
                    })
    except Exception as e:
        print(f"Error scraping Arbeitnow: {e}")
        
    print(f"Filtered to {len(jobs)} internships/junior roles from Arbeitnow.")
    return jobs

def scrape_jobs():
    wwr_listings = scrape_wwr()
    arbeitnow_listings = scrape_arbeitnow()
    
    # Combine and de-duplicate by URL
    combined = []
    seen_urls = set()
    
    for job in wwr_listings + arbeitnow_listings:
        url = job.get('url', '')
        if url and url not in seen_urls:
            seen_urls.add(url)
            combined.append(job)
            
    print(f"Scraped total of {len(combined)} unique internships/junior listings.")
    return combined

if __name__ == "__main__":
    # Quick test
    res = scrape_jobs()
    for j in res[:3]:
        print(j['title'], "-", j['company'], "-", j['url'])

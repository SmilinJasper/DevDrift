import argparse
import sys
import os

# Add root directory to python search path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper.devpost import scrape_devpost
from scraper.jobs import scrape_jobs
from scraper.normalizer import (
    normalize_hackathon,
    normalize_indeed_job,
    normalize_linkedin_job,
    normalize_wwr_job,
)
from scraper.db import get_supabase_client, get_system_crawler_profile_id, sync_listings

def parse_args():
    parser = argparse.ArgumentParser(description="Orbit Data Aggregation Scraper Pipeline")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run scraping and normalization locally and print results without pushing to database."
    )
    return parser.parse_args()

def main():
    args = parse_args()
    print("==================================================")
    print("      Starting Orbit Data Aggregation Pipeline    ")
    print("==================================================")
    
    if args.dry_run:
        print("[DRY-RUN] Running in dry-run mode. Database changes will not be saved.")
        
    # 1. Scrape Devpost Hackathons
    print("\n--- Phase 1: Scraping Hackathons from Devpost ---")
    raw_hackathons = scrape_devpost()
    normalized_hackathons = []
    for raw in raw_hackathons:
        normalized = normalize_hackathon(raw)
        if normalized:
            normalized_hackathons.append(normalized)
    print(f"Normalized {len(normalized_hackathons)} hackathons.")
    
    # 2. Scrape Jobs & Internships via Apify (Indeed + LinkedIn)
    print("\n--- Phase 2: Scraping Jobs & Internships via Apify ---")
    raw_jobs = scrape_jobs()
    normalized_jobs = []
    for raw in raw_jobs:
        source = raw.get("_source", "unknown")
        normalized = None

        if source == "indeed":
            normalized = normalize_indeed_job(raw)
        elif source == "linkedin":
            normalized = normalize_linkedin_job(raw)
        elif source == "weworkremotely":
            normalized = normalize_wwr_job(raw)
        else:
            print(f"  WARNING: Unknown source '{source}', skipping item.")

        if normalized:
            normalized_jobs.append(normalized)

    # Count by type for reporting
    job_count = sum(1 for j in normalized_jobs if j["type"] == "job")
    intern_count = sum(1 for j in normalized_jobs if j["type"] == "internship")
    print(f"Normalized {len(normalized_jobs)} listings ({job_count} jobs, {intern_count} internships).")
    
    # Combine listings
    all_listings = normalized_hackathons + normalized_jobs
    print(f"\nTotal listings normalized and ready: {len(all_listings)}")
    
    # 3. Dry-Run output sample
    if args.dry_run or not all_listings:
        print("\n--- Sample Scraped Listings (Up to 5) ---")
        for i, item in enumerate(all_listings[:5]):
            print(f"\n{i+1}. [{item['type'].upper()}] {item['title']}")
            print(f"   Location: {item['location']} (Remote: {item['is_remote']})")
            print(f"   Dates: {item['starts_at']} to {item['ends_at']}")
            print(f"   URL: {item['application_url']}")
            print(f"   Tags: {item['tags']}")
            desc_snippet = (item.get('description') or '')[:200]
            print(f"   Description Snippet: {desc_snippet}...")
            
    # 4. Write to Supabase (if not dry-run)
    if not args.dry_run:
        print("\n--- Phase 3: Pushing Listings to Supabase ---")
        supabase = get_supabase_client()
        if not supabase:
            print("ERROR: Supabase client could not be initialized. Please check credentials.")
            sys.exit(1)
            
        try:
            crawler_profile_id = get_system_crawler_profile_id(supabase)
            print(f"Using system crawler profile ID: {crawler_profile_id}")
            
            sync_listings(supabase, all_listings, crawler_profile_id)
        except Exception as e:
            print(f"ERROR: Sync process failed: {e}")
            sys.exit(1)
            
    print("\n==================================================")
    print("      Pipeline Run Completed Successfully        ")
    print("==================================================")

if __name__ == "__main__":
    main()

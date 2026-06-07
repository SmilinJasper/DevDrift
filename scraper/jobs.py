"""
Job & Internship scraper — powered by Apify managed actors.

Replaces the old direct-scraping approach (WWR RSS, Arbeitnow JSON API)
with Apify's Indeed and LinkedIn Job Scraper actors to bypass anti-bot
protections on major job boards.

Results are returned as raw dicts with a `_source` key ('indeed' or
'linkedin') so the normalizer can apply the correct field mapping.
"""

from scraper.apify import scrape_indeed, scrape_linkedin
from scraper.weworkremotely import scrape_weworkremotely


def scrape_jobs() -> list[dict]:
    """
    Orchestrates job scraping from all Apify-managed sources.
    Returns combined, de-duplicated raw results tagged with _source.
    """
    print("  Scraping Indeed via Apify actor...")
    indeed_results = scrape_indeed()

    print("  Scraping LinkedIn via Apify actor...")
    linkedin_results = scrape_linkedin()

    print("  Scraping WeWorkRemotely RSS feed...")
    wwr_results = scrape_weworkremotely()

    # Combine and do a final cross-source de-duplication by title+company
    combined: list[dict] = []
    seen_keys: set[str] = set()

    for item in indeed_results + linkedin_results + wwr_results:
        # Build a de-dup key from normalized title + company
        source = item.get("_source", "unknown")
        if source == "indeed":
            title = (item.get("title") or "").strip().lower()
            company = (item.get("companyName") or "").strip().lower()
        elif source == "linkedin":
            title = (item.get("title") or "").strip().lower()
            company = (item.get("companyName") or "").strip().lower()
        else: # weworkremotely
            title = (item.get("title") or "").strip().lower()
            company = "" # WWR title contains company, so deduplication by title is sufficient

        dedup_key = f"{title}|{company}"
        if dedup_key and dedup_key != "|" and dedup_key not in seen_keys:
            seen_keys.add(dedup_key)
            combined.append(item)

    print(f"  Combined total: {len(combined)} unique job/internship listings.")
    return combined


if __name__ == "__main__":
    # Quick standalone test
    import json
    results = scrape_jobs()
    for r in results[:5]:
        src = r.get("_source", "?")
        title = r.get("positionName") or r.get("title") or "N/A"
        print(f"[{src.upper()}] {title}")

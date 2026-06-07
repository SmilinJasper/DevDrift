"""
Apify Managed API integration for Indeed and LinkedIn job scraping.

Uses the apify-client SDK to call managed actors, avoiding anti-bot
protections that block direct Playwright scraping on GitHub Actions.
Results are returned as raw dicts for the normalizer to map to the
Supabase listings schema.
"""

from apify_client import ApifyClient
from scraper.config import (
    APIFY_API_TOKEN,
    INDEED_ACTOR_ID,
    LINKEDIN_ACTOR_ID,
    SEARCH_KEYWORDS,
    INDEED_COUNTRIES,
    INDEED_MAX_ITEMS,
    LINKEDIN_SEARCH_URLS,
    LINKEDIN_MAX_ITEMS,
)


def _get_client() -> ApifyClient:
    """Initializes and returns an authenticated Apify client."""
    if not APIFY_API_TOKEN:
        raise RuntimeError(
            "APIFY_API_TOKEN environment variable is not set. "
            "Add it as a GitHub Secret or to your .env file."
        )
    return ApifyClient(APIFY_API_TOKEN)


# ── Indeed ────────────────────────────────────────────────────────────────────


def scrape_indeed() -> list[dict]:
    """
    Runs the Indeed Scraper actor for each keyword × country combination.
    Returns a list of raw dicts tagged with source='indeed'.
    """
    client = _get_client()
    all_results: list[dict] = []

    for country in INDEED_COUNTRIES:
        for keyword in SEARCH_KEYWORDS:
            print(f"  [Indeed] Running actor for '{keyword}' in {country}...")
            run_input = {
                "query": keyword,
                "country": country,
                "maxRows": INDEED_MAX_ITEMS,
            }

            try:
                run = client.actor(INDEED_ACTOR_ID).call(run_input=run_input)
                dataset_items = list(
                    client.dataset(run.default_dataset_id).iterate_items()
                )
                print(f"  [Indeed] Got {len(dataset_items)} results for '{keyword}' in {country}.")

                for item in dataset_items:
                    item["_source"] = "indeed"
                all_results.extend(dataset_items)

            except Exception as e:
                print(f"  [Indeed] ERROR for '{keyword}' in {country}: {e}")

    # De-duplicate by URL within Indeed results
    seen_urls: set[str] = set()
    unique: list[dict] = []
    for item in all_results:
        url = item.get("applyUrl") or item.get("jobUrl") or ""
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique.append(item)
        elif not url:
            unique.append(item)  # keep items even without URL (rare)

    print(f"  [Indeed] Total unique results: {len(unique)}")
    return unique


# ── LinkedIn ──────────────────────────────────────────────────────────────────


def scrape_linkedin() -> list[dict]:
    """
    Runs the LinkedIn Jobs Scraper actor with pre-built search URLs.
    Returns a list of raw dicts tagged with source='linkedin'.
    """
    client = _get_client()

    print(f"  [LinkedIn] Running actor with {len(LINKEDIN_SEARCH_URLS)} search URL(s)...")
    run_input = {
        "urls": LINKEDIN_SEARCH_URLS,
        "scrapeCompany": False,  # saves credits — we only need job metadata
        "count": LINKEDIN_MAX_ITEMS,
    }

    try:
        run = client.actor(LINKEDIN_ACTOR_ID).call(run_input=run_input)
        dataset_items = list(
            client.dataset(run.default_dataset_id).iterate_items()
        )
        print(f"  [LinkedIn] Got {len(dataset_items)} results.")

        for item in dataset_items:
            item["_source"] = "linkedin"

        # De-duplicate by jobUrl
        seen_urls: set[str] = set()
        unique: list[dict] = []
        for item in dataset_items:
            url = item.get("applyUrl") or item.get("link") or ""
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique.append(item)
            elif not url:
                unique.append(item)

        print(f"  [LinkedIn] Total unique results: {len(unique)}")
        return unique

    except Exception as e:
        print(f"  [LinkedIn] ERROR: {e}")
        return []


if __name__ == "__main__":
    # Quick standalone test — requires APIFY_API_TOKEN in environment
    import json
    print("=== Indeed ===")
    indeed_results = scrape_indeed()
    for r in indeed_results[:2]:
        print(json.dumps(r, indent=2, default=str))

    print("\n=== LinkedIn ===")
    linkedin_results = scrape_linkedin()
    for r in linkedin_results[:2]:
        print(json.dumps(r, indent=2, default=str))

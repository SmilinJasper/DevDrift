import os

# Supabase Configurations
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Apify API Configuration
APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")

# Apify Actor IDs
INDEED_ACTOR_ID = "borderline/indeed-scraper"
LINKEDIN_ACTOR_ID = "curious_coder/linkedin-jobs-scraper"

# Search Configuration — tuned for free-tier credit conservation
# Each keyword becomes a separate actor run, so keep the list short.
SEARCH_KEYWORDS = [
    "software intern",
    "software",
]

# Indeed-specific settings
INDEED_COUNTRIES = ["US", "IN"]  # Search in United States and India
INDEED_MAX_ITEMS = 15  # per keyword per country — keeps credit usage low on the free tier

# LinkedIn search URLs — pre-built from linkedin.com/jobs/search in incognito
# These cover jobs and internships across India, US, and worldwide
LINKEDIN_SEARCH_URLS = [
    "https://www.linkedin.com/jobs/search/?keywords=software&location=India&sortBy=DD",
    "https://www.linkedin.com/jobs/search/?keywords=software%20intern&sortBy=DD",
    "https://www.linkedin.com/jobs/search/?keywords=software&sortBy=DD",
]
LINKEDIN_MAX_ITEMS = 25  # total across all URLs — keeps credit usage low

# Devpost Scraper Targets (unchanged — still uses Playwright)
DEVPOST_BASE_URL = "https://devpost.com/hackathons"
DEVPOST_INDIA_URL = "https://devpost.com/hackathons?search=India"

# System Crawler Profile settings
SYSTEM_CRAWLER_EMAIL = "crawler@devdrift.com"
SYSTEM_CRAWLER_USERNAME = "system_crawler"
SYSTEM_CRAWLER_FULL_NAME = "DevDrift System Crawler"

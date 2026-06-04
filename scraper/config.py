import os

# Supabase Configurations
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Scraper Targets
DEVPOST_BASE_URL = "https://devpost.com/hackathons"
DEVPOST_INDIA_URL = "https://devpost.com/hackathons?search=India"

WWR_RSS_URL = "https://weworkremotely.com/categories/remote-programming-jobs.rss"
ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"

# System Crawler Profile settings
SYSTEM_CRAWLER_EMAIL = "crawler@devdrift.com"
SYSTEM_CRAWLER_USERNAME = "system_crawler"
SYSTEM_CRAWLER_FULL_NAME = "DevDrift System Crawler"

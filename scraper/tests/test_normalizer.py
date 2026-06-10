import pytest
from scraper.normalizer import _extract_salary, _extract_location, _detect_listing_type, normalize_wwr_job

def test_extract_salary():
    assert _extract_salary(None) == ""
    assert _extract_salary("100K") == "100K"
    
    # Empty currency string
    salary_dict = {"salaryMin": "1000", "salaryMax": "2000", "salaryCurrency": ""}
    assert _extract_salary(salary_dict) == "1000 - 2000"
    
    # Standard USD
    usd_dict = {"salaryMin": "50k", "salaryMax": "100k", "salaryCurrency": "USD"}
    assert _extract_salary(usd_dict) == "USD 50k - 100k"

def test_extract_location():
    assert _extract_location(None) == ""
    assert _extract_location("New York") == "New York"
    
    # Dictionary extraction
    loc_dict = {"city": "San Francisco", "country": "USA"}
    assert _extract_location(loc_dict) == "San Francisco"

def test_detect_listing_type():
    assert _detect_listing_type("Software Engineer", "Build scalable systems.") == "job"
    assert _detect_listing_type("Software Engineering Intern", "Summer 2026.") == "internship"
    assert _detect_listing_type("Developer", "We offer an internship for students.") == "internship"

def test_normalize_wwr_job():
    raw_feed_item = {
        "title": "ACME Corp: Senior Backend Developer",
        "description": "<p>Looking for a Python dev</p>",
        "link": "https://weworkremotely.com/jobs/123",
        "pubDate": "Mon, 01 Jun 2026 12:00:00 GMT",
        "category": "Back-End Programming"
    }
    
    normalized = normalize_wwr_job(raw_feed_item)
    
    assert normalized is not None
    assert normalized["title"] == "Senior Backend Developer at ACME Corp"
    assert normalized["description"] == "Looking for a Python dev"
    assert normalized["is_remote"] is True
    assert normalized["type"] == "job"
    assert "WeWorkRemotely" in normalized["tags"]
    assert "Software Engineering" in normalized["tags"]
    assert "Back-End Programming" in normalized["tags"]

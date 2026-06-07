import re
from datetime import datetime
from bs4 import BeautifulSoup
from dateutil import parser as date_parser

# Regex for detecting internship-related keywords in titles/descriptions
_INTERN_RE = re.compile(r'\b(intern|internship|co-op|coop)\b', re.IGNORECASE)


def strip_html(html_content):
    """Strips HTML tags and returns clean plaintext."""
    if not html_content:
        return ""
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        return soup.get_text(separator="\n").strip()
    except Exception:
        # Fallback to regex if BeautifulSoup fails
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html_content).strip()


def _detect_listing_type(title: str, description: str = "") -> str:
    """
    Auto-detects whether a listing is a 'job' or 'internship'
    based on keyword analysis of the title and description.
    Maps to the public.listing_type enum: hackathon | job | internship
    """
    text = f"{title} {description}".lower()
    if _INTERN_RE.search(text):
        return "internship"
    return "job"


def _safe_truncate(text: str, max_len: int = 200) -> str:
    """Safely truncates a string to max_len characters."""
    if not text:
        return ""
    return text.strip()[:max_len]


def _parse_iso_date(date_str):
    """Parses a date string into ISO 8601 format, returns None on failure."""
    if not date_str:
        return None
    try:
        dt = date_parser.parse(str(date_str))
        return dt.isoformat()
    except Exception:
        return None


# ── Devpost Hackathon Normalizer (unchanged) ──────────────────────────────────


def parse_devpost_dates(date_str):
    """
    Parses Devpost date strings like 'May 05 - Jun 11, 2026' into ISO 8601 strings.
    Returns (starts_at, ends_at) or (None, None)
    """
    if not date_str:
        return None, None
        
    # Remove metadata text that might be attached
    date_str = date_str.replace("Managed by Devpost", "").strip()
    if not date_str:
        return None, None
        
    try:
        # Split on dash (handles standard hyphen, en-dash, and em-dash)
        parts = re.split(r'[-–—]', date_str)
        if len(parts) == 2:
            start_part = parts[0].strip()
            end_part = parts[1].strip()
            
            # Find year in end date
            year_match = re.search(r'\b\d{4}\b', end_part)
            year = year_match.group(0) if year_match else str(datetime.now().year)
            
            # If end_part doesn't contain a month (e.g., '30, 2026' or '18, 2026'),
            # prepend the month from start_part (e.g. 'Jun')
            if not re.search(r'[a-zA-Z]', end_part):
                month_match = re.search(r'[a-zA-Z]+', start_part)
                if month_match:
                    month = month_match.group(0)
                    end_part = f"{month} {end_part}"
            
            # Append year to start date if it doesn't have one
            if not re.search(r'\b\d{4}\b', start_part):
                if ',' not in start_part:
                    start_part = f"{start_part}, {year}"
                else:
                    start_part = f"{start_part} {year}"
                    
            starts_at = date_parser.parse(start_part)
            ends_at = date_parser.parse(end_part)
            
            # Ensure timezone-aware or correct offset if needed
            return starts_at.isoformat(), ends_at.isoformat()
        else:
            # Single date representation
            dt = date_parser.parse(date_str)
            return dt.isoformat(), None
    except Exception as e:
        print(f"Error parsing date string '{date_str}': {e}")
        return None, None


def normalize_hackathon(raw):
    """Normalizes raw Devpost hackathon data into the listings schema."""
    title = raw.get("title", "").strip()[:200]
    description = raw.get("description", "")
    
    # Construct a descriptive text if no direct description exists
    if not description:
        description = f"Hackathon hosted by {raw.get('host', 'Devpost')}. "
        if raw.get("prize"):
            description += f"Prizes: {raw.get('prize')}. "
        if raw.get("location"):
            description += f"Location: {raw.get('location')}."
            
    starts_at, ends_at = parse_devpost_dates(raw.get("dates"))
    
    # Determine remote status
    location = raw.get("location", "").strip()
    is_remote = False
    if not location or "online" in location.lower() or "remote" in location.lower():
        is_remote = True
        if not location:
            location = "Online"
            
    # Clean and filter tags
    tags = [t.strip() for t in raw.get("tags", []) if t.strip()]
    if "Hackathon" not in tags:
        tags.append("Hackathon")
        
    # Extract popularity score from prize or participant count if parsed
    # We can default to a float representation
    popularity_score = 0.0
    
    return {
        "title": title,
        "description": description,
        "type": "hackathon",
        "tags": list(set(tags)),
        "location": location,
        "is_remote": is_remote,
        "starts_at": starts_at,
        "ends_at": ends_at,
        "application_url": raw.get("url"),
        "popularity_score": popularity_score,
        "is_published": True
    }


# ── Legacy Job Normalizer (kept for backward compatibility) ───────────────────


def normalize_job(raw):
    """Normalizes raw job board internship data into the listings schema."""
    title = raw.get("title", "").strip()[:200]
    description = strip_html(raw.get("description", ""))
    
    location = raw.get("location", "").strip()
    is_remote = raw.get("is_remote", False)
    if "remote" in location.lower() or not location:
        is_remote = True
        if not location:
            location = "Remote"
            
    # Clean and filter tags
    tags = [t.strip() for t in raw.get("tags", []) if t.strip()]
    # Add standardized tags
    for tag_candidate in ["Internship", "Junior"]:
        if tag_candidate not in tags:
            # Check if keyword is in title to add it
            if tag_candidate.lower() in title.lower():
                tags.append(tag_candidate)
    if "Internship" not in tags:
        tags.append("Internship")
        
    company = raw.get("company", "").strip()
    if company and company not in title:
        title = f"{title} at {company}"[:200]
        
    return {
        "title": title,
        "description": description,
        "type": "internship",
        "tags": list(set(tags)),
        "location": location,
        "is_remote": is_remote,
        "starts_at": None,
        "ends_at": None,
        "application_url": raw.get("url"),
        "popularity_score": 0.0,
        "is_published": True
    }


# ── Indeed Normalizer ─────────────────────────────────────────────────────────


def normalize_indeed_job(raw: dict) -> dict | None:
    """
    Maps raw Indeed actor output to the Supabase listings schema.

    Indeed fields → Schema fields:
      title         → title (with company appended)
      companyName   → used in title
      location      → location + remote detection
      applyUrl / jobUrl → application_url
      descriptionHtml / descriptionText → description (HTML stripped)
      jobType       → tags
      salary        → tags (if present)
    """
    title = _safe_truncate(raw.get("title", ""), 200)
    if not title:
        return None

    company = (raw.get("companyName") or "").strip()
    if company and company.lower() not in title.lower():
        title = _safe_truncate(f"{title} at {company}", 200)

    description = strip_html(raw.get("descriptionHtml", "") or raw.get("descriptionText", ""))

    # Location & remote detection
    location = (raw.get("location") or "").strip()
    is_remote = False
    if not location or "remote" in location.lower():
        is_remote = True
        if not location:
            location = "Remote"

    # Application URL — prefer the direct employer link
    application_url = raw.get("applyUrl") or raw.get("jobUrl") or ""

    # Auto-detect listing type from title + description
    listing_type = _detect_listing_type(title, description)

    # Build tags
    tags: list[str] = []
    job_types = raw.get("jobType") or []
    if isinstance(job_types, list):
        tags.extend([jt.strip() for jt in job_types if jt and jt.strip()])
    elif isinstance(job_types, str):
        tags.append(job_types.strip())

    salary = (raw.get("salary") or "").strip()
    if salary:
        tags.append(salary)

    # Add source and type tags
    tags.append("Indeed")
    if listing_type == "internship" and "Internship" not in tags:
        tags.append("Internship")
    elif listing_type == "job" and "Software" not in " ".join(tags):
        tags.append("Software Engineering")

    return {
        "title": title,
        "description": description,
        "type": listing_type,
        "tags": list(set(tags)),
        "location": location,
        "is_remote": is_remote,
        "starts_at": None,
        "ends_at": None,
        "application_url": application_url,
        "popularity_score": 0.0,
        "is_published": True,
    }


# ── LinkedIn Normalizer ──────────────────────────────────────────────────────


def normalize_linkedin_job(raw: dict) -> dict | None:
    """
    Maps raw LinkedIn Jobs Scraper actor output to the Supabase listings schema.

    LinkedIn fields → Schema fields:
      title            → title (with company appended)
      companyName      → used in title
      location         → location + remote detection
      applyUrl / link  → application_url
      postedAt         → starts_at (posted date)
      descriptionHtml  → description
      employmentType   → tags
      seniorityLevel   → tags
    """
    title = _safe_truncate(raw.get("title", ""), 200)
    if not title:
        return None

    company = (raw.get("companyName") or "").strip()
    if company and company.lower() not in title.lower():
        title = _safe_truncate(f"{title} at {company}", 200)

    description = strip_html(raw.get("descriptionHtml", "") or raw.get("descriptionText", ""))

    # Location & remote detection
    location = (raw.get("location") or "").strip()
    is_remote = False
    if not location or "remote" in location.lower():
        is_remote = True
        if not location:
            location = "Remote"

    # Application URL
    application_url = raw.get("applyUrl") or raw.get("link") or ""

    # Posted date → starts_at
    starts_at = _parse_iso_date(raw.get("postedAt"))

    # Auto-detect listing type from title + description
    listing_type = _detect_listing_type(title, description)

    # Build tags
    tags: list[str] = []
    employment_type = (raw.get("employmentType") or "").strip()
    if employment_type:
        tags.append(employment_type)

    seniority = (raw.get("seniorityLevel") or "").strip()
    if seniority:
        tags.append(seniority)

    # Add source and type tags
    tags.append("LinkedIn")
    if listing_type == "internship" and "Internship" not in tags:
        tags.append("Internship")
    elif listing_type == "job" and "Software" not in " ".join(tags):
        tags.append("Software Engineering")

    return {
        "title": title,
        "description": description,
        "type": listing_type,
        "tags": list(set(tags)),
        "location": location,
        "is_remote": is_remote,
        "starts_at": starts_at,
        "ends_at": None,
        "application_url": application_url,
        "popularity_score": 0.0,
        "is_published": True,
    }

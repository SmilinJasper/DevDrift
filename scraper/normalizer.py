import re
from datetime import datetime
from bs4 import BeautifulSoup
from dateutil import parser as date_parser

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

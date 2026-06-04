import time
import uuid
from supabase import create_client, Client
from scraper.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SYSTEM_CRAWLER_EMAIL,
    SYSTEM_CRAWLER_USERNAME,
    SYSTEM_CRAWLER_FULL_NAME
)

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables not set.")
        return None
    try:
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        return None

def get_system_crawler_profile_id(supabase: Client) -> str:
    """Gets the UUID of the system crawler profile, creating it if it doesn't exist."""
    # 1. Check if the profile already exists in public.profiles
    try:
        res = supabase.table("profiles").select("id").eq("username", SYSTEM_CRAWLER_USERNAME).execute()
        if res.data:
            crawler_id = res.data[0]["id"]
            print(f"Found existing system crawler profile with ID: {crawler_id}")
            return crawler_id
    except Exception as e:
        print(f"Error checking profiles table: {e}")

    # 2. Crawler user doesn't exist, let's create it in auth.users
    print("System crawler profile not found. Creating system crawler user...")
    try:
        random_password = str(uuid.uuid4()) + "Aa1!"
        user_data = {
            "email": SYSTEM_CRAWLER_EMAIL,
            "password": random_password,
            "user_metadata": {
                "username": SYSTEM_CRAWLER_USERNAME,
                "full_name": SYSTEM_CRAWLER_FULL_NAME
            },
            "email_confirm": True
        }
        user_res = supabase.auth.admin.create_user(user_data)
        crawler_id = user_res.user.id
        print(f"Created system crawler auth user with ID: {crawler_id}")
        
        # Give database trigger some time to insert the profile
        time.sleep(2)
        
        # Verify if profile was created by trigger
        profile_res = supabase.table("profiles").select("id").eq("id", crawler_id).execute()
        if profile_res.data:
            return profile_res.data[0]["id"]
            
        # Fallback: manually insert profile if trigger didn't fire
        print("Warning: Profile was not created by trigger. Creating profile manually...")
        supabase.table("profiles").insert({
            "id": crawler_id,
            "username": SYSTEM_CRAWLER_USERNAME,
            "full_name": SYSTEM_CRAWLER_FULL_NAME
        }).execute()
        return crawler_id
        
    except Exception as e:
        print(f"Error creating system crawler user: {e}")
        
        # Final emergency fallback: try to find ANY existing profile to avoid crash
        try:
            any_profile = supabase.table("profiles").select("id").limit(1).execute()
            if any_profile.data:
                fallback_id = any_profile.data[0]["id"]
                print(f"WARNING: Using fallback profile ID '{fallback_id}' to satisfy foreign key constraint.")
                return fallback_id
        except Exception:
            pass
            
        raise RuntimeError(f"Could not initialize system crawler profile. Constraint check failed: {e}")

def get_existing_listings_map(supabase: Client) -> dict:
    """Returns a dictionary mapping application_url -> listing_id of existing database listings."""
    try:
        res = supabase.table("listings").select("id, application_url").execute()
        return {item["application_url"]: item["id"] for item in res.data if item.get("application_url")}
    except Exception as e:
        print(f"Warning: Could not fetch existing listings map: {e}")
        return {}

def sync_listings(supabase: Client, normalized_listings: list, crawler_profile_id: str):
    """Upserts normalized listings to Supabase, preventing duplicate insertions by application_url."""
    existing_map = get_existing_listings_map(supabase)
    print(f"Found {len(existing_map)} existing listings in database.")
    
    inserted_count = 0
    updated_count = 0
    
    for item in normalized_listings:
        # Associate listing with system crawler profile
        item["created_by"] = crawler_profile_id
        
        url = item.get("application_url")
        if url in existing_map:
            # Update existing listing
            listing_id = existing_map[url]
            try:
                supabase.table("listings").update(item).eq("id", listing_id).execute()
                updated_count += 1
            except Exception as e:
                print(f"Error updating listing '{item.get('title')}': {e}")
        else:
            # Insert new listing
            try:
                supabase.table("listings").insert(item).execute()
                inserted_count += 1
            except Exception as e:
                print(f"Error inserting listing '{item.get('title')}': {e}")
                
    print(f"Sync complete: Inserted {inserted_count} new listings, updated {updated_count} existing listings.")

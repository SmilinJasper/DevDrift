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

def sync_listings(supabase: Client, normalized_listings: list, crawler_profile_id: str):
    """Upserts normalized listings to Supabase and deletes old listings not present in this run."""
    try:
        existing_map = {}
        all_existing_ids = set()
        
        # Paginate to overcome Supabase's default 1000 row limit
        page_size = 1000
        start = 0
        while True:
            end = start + page_size - 1
            res = supabase.table("listings").select("id, application_url").range(start, end).execute()
            data = res.data
            
            if not data:
                break
                
            for item in data:
                if item.get("application_url"):
                    existing_map[item["application_url"]] = item["id"]
                all_existing_ids.add(item["id"])
                
            if len(data) < page_size:
                break
                
            start += page_size
            
    except Exception as e:
        print(f"Warning: Could not fetch existing listings map: {e}")
        existing_map = {}
        all_existing_ids = set()

    print(f"Found {len(all_existing_ids)} existing listings in database.")
    
    kept_ids = set()
    inserted_count = 0
    updated_count = 0
    
    for item in normalized_listings:
        # Associate listing with system crawler profile
        item["created_by"] = crawler_profile_id
        
        url = item.get("application_url")
        if url and url in existing_map:
            # Update existing listing
            listing_id = existing_map[url]
            try:
                supabase.table("listings").update(item).eq("id", listing_id).execute()
                kept_ids.add(listing_id)
                updated_count += 1
            except Exception as e:
                print(f"Error updating listing '{item.get('title')}': {e}")
        else:
            # Insert new listing
            try:
                res_insert = supabase.table("listings").insert(item).execute()
                if res_insert.data:
                    kept_ids.add(res_insert.data[0]["id"])
                inserted_count += 1
            except Exception as e:
                print(f"Error inserting listing '{item.get('title')}': {e}")
                
    # Delete listings that are no longer present
    ids_to_delete = all_existing_ids - kept_ids
    deleted_count = 0
    if ids_to_delete:
        print(f"Deleting {len(ids_to_delete)} old listings...")
        ids_list = list(ids_to_delete)
        # Delete in batches of 500
        batch_size = 500
        for i in range(0, len(ids_list), batch_size):
            batch = ids_list[i:i+batch_size]
            try:
                supabase.table("listings").delete().in_("id", batch).execute()
                deleted_count += len(batch)
            except Exception as e:
                print(f"Error deleting batch of old listings: {e}")
                
    print(f"Sync complete: Inserted {inserted_count}, updated {updated_count}, deleted {deleted_count} old listings.")

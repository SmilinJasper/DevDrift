import urllib.request
import json
from urllib.parse import urlencode

def test_pagination():
    has_more = True
    cursor = None
    page = 1
    total_items = 0
    
    while has_more and page <= 500:
        params = {"limit": 5}
        if cursor:
            params["cursor"] = cursor
        
        url = f"http://localhost:3000/api/listings?{urlencode(params)}"
        print(f"\nFetching page {page}: {url}")
        
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read())
                items = data.get("data", [])
                
                print(f"Received {len(items)} items.")
                if items:
                    print(f"First item ID: {items[0]['id']}")
                    print(f"Last item ID: {items[-1]['id']}")
                
                total_items += len(items)
                pagination = data.get("pagination", {})
                has_more = pagination.get("has_more", False)
                cursor = pagination.get("next_cursor")
                
                print(f"Has More: {has_more}, Next Cursor: {'Present' if cursor else 'None'}")
                page += 1
                
        except Exception as e:
            print(f"Error: {e}")
            break
            
    print(f"\nTest finished. Fetched {total_items} items across {page - 1} pages.")

if __name__ == "__main__":
    test_pagination()

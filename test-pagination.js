const fetch = require('node-fetch'); // we can just use global fetch in Node 18+

async function testPagination() {
  let hasMore = true;
  let cursor = null;
  let page = 1;
  let totalItems = 0;

  while (hasMore && page <= 5) {
    const url = `http://localhost:3000/api/listings?limit=5${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    console.log(`\nFetching page ${page}: ${url}`);
    
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Error: ${res.status} ${await res.text()}`);
        break;
      }
      
      const data = await res.json();
      console.log(`Received ${data.data?.length || 0} items.`);
      if (data.data?.length > 0) {
        console.log(`Last item ID: ${data.data[data.data.length - 1].id}`);
        console.log(`Last item Score: ${data.data[data.data.length - 1].popularity_score}`);
      }
      
      totalItems += data.data?.length || 0;
      hasMore = data.pagination?.has_more;
      cursor = data.pagination?.next_cursor;
      
      console.log(`Has More: ${hasMore}, Next Cursor: ${cursor ? 'Present' : 'None'}`);
      page++;
    } catch (e) {
      console.error(e);
      break;
    }
  }
  
  console.log(`\nTest finished. Fetched ${totalItems} items across ${page - 1} pages.`);
}

testPagination();
